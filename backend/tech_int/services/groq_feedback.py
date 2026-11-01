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


EXEC_SUMMARY_PROMPT = """You are writing the closing section of a candidate's
interview report.

IMPORTANT: Use ONLY the rounds present in the data below. Do not mention,
assume, or praise any round that is not in the data.

Write:
- "overall_summary": 2-4 sentences, hiring-panel tone. Do not just restate scores.
- "strengths": 2-4 specific things the candidate did well, each one sentence,
  grounded in the data (answers, verdicts, visual/communication metrics).
  If there are genuinely no strengths, return an empty array. Never invent any.
- "growth_areas": 2-4 specific gaps, each one sentence. Refer to the concepts
  or topics they missed.
- "action_plan": 3-5 concrete next steps the candidate can act on (topics to
  study, things to practice), each one sentence.

Return STRICT JSON only, no markdown, no backticks:
{{
  "overall_summary": "...",
  "strengths": ["..."],
  "growth_areas": ["..."],
  "action_plan": ["..."]
}}

Round data:
{data}
"""


def _compact_round(ev: dict | None) -> dict | None:
    """Trim a round evaluation down to what the LLM needs: rating, summary,
    and per-question verdict + matched/missed concepts."""
    if not ev:
        return None
    return {
        "rating": ev.get("overall_rating"),
        "summary": ev.get("overall_summary"),
        "questions": [
            {
                "question": q.get("question"),
                "verdict": q.get("verdict"),
                "matched": (q.get("matched_keywords") or [])[:5],
                "missed": (q.get("missed_keywords") or [])[:5],
            }
            for q in ev.get("per_question_feedback", [])
        ],
    }


def _as_str_list(v) -> list:
    if not isinstance(v, list):
        return []
    return [s.strip() for s in v if isinstance(s, str) and s.strip()]


def generate_executive_summary(
    technical_eval: dict | None = None,
    hr_eval: dict | None = None,
    coding_eval: dict | None = None,
    visual: dict | None = None,
) -> dict:
    """
    Builds the closing narrative for the report from whichever round
    evaluations are passed in (pass None for rounds that should not appear).

    `visual` is an optional compact dict of posture / eye-contact / voice
    scores for the round being reported, so communication strengths can be
    mentioned too.

    Returns: overall_summary, strengths, growth_areas, action_plan.
    The returned dict has "fallback": True when the LLM call failed, so
    callers can avoid caching a degraded result.
    """
    rounds_present = {
        "technical": _compact_round(technical_eval),
        "hr": _compact_round(hr_eval),
        "coding": coding_eval,
        "visual_behavior": visual,
    }
    rounds_present = {k: v for k, v in rounds_present.items() if v}

    if not rounds_present:
        return {
            "overall_summary": "No rounds completed yet.",
            "strengths": [],
            "growth_areas": [],
            "action_plan": [],
        }

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
            return {
                "overall_summary": parsed["overall_summary"],
                "strengths": _as_str_list(parsed.get("strengths")),
                "growth_areas": _as_str_list(parsed.get("growth_areas")),
                "action_plan": _as_str_list(parsed.get("action_plan")),
            }
        print("GROQ WARNING: unexpected exec summary shape:", parsed)
    except Exception as e:
        print("GROQ ERROR (exec summary):", repr(e))

    return _fallback_exec_summary(technical_eval, hr_eval)


def _fallback_exec_summary(technical_eval: dict | None, hr_eval: dict | None) -> dict:
    """Deterministic content built from verdicts, used when the LLM call fails."""
    evals = [e for e in (technical_eval, hr_eval) if e]
    summary = " ".join(e.get("overall_summary", "") for e in evals).strip() or "Report summary unavailable."

    strengths, growth, plan = [], [], []
    for e in evals:
        for q in e.get("per_question_feedback", []):
            topic = (q.get("question") or "").rstrip("?")
            if not topic:
                continue
            if q.get("verdict") == "Strong Answer":
                strengths.append(f"Answered well: {topic}")
            elif q.get("verdict") == "Needs Work":
                growth.append(f"Needs work: {topic}")
                plan.append(f"Revise and practise answering: {topic}")

    return {
        "overall_summary": summary,
        "strengths": strengths[:4],
        "growth_areas": growth[:4],
        "action_plan": plan[:5],
        "fallback": True,
    }