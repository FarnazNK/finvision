"""FinVision MCP server.

Exposes the same deterministic analytics that power the in-app assistant
(`analytics.TOOLS`) to external coding agents such as Claude Code, Cursor and
Codex over the Model Context Protocol.

Design notes:

* **One implementation, two interfaces.** The in-app assistant (`llm.py`) and
  this server both call the functions in `analytics.py`. No calculation is
  duplicated here; this module only adds agent-facing contracts.
* **Stateless by design (v1).** The agent passes the portfolio in each call, so
  the server needs no credentials, touches no database and cannot leak one
  user's data to another. Loading a signed-in user's saved holdings is a
  possible later step and would need an auth token.
* **Written for agents.** Every tool says *when* to use it, inputs are typed
  and bounded, optional fields have sensible defaults so agents don't have to
  invent IDs, and a sample portfolio resource lets an agent try the tools with
  zero setup.

Run locally over stdio:

    cd ai-service && python -m app.mcp_server
"""
from __future__ import annotations

import json
from typing import Annotated, Optional

from pydantic import BaseModel, Field

from mcp.server.mcpserver import MCPServer
from mcp.types import ToolAnnotations

from . import analytics
from .schemas import AssetClass, Holding, PortfolioSnapshot, Transaction, TxnStatus, TxnType

MAX_HOLDINGS = 500
MAX_TRANSACTIONS = 2000

INSTRUCTIONS = """\
FinVision computes portfolio analytics deterministically. Use these tools
instead of doing portfolio arithmetic yourself.

Every tool takes a `portfolio` object: a list of `holdings` (symbol, quantity,
costBasis per unit, current price) and optionally `transactions`. If the user
has no portfolio handy, read the `finvision://sample-portfolio` resource and
pass its contents as `portfolio`.

Weights and percentages are returned as fractions (0.25 = 25%). FinVision
provides analysis, not personalized investment advice.
"""

READ_ONLY = ToolAnnotations(
    read_only_hint=True,
    destructive_hint=False,
    idempotent_hint=True,
    open_world_hint=False,
)


# --- Agent-facing input models ---------------------------------------------
# These mirror `schemas.Holding` / `schemas.Transaction` but add descriptions
# and defaults, so an agent can build a valid call from what a user typically
# knows ("35 shares of AAPL bought at $148, now $198").


class HoldingInput(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20, description="Ticker, e.g. 'AAPL'.")
    quantity: float = Field(..., ge=0, description="Number of units held.")
    costBasis: float = Field(..., ge=0, description="Average cost PER UNIT, not the position total.")
    price: float = Field(..., ge=0, description="Current price per unit.")
    name: Optional[str] = Field(default=None, max_length=200, description="Display name; defaults to the symbol.")
    assetClass: AssetClass = Field(default="equity", description="Used by get_allocation.")
    dayChangePct: float = Field(
        default=0.0,
        description="Today's price change as a fraction (0.012 = +1.2%). Needed for get_top_movers.",
    )
    currency: str = Field(default="USD", min_length=3, max_length=3)
    id: Optional[str] = Field(default=None, max_length=100, description="Optional; generated if omitted.")


class TransactionInput(BaseModel):
    date: str = Field(..., max_length=40, description="ISO date, e.g. '2026-10-30'.")
    type: TxnType
    amount: float = Field(..., description="Cash amount of the transaction.")
    symbol: Optional[str] = Field(default=None, max_length=20)
    description: str = Field(default="", max_length=500)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    status: TxnStatus = "settled"
    id: Optional[str] = Field(default=None, max_length=100, description="Optional; generated if omitted.")


class PortfolioInput(BaseModel):
    holdings: list[HoldingInput] = Field(..., max_length=MAX_HOLDINGS)
    transactions: list[TransactionInput] = Field(default_factory=list, max_length=MAX_TRANSACTIONS)
    baseCurrency: str = Field(default="USD", min_length=3, max_length=3)

    def to_snapshot(self) -> PortfolioSnapshot:
        return PortfolioSnapshot(
            baseCurrency=self.baseCurrency,
            holdings=[
                Holding(
                    id=h.id or f"h_{i}",
                    symbol=h.symbol.upper(),
                    name=h.name or h.symbol.upper(),
                    assetClass=h.assetClass,
                    quantity=h.quantity,
                    costBasis=h.costBasis,
                    price=h.price,
                    dayChangePct=h.dayChangePct,
                    currency=h.currency,
                )
                for i, h in enumerate(self.holdings, start=1)
            ],
            transactions=[
                Transaction(
                    id=t.id or f"t_{i}",
                    date=t.date,
                    type=t.type,
                    symbol=t.symbol.upper() if t.symbol else None,
                    description=t.description,
                    amount=t.amount,
                    currency=t.currency,
                    status=t.status,
                )
                for i, t in enumerate(self.transactions, start=1)
            ],
        )


