"""FastAPI entrypoint for FinVision's AI insights service."""
from __future__ import annotations

import hmac
import os
import time
from collections import defaultdict, deque

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .llm import generate_insight
from .market_data import FinnhubClient, MarketDataError
from .observability import RequestMetricsMiddleware, request_metrics
from .persistence import HoldingRecord, SessionLocal, UserRecord
from .rag import Document, InMemoryRetriever
from .security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from .schemas import (
    InsightsRequest,
    InsightsResponse,
    ResearchCitation,
    ResearchIngestRequest,
    ResearchIngestResponse,
    ResearchRequest,
    ResearchResponse,
    MarketCandle,
    MarketQuote,
    MarketSearchResponse,
    AuthResponse,
    HoldingCreate,
    HoldingResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)

app = FastAPI(title="FinVision AI Service", version="1.1.0")
retriever = InMemoryRetriever()
market_client = FinnhubClient()
app.add_middleware(RequestMetricsMiddleware)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FINVISION_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

_requests: dict[str, deque[float]] = defaultdict(deque)
_DUMMY_PASSWORD_HASH = hash_password("finvision-dummy-password-not-a-real-account")


def authorize(authorization: str | None = Header(default=None)) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer credential required")

    credential = authorization[7:]
    configured_key = os.getenv("FINVISION_API_KEY", "")
    if configured_key and hmac.compare_digest(credential, configured_key):
        return

    try:
        decode_access_token(credential)
    except (jwt.InvalidTokenError, RuntimeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired credential") from exc


def require_service_api_key(authorization: str | None = Header(default=None)) -> None:
    configured_key = os.getenv("FINVISION_API_KEY", "")
    if not configured_key:
        raise HTTPException(status_code=503, detail="Research ingestion is disabled")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Service API key required")
    if not hmac.compare_digest(authorization[7:], configured_key):
        raise HTTPException(status_code=401, detail="Invalid service API key")


def current_user(authorization: str | None = Header(default=None)) -> UserRecord:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    try:
        user_id = decode_access_token(authorization[7:])
    except (jwt.InvalidTokenError, RuntimeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    with SessionLocal() as session:
        user = session.get(UserRecord, user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        session.expunge(user)
        return user


def enforce_rate_limit(request: Request) -> None:
    now = time.monotonic()
    window = _requests[request.client.host if request.client else "unknown"]
    while window and now - window[0] >= 60:
        window.popleft()
    limit = int(os.getenv("FINVISION_RATE_LIMIT", "30"))
    if len(window) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    window.append(now)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {
        "name": "FinVision API",
        "status": "online",
        "health": "/health",
        "docs": "/docs",
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/metrics")
def metrics(_: None = Depends(authorize)) -> dict[str, dict[str, int]]:
    return {"requests_total": request_metrics()}


@app.post("/api/auth/register", response_model=AuthResponse, status_code=201)
def register(
    req: RegisterRequest,
    _: None = Depends(enforce_rate_limit),
) -> AuthResponse:
    email = req.email.strip().lower()
    with SessionLocal() as session:
        if session.scalar(select(UserRecord).where(UserRecord.email == email)):
            raise HTTPException(status_code=409, detail="Email is already registered")
        user = UserRecord(email=email, password_hash=hash_password(req.password))
        session.add(user)
        session.commit()
        session.refresh(user)
        return AuthResponse(accessToken=create_access_token(user.id))


@app.post("/api/auth/login", response_model=AuthResponse)
def login(
    req: LoginRequest,
    _: None = Depends(enforce_rate_limit),
) -> AuthResponse:
    with SessionLocal() as session:
        user = session.scalar(select(UserRecord).where(UserRecord.email == req.email.strip().lower()))
        password_hash = user.password_hash if user is not None else _DUMMY_PASSWORD_HASH
        password_ok = verify_password(req.password, password_hash)
        if user is None or not password_ok:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return AuthResponse(accessToken=create_access_token(user.id))


@app.get("/api/auth/me", response_model=UserResponse)
def me(user: UserRecord = Depends(current_user)) -> UserResponse:
    return UserResponse(id=user.id, email=user.email)


@app.get("/api/portfolio/holdings", response_model=list[HoldingResponse])
def list_holdings(user: UserRecord = Depends(current_user)) -> list[HoldingResponse]:
    with SessionLocal() as session:
        records = session.scalars(
            select(HoldingRecord).where(HoldingRecord.user_id == user.id).order_by(HoldingRecord.id)
        ).all()
        return [
            HoldingResponse(
                id=record.id,
                symbol=record.symbol,
                name=record.name,
                assetClass=record.asset_class,
                quantity=record.quantity,
                costBasis=record.cost_basis,
                currency=record.currency,
            )
            for record in records
        ]


@app.post("/api/portfolio/holdings", response_model=HoldingResponse, status_code=201)
def create_holding(
    req: HoldingCreate,
    user: UserRecord = Depends(current_user),
) -> HoldingResponse:
    record = HoldingRecord(
        user_id=user.id,
        symbol=req.symbol.strip().upper(),
        name=req.name.strip(),
        asset_class=req.assetClass,
        quantity=req.quantity,
        cost_basis=req.costBasis,
        currency=req.currency.upper(),
    )
    with SessionLocal() as session:
        session.add(record)
        session.commit()
        session.refresh(record)
        return HoldingResponse(
            id=record.id,
            symbol=record.symbol,
            name=record.name,
            assetClass=record.asset_class,
            quantity=record.quantity,
            costBasis=record.cost_basis,
            currency=record.currency,
        )


def _market_error(exc: MarketDataError) -> HTTPException:
    return HTTPException(status_code=503, detail=str(exc))


@app.get("/api/markets/quote", response_model=MarketQuote)
def market_quote(
    symbol: str,
    _: None = Depends(enforce_rate_limit),
) -> MarketQuote:
    try:
        data = market_client.quote(symbol)
    except (MarketDataError, ValueError) as exc:
        raise _market_error(exc) from exc
    return MarketQuote(
        symbol=symbol.strip().upper(),
        current=data.get("c", 0),
        change=data.get("d", 0),
        changePercent=data.get("dp", 0),
        high=data.get("h", 0),
        low=data.get("l", 0),
        open=data.get("o", 0),
        previousClose=data.get("pc", 0),
        timestamp=data.get("t", 0),
    )


@app.get("/api/markets/history", response_model=MarketCandle)
def market_history(
    symbol: str,
    resolution: str = "D",
    start: int = 0,
    end: int = 0,
    _: None = Depends(enforce_rate_limit),
) -> MarketCandle:
    if start <= 0 or end <= start:
        raise HTTPException(status_code=400, detail="start and end must be valid Unix timestamps")
    try:
        data = market_client.candles(symbol, resolution, start, end)
    except (MarketDataError, ValueError) as exc:
        raise _market_error(exc) from exc
    return MarketCandle(
        symbol=symbol.strip().upper(),
        resolution=resolution,
        timestamps=data.get("t", []),
        open=data.get("o", []),
        high=data.get("h", []),
        low=data.get("l", []),
        close=data.get("c", []),
        volume=data.get("v", []),
        status=data.get("s", "unknown"),
    )


@app.get("/api/markets/search", response_model=MarketSearchResponse)
def market_search(
    q: str,
    _: None = Depends(enforce_rate_limit),
) -> MarketSearchResponse:
    if not q.strip():
        raise HTTPException(status_code=400, detail="q is required")
    try:
        data = market_client.search(q)
    except MarketDataError as exc:
        raise _market_error(exc) from exc
    return MarketSearchResponse(
        results=[
            {
                "symbol": item.get("symbol", ""),
                "description": item.get("description", ""),
                "type": item.get("type", ""),
                "exchange": item.get("exchange"),
            }
            for item in data.get("result", [])
        ]
    )


@app.post("/api/insights", response_model=InsightsResponse)
def insights(
    req: InsightsRequest,
    _: None = Depends(authorize),
    __: None = Depends(enforce_rate_limit),
) -> InsightsResponse:
    return generate_insight(req.question, req.portfolio)

@app.post(
    "/api/research/ingest",
    response_model=ResearchIngestResponse,
)
@app.post(
    "/api/research/documents",
    response_model=ResearchIngestResponse,
    include_in_schema=False,
)
def ingest_research_document(
    req: ResearchIngestRequest,
    _: None = Depends(require_service_api_key),
    __: None = Depends(enforce_rate_limit),
) -> ResearchIngestResponse:
    document = Document(
        document_id=req.document.documentId,
        title=req.document.title,
        source_url=req.document.sourceUrl,
        symbol=req.document.symbol,
        published_at=req.document.publishedAt,
        text=req.document.text,
    )
    chunks_created = retriever.add_document(document)
    return ResearchIngestResponse(
        documentId=document.document_id,
        chunksCreated=chunks_created,
    )


@app.post("/api/research", response_model=ResearchResponse)
def research(
    req: ResearchRequest,
    _: None = Depends(authorize),
    __: None = Depends(enforce_rate_limit),
) -> ResearchResponse:
    matches = retriever.search(req.question, symbol=req.symbol, limit=req.limit)
    if not matches:
        return ResearchResponse(
            answer="I could not find a relevant indexed document for that question.",
        )
    citations = [
        ResearchCitation(
            chunkId=match.chunk.chunk_id,
            documentId=match.chunk.document_id,
            title=match.chunk.title,
            sourceUrl=match.chunk.source_url,
            score=round(match.score, 4),
            excerpt=match.chunk.text[:500],
        )
        for match in matches
    ]
    answer = "Relevant research passages:\n\n" + "\n\n".join(
        f"[{index}] {citation.excerpt}"
        for index, citation in enumerate(citations, start=1)
    )
    return ResearchResponse(answer=answer, citations=citations)