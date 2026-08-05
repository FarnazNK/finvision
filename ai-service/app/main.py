"""FastAPI entrypoint for FinVision's AI insights service."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .llm import generate_insight
from .schemas import InsightsRequest, InsightsResponse

app = FastAPI(title="FinVision AI Service", version="1.0.0")

# The Vite dev server runs on 5173; allow it plus a configurable prod origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/insights", response_model=InsightsResponse)
def insights(req: InsightsRequest) -> InsightsResponse:
    return generate_insight(req.question, req.portfolio)
