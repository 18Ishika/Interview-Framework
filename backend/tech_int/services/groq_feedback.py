import os
import json
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
_client = Groq(api_key=api_key)

MODEL = "openai/gpt-oss-20b"

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
    Takes the already-scored results (scoring/labeling/keywords done via
    LLM in score_answer()) and generates a short conceptual explanation
    per question using Groq. Overall summary/rating are computed locally
    from the final_score values.
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


EXEC_SUMMARY_PROMPT = """You are writing a short executive summary for a
candidate's interview report, combining results from up to three rounds:
Technical, HR/Behavioral, and Coding.

Write 2-4 sentences that read like a hiring-panel summary: overall
impression, one or two standout strengths, and one growth area if the data
supports it. Be specific but do not just restate the numeric scores.

Return STRICT JSON only, no markdown, no backticks:
{{
  "overall_summary": "2-4 sentence executive summary",
  "strengths": ["short phrase", "short phrase"],
  "growth_areas": ["short phrase"]
}}

Round data (any round may be missing — only reference rounds that are present):
{data}
"""

def generate_executive_summary(technical_eval: dict | None, hr_eval: dict | None, coding_eval: dict | None = None) -> dict:
    """
    Combines whichever round evaluations exist into one narrative summary
    for the top of the full report. Call this once both/all requested
    rounds are complete — not from generate_final_feedback(), which only
    knows about a single round at a time.
    """
    rounds_present = {
        "technical": technical_eval and {
            "rating": technical_eval.get("overall_rating"),
            "summary": technical_eval.get("overall_summary"),
        },
        "hr": hr_eval and {
            "rating": hr_eval.get("overall_rating"),
            "summary": hr_eval.get("overall_summary"),
        },
        "coding": coding_eval,
    }
    rounds_present = {k: v for k, v in rounds_present.items() if v}

    if not rounds_present:
        return {"overall_summary": "No rounds completed yet.", "strengths": [], "growth_areas": []}

    prompt = EXEC_SUMMARY_PROMPT.format(data=json.dumps(rounds_present, ensure_ascii=False))

    try:
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content)
        if isinstance(parsed, dict) and "overall_summary" in parsed:
            return parsed
        print("GROQ WARNING: unexpected exec summary shape:", parsed)
    except Exception as e:
        print("GROQ ERROR (exec summary):", repr(e))

    fallback_summary = " ".join(
        v["summary"] for v in rounds_present.values() if isinstance(v, dict) and v.get("summary")
    ) or "Report summary unavailable."
    return {"overall_summary": fallback_summary, "strengths": [], "growth_areas": []}