"""The public demo portfolio, so anonymous visitors can try the assistant.

The live dashboard ships with seeded holdings and transactions
(``src/services/seed.ts``). Visitors who are not signed in may ask the
assistant about that demo portfolio, and only that portfolio: anything else
still needs a signed-in user or the service API key.

Prices, daily changes and transaction dates are ignored when matching,
because the dashboard simulates price ticks and dates transactions relative
to today. A test parses ``seed.ts`` and checks it against these constants,
so the two cannot drift apart silently.
"""
from __future__ import annotations

from .schemas import PortfolioSnapshot

# (symbol, quantity, costBasis) for each seeded holding.
DEMO_HOLDINGS: frozenset[tuple[str, float, float]] = frozenset(
    {
        ("VTI", 142, 198.4),
        ("VXUS", 86, 56.2),
        ("BND", 220, 76.4),
        ("AAPL", 35, 148.0),
        ("MSFT", 22, 280.0),
        ("GLD", 18, 165.0),
        ("CASH", 12500, 1),
    }
)

# (id, type, symbol, amount, status) for each seeded transaction.
DEMO_TRANSACTIONS: frozenset[tuple[str, str, str | None, float, str]] = frozenset(
    {
        ("t_1", "buy", "VTI", -984.4, "settled"),
        ("t_2", "dividend", "BND", 41.22, "settled"),
        ("t_3", "deposit", None, 2500, "settled"),
        ("t_4", "sell", "AAPL", 992.0, "settled"),
        ("t_5", "fee", None, -19.5, "settled"),
        ("t_6", "buy", "MSFT", -825.2, "pending"),
        ("t_7", "dividend", "VTI", 87.4, "settled"),
        ("t_8", "withdrawal", None, -1500, "settled"),
    }
)


def is_demo_portfolio(portfolio: PortfolioSnapshot) -> bool:
    """True only if the snapshot is the seeded demo portfolio.

    Holdings must match exactly. Transactions must be drawn from the seeded
    set, because the dashboard can filter them before sending.
    """
    holdings = {(h.symbol, h.quantity, h.costBasis) for h in portfolio.holdings}
    if holdings != DEMO_HOLDINGS or len(portfolio.holdings) != len(DEMO_HOLDINGS):
        return False
    transactions = [
        (t.id, t.type, t.symbol, t.amount, t.status) for t in portfolio.transactions
    ]
    return len(transactions) == len(set(transactions)) and set(transactions) <= DEMO_TRANSACTIONS
