import os
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def handle_upload_chunk(session_id, round_type, chunk_index, video_chunk):
    """
    Saves a video chunk to a temporary file.
    Namespaced by session_id and round_type to avoid collisions.
    """
    if not os.path.exists(settings.MEDIA_ROOT):
        os.makedirs(settings.MEDIA_ROOT)

    chunk_path = os.path.join(settings.MEDIA_ROOT, f"temp_{session_id}_{round_type}_{chunk_index}.webm")
    
    with open(chunk_path, 'wb') as f:
        for chunk in video_chunk.chunks():
            f.write(chunk)
            
    logger.info(f"Saved chunk {chunk_index} for session {session_id}, round: {round_type}")
    return {"status": "success"}

def handle_finish_upload(session_id, round_type, total_chunks):
    """
    Called when all chunks have been uploaded.
    Here we just trigger the Celery task to assemble and process the video.
    """
    if round_type == "hr":
        from hr_int.tasks import assemble_and_upload_hr_video_task

        assemble_and_upload_hr_video_task.delay(session_id, total_chunks)
    else:
        from .tasks import assemble_and_score_video_task

        assemble_and_score_video_task.delay(session_id, round_type, total_chunks)

    logger.info(f"Triggered assembly task for session {session_id}, round {round_type} ({total_chunks} chunks)")
    return {"status": "success", "message": "Upload assembly started"}
