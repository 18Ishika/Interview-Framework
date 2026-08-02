import os
import json
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
_client = Groq(api_key=api_key)

MODEL = "llama-3.3-70b-versatile"

SCORE_PROMPT = """You are grading a candidate's spoken answer to a technical
interview question. Judge it purely on conceptual correctness and depth —
NOT on whether it matches any specific wording or phrasing. Different
candidates may explain the same correct concept in completely different
ways; do not penalize style, structure, or word choice.

First, decide for yourself what the key concepts/terms a strong answer to
this question would need to cover. Then check how many of those the
candidate actually demonstrated (in their own words, paraphrases count).

Question: {question}
Candidate's answer: {candidate}

Evaluate and return STRICT JSON only, no markdown, no backticks, in exactly
this shape:
{{
  "correctness_score": <float 0-1, how conceptually correct and complete the answer is>,
  "keyword_coverage": <float 0-1, fraction of key concepts (that you identified) the candidate demonstrated>,
  "contradiction_score": <float 0-1, how much the answer contains factually wrong or contradictory statements>,
  "matched_keywords": [<key concepts the candidate did demonstrate understanding of>],
  "missed_keywords": [<key concepts relevant to the question that were missing>]
}}
"""


def score_answer(candidate: str, question: str) -> dict:
    prompt = SCORE_PROMPT.format(question=question, candidate=candidate)

    try:
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content)
    except Exception as e:
        print("GROQ SCORE ERROR:", repr(e))
        parsed = {
            "correctness_score": 0.0,
            "keyword_coverage": 0.0,
            "contradiction_score": 0.0,
            "matched_keywords": [],
            "missed_keywords": [],
        }

    correctness = float(parsed.get("correctness_score", 0.0))
    kw_score = float(parsed.get("keyword_coverage", 0.0))
    contradiction = float(parsed.get("contradiction_score", 0.0))
    matched = parsed.get("matched_keywords", [])
    missed = parsed.get("missed_keywords", [])

    final = round((0.45 * correctness) + (0.55 * kw_score), 4)

    if contradiction > 0.7:
        label = "Incorrect"
    elif kw_score < 0.30:
        label = "Incorrect"
    elif final >= 0.75:
        label = "Correct"
    elif final >= 0.50:
        label = "Partial"
    else:
        label = "Incorrect"

    return {
        "correctness_score": round(correctness, 4),
        "keyword_coverage": round(kw_score, 4),
        "contradiction_score": round(contradiction, 4),
        "final_score": final,
        "label": label,
        "matched_keywords": matched,
        "missed_keywords": missed,
    }