"""The default (masked) path: no customer figure is ever sent to the model."""
import json
import re

import pytest

from app import analytics, llm, privacy
from app.mcp_server import SAMPLE_PORTFOLIO, PortfolioInput
from fakes import ScriptedClient, text, tool_calls

SNAP = PortfolioInput.model_validate(SAMPLE_PORTFOLIO).to_snapshot()
TOKEN = re.compile(r"\{\{[FD]\d+\}\}")


@pytest.fixture(autouse=True)
def _masked_mode(monkeypatch):
    monkeypatch.delenv("FINVISION_MODEL_DATA", raising=False)  # default must be masked


def _last_tool_view(client: ScriptedClient) -> dict:
    """The most recent masked tool result the model received."""
    for msg in reversed(client.requests[-1]["messages"]):
        content = msg["content"]
        if isinstance(content, list) and content and isinstance(content[0], dict):
            return json.loads(content[0]["content"])
    raise AssertionError("no tool result sent yet")


def _answer_with(build):
    """A scripted model turn that writes its answer from the masked tool result."""
    holder: dict = {}

    def step():
        return text(build(_last_tool_view(holder["client"])))

    return holder, step


def _customer_strings(snapshot) -> set[str]:
    """Every way a customer figure could appear in a request, if it leaked."""
    values: list[float] = []
    for h in snapshot.holdings:
        values += [h.quantity, h.price, h.costBasis, h.quantity * h.price, h.quantity * h.costBasis]
    values += [t.amount for t in snapshot.transactions]
    for name, fn in analytics.TOOLS.items():
        out = fn(snapshot)
        values += [v for _, v in __import__("app.guardrails", fromlist=["_walk"])._walk(out)]
    strings: set[str] = set()
    for v in values:
        if abs(v) < 1e-9:
            continue
        strings |= {f"{abs(v):,.2f}", f"{abs(v):.2f}"}
        if abs(v) >= 100 or v != int(v):
            strings.add(repr(abs(v)))
        if abs(v) < 1:  # fractions also leak as percentages
            strings |= {f"{abs(v) * 100:.1f}%", f"{abs(v) * 100:.2f}%"}
    strings |= {t.date for t in snapshot.transactions}
    strings |= {t.description for t in snapshot.transactions}
    strings |= {h.name for h in snapshot.holdings}
    return strings


@pytest.mark.parametrize("tool", list(analytics.TOOLS))
def test_no_customer_figure_reaches_the_model(tool):
    holder, answer = _answer_with(lambda view: "Here is what I found: " + " ".join(
        TOKEN.findall(json.dumps(view))[:3]))
    client = ScriptedClient(tool_calls(tool), answer)
    holder["client"] = client
    resp = llm.generate_insight("Tell me about my portfolio activity and positions", SNAP,
                                client=client)
    assert resp.guardrail is None

    sent = json.dumps([r["messages"] for r in client.requests], default=str)
    sent = TOKEN.sub(" ", sent)
    leaked = sorted(s for s in _customer_strings(SNAP) if s in sent)
    assert leaked == [], f"customer data sent to the model: {leaked}"
    # The tool results themselves carry no digits except ranks.
    view = json.dumps(_tool_views(client))
    assert not re.search(r"\d", re.sub(r'"(rank|recency)": \d+', "", TOKEN.sub("", view)))


def _tool_views(client):
    return [json.loads(block["content"])
            for req in client.requests for msg in req["messages"]
            if isinstance(msg["content"], list)
            for block in msg["content"] if isinstance(block, dict)]


def test_placeholders_are_rendered_with_real_values_and_cited():
    holder, answer = _answer_with(lambda v: (
        f"Your portfolio is worth {v['marketValue']}, an unrealized {v['direction']} of "
        f"{v['unrealized']} ({v['unrealizedPct']})."))
    client = ScriptedClient(tool_calls("get_portfolio_summary"), answer)
    holder["client"] = client
    resp = llm.generate_insight("How is my portfolio doing?", SNAP, client=client)

    summary = analytics.unrealized_gain(SNAP)
    assert resp.guardrail is None
    assert f"{summary['marketValue']:,.2f} USD" in resp.answer
    assert "{{" not in resp.answer
    figures = {c.path: c for c in resp.citations if c.kind == "figure"}
    assert figures["marketValue"].value == summary["marketValue"]
    assert figures["marketValue"].ref == "get_portfolio_summary"
    assert set(figures) == {"marketValue", "unrealized", "unrealizedPct"}


