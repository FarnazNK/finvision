from fastapi.testclient import TestClient
from app.main import app
from app import sec_edgar

client = TestClient(app)


def test_sec_filings_source_and_cache(monkeypatch):
    monkeypatch.setenv("FINVISION_SEC_USER_AGENT", "FinVision Research contact@example.org")
    sec_edgar._cache.clear()
    calls = []

    class Response:
        def raise_for_status(self): pass
        def json(self):
            return {"name": "Example Inc", "filings": {"recent": {
                "form": ["10-Q", "4", "10-K"],
                "filingDate": ["2026-09-01", "2026-08-01", "2026-01-01"],
                "accessionNumber": ["0000000000-26-000001"] * 3,
                "primaryDocument": ["report.htm"] * 3,
            }}}

    def fake_get(url, **kwargs):
        calls.append((url, kwargs))
        return Response()

    monkeypatch.setattr(sec_edgar.httpx, "get", fake_get)
    first = client.get("/api/research/sec-filings?cik=320193")
    assert first.status_code == 200
    assert first.json()["source"] == "SEC EDGAR"
    assert len(first.json()["filings"]) == 2
    assert first.json()["filings"][0]["form"] == "10-Q"
    assert client.get("/api/research/sec-filings?cik=0000320193").status_code == 200
    assert len(calls) == 1
    assert calls[0][1]["headers"]["User-Agent"].endswith("@example.org")


def test_sec_rejects_invalid_cik_and_requires_contact(monkeypatch):
    assert client.get("/api/research/sec-filings?cik=../../secret").status_code == 422
    monkeypatch.delenv("FINVISION_SEC_USER_AGENT", raising=False)
    assert client.get("/api/research/sec-filings?cik=320193").status_code == 503
