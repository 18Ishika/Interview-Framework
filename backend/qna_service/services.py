import json
import random
import os
import io
from gtts import gTTS

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

TECH_JSON_PATH = os.path.join(BASE_DIR, 'backend', 'tech_int', 'data', 'Multi_Role_Technical_Interview_Q&A_Dataset.json')
HR_JSON_PATH = os.path.join(BASE_DIR, 'backend', 'hr_int', 'data', 'HR_Interview_Fresher_Dataset.json')

with open(TECH_JSON_PATH, 'r', encoding="utf-8") as f:
    TECH_QUESTION_DATA = json.load(f)

with open(HR_JSON_PATH, 'r', encoding="utf-8") as f:
    HR_QUESTION_DATA = json.load(f)


def get_role_data(role_name: str, round_type: str = 'tech') -> dict:
    data = HR_QUESTION_DATA if round_type == 'hr' else TECH_QUESTION_DATA
    for role in data.get('Roles', []):
        if role['Role'] == role_name:
            return role
    return None

def pick_questions(role_name: str, round_type: str = 'tech') -> list:
    role = get_role_data(role_name, round_type)
    if not role:
        return []

    selected_questions = []

    if round_type == 'tech':
        # One question per topic -> exactly 5 questions (5 topics per role)
        for topic in role['Topics']:
            concept = random.choice(topic['Concepts'])
            question = random.choice(concept['Questions'])
            selected_questions.append({
                'question': question['Question'],
                'topic': topic['Topic'],
                'concept': concept['Concept']
            })
    else:
        # HR: one question per concept (unchanged)
        for topic in role['Topics']:
            for concept in topic['Concepts']:
                question = random.choice(concept['Questions'])
                selected_questions.append({
                    'question': question['Question'],
                    'topic': topic['Topic'],
                    'concept': concept['Concept']
                })

    return selected_questions

def generate_questions(request, role_name: str, round_type: str):
    questions = pick_questions(role_name, round_type)
    request.session[f'{round_type}_questions'] = questions
    request.session[f'{round_type}_current_index'] = 0
    request.session[f'{round_type}_role'] = role_name
    return get_current_question(request, round_type)


def get_current_question(request, round_type: str) -> dict:
    questions = request.session.get(f'{round_type}_questions', [])
    index = request.session.get(f'{round_type}_current_index', 0)

    if index >= len(questions) or len(questions) == 0:
        return {'round_complete': True}

    current = questions[index]

    return {
        'round_complete': False,
        'question_number': index + 1,
        'total_questions': len(questions),
        'question': current['question'],
        'topic': current['topic'],
        'concept': current['concept']
    }


def has_active_question(request, round_type: str) -> bool:
    questions = request.session.get(f'{round_type}_questions', [])
    index = request.session.get(f'{round_type}_current_index', 0)
    return 0 <= index < len(questions)


def advance_question(request, round_type: str):
    request.session[f'{round_type}_current_index'] = request.session.get(f'{round_type}_current_index', 0) + 1


def generate_question_audio(request, round_type: str):
    questions = request.session.get(f'{round_type}_questions', [])
    index = request.session.get(f'{round_type}_current_index', 0)

    if not questions or index >= len(questions):
        return None

    question_text = questions[index]['question']
    tts = gTTS(text=question_text, lang='en', slow=False)

    audio_buffer = io.BytesIO()
    tts.write_to_fp(audio_buffer)
    audio_buffer.seek(0)

    return audio_buffer.read()