from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .services.groq_feedback import generate_final_feedback
import tempfile, os
from .tasks import evaluate_answer_task
import json
from gtts import gTTS
from django.http import FileResponse
import io
from django.http import HttpResponse
from users.authentication import ClerkAuthentication
from interview_sessions.models import Session, TechnicalRound
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

        session_key = request.session.session_key
        current_index = request.session.get('current_index', 0)

        # write audio to a temp file the worker process can access
        fd, audio_path = tempfile.mkstemp(suffix=".webm")
        with os.fdopen(fd, "wb") as f:
            for chunk in audio_file.chunks():
                f.write(chunk)

        evaluate_answer_task.delay(
            session_key,
            current_index,
            audio_path,
            answer_data["answer"],
            answer_data["keywords"],
            request.user.id,
        )

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
        results = get_all_results(request)

        if not results:
            return Response({"error": "No results found"}, status=400)

        report = generate_final_feedback(results)

        session_id = request.session.get('session_id')
        if session_id:
            try:
                interview_session = Session.objects.get(id=session_id)
                tech_round = TechnicalRound.objects.get(session=interview_session)
                
                tech_round.questions_asked = results
                tech_round.ai_evaluation = report
                tech_round.submitted_at = timezone.now()
                tech_round.save()
                
                interview_session.tech_status = "completed"
                interview_session.save()
            except Exception as e:
                print("Error finalizing results in db:", e)

        return Response({
            "report": report,
            "raw_results": results 
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)@api_view(['GET'])
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