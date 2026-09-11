# FinVision

FinVision is an AI-assisted portfolio dashboard for monitoring holdings, market movements, transactions, allocation, and watchlists in one place. It combines a responsive React application with a FastAPI insights service that grounds answers in the portfolio snapshot supplied by the client.

> **Status:** Working prototype / portfolio project. Market data and account data are currently simulated. Review the production considerations before using the project with real financial information.

## Highlights

- Portfolio overview with value, return, day-change, allocation, and top-holdings KPIs
- Holdings, markets, transactions, and watchlist views
- Simulated live price feed with pause/resume controls and a synchronized equity curve
- Light, dark, and system theme modes
- Currency display selection and transaction search
- Accessible UI primitives with keyboard navigation, labels, focus states, and reduced-motion support
- AI portfolio insights grounded in holdings and transaction data
- Deterministic analytics tools and citations for auditable AI responses
- Offline AI fallback when no Anthropic API key is configured
- Dockerized frontend and AI service with nginx SPA routing
- Redux state persistence across browser refreshes

## Architecture

```text
React + TypeScript + Redux Toolkit
            ¦
            ¦ POST /api/insights
            ¦ question + portfolio snapshot
            ?
FastAPI + Pydantic + Anthropic SDK
            ¦
            ?
Deterministic portfolio analytics tools
```

The frontend is a Vite-built single-page application. The AI service is isolated in `ai-service/` and exposes a small HTTP API. The model may call deterministic analytics tools for portfolio calculations; it does not receive permission to invent financial figures or perform unsupported arithmetic.

See [`ai-service/README.md`](./ai-service/README.md) for service-specific details.

## Technology stack

- **Frontend:** React 18, TypeScript, Vite, Redux Toolkit, React Router, styled-components, Recharts
- **AI service:** Python 3.12, FastAPI, Pydantic v2, Anthropic SDK
- **Testing:** Jest, React Testing Library, pytest
- **Delivery:** Docker, Docker Compose, nginx
- **Quality:** TypeScript strict mode, ESLint, typed Redux hooks, CI via GitHub Actions

## Quick start

### Prerequisites

- Node.js 20 or newer
- npm
- Python 3.12 for running the service outside Docker
- Docker Desktop for the full-stack workflow

### Run with Docker Compose

The default configuration runs the web application on port `8080` and the AI service on port `8000`. Anthropic access is optional; without it, the service uses its deterministic offline response.

```bash
export ANTHROPIC_API_KEY=sk-...   # optional
export VITE_AI_SERVICE_URL=http://localhost:8000

docker compose up --build
```

Open:

- Web application: <http://localhost:8080>
- AI service health: <http://localhost:8000/health>
- Interactive API docs: <http://localhost:8000/docs>

On PowerShell:

```powershell
$env:ANTHROPIC_API_KEY = 'sk-...' # optional
$env:VITE_AI_SERVICE_URL = 'http://localhost:8000'
docker compose up --build
```

### Run the frontend locally

```bash
npm ci
npm run dev
```

The Vite development server listens on port `3000`.

### Run the AI service locally

```bash
cd ai-service
python -m venv .venv
# Activate the virtual environment using the command for your shell.
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

When running the service locally, execute commands from `ai-service` or set `PYTHONPATH` to that directory so the `app` package can be imported.

## Configuration

The frontend value `VITE_AI_SERVICE_URL` is embedded into the browser bundle at build time. Set it to the public AI service URL before building the web image.

The AI service supports these environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Enables Anthropic-backed responses | Empty / offline mode |
| `FINVISION_MODEL` | Anthropic model identifier | `claude-sonnet-5` |
| `FINVISION_ALLOWED_ORIGINS` | Comma-separated CORS origins | Local ports `3000` and `8080` |
| `FINVISION_API_KEY` | Optional bearer-token protection for `/api/insights` | Empty / disabled |
| `FINVISION_RATE_LIMIT` | Requests per client per minute | `30` |
| `FINVISION_REQUEST_TIMEOUT` | Anthropic request timeout in seconds | `20` |

**Security:** Never put a shared production secret in a `VITE_*` variable. Vite embeds those values in public browser JavaScript. Use a server-side proxy, private service networking, or user-scoped authentication for production deployments.

The web container includes an nginx `try_files` fallback, so direct navigation and browser refreshes on routes such as `/holdings`, `/markets`, and `/transactions` continue to serve the SPA entry point.

## Available scripts

```bash
npm run dev                    # Start Vite on port 3000
npm run typecheck              # TypeScript check
npm run lint                   # ESLint
npm test -- --runInBand        # Frontend tests
npm run build                  # Production frontend build
```

Backend tests:

```bash
cd ai-service
python -m pytest -v
```

## Verification checklist

Run the following before publishing a change:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
cd ai-service
python -m pytest -v
cd ..
docker compose config
docker compose build
```

For a runtime smoke test:

1. Open `/holdings` directly at `http://localhost:8080/holdings` and refresh the page.
2. Confirm `http://localhost:8000/health` returns `{"status":"ok"}`.
3. Ask a question in the Overview page's Insights panel.
4. Confirm the portfolio value and equity curve respond to live-feed ticks.

## Repository layout

```text
src/
+-- app/             Store configuration and typed Redux hooks
+-- components/      Layout, charts, and reusable UI primitives
+-- features/        Portfolio, markets, transactions, watchlist, UI, insights
+-- hooks/           Application hooks such as useMarketFeed
+-- pages/           Overview, Holdings, Markets, Transactions, Watchlist
+-- services/        Market feed, seed data, and AI client
+-- theme/           Design tokens and global styling
+-- test/            Shared test setup and rendering helpers
+-- types/           Shared domain types
+-- utils/           Formatting and responsive helpers

ai-service/
+-- app/             FastAPI entrypoint, schemas, analytics, and LLM orchestration
+-- tests/           API and analytics tests
```

## Product and production considerations

This repository intentionally uses seed holdings and a simulated market feed. A production financial product would additionally require authenticated user accounts, durable per-user storage, real market-data licensing, broker or manual holdings ingestion, subscription and billing controls, operational monitoring, privacy and terms documentation, and a professional legal/compliance review.

The insights feature is descriptive rather than a source of personalized investment advice. Do not use the prototype as a substitute for professional financial guidance.

## License

No open-source license has been declared yet. Treat the repository as all rights reserved unless the project owner adds a license.