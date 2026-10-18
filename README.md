# FinVision

> **FinVision at a glance:** A React/TypeScript portfolio workspace with Redux Toolkit state, Recharts visualizations, responsive navigation, holdings/transactions/watchlist views, and a Python/FastAPI backend for authenticated portfolios, market data, and AI-assisted analysis.
>
> **Try it:** [Live dashboard](https://farnaznk.github.io/finvision/) · [API docs](https://finvision-api.vercel.app/docs) · [Frontend source](src/) · [Backend source](ai-service/)
>
> **Engineering highlights:** Typed React components and reusable UI primitives; interactive performance/allocation charts; deterministic portfolio calculations exposed as AI tools; JWT and user-scoped data APIs; Jest/React Testing Library and pytest.
>
> **Demo boundaries:** The public dashboard may show seeded holdings and simulated price ticks. External quotes and model responses depend on configuration. This is not investment advice.
>
> **Where to look:** `src/pages/OverviewPage.tsx` (dashboard), `src/components/layout/AppShell.tsx` (responsive navigation), `src/components/charts/` (data visualization), `ai-service/` (API and AI).


## Prometheus & Grafana — free local monitoring

The optional [Prometheus and Grafana Kubernetes add-on](k8s/MONITORING.md) collects application HTTP metrics and provides dashboards on a **localhost-only kind cluster**, with no AWS costs. Prometheus and Grafana run as private ClusterIP Services, and Grafana's admin password is created as a Kubernetes Secret. CI validates the manifests; this is a locally runnable portfolio setup, **not** a live production monitoring deployment.


## Kubernetes container orchestration (free local demo)

The Docker images for FinVision can also be managed with **Kubernetes on your laptop using kind**. This is optional: Docker Compose and the existing APIs continue to work as before. The `k8s/local.yaml` example defines Kubernetes Deployments and internal ClusterIP Services, a local PostgreSQL persistent volume, resource limits, and external runtime-generated Secret references. No AWS account, managed Kubernetes service, or paid cloud resource is needed.

Follow the setup and cleanup instructions in **[k8s/README.md](k8s/README.md)**. Kubernetes manifests are checked by a dedicated GitHub Actions validation workflow. This is a **local demonstration**, not a tested production or public cluster deployment.


## GraphQL portfolio API (read-only)

FinVision keeps its existing **REST** endpoints for account management, portfolio changes and market data. An additional typed **GraphQL** API at `POST /api/graphql` demonstrates flexible dashboard field selection. It requires an authenticated user and applies the existing rate limit; resolvers only return holdings owned by that user. The endpoint is read-only and does not expose investment execution or cost-basis information. The demo rejects mutation operations, introspection, fragments, oversized requests and multi-root requests, and caps the holdings result at 50 items.

```bash
cd ai-service
pip install -r requirements-dev.txt
pytest tests/test_graphql.py -q
```

Example with your login token:

```bash
curl -X POST http://localhost:8000/api/graphql \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ holdings(limit: 10) { symbol name assetClass currency } }"}'
```

**No AWS or paid services are required.** The GraphQL API is an additive read-only portfolio feature; the existing REST API remains the primary application contract.


## AWS AgentCore — free portfolio demo

An **optional, disabled-by-default** read-only portfolio assistant demonstrates an authenticated FastAPI integration with a mockable AgentCore runtime. The endpoint only reads holdings owned by the signed-in user and limits model context to asset names/symbols; it does not place trades or transmit balances or cost basis. The live dashboard and hosted API do **not** use AWS AgentCore unless explicitly configured.

Run the offline demonstration without AWS credentials or charges:

```bash
python aws_agentcore/demo_offline.py
```

Tests: `python -m pytest aws_agentcore/test_agentcore_readonly.py -q` (with the backend's test dependencies). See [`aws_agentcore/PORTFOLIO.md`](aws_agentcore/PORTFOLIO.md) for design, access controls and deployment limitations. Live AWS integration has not been deployed or verified.


**AI-assisted portfolio intelligence**

### Technology stack

**Frontend**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white) ![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-764ABC?logo=redux&logoColor=white) ![React Router](https://img.shields.io/badge/React_Router-CA4245?logo=reactrouter&logoColor=white) ![styled-components](https://img.shields.io/badge/styled--components-DB7093?logo=styledcomponents&logoColor=white) ![Recharts](https://img.shields.io/badge/Recharts-8884D8)

**Backend & database**

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white) ![Pydantic](https://img.shields.io/badge/Pydantic-E92063?logo=pydantic&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white) ![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00) ![JWT](https://img.shields.io/badge/JWT-Authentication-444444?logo=jsonwebtokens&logoColor=white)

**AI, testing & delivery**

![Anthropic](https://img.shields.io/badge/Anthropic-Optional-191919?logo=anthropic&logoColor=white) ![Finnhub](https://img.shields.io/badge/Finnhub-Optional-4E8D7C) ![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white) ![nginx](https://img.shields.io/badge/nginx-009639?logo=nginx&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=githubactions&logoColor=white) ![Jest](https://img.shields.io/badge/Jest-C21325?logo=jest&logoColor=white) ![pytest](https://img.shields.io/badge/pytest-0A9EDC?logo=pytest&logoColor=white)

[![CI](https://github.com/FarnazNK/finvision/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/FarnazNK/finvision/actions/workflows/ci.yml)

FinVision is a full-stack financial analytics project exploring **reliable backend services**, **deterministic portfolio calculations**, and **AI-assisted research**. It combines a responsive portfolio dashboard with authenticated APIs and explainable AI responses.

> **Demo transparency:** The public dashboard can use simulated portfolio prices. External market quotes depend on provider configuration and availability, and should not be treated as guaranteed real-time prices. FinVision is a portfolio engineering project, not an investment-advice service.

## Project links

| Explore | Link |
| --- | --- |
| Live dashboard | [FinVision](https://farnaznk.github.io/finvision/) |
| FastAPI backend implementation | [Backend source](./ai-service/) |
| Hosted API documentation | [OpenAPI / Swagger UI](https://finvision-api.vercel.app/docs) |

The backend lives **in this repository** under `ai-service/`, alongside the React frontend. It implements HTTP endpoints, JWT authentication, and SQLAlchemy models for users and holdings. **Database configuration:** local development defaults to SQLite; the documented Vercel deployment is configured to use **Neon PostgreSQL** through the server-side `DATABASE_URL` environment variable. The frontend and API are deployed separately. This describes the documented deployment configuration, not an independently verified live database connection.

**Data transparency:** The demo dashboard may use seeded holdings and simulated price ticks. External quotes depend on optional provider configuration and may be delayed. Simulated portfolio data does not mean the backend is mocked.

## Engineering highlights

### Backend engineering

- **FastAPI and Pydantic:** Defined HTTP contracts for authentication, portfolios, market quotes, AI insights, and research.
- **PostgreSQL and SQLAlchemy:** Persist users and holdings, with user-scoped portfolio reads and writes.
- **JWT authentication:** Password hashing, signed access tokens, and authenticated portfolio endpoints.
- **Market-data integration:** Optional server-side Finnhub adapter, bounded request timeouts, input validation, and in-process caching.
- **Testing and delivery:** pytest, Docker, GitHub Actions, and container builds.

### Applied AI

- **Grounded portfolio insights:** AI interpretation uses supplied portfolio snapshots and deterministic calculation tools rather than model-invented arithmetic.
- **Source-aware retrieval:** Research documents are chunked and ranked; retrieval responses include source URLs and chunk identifiers.
- **Graceful fallback:** A deterministic response keeps core insights demonstrable without an external model provider.
- **Honest boundaries:** Research retrieval currently uses an in-memory prototype; document persistence, tenant isolation, and production-grade retrieval evaluation require further work.

### Frontend

- **React + TypeScript:** Vite, Redux Toolkit, React Router, and styled-components.
- **Financial visualizations:** Portfolio KPIs, performance charts, asset allocation, holdings, transactions, and watchlists.
- **AI assistant interface:** Natural-language questions about the displayed portfolio.
- **Responsive layout:** Desktop and mobile navigation with accessible interface components.

## Architecture

FinVision separates the static React dashboard from its Python API. The diagram distinguishes **implemented components** (solid links) from **planned infrastructure** (dashed links).

```mermaid
flowchart TB
    subgraph Client["Frontend · GitHub Pages"]
        Pages["React 18 / TypeScript / Vite"]
        Store["Redux Toolkit · portfolio + UI state"]
        Charts["Recharts · KPIs / performance / allocation"]
        InsightsUI["Portfolio insights interface"]
        Demo["Seeded holdings + simulated market ticks"]
        Pages --> Store
        Store --> Charts
        Store --> InsightsUI
        Demo --> Store
    end

    subgraph Backend["FastAPI service · Vercel"]
        API["HTTP API · Pydantic validation"]
        Auth["Register / login / JWT auth"]
        Holdings["User-scoped holdings API"]
        Market["Market quotes / history / symbol search"]
        Insights["AI insights orchestration"]
        Analytics["Deterministic portfolio analytics tools"]
        Research["Research ingest + ranked retrieval"]
        Obs["Request metrics + rate limiting"]
        API --> Auth
        API --> Holdings
        API --> Market
        API --> Insights
        Insights --> Analytics
        API --> Research
        API --> Obs
    end

    subgraph Persistence["Data & external dependencies"]
        SQL[("SQLAlchemy / PostgreSQL · users + holdings")]
        Finnhub["Finnhub API · optional"]
        Anthropic["Anthropic model · optional"]
        Docs[("In-memory document chunks")]
    end

    subgraph Future["Planned; not currently deployed"]
        Vector[("Tenant-scoped pgvector")]
        Blob[("Durable document storage")]
        Cache[("Shared cache / jobs")]
    end

    Pages -->|"HTTPS API requests"| API
    InsightsUI -->|"Portfolio snapshot + question"| Insights
    Auth --> SQL
    Holdings --> SQL
    Market -->|"Server-side provider request"| Finnhub
    Insights -->|"Optional model + tool calls"| Anthropic
    Research --> Docs
    Research -.-> Vector
    Research -.-> Blob
    API -.-> Cache
```

### Frontend and data flow

The frontend is a Vite-built single-page application with React Router, Redux Toolkit, styled-components, and Recharts. Redux-backed demo holdings and simulated ticks drive the dashboard; they should **not** be confused with exchange-verified live prices. The backend's user-scoped holdings API is separate from those browser-generated demo values.

### Authentication and persistence

The backend uses FastAPI/Pydantic contracts, password hashing, JWT access tokens, SQLAlchemy models, and user-scoped database queries. It supports local SQLite configuration and PostgreSQL for hosted deployments. Authorization is implemented on authenticated holdings endpoints; this does **not** imply all research data is tenant-isolated.

### Market data and AI

- The optional Finnhub adapter requests quotes, candles, and symbol search from the backend with timeout handling and a small in-process cache. Provider availability and quote freshness are not guaranteed.
- The portfolio insights endpoint accepts a **caller-supplied portfolio snapshot**, runs deterministic analytics, and can use an optional Anthropic model for natural-language interpretation and tool calls. Without its API key, the service uses a deterministic fallback. The server does **not yet** derive that snapshot from the authenticated user's holdings.
- The research prototype chunks documents and returns ranked excerpts with source metadata. Storage is **in memory**, not durable or tenant-isolated. A production retrieval system would need access controls, persistent ingestion, embeddings/vector search, and retrieval evaluation.

### Operations and boundaries

Docker and nginx provide containerized application packaging; GitHub Actions runs frontend and backend checks. The deployed demo uses GitHub Pages for its frontend and Vercel for its API. PostgreSQL is a runtime dependency for the configured hosted backend; Redis, pgvector, and object storage in the diagram are **future integrations**, not deployed features.


## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Redux Toolkit, styled-components, Recharts |
| Backend | Python, FastAPI, Pydantic, SQLAlchemy, PostgreSQL |
| AI | Anthropic integration (optional), deterministic analytics, document retrieval |
| Testing | Jest, React Testing Library, pytest |
| Delivery | Docker, GitHub Actions, GitHub Pages, Vercel |

## Current limitations and next steps

FinVision is a portfolio project with a deployed demo, **not a claim of production-grade investment infrastructure**.

- Quotes are provider-dependent; simulated values remain in the demo.
- AI portfolio questions use a caller-supplied snapshot; authenticated server-derived snapshots are a future security improvement.
- Research documents are not yet durable or tenant-isolated.
- Planned work includes secure persistent retrieval, expanded retrieval and grounding evaluations, provider data freshness, and distributed observability.

## Repository guide

- [Backend and AI service](./ai-service/)
- [Frontend source](./src/)
- [Security policy](./SECURITY.md)
- [CI workflow](./.github/workflows/ci.yml)

For developer-focused installation details, consult the service documentation and project configuration files. **Never commit passwords, tokens, private keys, or populated environment files.** Configure secrets only in the deployment environment; rotate any credentials that have ever been exposed.

---

Built to demonstrate practical full-stack, backend, and applied-AI engineering.
