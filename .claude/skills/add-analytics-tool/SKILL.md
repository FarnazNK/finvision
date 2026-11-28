---
name: add-analytics-tool
description: Add a new portfolio analytics tool end to end, so the AI assistant, the deterministic fallback, the privacy masking and the MCP server all support it with tests and eval cases. Use when the assistant needs to answer a new kind of portfolio question (for example volatility, drawdown or sector exposure).
---

# Add an analytics tool

A tool touches six places. Skipping one breaks a guarantee: numbers that can't be verified,
customer figures sent to the model, or the MCP server returning different numbers.

## 1. Calculation (`ai-service/app/analytics.py`)
- Write a pure function `fn(snapshot: PortfolioSnapshot) -> dict | list` with no I/O.
- Return raw numbers (fractions, not percentages); round only for display.
- Handle an empty portfolio, a single holding, cash-only and zero values without dividing by zero.
- Register it in `TOOLS` under a `get_*` name.

## 2. Assistant (`ai-service/app/llm.py`)
- Add a one-line description to `_DESCRIPTIONS`; the model chooses tools from these.
- Teach the no-model fallback: add an intent pattern used by `route_question` and a branch in
  `_describe` that writes a sentence with the exact figures. The fallback answer must pass
  `guardrails.verify_numbers` (it asserts this).

## 3. Privacy masking (`ai-service/app/privacy.py`)
- Add a branch to `mask_tool_output` that returns a **whitelisted** view: every customer-derived
  number goes through `session.money`, `session.percent` or `session.date`; add non-numeric
  hints the model needs (rank, direction, size words). `mask_tool_output` raises for unknown
  tools, so forgetting this step fails loudly.
- `tests/test_privacy.py::test_no_customer_figure_reaches_the_model` is parametrized over
  `analytics.TOOLS` and must pass for the new tool without changes to the test.

## 4. MCP server (`ai-service/app/mcp_server.py`)
- Add an `@mcp.tool(name="get_...", annotations=READ_ONLY)` function that calls the same
  analytics function, with a description that says when an agent should use it.

## 5. Tests (`ai-service/tests/`)
- `test_analytics.py`: hand-calculated expected values, plus the edge cases from step 1.
- `test_mcp_server.py`: the MCP tool returns the same numbers as `analytics`.
- Run `python -m pytest -q` from `ai-service/`.

## 6. Evals (`ai-service/evals/cases.json`)
- Add at least two `grounded` cases phrased the way a user would ask, with `"tools": ["get_..."]`.
  Use the `add-eval-case` skill, then run `python -m evals.run`.

Finally, ask the `quant-reviewer` subagent to check the calculation and the `privacy-reviewer`
subagent to check the masking.
