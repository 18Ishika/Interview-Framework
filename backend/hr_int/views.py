import os
import uuid
import json
import logging
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from interview_sessions.models import Session, HrRound
from .tasks import assemble_and_upload_hr_video_task
from users.authentication import ClerkAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

@api_view(["POST"])
@authentication_classes([ClerkAuthentication])
@permission_classes([IsAuthenticated])
def start_hr_interview(request):
    try:
        session_id = uuid.uuid4()
        # Create a new session for the HR interview
        interview_session = Session.objects.create(
            id=session_id,
            user=request.user,
            target_role="HR" # Default role for HR if not specified
        )
        interview_session.hr_status = "in_progress"
        interview_session.save()

        # Initialize HrRound
        HrRound.objects.create(session=interview_session)

        return JsonResponse({"session_id": str(session_id)}, status=200)
    except Exception as e:
        logger.error(f"Error starting HR interview: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def upload_chunk(request):
    """
    Receives a video chunk and saves it to a temporary file.
    """
    if request.method == 'POST':
        try:
            session_id = request.POST.get("session_id")
            chunk_index = request.POST.get("chunk_index")
            video_chunk = request.FILES.get("chunk")

            if not session_id or chunk_index is None or not video_chunk:
                return JsonResponse({"error": "Missing required fields"}, status=400)

            # Ensure media root exists
            if not os.path.exists(settings.MEDIA_ROOT):
                os.makedirs(settings.MEDIA_ROOT)

            chunk_path = os.path.join(settings.MEDIA_ROOT, f"temp_{session_id}_{chunk_index}.webm")
            
            with open(chunk_path, 'wb') as f:
                for chunk in video_chunk.chunks():
                    f.write(chunk)
                    
            logger.info(f"Saved chunk {chunk_index} for session {session_id}")
            return JsonResponse({"status": "success"}, status=200)

        except Exception as e:
            logger.error(f"Error saving chunk: {str(e)}")
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def finish_upload(request):
    """
    Called ONLY after the frontend has confirmed every chunk upload succeeded.
    No countdown needed — all chunks are guaranteed to be on disk.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            session_id = data.get("session_id")
            total_chunks = data.get("total_chunks")
            
            if not session_id:
                return JsonResponse({"error": "Missing session_id"}, status=400)
                
            # Trigger Celery task immediately — chunks are already here
            assemble_and_upload_hr_video_task.delay(session_id, total_chunks)
            
            logger.info(f"Triggered assembly task for session {session_id} ({total_chunks} chunks confirmed)")
            return JsonResponse({"status": "success", "message": "Upload assembly started"}, status=200)

        except Exception as e:
            logger.error(f"Error starting finish_upload task: {str(e)}")
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)
