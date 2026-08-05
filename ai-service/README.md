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
| POST   | `/api/insights` | `{question, portfolio}` → grounded answer|
