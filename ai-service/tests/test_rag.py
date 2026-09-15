from app.main import app, retriever
from app.rag import Document, InMemoryRetriever, chunk_document
from fastapi.testclient import TestClient

client = TestClient(app)


def test_chunk_document_preserves_metadata_and_overlap():
    document = Document(
        document_id="nvda-10k",
        title="NVIDIA annual report",
        source_url="https://example.test/nvda-10k",
        symbol="NVDA",
        published_at="2026-01-01",
        text="one two three four five six seven eight nine ten",
    )
    chunks = chunk_document(document, max_words=6, overlap=2)
    assert len(chunks) == 3
    assert chunks[0].symbol == "NVDA"
    assert chunks[0].source_url == document.source_url
    assert "five six" in chunks[1].text


def test_retriever_ranks_matching_symbol_and_terms():
    store = InMemoryRetriever()
    store.add_document(Document(
        document_id="a", title="NVIDIA risk factors", source_url="https://a",
        symbol="NVDA", published_at=None,
        text="NVIDIA identifies supply chain and semiconductor manufacturing risks.",
    ))
    store.add_document(Document(
        document_id="b", title="Other company", source_url="https://b",
        symbol="ABC", published_at=None,
        text="The company discusses unrelated revenue trends.",
    ))
    results = store.search("What supply chain risks did NVIDIA discuss?", symbol="NVDA")
    assert results
    assert results[0].chunk.document_id == "a"


def test_research_ingest_and_query_returns_citations(monkeypatch):
    monkeypatch.setenv("FINVISION_API_KEY", "test-api-key")
    headers = {"Authorization": "Bearer test-api-key"}
    payload = {
        "document": {
            "documentId": "aapl-report",
            "title": "Apple annual report",
            "sourceUrl": "https://example.test/aapl",
            "symbol": "AAPL",
            "publishedAt": "2026-01-01",
            "text": "Apple describes services growth and supply chain risks.",
        }
    }
    ingest = client.post("/api/research/ingest", json=payload, headers=headers)
    assert ingest.status_code == 200
    assert ingest.json()["chunksCreated"] == 1

    response = client.post(
        "/api/research",
        json={"question": "What supply chain risks are described?", "symbol": "AAPL"},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["citations"][0]["documentId"] == "aapl-report"
    assert body["citations"][0]["sourceUrl"] == "https://example.test/aapl"