def test_concentration_view_gives_rank_and_size_words_not_numbers():
    session = privacy.MaskingSession(currency="USD")
    view = privacy.mask_tool_output("get_concentration", analytics.concentration(SNAP), session)
    top = view["positions"][0]
    assert top["rank"] == 1 and top["symbol"] == "VTI" and top["size"] == "large"
    assert TOKEN.fullmatch(top["weight"]) and TOKEN.fullmatch(top["marketValue"])


def test_signed_values_render_as_magnitude_with_direction():
    session = privacy.MaskingSession(currency="USD")
    view = privacy.mask_tool_output(
        "get_recent_activity", analytics.recent_activity(SNAP), session)
    buy = next(t for t in view["transactions"] if t["type"] == "buy")
    assert buy["direction"] == "outflow"
    rendered = privacy.render_answer(f"You bought AAPL for {buy['amount']}.", session, SNAP)
    assert rendered.ok and rendered.text == "You bought AAPL for 1,984.00 USD."


def test_invented_number_triggers_retry_then_succeeds():
    holder, good = _answer_with(lambda v: f"VTI is your largest position at "
                                          f"{v['positions'][0]['weight']}.")
    client = ScriptedClient(
        tool_calls("get_concentration"),
        text("Your top two positions are 66.5% of the portfolio."),
        good,
    )
    holder["client"] = client
    resp = llm.generate_insight("Am I over-concentrated?", SNAP, client=client)
    assert resp.guardrail is None
    assert "66.5%" in str(client.requests[-1]["messages"][-1]["content"])
    assert "45.4%" in resp.answer


def test_repeated_invented_numbers_fall_back_to_deterministic_answer():
    client = ScriptedClient(
        tool_calls("get_portfolio_summary"),
        text("Your portfolio is worth $90,000."),
        text("Your portfolio is worth about $91,500."),
    )
    resp = llm.generate_insight("How is my portfolio doing?", SNAP, client=client)
    assert resp.guardrail == "fallback:unverified_numbers"
    assert "77,011.78" in resp.answer and "90,000" not in resp.answer


def test_unknown_placeholder_is_rejected():
    session = privacy.MaskingSession(currency="USD")
    privacy.mask_tool_output("get_portfolio_summary", analytics.unrealized_gain(SNAP), session)
    rendered = privacy.render_answer("Worth {{F99}}.", session, SNAP)
    assert not rendered.ok and "unknown placeholder {{F99}}" in rendered.problems


def test_counts_tickers_and_numbers_from_the_question_are_allowed():
    session = privacy.MaskingSession(currency="USD")
    privacy.mask_tool_output("get_concentration", analytics.concentration(SNAP), session)
    rendered = privacy.render_answer(
        "Your 3 largest positions are VTI, BND and AAPL, as you asked for the top 5.",
        session, SNAP, question="What are my top 5 positions?")
    assert rendered.ok


def test_advice_after_rendering_is_replaced():
    holder, answer = _answer_with(lambda v: (
        f"VTI is {v['positions'][0]['weight']} of the portfolio, so you should sell some VTI."))
    client = ScriptedClient(tool_calls("get_concentration"), answer)
    holder["client"] = client
    resp = llm.generate_insight("Am I over-concentrated?", SNAP, client=client)
    assert resp.guardrail == "fallback:advice_in_output"
    assert "sell" not in resp.answer.lower()


def test_masked_is_the_default_and_full_is_opt_in(monkeypatch):
    assert privacy.data_policy() == "masked"
    monkeypatch.setenv("FINVISION_MODEL_DATA", "full")
    assert privacy.data_policy() == "full"
    monkeypatch.setenv("FINVISION_MODEL_DATA", "anything-else")
    assert privacy.data_policy() == "masked"  # unknown values fail safe


def test_holding_names_are_not_sent_to_the_model():
    snapshot = PortfolioInput.model_validate({
        **SAMPLE_PORTFOLIO,
        "holdings": [{**SAMPLE_PORTFOLIO["holdings"][0], "name": "Jane Doe joint brokerage"},
                     *SAMPLE_PORTFOLIO["holdings"][1:]],
    }).to_snapshot()
    holder, answer = _answer_with(lambda v: f"VTI ranks first at {v['positions'][0]['weight']}.")
    client = ScriptedClient(tool_calls("get_concentration"), answer)
    holder["client"] = client
    llm.generate_insight("What is my largest position?", snapshot, client=client)
    assert "Jane Doe" not in json.dumps([r["messages"] for r in client.requests], default=str)
