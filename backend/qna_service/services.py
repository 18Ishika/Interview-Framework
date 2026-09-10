import json
import random
import os
import io
from gtts import gTTS

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# JSON_PATH = os.path.join(BASE_DIR, 'tech_int', 'data', 'Multi_Role_Technical_Interview_Q&A_Dataset.json')

with open(r"D:\Sharda\Final Year\Code\Interview-Framework\backend\tech_int\data\Multi_Role_Technical_Interview_Q&A_Dataset.json", 'r') as f:
    QUESTION_DATA = json.load(f)

def get_role_data(role_name: str) -> dict:
    for role in QUESTION_DATA.get('Roles', []):
        if role['Role'] == role_name:
            return role
    return None

def pick_questions(role_name: str) -> list:
    role = get_role_data(role_name)
    if not role:
        # Fallback or generic questions if role not found
        if role_name == 'HR':
            return [
                {
                    'question': 'Tell me about yourself and your background.',
                    'answer': 'A good candidate will provide a concise summary of their professional background, relevant experience, and what they are looking for in their next role.',
                    'keywords': ['background', 'experience', 'skills', 'goals', 'education'],
                    'topic': 'Introduction',
                    'concept': 'Self-Awareness & Communication'
                },
                {
                    'question': 'Why do you want to work for our company?',
                    'answer': 'The candidate should demonstrate that they have researched the company and have a genuine interest in its mission, products, or culture.',
                    'keywords': ['mission', 'values', 'culture', 'products', 'research', 'growth'],
                    'topic': 'Company Fit',
                    'concept': 'Motivation & Alignment'
                },
                {
                    'question': 'Can you describe a time when you faced a significant challenge at work and how you handled it?',
                    'answer': 'The candidate should use the STAR method (Situation, Task, Action, Result) to describe a specific challenge, the actions they took to resolve it, and the positive outcome.',
                    'keywords': ['challenge', 'problem', 'solution', 'result', 'action', 'star', 'overcame'],
                    'topic': 'Behavioral',
                    'concept': 'Problem Solving & Resilience'
                }
            ]
        return []

    selected_questions = []

    for topic in role['Topics']:
        topic_questions = []
        for concept in topic['Concepts']:
            for question in concept['Questions']:
                topic_questions.append({
                    'question': question['Question'],
                    'answer': question['Answer'],
                    'keywords': question.get('Keywords', []),
                    'topic': topic['Topic'],
                    'concept': concept['Concept']
                })
        if topic_questions:
            selected_questions.append(random.choice(topic_questions))

    random.shuffle(selected_questions)
    return selected_questions

def generate_questions(request, role_name: str, round_type: str):
    """
    Generates questions and sets them in the session based on round_type.
    """
    questions = pick_questions(role_name)
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

def get_current_answer_data(request, round_type: str) -> dict:
    questions = request.session.get(f'{round_type}_questions', [])
    index = request.session.get(f'{round_type}_current_index', 0)

    if index >= len(questions) or len(questions) == 0:
        return None

    current = questions[index]
    return {
        'answer': current['answer'],
        'keywords': current['keywords']
    }

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
