"""Privacy firewall: the model never sees the customer's figures.

The problem this solves
-----------------------
Sending a customer's holdings, balances and transactions to a third-party model
provider is what stops most financial AI projects in legal, compliance and
vendor-risk review. FinVision's design makes it avoidable: the model never
calculates (analytics are deterministic Python), so it never needs the numbers.

How it works
------------
1. **Mask.** Before anything reaches the model, every customer-derived value
   (amounts, weights, percentages, dates) is swapped for a placeholder such as
   ``{{F3}}``. The model gets only non-sensitive structure: public ticker
   symbols, asset classes, ranks, gain/loss direction and coarse size words.
2. **Write.** The model writes its answer using the placeholders.
3. **Validate.** The draft is rejected if it contains any figure of its own
   (it has none to copy, so any number would be invented) or an unknown
   placeholder. The model gets one retry, then the service answers
   deterministically, as before.
4. **Render.** The server replaces each placeholder with the real, formatted
   value. Citations come from the placeholder map, so each number is tied to the
   exact tool and field it came from.

Signed values are rendered as magnitudes ("1,200.00 USD") with a separate
``direction`` field ("gain"/"loss"), so the prose and the number never disagree
about the sign.

``FINVISION_MODEL_DATA=full`` restores the previous behaviour (raw figures sent
to the model) for comparison. The default is ``masked``.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Any, Literal

from .schemas import Citation, PortfolioSnapshot

DataPolicy = Literal["masked", "full"]

_TOKEN = re.compile(r"\{\{([FD]\d{1,4})\}\}")


def data_policy() -> DataPolicy:
    value = os.getenv("FINVISION_MODEL_DATA", "masked").strip().lower()
    return "full" if value == "full" else "masked"


@dataclass
class _Value:
    tool: str
    path: str
    raw: Any
    display: str


@dataclass
class MaskingSession:
    """Placeholder registry for one request. Never leaves the server."""

    currency: str
    values: dict[str, _Value] = field(default_factory=dict)

    def _add(self, prefix: str, tool: str, path: str, raw: Any, display: str) -> str:
        token = f"{prefix}{len(self.values) + 1}"
        self.values[token] = _Value(tool, path, raw, display)
        return "{{" + token + "}}"

    def money(self, tool: str, path: str, value: float) -> str:
        return self._add("F", tool, path, value, f"{abs(value):,.2f} {self.currency}")

    def percent(self, tool: str, path: str, fraction: float, decimals: int = 1) -> str:
        return self._add("F", tool, path, fraction, f"{abs(fraction) * 100:.{decimals}f}%")

    def date(self, tool: str, path: str, value: str) -> str:
        return self._add("D", tool, path, value, value)


def _direction(value: float, up: str, down: str) -> str:
    if value > 0:
        return up
    if value < 0:
        return down
    return "flat"


def _size(weight: float) -> str:
    # Coarse words only, so the model can judge concentration without a figure.
    if weight >= 0.5:
        return "majority"
    if weight >= 0.2:
        return "large"
    if weight >= 0.05:
        return "moderate"
    return "small"


def mask_tool_output(tool: str, out: Any, session: MaskingSession) -> Any:
    """Whitelisted, placeholder-only view of a tool result for the model."""
    s = session
    if tool == "get_portfolio_summary":
        return {
            "marketValue": s.money(tool, "marketValue", out["marketValue"]),
            "costBasis": s.money(tool, "costBasis", out["costBasis"]),
            "unrealized": s.money(tool, "unrealized", out["unrealized"]),
            "unrealizedPct": s.percent(tool, "unrealizedPct", out["unrealizedPct"], 2),
            "direction": _direction(out["unrealized"], "gain", "loss"),
        }
    if tool == "get_allocation":
        ranked = sorted(out.items(), key=lambda kv: kv[1], reverse=True)
        return {"allocation": [
            {"rank": i + 1, "assetClass": cls,
             "weight": s.percent(tool, cls, weight), "size": _size(weight)}
            for i, (cls, weight) in enumerate(ranked)
        ]}
    if tool == "get_concentration":
        return {"positions": [
            {"rank": i + 1, "symbol": row["symbol"],
             "weight": s.percent(tool, f"[{row['symbol']}].weight", row["weight"]),
             "marketValue": s.money(tool, f"[{row['symbol']}].marketValue", row["marketValue"]),
             "size": _size(row["weight"])}
            for i, row in enumerate(out)
        ]}
    if tool == "get_top_movers":
        def side(name: str) -> list[dict]:
            return [
                {"rank": i + 1, "symbol": row["symbol"],
                 "dayChange": s.percent(
                     tool, f"{name}[{row['symbol']}].dayChangePct", row["dayChangePct"], 2),
                 "direction": _direction(row["dayChangePct"], "up", "down")}
                for i, row in enumerate(out[name])
            ]
        return {"gainers": side("gainers"), "losers": side("losers")}
    if tool == "get_recent_activity":
        return {"transactions": [
            {"recency": i + 1, "date": s.date(tool, f"[{i}].date", row["date"]),
             "type": row["type"], "symbol": row["symbol"],
             "amount": s.money(tool, f"[{i}].amount", row["amount"]),
             "direction": _direction(row["amount"], "inflow", "outflow"),
             "status": row["status"]}
            for i, row in enumerate(out)
        ]}
    raise ValueError(f"No masked view for tool: {tool}")


def masked_snapshot(snapshot: PortfolioSnapshot) -> dict:
    """What the model is told about the portfolio up front: structure, no figures."""
    return {
        "baseCurrency": snapshot.baseCurrency,
        "holdings": [{"symbol": h.symbol, "assetClass": h.assetClass} for h in snapshot.holdings],
        "note": "All figures are hidden. Call tools; they return placeholders like {{F1}}.",
    }


@dataclass
class Rendered:
    text: str
    citations: list[Citation]
    problems: list[str]

    @property
    def ok(self) -> bool:
        return not self.problems


def render_answer(
    draft: str,
    session: MaskingSession,
    snapshot: PortfolioSnapshot,
    question: str = "",
) -> Rendered:
    """Check a placeholder draft, then substitute the real values."""
    from .guardrails import _MAX_BARE_COUNT, extract_figures  # avoid import cycle

    problems: list[str] = []
    unknown = sorted({t for t in _TOKEN.findall(draft) if t not in session.values})
    problems += [f"unknown placeholder {{{{{t}}}}}" for t in unknown]

    # The model has no figures to copy, so any number it wrote is invented.
    residue = _TOKEN.sub(" ", draft)
    for h in snapshot.holdings:  # tickers such as "3988.HK" are names, not figures
        residue = re.sub(rf"(?<![\w.]){re.escape(h.symbol)}(?![\w])", " ", residue)
    asked = {f.value for f in extract_figures(question)}
    for fig in extract_figures(residue):
        if fig.bare_int and fig.value <= _MAX_BARE_COUNT:
            continue
        if fig.value in asked:
            continue
        problems.append(fig.text)

    citations: list[Citation] = []
    seen: set[str] = set()

    def substitute(match: re.Match) -> str:
        token = match.group(1)
        value = session.values.get(token)
        if value is None:
            return match.group(0)
        if token not in seen and token.startswith("F"):
            seen.add(token)
            citations.append(Citation(
                kind="figure", ref=value.tool, path=value.path,
                value=value.raw, text=value.display,
            ))
        return value.display

    return Rendered(text=_TOKEN.sub(substitute, draft), citations=citations, problems=problems)
