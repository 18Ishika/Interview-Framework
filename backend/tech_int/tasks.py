# tech_interview/tasks.py
import os
from celery import shared_task
from django.contrib.sessions.backends.db import SessionStore
from .services.transcription import transcribe
from .services.scoring import score_answer
from interview_sessions.models import TechnicalRound
from interview_sessions.services.cloudinary_service import CloudinaryService


@shared_task(bind=True, max_retries=2)
def evaluate_answer_task(self, session_key, question_index, audio_path, reference, forced_keywords, user_id):
    session = SessionStore(session_key=session_key)

    try:
        transcript = transcribe(audio_path) 

        result = score_answer(
            candidate=transcript,
            reference=reference,
            forced_keywords=forced_keywords,
        )
        result["transcript"] = transcript

        questions = session.get('questions', [])
        result['question'] = questions[question_index]['question']
        result['topic'] = questions[question_index]['topic']
        result['concept'] = questions[question_index]['concept']

        session_id = session.get('session_id')
        audio_url = CloudinaryService.upload_audio(audio_path, user_id, session_id, "technical")
        result['audio_url'] = audio_url

        results = session.get('results', [])
        results.append(result)
        session['results'] = results
        session.save()

        try:
            tech_round = TechnicalRound.objects.get(session__id=session_id)
            if not isinstance(tech_round.audio_recording, list):
                tech_round.audio_recording = []
            tech_round.audio_recording.append(audio_url)
            tech_round.questions_asked = results
            tech_round.save()
        except TechnicalRound.DoesNotExist:
            pass

    except Exception as e:
        print("evaluate_answer_task failed:", e)
        raise
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)