# tech_interview/tasks.py
import os
import tempfile
import urllib.request
from celery import shared_task, chord
from django.utils import timezone
from interview_sessions.models import TechnicalRound, Session
from .services.transcription import transcribe
from .services.scoring import score_answer
from .services.groq_feedback import generate_final_feedback

@shared_task(bind=True, max_retries=2)
def evaluate_single_answer_task(self, audio_url, question_context):
    temp_audio_path = None
    question_text = question_context.get("question", "Unknown Question")
    print(f"[Celery] Starting evaluation task for question: '{question_text}'")
    try:
        # Download the audio file to a temp file
        fd, temp_audio_path = tempfile.mkstemp(suffix=".webm")
        os.close(fd)

        print(f"[Celery] Downloading audio from: {audio_url}")
        req = urllib.request.Request(audio_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(temp_audio_path, 'wb') as out_file:
            out_file.write(response.read())
        print(f"[Celery] Audio downloaded successfully to {temp_audio_path}")

        print("[Celery] Starting transcription...")
        transcript = transcribe(temp_audio_path)
        print(f"[Celery] Transcription complete: '{transcript}'")

        print("[Celery] Starting scoring...")
        result = score_answer(
            candidate=transcript,
            question=question_text,
        )
        print(f"[Celery] Scoring complete. Score: {result.get('final_score', 0)}")

        result["transcript"] = transcript
        result["audio_url"] = audio_url
        result["status"] = "evaluated"
        result.update(question_context)

        return result
    except Exception as e:
        print(f"[Celery] evaluate_single_answer_task failed for '{question_text}':", e)
        raise
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
            print(f"[Celery] Cleaned up temporary audio file: {temp_audio_path}")

@shared_task(bind=True, max_retries=2)
def finalize_evaluation_chord_task(self, results, session_id):
    print(f"[Celery] Callback triggered: finalize_evaluation_chord_task for Session ID: {session_id}")
    try:
        tech_round = TechnicalRound.objects.get(session__id=session_id)
        interview_session = tech_round.session

        valid_results = [res for res in results if isinstance(res, dict) and "final_score" in res]
        print(f"[Celery] Received {len(results)} results from parallel tasks. {len(valid_results)} are valid.")

        print("[Celery] Generating final report using Groq...")
        report = generate_final_feedback(valid_results)
        print("[Celery] Report generated successfully.")

        tech_round.ai_evaluation = report
        tech_round.questions_asked = valid_results
        tech_round.is_result_acknowledged = False
        tech_round.save()

        interview_session.tech_status = "completed"
        interview_session.save()
        print(f"[Celery] Saved TechnicalRound and marked Session {session_id} as completed.")
        
        try:
            from interview_sessions.services.notifier import NotificationService
            NotificationService.notify_user_evaluation_complete(
                user_id=interview_session.user.clerk_user_id,
                round_type="technical",
                result_data={
                    "session_id": session_id,
                    "status": "completed"
                }
            )
        except Exception as notify_e:
            print(f"[Celery] NotificationService failed: {notify_e}")

        return report
    except Exception as e:
        print(f"[Celery] finalize_evaluation_chord_task failed for Session {session_id}:", e)
        raise