import os
import uuid
import json
import logging
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from interview_sessions.models import Session, HrRound
from users.authentication import ClerkAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from celery import chord

# Shared services
from recording_service.services import handle_upload_chunk, handle_finish_upload
from qna_service.services import (
    generate_questions,
    get_current_question,
    get_current_answer_data,
    advance_question,
    generate_question_audio
)
from qna_service.tasks import evaluate_single_answer_task, finalize_evaluation_chord_task
from interview_sessions.services.cloudinary_service import CloudinaryService

logger = logging.getLogger(__name__)

@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def start_hr_interview(request):
    try:
        session_id = uuid.uuid4()
        interview_session = Session.objects.create(
            id=session_id,
            user=request.user,
            target_role="HR"
        )
        interview_session.hr_status = "in_progress"
        interview_session.save()

        HrRound.objects.create(session=interview_session, started_at=timezone.now())
        
        request.session['hr_session_id'] = str(session_id)
        
        # Generate QnA for HR
        question = generate_questions(request, role_name="HR", round_type="hr")
        question["session_id"] = str(session_id)
        
        return Response(question)
    except Exception as e:
        logger.error(f"Error starting HR interview: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def upload_chunk(request):
    try:
        session_id = request.data.get('session_id')
        chunk_index = request.data.get('chunk_index')
        chunk = request.FILES.get('chunk')

        if not session_id or chunk_index is None or not chunk:
            return Response({"error": "Missing required fields"}, status=400)

        result = handle_upload_chunk(session_id, "hr", chunk_index, chunk)
        return Response(result)
    except Exception as e:
        logger.error(f"Error saving chunk: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def finish_upload(request):
    try:
        session_id = request.data.get('session_id')
        total_chunks = request.data.get('total_chunks')

        if not session_id or total_chunks is None:
            return Response({"error": "Missing required fields"}, status=400)
            
        try:
            hr_round = HrRound.objects.get(session_id=session_id)
            hr_round.submitted_at = timezone.now()
            hr_round.save(update_fields=["submitted_at"])
        except HrRound.DoesNotExist:
            logger.warning(f"HrRound for session {session_id} not found when saving submitted_at")

        result = handle_finish_upload(session_id, "hr", total_chunks)
        return Response(result)
    except Exception as e:
        logger.error(f"Error starting finish_upload task: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_hr_behavior_metrics(request, session_id):
    try:
        hr_round = HrRound.objects.get(session_id=session_id)
    except HrRound.DoesNotExist:
        return Response({"error": "HrRound not found for this session_id"}, status=404)

    return Response({
        "session_id": str(session_id),
        "hr_status": hr_round.session.hr_status,
        "posture_metric": hr_round.posture_metric,
        "eye_contact_metrics": hr_round.eye_contact_metrics,
        "qna_metrics": hr_round.qna_metrics,
    }, status=200)

@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_question_view(request):
    try:
        question = get_current_question(request, "hr")
        return Response(question)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def question_audio(request):
    try:
        audio_data = generate_question_audio(request, "hr")
        if not audio_data:
            return HttpResponse(status=404)
        response = HttpResponse(audio_data, content_type='audio/mpeg')
        response['Content-Disposition'] = 'attachment; filename="question.mp3"'
        return response
    except Exception as e:
        return HttpResponse(str(e), status=500)

@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def evaluate_answer_view(request):
    try:
        audio_file = request.FILES.get("audio")
        if not audio_file:
            return Response({"error": "Audio file is required"}, status=400)

        answer_data = get_current_answer_data(request, "hr")
        if not answer_data:
            return Response({"error": "No active question found"}, status=400)

        session_id_str = request.session.get('hr_session_id')
        if not session_id_str:
            return Response({"error": "No session active"}, status=400)

        current_question = get_current_question(request, "hr")
        
        # Upload audio to Cloudinary
        audio_url = CloudinaryService.upload_audio(audio_file, request.user.id, session_id_str, "hr")

        try:
            hr_round, _ = HrRound.objects.get_or_create(session_id=session_id_str)
            if not isinstance(hr_round.questions_asked, list):
                hr_round.questions_asked = []
            
            if not isinstance(hr_round.audio_recording, list):
                hr_round.audio_recording = []
            hr_round.audio_recording.append(audio_url)

            hr_round.questions_asked.append({
                "question": current_question.get('question'),
                "topic": current_question.get('topic'),
                "concept": current_question.get('concept'),
                "audio_url": audio_url,
                "reference": answer_data["answer"],
                "keywords": answer_data["keywords"],
                "status": "pending_evaluation"
            })
            hr_round.save()
        except Exception as e:
            logger.error(f"Error updating HrRound with audio question context: {e}")

        advance_question(request, "hr")
        next_question = get_current_question(request, "hr")
        return Response({"next_question": next_question})

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def get_results_view(request):
    try:
        session_id_str = request.session.get('hr_session_id')
        if not session_id_str:
            return Response({"error": "No active session"}, status=400)

        try:
            hr_round = HrRound.objects.get(session_id=session_id_str)
        except HrRound.DoesNotExist:
            return Response({"error": "HR round not found"}, status=400)

        if hr_round.session.hr_status == "completed":
            return Response({
                "message": "Evaluation completed",
                "status": "completed",
                "report": hr_round.qna_metrics,
                "raw_results": hr_round.questions_asked
            })

        tasks = []
        for q in hr_round.questions_asked:
            if q.get("status") == "pending_evaluation":
                tasks.append(evaluate_single_answer_task.s(q["audio_url"], q))

        if tasks:
            callback = finalize_evaluation_chord_task.s(session_id_str, "hr")
            chord(tasks)(callback)

        return Response({
            "message": "Evaluation in progress",
            "status": "in_progress",
            "task_count": len(tasks)
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)