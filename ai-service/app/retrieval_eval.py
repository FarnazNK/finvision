"""Reproducible retrieval evaluation for FinVision's deterministic RAG baseline.

Run: cd ai-service && python -m app.retrieval_eval
This is a synthetic smoke benchmark, not a claim about real-world financial QA.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

from .rag import Document, InMemoryRetriever


@dataclass(frozen=True)
class EvalCase:
    question: str
    relevant_document_ids: tuple[str, ...]
    symbol: str | None = None


@dataclass(frozen=True)
class EvalResult:
    cases: int
    recall_at_k: float
    mrr_at_k: float
    k: int


def evaluate(retriever: InMemoryRetriever, cases: list[EvalCase], k: int = 5) -> EvalResult:
    """Compute macro recall@k and mean reciprocal rank@k, bounded to [0, 1].

    Each query may have multiple relevant documents; duplicate chunks from the
    same document count only once. An empty evaluation set is an error rather
    than an accidentally perfect score.
    """
    if k < 1 or not cases:
        raise ValueError("k must be positive and cases must not be empty")

    recalls: list[float] = []
    reciprocal_ranks: list[float] = []
    for case in cases:
        relevant = set(case.relevant_document_ids)
        if not relevant:
            raise ValueError("each evaluation case needs at least one relevant document")
        results = retriever.search(case.question, symbol=case.symbol, limit=k)
        ranked_ids = list(dict.fromkeys(item.chunk.document_id for item in results))
        recalls.append(len(set(ranked_ids) & relevant) / len(relevant))
        reciprocal_ranks.append(next(
            (1 / rank for rank, document_id in enumerate(ranked_ids, 1) if document_id in relevant),
            0.0,
        ))

    return EvalResult(
        cases=len(cases),
        recall_at_k=round(sum(recalls) / len(recalls), 4),
        mrr_at_k=round(sum(reciprocal_ranks) / len(reciprocal_ranks), 4),
        k=k,
    )


def load_fixture(path: Path) -> tuple[InMemoryRetriever, list[EvalCase]]:
    """Load a versioned synthetic dataset, keeping metrics reproducible in CI."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    store = InMemoryRetriever()
    for record in payload["documents"]:
        store.add_document(Document(
            document_id=record["id"],
            title=record["title"],
            source_url=record["source_url"],
            symbol=record.get("symbol"),
            published_at=None,
            text=record["text"],
        ))
    cases = [
        EvalCase(
            question=record["question"],
            relevant_document_ids=tuple(record["relevant_document_ids"]),
            symbol=record.get("symbol"),
        )
        for record in payload["cases"]
    ]
    return store, cases


def main() -> None:
    fixture = Path(__file__).resolve().parent.parent / "evals" / "retrieval_baseline.json"
    store, cases = load_fixture(fixture)
    result = evaluate(store, cases, k=3)
    print(json.dumps(asdict(result), indent=2))
    # Fail CI on regressions relative to our versioned synthetic benchmark.
    if result.recall_at_k < 1.0 or result.mrr_at_k < 1.0:
        raise SystemExit("Retrieval baseline regression; inspect corpus and rankings")


if __name__ == "__main__":
    main()
