"""FastAPI entrypoint for FinVision's AI insights service."""
from __future__ import annotations

import os
import time
from collections import defaultdict, deque

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .llm import generate_insight
from .schemas import InsightsRequest, InsightsResponse

app = FastAPI(title="FinVision AI Service", version="1.0.0")

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


def authorize(authorization: str | None = Header(default=None)) -> None:
    configured_key = os.getenv("FINVISION_API_KEY", "")
    if configured_key and authorization != f"Bearer {configured_key}":
        raise HTTPException(status_code=401, detail="Invalid API key")


def enforce_rate_limit(request: Request) -> None:
    now = time.monotonic()
    window = _requests[request.client.host if request.client else "unknown"]
    while window and now - window[0] >= 60:
        window.popleft()
    limit = int(os.getenv("FINVISION_RATE_LIMIT", "30"))
    if len(window) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    window.append(now)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/insights", response_model=InsightsResponse)
def insights(
    req: InsightsRequest,
    _: None = Depends(authorize),
    __: None = Depends(enforce_rate_limit),
) -> InsightsResponse:
    return generate_insight(req.question, req.portfolio)
