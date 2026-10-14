import pytest

from app.rag import Document, InMemoryRetriever
from app.retrieval_eval import EvalCase, evaluate, load_fixture
from pathlib import Path


def test_retrieval_baseline_fixture():
    store, cases = load_fixture(Path(__file__).resolve().parents[1] / "evals" / "retrieval_baseline.json")
    result = evaluate(store, cases, k=3)
    assert result.cases == 3
    assert result.recall_at_k == 1.0
    assert result.mrr_at_k == 1.0


def test_ranking_metrics_penalize_misses_and_late_hits():
    store = InMemoryRetriever()
    store.add_document(Document("irrelevant", "alpha beta", "https://example.test/a", None, None, "alpha beta"))
    store.add_document(Document("relevant", "alpha", "https://example.test/b", None, None, "alpha"))
    result = evaluate(store, [EvalCase("alpha beta", ("relevant",))], k=2)
    assert result.recall_at_k == 1.0
    assert result.mrr_at_k == 0.5
    assert evaluate(store, [EvalCase("alpha beta", ("relevant",))], k=1).recall_at_k == 0.0


@pytest.mark.parametrize("cases,k", [([], 3), ([EvalCase("test", ("x",))], 0), ([EvalCase("test", ())], 2)])
def test_invalid_evaluations_rejected(cases, k):
    with pytest.raises(ValueError):
        evaluate(InMemoryRetriever(), cases, k=k)
