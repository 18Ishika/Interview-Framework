from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from celery import chord
from qna_service.tasks import evaluate_single_answer_task, finalize_evaluation_chord_task
from django.http import HttpResponse
from users.authentication import ClerkAuthentication
from interview_sessions.models import Session, TechnicalRound, HrRound
from django.utils import timezone
import uuid
from interview_sessions.services.cloudinary_service import CloudinaryService
from qna_service.services import (
    generate_questions,
    get_current_question,
    has_active_question,
    advance_question,
    generate_question_audio
)
from recording_service.services import handle_upload_chunk, handle_finish_upload

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

        interview_session, _ = Session.objects.get_or_create(
            id=session_id,
            defaults={"user": request.user, "target_role": role_name}
        )
        interview_session.tech_status = "in_progress"
        interview_session.save()

        tech_round, _ = TechnicalRound.objects.get_or_create(session=interview_session)
        if not tech_round.started_at:
            tech_round.started_at = timezone.now()
        tech_round.save()

        request.session['session_id'] = str(session_id)

        question = generate_questions(request, role_name, round_type="tech")
        question["session_id"] = str(session_id)
        return Response(question)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_question_view(request):
    try:
        question = get_current_question(request, "tech")
        return Response(question)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def evaluate_answer_view(request):
    try:
        if not has_active_question(request, "tech"):
            return Response({"error": "No active question found"}, status=400)

        audio_file = request.FILES.get("audio")
        if not audio_file:
            return Response({"error": "Audio file is required"}, status=400)

        session_id_str = request.session.get('session_id')
        if not session_id_str:
            return Response({"error": "No session active"}, status=400)

        current_question = get_current_question(request, "tech")

        audio_url = CloudinaryService.upload_audio(audio_file, request.user.id, session_id_str, "technical")

        try:
            tech_round, _ = TechnicalRound.objects.get_or_create(session_id=session_id_str)
            if not isinstance(tech_round.questions_asked, list):
                tech_round.questions_asked = []

            if not isinstance(tech_round.audio_recording, list):
                tech_round.audio_recording = []
            tech_round.audio_recording.append(audio_url)

            tech_round.questions_asked.append({
                "question": current_question.get('question'),
                "topic": current_question.get('topic'),
                "concept": current_question.get('concept'),
                "audio_url": audio_url,
                "status": "pending_evaluation"
            })
            tech_round.save()
        except Exception as e:
            print("Error updating TechnicalRound with audio question context:", e)

        advance_question(request, "tech")
        next_question = get_current_question(request, "tech")
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
                    question_context=question_context,
                    round_type="tech"
                )
            )

        if not eval_tasks:
            return Response({"error": "No valid audio recordings found to evaluate"}, status=400)

        callback_task = finalize_evaluation_chord_task.s(session_id_str, "tech")
        chord(eval_tasks)(callback_task)

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
    try:
        audio_data = generate_question_audio(request, "tech")
        if not audio_data:
            return Response({'error': 'No active question'}, status=400)
        return HttpResponse(audio_data, content_type='audio/mpeg')
    except Exception as e:
        return Response({"error": str(e)}, status=500)

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


@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def upload_chunk_view(request):
    try:
        session_id = request.data.get('session_id')
        chunk_index = request.data.get('chunk_index')
        chunk = request.FILES.get('chunk')

        if not session_id or chunk_index is None or not chunk:
            return Response({"error": "Missing required fields"}, status=400)

        result = handle_upload_chunk(session_id, "tech", chunk_index, chunk)
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def finish_upload_view(request):
    try:
        session_id = request.data.get('session_id')
        total_chunks = request.data.get('total_chunks')

        if not session_id or total_chunks is None:
            return Response({"error": "Missing required fields"}, status=400)

        result = handle_finish_upload(session_id, "tech", total_chunks)
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)