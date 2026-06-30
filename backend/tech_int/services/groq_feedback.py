import os
import json
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
_client = Groq(api_key=api_key)

MODEL = "llama-3.3-70b-versatile"

PROMPT_TEMPLATE = """You are a technical interview coach. Below is a list of
interview questions, the candidate's transcribed spoken answers, and their
score label for each.

For EACH question, write a short 2-3 line explanation of how well they
answered conceptually — what they got right, what was missing or shallow,
and how to think about it better. Be honest but constructive. Do NOT mention
specific keywords or exact terms — only explain the underlying concept.

Return STRICT JSON only, no markdown, no backticks, as a JSON object with a
single key "explanations" containing an array of strings in the same order
as the input, like this:
{{
  "explanations": [
    "2-3 line explanation for question 1",
    "2-3 line explanation for question 2"
  ]
}}

Input data:
{data}
"""

VERDICT_MAP = {"Correct": "Strong Answer", "Partial": "Good Attempt", "Incorrect": "Needs Work"}


def generate_final_feedback(results: list) -> dict:
    """
    Builds the final report almost entirely from local scoring data.
    Groq (Llama 3.3 70B) is used ONLY to generate a short conceptual
    explanation per question — nothing else (no ratings, no summaries,
    no keywords) comes from the LLM, keeping dependency on it minimal.
    """
    explanations = _get_explanations(results)

    per_question_feedback = []
    for i, r in enumerate(results):
        per_question_feedback.append({
            "question": r.get("question"),
            "verdict": VERDICT_MAP.get(r.get("label"), r.get("label")),
            "feedback": explanations[i] if i < len(explanations) else _fallback_feedback(r),
            "matched_keywords": r.get("matched_keywords", []),
            "missed_keywords": r.get("missed_keywords", []),
        })

    return {
        "overall_summary": _build_overall_summary(results),
        "overall_rating": _build_overall_rating(results),
        "per_question_feedback": per_question_feedback,
    }


def _get_explanations(results: list) -> list:
    trimmed = [
        {
            "question": r.get("question"),
            "label": r.get("label"),
            "transcript": r.get("transcript"),
        }
        for r in results
    ]
    prompt = PROMPT_TEMPLATE.format(data=json.dumps(trimmed, ensure_ascii=False))

    try:
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content)
        explanations = parsed.get("explanations") if isinstance(parsed, dict) else None
        if isinstance(explanations, list) and len(explanations) == len(results):
            return explanations
        print("GROQ WARNING: unexpected shape:", parsed)
        return [_fallback_feedback(r) for r in results]
    except Exception as e:
        print("GROQ ERROR:", repr(e))
        return [_fallback_feedback(r) for r in results]


def _fallback_feedback(r: dict) -> str:
    return f"You scored {round(r.get('final_score', 0) * 100, 1)}% on this question ({r.get('label')})."


def _build_overall_rating(results: list) -> str:
    if not results:
        return "N/A"
    avg = sum(r.get("final_score", 0) for r in results) / len(results)
    return (
        "Excellent" if avg >= 0.8 else
        "Good" if avg >= 0.65 else
        "Average" if avg >= 0.5 else
        "Needs Improvement"
    )


def _build_overall_summary(results: list) -> str:
    if not results:
        return "No results available."
    avg = sum(r.get("final_score", 0) for r in results) / len(results)
    counts = {"Correct": 0, "Partial": 0, "Incorrect": 0}
    for r in results:
        counts[r.get("label", "Incorrect")] = counts.get(r.get("label", "Incorrect"), 0) + 1
    return (
        f"You scored an average of {round(avg * 100, 1)}% across {len(results)} questions — "
        f"{counts['Correct']} strong, {counts['Partial']} partial, {counts['Incorrect']} needing work."
    )