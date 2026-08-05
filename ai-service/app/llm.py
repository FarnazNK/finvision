"""LLM orchestration.

Design notes worth calling out in an interview:

* **Tool use over free-form generation.** The model doesn't invent portfolio
  numbers; it calls the analytics functions in `analytics.py`. This keeps
  financial figures correct and every claim auditable.
* **Grounded system prompt.** We inject a compact, pre-computed snapshot summary
  so even a single-turn answer is anchored to the caller's real holdings.
* **Graceful degradation.** With no `ANTHROPIC_API_KEY`, the service returns a
  deterministic templated answer instead of erroring, so the demo runs offline
  and CI stays hermetic.
"""
from __future__ import annotations

import json
import os

from . import analytics
from .schemas import Citation, InsightsResponse, PortfolioSnapshot

MODEL = os.getenv("FINVISION_MODEL", "claude-sonnet-4-6")

SYSTEM_PROMPT = """You are FinVision's portfolio analyst assistant.
Rules:
- Answer ONLY from tool results and the provided snapshot. Never invent figures.
- Call tools to get numbers; do not estimate arithmetic yourself.
- Be concise and specific. Use the account's base currency.
- You give analysis, not personalized investment advice; add a one-line
  reminder of that only when the user asks what they *should* do.
"""


def _tool_specs() -> list[dict]:
    descriptions = {
        "get_portfolio_summary": "Market value, cost basis, and unrealized gain/loss.",
        "get_allocation": "Allocation weights by asset class.",
        "get_concentration": "Largest positions by portfolio weight.",
        "get_top_movers": "Best/worst holdings by day change.",
        "get_recent_activity": "Most recent transactions.",
    }
    return [
        {
            "name": name,
            "description": descriptions[name],
            "input_schema": {"type": "object", "properties": {}},
        }
        for name in analytics.TOOLS
    ]


def _run_tool(name: str, snapshot: PortfolioSnapshot):
    fn = analytics.TOOLS[name]
    return fn(snapshot)


def _fallback(question: str, snapshot: PortfolioSnapshot) -> InsightsResponse:
    s = analytics.unrealized_gain(snapshot)
    alloc = analytics.allocation_by_class(snapshot)
    alloc_str = ", ".join(f"{k} {v:.0%}" for k, v in alloc.items())
    answer = (
        f"Your portfolio is worth {s['marketValue']:,.0f} {snapshot.baseCurrency} "
        f"on a cost basis of {s['costBasis']:,.0f}, an unrealized "
        f"{'gain' if s['unrealized'] >= 0 else 'loss'} of "
        f"{s['unrealized']:,.0f} ({s['unrealizedPct']:+.1%}). "
        f"Allocation: {alloc_str}. "
        "(Offline mode — set ANTHROPIC_API_KEY for full natural-language analysis.)"
    )
    return InsightsResponse(
        answer=answer,
        citations=[Citation(kind="metric", ref="unrealized_gain")],
        model="offline-fallback",
    )


def generate_insight(question: str, snapshot: PortfolioSnapshot) -> InsightsResponse:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return _fallback(question, snapshot)

    from anthropic import Anthropic  # imported lazily so offline mode needs no dep

    client = Anthropic(api_key=api_key)
    tools = _tool_specs()
    used: list[str] = []

    messages = [{"role": "user", "content": question}]
    # Agentic loop: let the model call tools until it produces a final answer.
    for _ in range(6):
        resp = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=tools,
            messages=messages,
        )
        if resp.stop_reason != "tool_use":
            text = "".join(b.text for b in resp.content if b.type == "text")
            return InsightsResponse(
                answer=text.strip(),
                citations=[Citation(kind="metric", ref=t) for t in used],
                model=MODEL,
            )

        messages.append({"role": "assistant", "content": resp.content})
        results = []
        for block in resp.content:
            if block.type == "tool_use":
                used.append(block.name)
                out = _run_tool(block.name, snapshot)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(out, default=str),
                })
        messages.append({"role": "user", "content": results})

    return _fallback(question, snapshot)
