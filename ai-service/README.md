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
export ANTHROPIC_API_KEY="<your-api-key>"  # optional; omit for offline mode
export FINVISION_JWT_SECRET="<local-development-secret>"
uvicorn app.main:app --reload               # http://localhost:8000/docs
pytest                                      # tests
```

## Endpoints

| Method | Path            | Description                              |
|--------|-----------------|------------------------------------------|
| GET    | `/health`       | Liveness probe                           |
Key APIs include authentication and user-scoped portfolios, market-data
retrieval, grounded AI insights, document retrieval with citations, and health
checks. Internal metrics are protected and omitted from the public API schema.

Market endpoints keep the Finnhub credential on the server and cache responses
in-process to avoid repeated provider requests. Set `FINNHUB_API_KEY` before
starting the service. The API returns `503` when the key is not configured, so
local development remains explicit rather than silently showing fake provider data.

## Persistence and authentication

Set `DATABASE_URL` to a PostgreSQL connection string in deployed environments.
The local default is SQLite so the API can be tested without external services.
Users authenticate with a short-lived JWT issued by `/api/auth/login`; portfolio
queries derive ownership from that token and never accept a browser-supplied
`user_id`. `FINVISION_JWT_SECRET` is required; use a long random value outside
tests. Deployed environments must also set `FINVISION_API_KEY` for demo API
authentication and `FINVISION_METRICS_KEY` for internal metrics access.

## Research Assistant and RAG seam

The Research Assistant provides a document-grounded retrieval path separate from portfolio analytics. `app/rag.py` performs bounded overlapping chunking, preserves document metadata, and exposes a `Retriever` protocol. The current `InMemoryRetriever` is deterministic for demos and CI; a production deployment can replace it with a PostgreSQL/pgvector implementation without changing the API schemas.

Every result includes the document URL, chunk ID, retrieval score, and excerpt so answers can be audited. Before production use, add authenticated per-user document ownership, durable storage, embedding generation, pgvector indexing, ingestion workers, and retrieval/grounding evaluation datasets.