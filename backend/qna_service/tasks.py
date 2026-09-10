import os
import tempfile
import urllib.request
import logging
from celery import shared_task, chord
from django.utils import timezone
from interview_sessions.models import TechnicalRound, HrRound, Session
from tech_int.services.transcription import transcribe
from tech_int.services.scoring import score_answer
from tech_int.services.groq_feedback import generate_final_feedback

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=2)
def evaluate_single_answer_task(self, audio_url, question_context):
    temp_audio_path = None
    question_text = question_context.get("question", "Unknown Question")
    logger.info(f"[Celery] Starting evaluation task for question: '{question_text}'")
    try:
        # Download the audio file to a temp file
        fd, temp_audio_path = tempfile.mkstemp(suffix=".webm")
        os.close(fd)

        logger.info(f"[Celery] Downloading audio from: {audio_url}")
        req = urllib.request.Request(audio_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(temp_audio_path, 'wb') as out_file:
            out_file.write(response.read())
        
        logger.info("[Celery] Starting transcription...")
        transcript = transcribe(temp_audio_path)

        logger.info("[Celery] Starting scoring...")
        result = score_answer(
            candidate=transcript,
            question=question_text,
        )

        result["transcript"] = transcript
        result["audio_url"] = audio_url
        result["status"] = "evaluated"
        result.update(question_context)

        return result
    except Exception as e:
        logger.error(f"[Celery] evaluate_single_answer_task failed for '{question_text}': {e}")
        # Partial failure handling: return a default fallback result instead of crashing the chord
        return {
            "status": "failed",
            "error": str(e),
            "transcript": "Audio could not be processed",
            "final_score": 0,
            "feedback": "Evaluation failed due to a processing error.",
            **question_context
        }
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)


@shared_task(bind=True, max_retries=2)
def finalize_evaluation_chord_task(self, results, session_id, round_type):
    logger.info(f"[Celery] finalize_evaluation_chord_task for Session ID: {session_id}, round: {round_type}")
    try:
        session = Session.objects.get(id=session_id)
        if round_type == 'tech':
            round_instance = session.technical_round
        else:
            round_instance = session.hr_round

        valid_results = [res for res in results if isinstance(res, dict) and "final_score" in res]
        logger.info(f"[Celery] Received {len(results)} results, {len(valid_results)} valid.")

        # If we have valid results, generate a report
        if valid_results:
            logger.info("[Celery] Generating final report using Groq...")
            report = generate_final_feedback(valid_results)
        else:
            report = {"overall_rating": 0, "overall_summary": "Evaluation failed for all questions."}

        round_instance.questions_asked = valid_results
        
        if round_type == 'tech':
            round_instance.ai_evaluation = report
            session.tech_status = "completed"
        else:
            # HR round saves QnA metrics
            round_instance.qna_metrics = report
            # session.hr_status is completed by the video processing task OR here
            # But the plan specifies marking status completed independent of the other task
            session.hr_status = "completed"
            
        round_instance.is_result_acknowledged = False
        
        # Determine fields to save based on round_type
        if round_type == 'tech':
            round_instance.save(update_fields=["ai_evaluation", "questions_asked", "is_result_acknowledged"])
            session.save(update_fields=["tech_status"])
        else:
            round_instance.save(update_fields=["qna_metrics", "questions_asked", "is_result_acknowledged"])
            session.save(update_fields=["hr_status"])

        logger.info(f"[Celery] Saved QnA evaluation and marked Session {session_id} {round_type}_status as completed.")
        
        try:
            from interview_sessions.services.notifier import NotificationService
            NotificationService.notify_user_evaluation_complete(
                user_id=session.user.clerk_user_id,
                round_type=round_type,
                result_data={
                    "session_id": session_id,
                    "status": "qna_evaluated"
                }
            )
        except Exception as notify_e:
            logger.error(f"[Celery] NotificationService failed: {notify_e}")

        return report
    except Exception as e:
        logger.error(f"[Celery] finalize_evaluation_chord_task failed for Session {session_id}: {e}")
        raise
