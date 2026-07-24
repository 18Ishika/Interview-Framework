from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from celery import chord
from .tasks import evaluate_single_answer_task, finalize_evaluation_chord_task
from gtts import gTTS
import io
from django.http import HttpResponse
from users.authentication import ClerkAuthentication
from interview_sessions.models import Session, TechnicalRound ,HrRound
from django.utils import timezone
import uuid
from interview_sessions.services.cloudinary_service import CloudinaryService
from .services.pick import (
    start_interview,
    get_current_question,
    get_current_answer_data,
    save_result,
    advance_question,
    get_all_results
)
from .services.transcription import transcribe
from .services.scoring import score_answer


@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def start_interview_view(request):
    try:
        role_name = request.data.get("role")
        session_id = request.data.get("session_id")

        if not role_name:
            return Response({"error": "Role is required"}, status=400)

        if not session_id:
            session_id = uuid.uuid4()
            
        # Get or create the session
        interview_session, _ = Session.objects.get_or_create(
            id=session_id,
            defaults={"user": request.user, "target_role": role_name}
        )
        interview_session.tech_status = "in_progress"
        interview_session.save()

        # Get or create the technical round
        tech_round, _ = TechnicalRound.objects.get_or_create(session=interview_session)
        if not tech_round.started_at:
            tech_round.started_at = timezone.now()
        tech_round.save()

        request.session['session_id'] = str(session_id)

        question = start_interview(request, role_name)
        question["session_id"] = str(session_id)
        return Response(question)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_question_view(request):
    try:
        question = get_current_question(request)
        return Response(question)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def evaluate_answer_view(request):
    try:
        audio_file = request.FILES.get("audio")
        if not audio_file:
            return Response({"error": "Audio file is required"}, status=400)

        answer_data = get_current_answer_data(request)
        if not answer_data:
            return Response({"error": "No active question found"}, status=400)

        session_id_str = request.session.get('session_id')
        if not session_id_str:
            return Response({"error": "No session active"}, status=400)

        current_question = get_current_question(request)
        
        # Upload audio to Cloudinary directly
        audio_url = CloudinaryService.upload_audio(audio_file, request.user.id, session_id_str, "technical")

        try:
            tech_round, _ = TechnicalRound.objects.get_or_create(session_id=session_id_str)
            if not isinstance(tech_round.questions_asked, list):
                tech_round.questions_asked = []
            
            # Append to the ArrayField for record keeping
            if not isinstance(tech_round.audio_recording, list):
                tech_round.audio_recording = []
            tech_round.audio_recording.append(audio_url)

            # Store initial data for evaluation later
            tech_round.questions_asked.append({
                "question": current_question.get('question'),
                "topic": current_question.get('topic'),
                "concept": current_question.get('concept'),
                "audio_url": audio_url,
                "reference": answer_data["answer"],
                "keywords": answer_data["keywords"],
                "status": "pending_evaluation"
            })
            tech_round.save()
        except Exception as e:
            print("Error updating TechnicalRound with audio question context:", e)

        advance_question(request)
        next_question = get_current_question(request)
        return Response({"next_question": next_question})

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_results_view(request):
    try:
        session_id_str = request.session.get('session_id')
        if not session_id_str:
            return Response({"error": "No active session"}, status=400)

        try:
            tech_round = TechnicalRound.objects.get(session_id=session_id_str)
        except TechnicalRound.DoesNotExist:
            return Response({"error": "Technical round not found"}, status=400)

        # If already completed, just return the report!
        if tech_round.session.tech_status == "completed":
            return Response({
                "message": "Evaluation completed",
                "status": "completed",
                "report": tech_round.ai_evaluation,
                "raw_results": tech_round.questions_asked
            })
        
        questions_asked = tech_round.questions_asked
        if not questions_asked:
            return Response({"error": "No questions to evaluate"}, status=400)

        eval_tasks = []
        for q in questions_asked:
            if not isinstance(q, dict) or not q.get("audio_url"):
                continue
            question_context = {
                "question": q.get("question"),
                "topic": q.get("topic"),
                "concept": q.get("concept")
            }
            eval_tasks.append(
                evaluate_single_answer_task.s(
                    audio_url=q.get("audio_url"),
                    transcript_reference=q.get("reference"),
                    forced_keywords=q.get("keywords", []),
                    question_context=question_context
                )
            )

        if not eval_tasks:
            return Response({"error": "No valid audio recordings found to evaluate"}, status=400)

        print("Eval task started.")
        callback_task = finalize_evaluation_chord_task.s(session_id=session_id_str)
        print("Callback task created.")
        
        # Trigger the chord
        chord(eval_tasks)(callback_task)
        print("Eval task completed.")

        # Update submitted_at since the user has finished the interview
        tech_round.submitted_at = timezone.now()
        tech_round.save()

        return Response({
            "message": "Evaluation started",
            "status": "processing"
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_interview_status(request):
    try:
        session_id_str = request.session.get('session_id')
        if not session_id_str:
            return Response({"error": "No active session"}, status=400)
            
        interview_session = Session.objects.get(id=session_id_str)
        return Response({
            "status": interview_session.tech_status,
            "session_id": str(interview_session.id)
        })
    except Session.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def question_audio(request):
    questions = request.session.get('questions', [])
    index = request.session.get('current_index', 0)

    if not questions or index >= len(questions):
        return Response({'error': 'No active question'}, status=400)

    question_text = questions[index]['question']

    tts = gTTS(text=question_text, lang='en', slow=False)
    
    audio_buffer = io.BytesIO()
    tts.write_to_fp(audio_buffer)
    audio_buffer.seek(0)

    return HttpResponse(audio_buffer.read(), content_type='audio/mpeg')

@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def acknowledge_result_view(request):
    try:
        session_id = request.data.get("session_id")
        round_type = request.data.get("round_type", "technical")
        
        if not session_id:
            return Response({"error": "session_id is required"}, status=400)
            
        session = Session.objects.get(id=session_id, user=request.user)
        
        if round_type == "technical":
            tech_round = session.technical_round
            tech_round.is_result_acknowledged = True
            tech_round.save()
            return Response({"message": "Technical round acknowledged."})

        if round_type == "hr":
            hr_round = session.hr_round
            hr_round.is_result_acknowledged = True
            hr_round.save()
            return Response({"message": "HR round acknowledged."})
            
        return Response({"error": "Invalid round_type"}, status=400)
    except Session.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
@api_view(['GET'])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_pending_notifications_view(request):
    try:
        sessions = Session.objects.filter(user=request.user)
        pending = []
        
        for session in sessions:
            if hasattr(session, 'technical_round'):
                tech_round = session.technical_round
                if tech_round.ai_evaluation and not tech_round.is_result_acknowledged:
                    pending.append({
                        "session_id": str(session.id),
                        "round_type": "technical",
                        "status": "completed"
                    })

            if hasattr(session, 'hr_round'):
                hr_round = session.hr_round
                if session.hr_status == "completed" and not hr_round.is_result_acknowledged:
                    pending.append({
                        "session_id": str(session.id),
                        "round_type": "hr",
                        "status": "completed"
                    })
        
        return Response({"pending": pending})
    except Exception as e:
        return Response({"error": str(e)}, status=500)