PortfolioArg = Annotated[PortfolioInput, Field(description="The portfolio to analyze.")]


# --- Server -----------------------------------------------------------------

mcp = MCPServer("FinVision", instructions=INSTRUCTIONS)


@mcp.tool(name="get_portfolio_summary", annotations=READ_ONLY)
def get_portfolio_summary(portfolio: PortfolioArg) -> dict:
    """Total market value, total cost basis and unrealized gain/loss (amount and
    fraction). Use for "how is my portfolio doing", "what is it worth" or
    "am I up or down overall"."""
    return analytics.TOOLS["get_portfolio_summary"](portfolio.to_snapshot())


@mcp.tool(name="get_allocation", annotations=READ_ONLY)
def get_allocation(portfolio: PortfolioArg) -> dict:
    """Share of market value in each asset class (equity, fixed_income, cash,
    alternative, crypto), as fractions summing to 1. Use for diversification
    or "stocks vs bonds" questions. For individual positions use
    get_concentration instead."""
    return {"allocation": analytics.TOOLS["get_allocation"](portfolio.to_snapshot())}


@mcp.tool(name="get_concentration", annotations=READ_ONLY)
def get_concentration(
    portfolio: PortfolioArg,
    top_n: Annotated[int, Field(ge=1, le=50, description="How many positions to return.")] = 5,
) -> dict:
    """Largest individual positions by share of portfolio market value, sorted
    largest first. Use for "what are my biggest holdings" or single-stock
    concentration risk."""
    return {"positions": analytics.TOOLS["get_concentration"](portfolio.to_snapshot(), top_n=top_n)}


@mcp.tool(name="get_top_movers", annotations=READ_ONLY)
def get_top_movers(
    portfolio: PortfolioArg,
    n: Annotated[int, Field(ge=1, le=20, description="How many gainers and losers to return.")] = 3,
) -> dict:
    """Best and worst holdings by today's price change. Requires `dayChangePct`
    on each holding. Use for "what moved today"."""
    return analytics.TOOLS["get_top_movers"](portfolio.to_snapshot(), n=n)


@mcp.tool(name="get_recent_activity", annotations=READ_ONLY)
def get_recent_activity(
    portfolio: PortfolioArg,
    limit: Annotated[int, Field(ge=1, le=100, description="Maximum transactions to return.")] = 10,
) -> dict:
    """Most recent transactions, newest first. Requires `portfolio.transactions`.
    Use for "what did I buy or sell recently" or dividend/fee history."""
    return {"transactions": analytics.TOOLS["get_recent_activity"](portfolio.to_snapshot(), limit=limit)}


SAMPLE_PORTFOLIO = {
    "baseCurrency": "USD",
    "holdings": [
        {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "assetClass": "equity",
         "quantity": 142, "costBasis": 198.4, "price": 246.1, "dayChangePct": 0.0084},
        {"symbol": "VXUS", "name": "Vanguard Total International Stock ETF", "assetClass": "equity",
         "quantity": 86, "costBasis": 56.2, "price": 64.83, "dayChangePct": -0.0021},
        {"symbol": "BND", "name": "Vanguard Total Bond Market ETF", "assetClass": "fixed_income",
         "quantity": 220, "costBasis": 76.4, "price": 73.95, "dayChangePct": 0.0011},
        {"symbol": "AAPL", "name": "Apple Inc.", "assetClass": "equity",
         "quantity": 35, "costBasis": 148.0, "price": 198.4, "dayChangePct": 0.0123},
        {"symbol": "MSFT", "name": "Microsoft Corporation", "assetClass": "equity",
         "quantity": 22, "costBasis": 280.0, "price": 412.6, "dayChangePct": -0.0047},
        {"symbol": "USD", "name": "Cash", "assetClass": "cash",
         "quantity": 4200, "costBasis": 1, "price": 1, "dayChangePct": 0.0},
    ],
    "transactions": [
        {"date": "2026-10-28", "type": "buy", "symbol": "AAPL", "amount": -1984.0,
         "description": "Buy 10 AAPL"},
        {"date": "2026-10-15", "type": "dividend", "symbol": "VTI", "amount": 112.36,
         "description": "VTI quarterly dividend"},
        {"date": "2026-10-01", "type": "deposit", "amount": 2500.0,
         "description": "Monthly contribution"},
    ],
}


@mcp.resource(
    "finvision://sample-portfolio",
    name="sample-portfolio",
    description="A ready-made demo portfolio to pass as `portfolio` when the user has none.",
    mime_type="application/json",
)
def sample_portfolio() -> str:
    return json.dumps(SAMPLE_PORTFOLIO, indent=2)


if __name__ == "__main__":
    mcp.run(transport="stdio")
