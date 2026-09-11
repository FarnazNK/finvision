# FinVision AI Service

FastAPI microservice powering FinVision's **Portfolio Insights** — a grounded,
tool-using LLM assistant that answers natural-language questions about a user's
holdings and transactions.

## Why it's built this way

- **Tool use, not hallucinated math.** The model calls deterministic analytics
  functions (`app/analytics.py`) via Anthropic function calling; financial
  figures are computed in Python and only *reasoned about* by the model.
- **Grounded + auditable.** Every response carries `citations` pointing at the
  metrics/records that produced it.
- **Runs offline.** Without `ANTHROPIC_API_KEY`, `/api/insights` returns a
  deterministic templated answer, so demos and CI need no network or secrets.

## Run

```bash
pip install -r requirements-dev.txt
export ANTHROPIC_API_KEY=sk-...        # optional; omit for offline mode
uvicorn app.main:app --reload          # http://localhost:8000/docs
pytest                                 # tests
```

## Endpoints

| Method | Path            | Description                              |
|--------|-----------------|------------------------------------------|
| GET    | `/health`       | Liveness probe                           |
| GET    | `/metrics`       | Lightweight request counters for monitoring |
| POST   | `/api/insights` | `{question, portfolio}` → grounded answer|
| GET    | `/api/markets/quote?symbol=AAPL` | Current quote from Finnhub |
| GET    | `/api/markets/history?symbol=AAPL&start=...&end=...` | Historical candles |
| GET    | `/api/markets/search?q=apple` | Symbol search |
| POST   | `/api/auth/register` | Create a user account |
| POST   | `/api/auth/login` | Issue a short-lived access token |
| GET    | `/api/auth/me` | Return the authenticated user |
| GET    | `/api/portfolio/holdings` | List the authenticated user's holdings |
| POST   | `/api/portfolio/holdings` | Add a holding to the authenticated user's portfolio |
| POST   | `/api/research/ingest` | Index a document into the retrieval store |
| POST   | `/api/research` | Retrieve relevant passages with citations |

Market endpoints keep the Finnhub credential on the server and cache responses
in-process to avoid repeated provider requests. Set `FINNHUB_API_KEY` before
starting the service. The API returns `503` when the key is not configured, so
local development remains explicit rather than silently showing fake provider data.

## Persistence and authentication

Set `DATABASE_URL` to a PostgreSQL connection string in deployed environments.
The local default is SQLite so the API can be tested without external services.
Users authenticate with a short-lived JWT issued by `/api/auth/login`; portfolio
queries derive ownership from that token and never accept a browser-supplied
`user_id`. Set `FINVISION_JWT_SECRET` to a long random value in production.

## Research Assistant and RAG seam

The Research Assistant provides a document-grounded retrieval path separate from portfolio analytics. `app/rag.py` performs bounded overlapping chunking, preserves document metadata, and exposes a `Retriever` protocol. The current `InMemoryRetriever` is deterministic for demos and CI; a production deployment can replace it with a PostgreSQL/pgvector implementation without changing the API schemas.

Example workflow:

```bash
curl -X POST http://localhost:8000/api/research/ingest \
  -H 'Content-Type: application/json' \
  -d '{"document":{"documentId":"nvda-10k","title":"NVIDIA annual report","sourceUrl":"https://example.test/nvda-10k","symbol":"NVDA","text":"NVIDIA describes supply chain risks and manufacturing dependencies."}}'

curl -X POST http://localhost:8000/api/research \
  -H 'Content-Type: application/json' \
  -d '{"question":"What supply chain risks did NVIDIA discuss?","symbol":"NVDA"}'
```

Every result includes the document URL, chunk ID, retrieval score, and excerpt so answers can be audited. Before production use, add authenticated per-user document ownership, durable storage, embedding generation, pgvector indexing, ingestion workers, and retrieval/grounding evaluation datasets.