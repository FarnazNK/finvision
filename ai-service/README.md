# FinVision AI Service

FastAPI microservice powering FinVision's **Portfolio Insights** — a grounded,
tool-using LLM assistant that answers natural-language questions about a user's
holdings and transactions.

## Why it's built this way

- **Tool use, not hallucinated math.** The model calls deterministic analytics
  functions (`app/analytics.py`) via Anthropic function calling; financial
  figures are computed in Python and only *reasoned about* by the model.
- **Guardrails in code** (`app/guardrails.py`). Advice, off-topic and
  prompt-injection questions are refused before the model is called; every
  figure in a model answer must match a tool result, or the model gets one
  retry and then the service answers deterministically.
- **Number-level citations.** Responses carry `metric` citations (tools called)
  and `figure` citations (each number in the text → tool, field, raw value),
  plus a `guardrail` field saying which path produced the answer.
- **Never a 500 from the model.** Without `ANTHROPIC_API_KEY`, and on API errors,
  timeouts or the step limit, `/api/insights` answers deterministically from the
  tool that fits the question, so demos and CI need no network or secrets.
- **Evals.** `python -m evals.run` runs 20 cases offline (in CI);
  `python -m evals.run --live` runs them against the model.

## Run

```bash
pip install -r requirements-dev.txt
export ANTHROPIC_API_KEY=sk-...        # optional; omit for offline mode
export FINVISION_MODEL=claude-sonnet-5-5  # optional; this is the default
uvicorn app.main:app --reload          # http://localhost:8000/docs
pytest                                 # tests
python -m evals.run                    # offline eval set
```

## MCP server

`app/mcp_server.py` exposes the five analytics tools to coding agents over the
Model Context Protocol, reusing `analytics.TOOLS` (no duplicated logic). It is
stateless: the agent passes the portfolio in each call. `run_mcp.py` starts it
over stdio from any directory; the repo-root `.mcp.json` registers it for
Claude Code. The MCP SDK lives in `requirements-mcp.txt`, so the deployed API
image is unchanged.

```bash
python run_mcp.py                      # stdio server, for agents
pytest tests/test_mcp_server.py        # in-process and real stdio tests
```

Setup for Claude Code and Cursor is in the [root README](../README.md#use-it-from-a-coding-agent-mcp).

## Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/health` | public | Liveness probe |
| GET | `/metrics` | service API key or JWT | JSON request counters (see note below) |
| POST | `/api/insights` | JWT or service API key; anonymous for the demo portfolio only | `{question, portfolio}` → grounded answer |
| GET | `/api/markets/quote?symbol=AAPL` | public, rate-limited | Current quote from Finnhub (503 without `FINNHUB_API_KEY`) |
| GET | `/api/markets/quotes?symbols=AAPL,VTI` | public, rate-limited | Up to 25 quotes in one request; unpriced symbols are listed in `unavailable` |
| GET | `/api/markets/history?symbol=AAPL&start=...&end=...` | public, rate-limited | Historical candles |
| GET | `/api/markets/search?q=apple` | public, rate-limited | Symbol search |
| POST | `/api/auth/register` | public, rate-limited | Create a user account |
| POST | `/api/auth/login` | public, rate-limited | Issue a short-lived access token |
| GET | `/api/auth/me` | JWT | Return the authenticated user |
| GET | `/api/portfolio/holdings` | JWT | List the authenticated user's holdings |
| POST | `/api/portfolio/holdings` | JWT | Add a holding to the authenticated user's portfolio |
| POST | `/api/graphql` | JWT | Read-only GraphQL over the user's own holdings |
| POST | `/api/research/ingest` | service API key | Index a document into the retrieval store |
| POST | `/api/research` | JWT or service API key | Retrieve relevant passages with citations |
| POST | `/api/agentcore/portfolio/ask` | JWT; 404 unless `FINVISION_ENABLE_AGENTCORE=true` | Read-only AgentCore assistant |

Auth, markets, insights, research, GraphQL and AgentCore routes go through the
per-IP rate limit (`FINVISION_RATE_LIMIT`, default 30 requests/minute, kept in
process memory); `/api/auth/me` and the holdings routes do not. Research
ingestion returns 503 unless `FINVISION_API_KEY` is set. A second, Prometheus-format `/metrics` route is defined later in
`main.py` and is shadowed by the JSON one, so Prometheus scrapes currently get a
401.

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