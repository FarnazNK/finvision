"""Guardrails enforced in code, not just requested in the prompt.

The system prompt asks the model to stay grounded and avoid advice, but a prompt
is a request, not a guarantee. This module checks both sides of the model call:

* **Before the call** (`screen_question`): refuse personalized investment
  advice, off-topic requests and obvious prompt-injection attempts without ever
  sending them to the model. Free-text fields inside the portfolio (holding names,
  transaction descriptions) are screened for injection too, because they also end
  up in the prompt.
* **After the call** (`verify_numbers`): every figure in the answer must match a
  value returned by an analytics tool (or a raw input in the portfolio snapshot).
  Matching figures become number-level citations; anything else is reported as
  unsupported so the caller can retry or fall back.
* **Output advice check** (`contains_advice`): a last check that the answer
  didn't slip into buy/sell recommendations.

Everything here is deterministic regex and arithmetic, so it is cheap, testable,
and behaves the same with or without an API key.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any, Iterable, Optional

from .schemas import Citation, PortfolioSnapshot

# --------------------------------------------------------------------------
# Input screening
# --------------------------------------------------------------------------

_INJECTION = re.compile(
    r"""
    \b(ignore|disregard|forget|override|bypass)\b[^.?!\n]{0,40}
        \b(previous|prior|above|earlier|all|your|system|the)\b[^.?!\n]{0,20}
        \b(instructions?|prompts?|rules|guidelines|messages?|context)\b
  | \b(reveal|show|print|repeat|output|leak|tell\ me)\b[^.?!\n]{0,30}
        \b(system\s+prompt|your\s+(instructions|prompt|rules)|hidden\s+(prompt|instructions))
  | \bsystem\s+prompt\b
  | \byou\s+are\s+now\b
  | \b(pretend|act)\s+(to\s+be|as|you\s+are)\b
  | \b(developer|god|admin|DAN)\s+mode\b
  | \bjailbreak
  | \bnew\s+instructions?\s*:
  | </?\s*(system|assistant|instructions?|tool_result)\s*>
  """,
    re.IGNORECASE | re.VERBOSE,
)

_ADVICE = re.compile(
    r"""
    \bshould\s+i\s+(buy|sell|hold|invest|add|trim|dump|keep|get\s+out|move|put|rebalance|short)\b
  | \bwhat\s+should\s+i\s+(buy|sell|invest|do\s+with)\b
  | \bwhich\s+(stocks?|etfs?|funds?|shares?|coins?|holdings?|positions?)\b[^?]{0,30}\b(buy|sell|invest|add|dump)\b
  | \b(recommend|suggest)\w*\b[^?]{0,40}\b(buy|sell|invest|stocks?|etfs?|funds?|allocation|trade)\b
  | \bis\s+(it|now|this)\s+a\s+good\s+time\s+to\b
  | \b(is|are)\s+\S+(\s+\S+)?\s+a\s+good\s+(buy|investment|stock)\b
  | \bgood\s+(buy|investment)\b
  | \bprice\s+target\b
  | \bwill\s+\S+(\s+\S+)?\s+(go\s+up|go\s+down|rise|fall|drop|crash|recover|moon)\b
  | \bpredict\w*\b
  | \bforecast\w*\b
  | \bhow\s+much\s+should\s+i\b
  """,
    re.IGNORECASE | re.VERBOSE,
)

_OFF_TOPIC = re.compile(
    r"""
    \b(write|compose|tell)\s+(me\s+)?(a|an|some)\s+(poem|story|song|joke|haiku|essay|limerick)\b
  | \b(poem|haiku|recipe|weather|horoscope|lyrics)\b
  | \b(python|javascript|sql|html|regex)\b
  | \btranslate\b
  | \bcapital\s+of\b
  | \bwho\s+(won|is\s+the\s+president)\b
  """,
    re.IGNORECASE | re.VERBOSE,
)

# A question has to touch the portfolio somehow to be in scope.
_ON_TOPIC = re.compile(
    r"""
    \b(portfolio|holdings?|positions?|account|stocks?|shares?|bonds?|cash|crypto|etfs?|funds?
      |equit(y|ies)|fixed\s+income|assets?|allocation|allocated|split|mix|diversif\w*|concentrat\w*
      |weights?|exposure|largest|biggest|smallest|top|worth|value|balance|cost\s+basis|basis
      |gains?|loss(es)?|losing|lost|up|down|return(s|ed)?|performance|perform\w*|doing
      |movers?|moved|today|day|change|best|worst|activity|transactions?|recent|latest
      |dividends?|deposits?|withdrawals?|fees?|bought|sold|buy|sell|trades?|invest\w*
      |unrealized|profit|risk|summar\w*|overview)\b
    """,
    re.IGNORECASE | re.VERBOSE,
)

REFUSALS = {
    "advice": (
        "I can't tell you what to buy, sell or hold. That would be personalized "
        "investment advice, and I only describe what's in this portfolio."
    ),
    "off_topic": (
        "I can only answer questions about this portfolio: its value, gains and "
        "losses, allocation, concentration, today's movers and recent activity."
    ),
    "injection": (
        "I can't follow instructions that try to change how I work. Ask me a "
        "question about this portfolio instead, for example \"Am I over-concentrated "
        "in any position?\""
    ),
}


@dataclass(frozen=True)
class Screen:
    """Result of screening a question. ``reason`` is None when it may proceed."""

    reason: Optional[str] = None  # "advice" | "off_topic" | "injection"

    @property
    def allowed(self) -> bool:
        return self.reason is None


def _portfolio_text(snapshot: PortfolioSnapshot) -> Iterable[str]:
    for h in snapshot.holdings:
        yield h.name
        yield h.symbol
    for t in snapshot.transactions:
        yield t.description


def screen_question(question: str, snapshot: PortfolioSnapshot) -> Screen:
    """Decide in code whether a question may reach the model."""
    q = question.strip()
    if _INJECTION.search(q) or any(_INJECTION.search(s) for s in _portfolio_text(snapshot)):
        return Screen("injection")
    if _ADVICE.search(q):
        return Screen("advice")
    if _OFF_TOPIC.search(q):
        return Screen("off_topic")
    symbols = {h.symbol.lower() for h in snapshot.holdings}
    words = set(re.findall(r"[a-z0-9.]+", q.lower()))
    if not _ON_TOPIC.search(q) and not (symbols & words):
        return Screen("off_topic")
    return Screen()


_ADVICE_OUT = re.compile(
    r"\b(you\s+should|i(?:'d|\s+would)?\s+(?:recommend|suggest)|consider|it(?:'s|\s+is)\s+(?:a\s+good|wise)\s+(?:idea|time)\s+to)"
    r"\s+(?:\w+\s+){0,2}(buy|sell|trim|add|reduc\w*|increas\w*|rebalanc\w*|dump|short|purchas\w*|offload)",
    re.IGNORECASE,
)


def contains_advice(answer: str) -> bool:
    return bool(_ADVICE_OUT.search(answer))


# --------------------------------------------------------------------------
# Number verification and number-level citations
# --------------------------------------------------------------------------

_DATE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
_NUMBER = re.compile(
    r"""
    (?<![\w.])                      # not glued to a word, ticker or decimal
    (?P<cur>\$|US\$|USD\s?|€|£)?
    (?P<int>\d{1,3}(?:,\d{3})+|\d+)
    (?P<dec>\.\d+)?
    (?P<suf>\s?%|\s?(?:k|K|M|bn)\b|\s?(?:thousand|million|billion)\b|\s?percent\b)?
    """,
    re.VERBOSE,
)
_MULT = {"k": 1e3, "K": 1e3, "thousand": 1e3, "M": 1e6, "million": 1e6, "bn": 1e9, "billion": 1e9}

# Bare small integers ("your 3 largest positions", "top 5") are counts, not figures.
_MAX_BARE_COUNT = 20


@dataclass
class Figure:
    text: str
    value: float          # as written, after k/M scaling
    decimals: int
    percent: bool
    bare_int: bool
    scale: float = 1.0    # 1e3 for "12.3k", 1e6 for "1.2M"


@dataclass
class Source:
    ref: str              # tool name or "portfolio_snapshot"
    path: str
    value: float


@dataclass
class Verification:
    citations: list[Citation] = field(default_factory=list)
    unsupported: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.unsupported


def extract_figures(text: str) -> list[Figure]:
    cleaned = _DATE.sub(lambda m: " " * len(m.group()), text)
    out: list[Figure] = []
    for m in _NUMBER.finditer(cleaned):
        raw_int = m.group("int").replace(",", "")
        dec = m.group("dec") or ""
        suf = (m.group("suf") or "").strip()
        value = float(raw_int + dec)
        percent = suf in ("%", "percent")
        scale = _MULT.get(suf, 1.0)
        value *= scale
        bare = not (m.group("cur") or dec or suf or "," in m.group("int"))
        out.append(Figure(
            text=m.group().strip(),
            value=value,
            decimals=max(len(dec) - 1, 0),
            percent=percent,
            bare_int=bare,
            scale=scale,
        ))
    return out


def _walk(obj: Any, path: str = "") -> Iterable[tuple[str, float]]:
    if isinstance(obj, bool):
        return
    if isinstance(obj, (int, float)) and math.isfinite(obj):
        yield path, float(obj)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from _walk(v, f"{path}.{k}" if path else str(k))
    elif isinstance(obj, (list, tuple)):
        for i, v in enumerate(obj):
            label = v.get("symbol") if isinstance(v, dict) and v.get("symbol") else i
            yield from _walk(v, f"{path}[{label}]")


def collect_sources(tool_outputs: list[tuple[str, Any]], snapshot: PortfolioSnapshot) -> list[Source]:
    """All numbers the answer is allowed to use. Tool outputs come first so a
    figure is credited to a tool whenever one produced it."""
    sources = [Source(name, p, v) for name, out in tool_outputs for p, v in _walk(out)]
    for h in snapshot.holdings:
        for f in ("quantity", "price", "costBasis", "dayChangePct"):
            sources.append(Source("portfolio_snapshot", f"holdings[{h.symbol}].{f}", float(getattr(h, f))))
    return sources


def _matches(fig: Figure, src: float) -> bool:
    if fig.percent:
        tol = 0.5 * 10 ** -fig.decimals + 1e-9
        # A tool fraction (0.2512) written as 25.1% or 25%, or a value already in percent.
        return abs(abs(src) * 100 - fig.value) <= tol or abs(abs(src) - fig.value) <= tol
    # Plain amounts: allow the rounding the text shows ("$12,345" for 12345.67,
    # "$12.3k" for 12,345.67). Sign is free: "a loss of $1,200" for -1200.
    tol = 0.5 * 10 ** -fig.decimals * fig.scale + 1e-9
    return abs(abs(src) - fig.value) <= tol


def verify_numbers(
    answer: str,
    tool_outputs: list[tuple[str, Any]],
    snapshot: PortfolioSnapshot,
    question: str = "",
) -> Verification:
    """Check every figure in ``answer`` against tool outputs and snapshot inputs."""
    sources = collect_sources(tool_outputs, snapshot)
    asked = {f.value for f in extract_figures(question)}
    result = Verification()
    seen: set[str] = set()
    for fig in extract_figures(answer):
        if fig.bare_int and fig.value <= _MAX_BARE_COUNT:
            continue
        if fig.value in asked:
            continue
        match = next((s for s in sources if _matches(fig, s.value)), None)
        if match is None:
            result.unsupported.append(fig.text)
            continue
        if fig.text in seen:
            continue
        seen.add(fig.text)
        result.citations.append(Citation(
            kind="figure", ref=match.ref, path=match.path, value=match.value, text=fig.text,
        ))
    return result
