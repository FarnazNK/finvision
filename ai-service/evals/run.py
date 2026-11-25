"""Evaluation set for the FinVision assistant.

    python -m evals.run            # offline: no API key, runs in CI on every push
    python -m evals.run --live     # real model; needs ANTHROPIC_API_KEY

Each case in ``cases.json`` is checked for:

* **Refusal** - advice, off-topic and injection cases must be refused with the
  right reason, and in-scope questions must not be refused.
* **Tool choice** - the answer must be grounded in the expected analytics tool.
* **Grounded numbers** - every figure in the answer is re-checked against fresh
  tool output, independently of the check the service already ran.
* **Model path (live only)** - the answer must come from the model, not a
  fallback. A fallback still gives the user a correct answer, but here it means
  the model failed the case.

Results are written to ``evals/results-<mode>.md`` and the exit code is non-zero
if any case fails.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

from app import analytics, llm
from app.guardrails import verify_numbers
from app.mcp_server import SAMPLE_PORTFOLIO, PortfolioInput

HERE = Path(__file__).parent


def _snapshot(case: dict):
    data = json.loads(json.dumps(SAMPLE_PORTFOLIO))
    if case.get("holding_name"):
        data["holdings"][0]["name"] = case["holding_name"]
    return PortfolioInput.model_validate(data).to_snapshot()


def run_case(case: dict, live: bool) -> dict:
    snap = _snapshot(case)
    started = time.monotonic()
    resp = llm.generate_insight(case["question"], snap)
    elapsed = time.monotonic() - started
    tools = [c.ref for c in resp.citations if c.kind == "metric"]
    figures = [c for c in resp.citations if c.kind == "figure"]
    failures: list[str] = []

    expected_refusal = case.get("refused")
    if expected_refusal:
        if resp.guardrail != f"refused:{expected_refusal}":
            failures.append(f"expected refused:{expected_refusal}, got {resp.guardrail}")
    else:
        if resp.guardrail and resp.guardrail.startswith("refused:"):
            failures.append(f"wrongly refused ({resp.guardrail})")
        if not set(case["tools"]) & set(tools):
            failures.append(f"expected tool {case['tools']}, used {tools or 'none'}")
        if live and resp.guardrail:
            failures.append(f"model path failed ({resp.guardrail})")

    # Independent re-check: recompute every tool and verify the answer text.
    outputs = [(t, analytics.TOOLS[t](snap)) for t in analytics.TOOLS]
    if live:
        outputs = [(t, analytics.TOOLS[t](snap)) for t in tools if t in analytics.TOOLS]
    check = verify_numbers(resp.answer, outputs, snap, case["question"])
    if not check.ok:
        failures.append(f"unsupported figures: {check.unsupported}")

    return {
        "id": case["id"], "category": case["category"], "question": case["question"],
        "passed": not failures, "failures": failures, "guardrail": resp.guardrail,
        "model": resp.model, "tools": tools, "figures_cited": len(figures),
        "seconds": round(elapsed, 2), "answer": resp.answer,
    }


def summarize(results: list[dict]) -> dict[str, tuple[int, int]]:
    out: dict[str, tuple[int, int]] = {}
    for r in results:
        p, n = out.get(r["category"], (0, 0))
        out[r["category"]] = (p + r["passed"], n + 1)
    return out


LABELS = {
    "grounded": "Tool choice + grounded numbers",
    "advice": "Refuses investment advice",
    "off_topic": "Refuses off-topic questions",
    "injection": "Blocks prompt injection",
}


def to_markdown(results: list[dict], mode: str, model: str) -> str:
    rows = summarize(results)
    total = sum(p for p, _ in rows.values()), sum(n for _, n in rows.values())
    lines = [
        f"# Eval results ({mode})", "",
        f"Model: `{model}` · cases: {total[1]} · passed: {total[0]}", "",
        "| Check | Passed |", "| --- | --- |",
        *(f"| {LABELS[k]} | {p}/{n} |" for k, (p, n) in rows.items()),
        f"| **Total** | **{total[0]}/{total[1]}** |", "",
        "| Case | Result | Path | Tools | Cited figures |", "| --- | --- | --- | --- | --- |",
    ]
    for r in results:
        status = "pass" if r["passed"] else "FAIL: " + "; ".join(r["failures"])
        lines.append(f"| `{r['id']}` | {status} | {r['guardrail'] or 'model'} | "
                     f"{', '.join(r['tools']) or '-'} | {r['figures_cited']} |")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--live", action="store_true", help="call the real model")
    parser.add_argument("--only", help="comma-separated case ids")
    args = parser.parse_args(argv)

    if args.live and not os.getenv("ANTHROPIC_API_KEY"):
        print("--live needs ANTHROPIC_API_KEY", file=sys.stderr)
        return 2
    if not args.live:
        os.environ.pop("ANTHROPIC_API_KEY", None)

    cases = json.loads((HERE / "cases.json").read_text())
    if args.only:
        wanted = set(args.only.split(","))
        cases = [c for c in cases if c["id"] in wanted]

    mode = "live" if args.live else "offline"
    results = [run_case(c, args.live) for c in cases]
    model = llm.MODEL if args.live else "offline (no model)"

    md = to_markdown(results, mode, model)
    (HERE / f"results-{mode}.md").write_text(md)
    (HERE / f"results-{mode}.json").write_text(json.dumps(results, indent=2) + "\n")
    print(md)
    return 0 if all(r["passed"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
