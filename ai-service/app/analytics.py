"""Deterministic portfolio analytics.

Two reasons this is a separate, pure-Python module rather than something the LLM
computes in its head:

1. **Correctness.** LLMs are unreliable at arithmetic over many rows. We compute
   the numbers here and let the model *reason about* them, not derive them.
2. **Grounding.** These same functions are exposed to the model as tools
   (function calling), so every figure in an answer traces back to a real
   computation over the caller's data.
"""
from __future__ import annotations

from collections import defaultdict

from .schemas import PortfolioSnapshot


def market_value(snapshot: PortfolioSnapshot) -> float:
    return sum(h.quantity * h.price for h in snapshot.holdings)


def cost_basis_total(snapshot: PortfolioSnapshot) -> float:
    return sum(h.quantity * h.costBasis for h in snapshot.holdings)


def unrealized_gain(snapshot: PortfolioSnapshot) -> dict:
    mv = market_value(snapshot)
    cb = cost_basis_total(snapshot)
    pct = (mv - cb) / cb if cb else 0.0
    return {"marketValue": round(mv, 2), "costBasis": round(cb, 2),
            "unrealized": round(mv - cb, 2), "unrealizedPct": round(pct, 4)}


def allocation_by_class(snapshot: PortfolioSnapshot) -> dict:
    total = market_value(snapshot) or 1.0
    buckets: dict[str, float] = defaultdict(float)
    for h in snapshot.holdings:
        buckets[h.assetClass] += h.quantity * h.price
    return {k: round(v / total, 4) for k, v in sorted(buckets.items())}


def concentration(snapshot: PortfolioSnapshot, top_n: int = 5) -> list[dict]:
    total = market_value(snapshot) or 1.0
    rows = [
        {"symbol": h.symbol, "name": h.name,
         "weight": round((h.quantity * h.price) / total, 4)}
        for h in snapshot.holdings
    ]
    rows.sort(key=lambda r: r["weight"], reverse=True)
    return rows[:top_n]


def top_movers(snapshot: PortfolioSnapshot, n: int = 3) -> dict:
    ranked = sorted(snapshot.holdings, key=lambda h: h.dayChangePct)
    fmt = lambda h: {"symbol": h.symbol, "dayChangePct": round(h.dayChangePct, 4)}
    return {"losers": [fmt(h) for h in ranked[:n]],
            "gainers": [fmt(h) for h in ranked[::-1][:n]]}


def recent_activity(snapshot: PortfolioSnapshot, limit: int = 10) -> list[dict]:
    txns = sorted(snapshot.transactions, key=lambda t: t.date, reverse=True)
    return [{"date": t.date, "type": t.type, "symbol": t.symbol,
             "amount": t.amount, "status": t.status} for t in txns[:limit]]


# Registry the LLM layer introspects to build its tool schema.
TOOLS = {
    "get_portfolio_summary": unrealized_gain,
    "get_allocation": allocation_by_class,
    "get_concentration": concentration,
    "get_top_movers": top_movers,
    "get_recent_activity": recent_activity,
}
