"""Pydantic schemas.

These intentionally mirror `src/types/domain.ts` on the frontend so the same
portfolio payload the React app already holds in its Redux store can be POSTed
here without a translation layer.
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
    """The context the client sends so answers are grounded in *this* account."""

    holdings: list[Holding] = Field(default_factory=list)
    transactions: list[Transaction] = Field(default_factory=list)
    baseCurrency: str = "USD"


class InsightsRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    portfolio: PortfolioSnapshot


class Citation(BaseModel):
    """Which holdings/transactions grounded a given answer, for auditability."""

    kind: Literal["holding", "transaction", "metric"]
    ref: str


class InsightsResponse(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    model: str
