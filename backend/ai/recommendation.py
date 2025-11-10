"""Lightweight recommendation placeholder.

Uses sentence-transformers embeddings (install optional dependency) to find similar activities.
Falls back to simple keyword overlap if model not available.
"""

from typing import List

try:
    from sentence_transformers import SentenceTransformer, util  # type: ignore
    _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
except Exception:  # pragma: no cover
    _MODEL = None

KEYWORD_SPLIT_CHARS = [',', ';', '\n']


def _keywords(text: str) -> List[str]:
    for ch in KEYWORD_SPLIT_CHARS:
        text = text.replace(ch, ' ')
    return [w.lower() for w in text.split() if len(w) > 3]


def similar_titles(title: str, candidates: List[str], top_k: int = 5) -> List[str]:
    if _MODEL:
        query_vec = _MODEL.encode(title, convert_to_tensor=True)
        cand_vecs = _MODEL.encode(candidates, convert_to_tensor=True)
        scores = util.cos_sim(query_vec, cand_vecs)[0]
        paired = list(zip(candidates, scores.tolist()))
        paired.sort(key=lambda x: x[1], reverse=True)
        return [p[0] for p in paired[:top_k]]
    # Fallback: keyword overlap
    query_kw = set(_keywords(title))
    scored = []
    for c in candidates:
        overlap = len(query_kw.intersection(_keywords(c)))
        scored.append((c, overlap))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [c for c, _ in scored[:top_k]]
