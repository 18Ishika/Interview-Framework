import re
import spacy
from sentence_transformers import SentenceTransformer, util

nlp = spacy.load("en_core_web_sm")
st_model = SentenceTransformer("all-MiniLM-L6-v2")


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


def length_penalty(candidate: str, reference: str) -> float:
    ratio = len(candidate.split()) / max(len(reference.split()), 1)
    return 1.0 if ratio >= 0.3 else ratio / 0.3


def score_answer(candidate: str, reference: str, forced_keywords: list = []) -> dict:
    # Component 1: semantic similarity
    embeddings = st_model.encode([candidate, reference])
    semantic = util.cos_sim(embeddings[0], embeddings[1]).item()

    # Component 2: keyword coverage
    if forced_keywords:
        # Check if each keyword phrase appears in candidate text
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

    # Component 3: length penalty
    lp = length_penalty(candidate, reference)

    # Final weighted score
    final = (0.60 * semantic) + (0.30 * kw_score) + (0.10 * lp)
    final = round(final, 4)

    return {
        "semantic_score": round(semantic, 4),
        "keyword_coverage": round(kw_score, 4),
        "length_penalty": round(lp, 4),
        "final_score": final,
        "label": (
            "Correct" if final >= 0.75 else
            "Partial" if final >= 0.50 else
            "Incorrect"
        ),
        "matched_keywords": matched,
        "missed_keywords": missed
    }