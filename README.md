# FinVision

**AI-assisted portfolio intelligence · React · TypeScript · FastAPI · PostgreSQL**

[Live dashboard](https://farnaznk.github.io/finvision/) · **[Backend source (FastAPI)](./ai-service/app/main.py)** · [Backend directory](./ai-service/) · [API documentation](https://finvision-api.vercel.app/docs) · [API health](https://finvision-api.vercel.app/health)

[![CI](https://github.com/FarnazNK/finvision/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/FarnazNK/finvision/actions/workflows/ci.yml)

FinVision is a full-stack financial analytics project exploring **reliable backend services**, **deterministic portfolio calculations**, and **AI-assisted research**. It combines a responsive portfolio dashboard with authenticated APIs and explainable AI responses.

> **Demo transparency:** The public dashboard can use simulated portfolio prices. External market quotes depend on provider configuration and availability, and should not be treated as guaranteed real-time prices. FinVision is a portfolio engineering project, not an investment-advice service.

## Where is the backend?

**The backend is in this same repository, not a separate repo.** Its source lives in [`ai-service/`](./ai-service/). Start with the [FastAPI application and routes](./ai-service/app/main.py), [JWT authentication](./ai-service/app/security.py), [SQLAlchemy user/holding persistence](./ai-service/app/persistence.py), and [backend tests](./ai-service/tests/). The hosted API is deployed separately from the static frontend, at [finvision-api.vercel.app](https://finvision-api.vercel.app/docs).

**What is mocked versus real?** Portfolio dashboard demo holdings and price ticks can be **simulated**; that does **not** mean the backend is mocked or absent. The backend implements real HTTP endpoints, JWT authentication, and SQLAlchemy storage, with PostgreSQL configured for the hosted deployment. External market quotes require an optional Finnhub key; the app must not present demo prices as guaranteed live market data. AI model responses likewise depend on optional provider configuration and can use a deterministic fallback.

## Explore the application

| Experience | Link |
| --- | --- |
| Portfolio dashboard | [Open FinVision](https://farnaznk.github.io/finvision/) |
| Public product page | [View overview](https://farnaznk.github.io/finvision/welcome) |
| Authentication | [Sign in / register](https://farnaznk.github.io/finvision/auth) |
| FastAPI source code | [Explore backend implementation](./ai-service/app/main.py) |
| Authentication and database | [JWT auth](./ai-service/app/security.py) · [SQLAlchemy models](./ai-service/app/persistence.py) |
| FastAPI endpoints | [Browse hosted API documentation](https://finvision-api.vercel.app/docs) |

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

```mermaid
flowchart LR
    UI["React / TypeScript dashboard"] --> API["FastAPI"]
    API --> AUTH["JWT authentication"]
    API --> DB[("PostgreSQL: users + holdings")]
    API --> MARKETS["Market data adapter"]
    MARKETS --> FINNHUB["Finnhub (optional)"]
    API --> AI["AI insights + calculation tools"]
    API --> RAG["Research retrieval prototype"]
    RAG --> MEMORY[("In-memory documents")]
```

Financial analytics tools in the backend use deterministic calculations, but **the frontend dashboard also calculates values from its current portfolio state**. The seeded/demo portfolio and simulated market ticks are not verified market prices. Hosted AI is optional; provider quotes, persisted user holdings, and demo data are distinct sources.

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
