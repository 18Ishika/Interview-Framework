import json
import random
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(BASE_DIR, 'data', 'Multi_Role_Technical_Interview_Q&A_Dataset.json')

with open(JSON_PATH, 'r') as f:
    QUESTION_DATA = json.load(f)


def get_role_data(role_name: str) -> dict:
    for role in QUESTION_DATA['Roles']:
        if role['Role'] == role_name:
            return role
    return None


def pick_questions(role_name: str) -> list:
    role = get_role_data(role_name)
    if not role:
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


def start_interview(request, role_name: str):
    questions = pick_questions(role_name)
    request.session['questions'] = questions
    request.session['current_index'] = 0
    request.session['role'] = role_name
    request.session['results'] = []

    return get_current_question(request)


def get_current_question(request) -> dict:
    questions = request.session.get('questions', [])
    index = request.session.get('current_index', 0)

    if index >= len(questions):
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


def get_current_answer_data(request) -> dict:
    questions = request.session.get('questions', [])
    index = request.session.get('current_index', 0)

    if index >= len(questions):
        return None

    current = questions[index]
    return {
        'answer': current['answer'],
        'keywords': current['keywords']
    }


def save_result(request, result: dict):
    results = request.session.get('results', [])
    questions = request.session.get('questions', [])
    index = request.session.get('current_index', 0)

    # Attach question text and topic to result before saving
    result['question'] = questions[index]['question']
    result['topic'] = questions[index]['topic']
    result['concept'] = questions[index]['concept']

    results.append(result)
    request.session['results'] = results


def advance_question(request):
    request.session['current_index'] = request.session.get('current_index', 0) + 1


def get_all_results(request) -> list:
    return request.session.get('results', [])