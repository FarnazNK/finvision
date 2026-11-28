# FinVision: instructions for coding agents

Portfolio tracker with an AI assistant. Two rules define the product, and every change must keep them:

1. **The model never calculates.** Every number in an answer comes from a deterministic tool in
   `ai-service/app/analytics.py`, is checked by code (`guardrails.verify_numbers`) and is cited.
2. **The model never sees customer figures.** In the default masked mode (`privacy.py`), amounts,
   weights, returns and transaction dates are replaced with placeholders before anything reaches
   the model provider, and the server inserts the real values afterwards.

## Layout

| Path | What it is |
| --- | --- |
| `src/` | React + TypeScript dashboard (Vite, Zustand, Zod) |
| `src/services/priceModel.ts` | Correlated GBM price simulation for the demo (statistically tested) |
| `ai-service/app/` | FastAPI backend: `llm.py` (tool loop), `privacy.py`, `guardrails.py`, `analytics.py`, `billing.py` (Stripe), `mcp_server.py` |
| `ai-service/evals/cases.json` | Assistant eval set, run with `python -m evals.run` |
| `.mcp.json` | Registers the FinVision MCP server, so you can call the real analytics tools while working |

## Commands

| Task | Command |
| --- | --- |
| Frontend tests, types, lint, build | `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` |
| Backend tests | `cd ai-service && python -m pytest -q` |
| Assistant evals (offline) | `cd ai-service && python -m evals.run` |
| AgentCore regression tests | `pytest aws_agentcore/test_agentcore_readonly.py -q` |

A change is done when the tests, typecheck, lint and evals that touch it pass.

## Rules

- **Model-facing code** (`llm.py`, `privacy.py`, tool outputs): a new value sent to the model must
  be masked in `privacy.mask_tool_output`. `tests/test_privacy.py::test_no_customer_figure_reaches_the_model`
  must keep passing; never weaken it to make a change pass.
- **No advice.** The assistant explains the portfolio; it never recommends buying, selling or
  timing. Advice checks live in `guardrails.py`.
- **One implementation, two interfaces.** The in-app assistant and the MCP server call the same
  `analytics` functions; `tests/test_mcp_server.py` checks they return identical numbers.
- **Untrusted input everywhere.** API responses are parsed with Zod in the frontend; state restored
  from localStorage goes through `src/app/persistedSchema.ts`; Stripe webhooks are signature-verified
  in `billing.verify_event` before anything is applied.
- **Billing is server-side.** Pro access is decided by `billing.is_pro` on the server, never by the
  client. Never log card data, Stripe secrets or webhook payloads.
- **Simulated prices stay realistic.** Changes to `priceModel.ts` must keep `priceModel.test.ts`
  passing (volatility, correlation and bounded intraday moves).
- **Secrets and lockfiles.** Never edit `.env` files or keys. Change dependencies with `npm install`,
  not by editing `package-lock.json`. The hooks in `.claude/settings.json` enforce this.

## Subagents and skills

- `privacy-reviewer` (read-only): checks a diff for customer data reaching the model, logs or the client.
- `quant-reviewer` (read-only): checks changes to analytics or the price model for financial correctness.
- Skill `add-analytics-tool`: adds a tool end to end (analytics, masking, assistant, MCP, tests, evals).
- Skill `add-eval-case`: adds a case to the assistant eval set.

## Pull requests

Branch from `main`. Keep PRs focused, say what was measured, and update the README when behaviour changes.
