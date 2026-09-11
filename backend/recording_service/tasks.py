import os
import glob
import logging
from celery import shared_task
from django.conf import settings
from interview_sessions.models import Session, HrRound, TechnicalRound
from interview_sessions.services.cloudinary_service import CloudinaryService
from hr_int.services.visual_behavior_service import VisualBehaviorService

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=2)
def assemble_and_score_video_task(self, session_id, round_type, total_chunks=None):
    logger.info(f"[Celery] Starting assembly for {round_type} Session: {session_id} (expected: {total_chunks} chunks)")

    if not os.path.exists(settings.MEDIA_ROOT):
        os.makedirs(settings.MEDIA_ROOT)

    chunk_pattern = os.path.join(settings.MEDIA_ROOT, f"temp_{session_id}_{round_type}_*.webm")
    chunk_files = sorted(
        glob.glob(chunk_pattern),
        key=lambda f: int(os.path.basename(f).split('_')[-1].replace('.webm', ''))
    )
    found_chunks = len(chunk_files)
    logger.info(f"[Celery] Found {found_chunks} chunk files on disk")

    if total_chunks and found_chunks < int(total_chunks):
        logger.warning(f"[Celery] Expected {total_chunks} chunks but found {found_chunks}!")

    if found_chunks == 0:
        logger.error(f"[Celery] No chunks found for session {session_id}, round {round_type}. Nothing to assemble.")
        return None

    final_video_path = os.path.join(settings.MEDIA_ROOT, f"final_{session_id}_{round_type}.webm")

    try:
        with open(final_video_path, 'wb') as final_file:
            for chunk_path in chunk_files:
                with open(chunk_path, 'rb') as chunk_file:
                    final_file.write(chunk_file.read())
                logger.info(f"Appended {os.path.basename(chunk_path)}")

        file_size = os.path.getsize(final_video_path)
        logger.info(f"[Celery] Assembled video is {file_size / 1024:.1f} KB from {found_chunks} chunks")

        # Get or create round instance
        session = Session.objects.get(id=session_id)
        if round_type == 'tech':
            round_instance, _ = TechnicalRound.objects.get_or_create(session=session)
        else:
            round_instance, _ = HrRound.objects.get_or_create(session=session)

        if round_type == 'tech':
            try:
                behavior_report = VisualBehaviorService(final_video_path, annotate=False).run()
                round_instance.posture_metric = {
                    **behavior_report["posture"],
                    "head_pose": behavior_report["head_pose"],
                }
                round_instance.eye_contact_metrics = {
                    **behavior_report["gaze"],
                    "blink": behavior_report["blink"],
                }
                round_instance.voice_metrics = {
                    "overall_visual_confidence_score": behavior_report["overall_visual_confidence_score"],
                    "duration_seconds": behavior_report["duration_seconds"],
                    "analyzed_frames": behavior_report["analyzed_frames"],
                }
                round_instance.save(update_fields=["posture_metric", "eye_contact_metrics", "voice_metrics"])
                logger.info(f"[Celery] Saved technical behavior metrics for {session_id}")
            except Exception as behavior_error:
                logger.exception(f"[Celery] Technical behavior analysis failed for {session_id}: {behavior_error}")

        logger.info(f"[Celery] Uploading assembled video to Cloudinary for {session_id}")
        with open(final_video_path, 'rb') as video_file:
            secure_url = CloudinaryService.upload_video(video_file, session_id=session_id, round_type=round_type)

        round_instance.video_recording = secure_url
        round_instance.save(update_fields=["video_recording"])

        logger.info(f"[Celery] Successfully processed {round_type} video for {session_id}")

        try:
            from interview_sessions.services.notifier import NotificationService
            NotificationService.notify_user_evaluation_complete(
                user_id=session.user.clerk_user_id,
                round_type=round_type,
                result_data={
                    "session_id": str(session_id),
                    "status": "video_processed",
                    "video_url": secure_url
                }
            )
        except Exception as notify_e:
            logger.error(f"[Celery] NotificationService failed: {notify_e}")

        return secure_url

    except Exception as e:
        logger.error(f"[Celery] Error in assemble_and_score_video_task: {str(e)}")
        raise e

    finally:
        if os.path.exists(final_video_path):
            os.remove(final_video_path)
        for chunk_path in chunk_files:
            if os.path.exists(chunk_path):
                os.remove(chunk_path)
