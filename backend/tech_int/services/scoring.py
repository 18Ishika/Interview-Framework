import re
import spacy
from sentence_transformers import SentenceTransformer, CrossEncoder, util

nlp = spacy.load("en_core_web_sm")
st_model = SentenceTransformer("all-MiniLM-L6-v2")
nli_model = CrossEncoder("cross-encoder/nli-deberta-v3-base")


def extract_technical_keywords(text: str) -> set:
    doc = nlp(text.lower())

    spacy_kw = {
        token.lemma_ for token in doc
        if not token.is_stop
        and token.is_alpha
        and token.pos_ in {"NOUN", "VERB", "PROPN", "ADJ"}
    }

    codes = set(re.findall(r'\b[1-5](?:xx|\d{2})\b', text))
    acronyms = {a.lower() for a in re.findall(r'\b[A-Z]{2,}\b', text)}

    return spacy_kw | codes | acronyms


def check_contradiction(candidate: str, reference: str) -> float:
    scores = nli_model.predict([(candidate, reference)])
    # scores[0] is [contradiction, neutral, entailment]
    contradiction_score = float(scores[0][0])
    return contradiction_score


def score_answer(candidate: str, reference: str, forced_keywords: list = []) -> dict:
    # Component 1: semantic similarity
    embeddings = st_model.encode([candidate, reference])
    semantic = util.cos_sim(embeddings[0], embeddings[1]).item()

    # Component 2: keyword coverage
    if forced_keywords:
        candidate_lower = candidate.lower()
        matched = [kw for kw in forced_keywords if kw.lower() in candidate_lower]
        missed = [kw for kw in forced_keywords if kw.lower() not in candidate_lower]
        kw_score = len(matched) / len(forced_keywords) if forced_keywords else 1.0
    else:
        ref_kw = extract_technical_keywords(reference)
        cand_kw = extract_technical_keywords(candidate)
        matched = list(ref_kw & cand_kw)
        missed = list(ref_kw - cand_kw)
        kw_score = len(matched) / len(ref_kw) if ref_kw else 1.0

    # Component 3: contradiction check
    contradiction = check_contradiction(candidate, reference)

    # Final weighted score
    final = (0.45 * semantic) + (0.55 * kw_score)
    final = round(final, 4)

    # Determine label
    # Hard override 1 — strong contradiction detected
    if contradiction > 0.7:
        label = "Incorrect"
    # Hard override 2 — very low keyword coverage
    elif kw_score < 0.30:
        label = "Incorrect"
    elif final >= 0.75:
        label = "Correct"
    elif final >= 0.50:
        label = "Partial"
    else:
        label = "Incorrect"

    return {
        "semantic_score": round(semantic, 4),
        "keyword_coverage": round(kw_score, 4),
        "contradiction_score": round(contradiction, 4),
        "final_score": final,
        "label": label,
        "matched_keywords": matched,
        "missed_keywords": missed
    }