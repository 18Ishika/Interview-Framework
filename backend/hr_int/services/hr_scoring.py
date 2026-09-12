import os
import json
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
_client = Groq(api_key=api_key)

MODEL = "openai/gpt-oss-20b"

HR_SCORE_PROMPT = """You are grading a candidate's spoken answer to an HR /
behavioral interview question. There is no single "correct" answer here —
judge the answer on how well it communicates the candidate's experience,
mindset, and self-awareness, NOT on matching any specific wording.

Evaluate the answer on:
- Relevance: does it actually address what was asked?
- Structure & clarity: is it coherent, specific, and easy to follow (e.g.
  concrete examples, situation-action-result style reasoning where relevant)?
- Depth & authenticity: does it show genuine reflection/self-awareness
  rather than a vague, generic, or rehearsed non-answer?
- Red flags: contradictions, unprofessional statements, or answers that
  dodge the question entirely.

Question: {question}
Candidate's answer: {candidate}

Return STRICT JSON only, no markdown, no backticks, in exactly this shape:
{{
  "correctness_score": <float 0-1, relevance + structure + clarity of the answer>,
  "keyword_coverage": <float 0-1, how well it covers the aspects a strong answer to this question would include>,
  "contradiction_score": <float 0-1, presence of red flags, contradictions, or unprofessional/dodging content>,
  "matched_keywords": [<qualities/aspects the candidate did demonstrate, e.g. "gave a specific example", "showed accountability">],
  "missed_keywords": [<qualities/aspects a strong answer would have shown but this one didn't>]
}}
"""


def score_hr_answer(candidate: str, question: str) -> dict:
    prompt = HR_SCORE_PROMPT.format(question=question, candidate=candidate)

    try:
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content)
    except Exception as e:
        print("GROQ HR SCORE ERROR:", repr(e))
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

    final = round((0.5 * correctness) + (0.5 * kw_score), 4)

    if contradiction > 0.7:
        label = "Weak"
    elif final >= 0.75:
        label = "Strong"
    elif final >= 0.50:
        label = "Adequate"
    else:
        label = "Weak"

    return {
        "correctness_score": round(correctness, 4),
        "keyword_coverage": round(kw_score, 4),
        "contradiction_score": round(contradiction, 4),
        "final_score": final,
        "label": label,
        "matched_keywords": matched,
        "missed_keywords": missed,
    }