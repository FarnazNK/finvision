"""Pydantic schemas.

These intentionally mirror the frontend portfolio payload while also defining
stable contracts for the document-grounded Research Assistant.
"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

AssetClass = Literal["equity", "fixed_income", "cash", "alternative", "crypto"]
TxnType = Literal["buy", "sell", "dividend", "deposit", "withdrawal", "fee"]
TxnStatus = Literal["settled", "pending", "failed"]


class Holding(BaseModel):
    id: str
    symbol: str
    name: str
    assetClass: AssetClass
    quantity: float
    costBasis: float
    price: float
    dayChangePct: float
    currency: str = "USD"


class Transaction(BaseModel):
    id: str
    date: str
    type: TxnType
    symbol: Optional[str] = None
    description: str
    amount: float
    currency: str = "USD"
    status: TxnStatus


class PortfolioSnapshot(BaseModel):
    """The context the client sends so answers are grounded in this account."""

    holdings: list[Holding] = Field(default_factory=list)
    transactions: list[Transaction] = Field(default_factory=list)
    baseCurrency: str = "USD"


class InsightsRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    portfolio: PortfolioSnapshot


class AuthenticatedInsightsRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)


class Citation(BaseModel):
    """Which holdings, transactions, or documents grounded a response."""

    kind: Literal["holding", "transaction", "metric", "document"]
    ref: str
    source: Optional[str] = None


class InsightsResponse(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    model: str


class ResearchDocument(BaseModel):
    documentId: str = Field(..., min_length=1, max_length=200)
    title: str = Field(..., min_length=1, max_length=300)
    sourceUrl: str = Field(..., min_length=1, max_length=2000)
    symbol: Optional[str] = Field(default=None, max_length=20)
    publishedAt: Optional[str] = None
    text: str = Field(..., min_length=1, max_length=100_000)


class ResearchIngestRequest(BaseModel):
    document: ResearchDocument


class ResearchIngestResponse(BaseModel):
    documentId: str
    chunksCreated: int


class ResearchRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    symbol: Optional[str] = Field(default=None, max_length=20)
    limit: int = Field(default=5, ge=1, le=10)


class ResearchCitation(BaseModel):
    chunkId: str
    documentId: str
    title: str
    sourceUrl: str
    score: float
    excerpt: str


class ResearchResponse(BaseModel):
    answer: str
    citations: list[ResearchCitation] = Field(default_factory=list)
    model: str = "retrieval-only"


class MarketQuote(BaseModel):
    symbol: str
    current: float
    change: float
    changePercent: float
    high: float
    low: float
    open: float
    previousClose: float
    timestamp: int


class MarketCandle(BaseModel):
    symbol: str
    resolution: str
    timestamps: list[int]
    open: list[float]
    high: list[float]
    low: list[float]
    close: list[float]
    volume: list[float]
    status: str


class MarketSearchResult(BaseModel):
    symbol: str
    description: str
    type: str
    exchange: Optional[str] = None


class MarketSearchResponse(BaseModel):
    results: list[MarketSearchResult]


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=320)
    password: str = Field(..., min_length=12, max_length=128)


class LoginRequest(RegisterRequest):
    pass


class AuthResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str


class HoldingCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=200)
    assetClass: AssetClass = "equity"
    quantity: float = Field(..., gt=0)
    costBasis: float = Field(..., ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)


class HoldingResponse(HoldingCreate):
    id: int
    price: float = 0
    dayChangePct: float = 0