"""Builds a signed-in user's portfolio snapshot on the server.

The dashboard and the AI assistant both read this snapshot, so the numbers a
user sees and the numbers the model reasons over always come from the same
place: the user's saved holdings, priced here. The browser can't substitute
its own figures.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Protocol

from sqlalchemy import select

from .market_data import MarketDataError
from .persistence import HoldingRecord, SessionLocal
from .schemas import Holding, PortfolioSnapshotResponse, PriceSource

MAX_HOLDINGS = 200


class QuoteSource(Protocol):
    def quote(self, symbol: str) -> dict: ...


def _market_price(quotes: QuoteSource, symbol: str) -> tuple[float, float] | None:
    """Return (price, day change as a decimal), or None when no usable quote."""
    try:
        data = quotes.quote(symbol)
    except (MarketDataError, ValueError):
        return None
    price = data.get("c")
    if not isinstance(price, (int, float)) or price <= 0:
        # Finnhub returns c=0 for unknown symbols rather than an error.
        return None
    change_pct = data.get("dp")
    day_change = float(change_pct) / 100 if isinstance(change_pct, (int, float)) else 0.0
    return float(price), day_change


def build_user_snapshot(
    user_id: int, quotes: QuoteSource, base_currency: str = "USD"
) -> PortfolioSnapshotResponse:
    with SessionLocal() as session:
        records = session.scalars(
            select(HoldingRecord)
            .where(HoldingRecord.user_id == user_id)
            .order_by(HoldingRecord.id)
            .limit(MAX_HOLDINGS)
        ).all()

    holdings: list[Holding] = []
    priced_from_market = 0
    for record in records:
        cost_basis = Decimal(record.cost_basis)
        quote = None if record.asset_class == "cash" else _market_price(quotes, record.symbol)
        if quote is None:
            # Without a live quote, value the position at cost so totals stay
            # meaningful and the response says so via priceSource.
            price, day_change = float(cost_basis), 0.0
        else:
            price, day_change = quote
            priced_from_market += 1
        holdings.append(
            Holding(
                id=str(record.id),
                symbol=record.symbol,
                name=record.name,
                assetClass=record.asset_class,  # type: ignore[arg-type]
                quantity=float(record.quantity),
                costBasis=float(cost_basis),
                price=price,
                dayChangePct=day_change,
                currency=record.currency,
            )
        )

    source: PriceSource
    if not holdings:
        source = "empty"
    elif priced_from_market == len(holdings):
        source = "market"
    elif priced_from_market == 0:
        source = "cost_basis"
    else:
        source = "mixed"

    return PortfolioSnapshotResponse(
        holdings=holdings,
        transactions=[],
        baseCurrency=base_currency,
        priceSource=source,
    )
