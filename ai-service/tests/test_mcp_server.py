"""Tests for the FinVision MCP server, exercised through a real MCP client."""
import json
import sys
from pathlib import Path

import pytest
from mcp import Client, StdioServerParameters

from app import analytics
from app.mcp_server import SAMPLE_PORTFOLIO, PortfolioInput, mcp

EXPECTED_TOOLS = set(analytics.TOOLS)


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _json(result) -> dict:
    assert not result.is_error, result.content[0].text
    return json.loads(result.content[0].text)


@pytest.mark.anyio
async def test_exposes_every_analytics_tool_read_only():
    async with Client(mcp) as client:
        tools = (await client.list_tools()).tools
    assert {t.name for t in tools} == EXPECTED_TOOLS
    for tool in tools:
        assert tool.description and len(tool.description) > 40, tool.name
        assert tool.annotations.read_only_hint is True
        assert "portfolio" in tool.input_schema["required"]


@pytest.mark.anyio
async def test_results_match_the_in_app_analytics():
    """MCP and the in-app assistant must return identical numbers."""
    snapshot = PortfolioInput.model_validate(SAMPLE_PORTFOLIO).to_snapshot()
    async with Client(mcp) as client:
        summary = _json(await client.call_tool("get_portfolio_summary", {"portfolio": SAMPLE_PORTFOLIO}))
        alloc = _json(await client.call_tool("get_allocation", {"portfolio": SAMPLE_PORTFOLIO}))
        movers = _json(await client.call_tool("get_top_movers", {"portfolio": SAMPLE_PORTFOLIO, "n": 2}))
    assert summary == analytics.unrealized_gain(snapshot)
    assert alloc["allocation"] == analytics.allocation_by_class(snapshot)
    assert movers == analytics.top_movers(snapshot, n=2)


@pytest.mark.anyio
async def test_optional_parameters_are_honoured():
    async with Client(mcp) as client:
        top = _json(await client.call_tool("get_concentration", {"portfolio": SAMPLE_PORTFOLIO, "top_n": 2}))
        acts = _json(await client.call_tool("get_recent_activity", {"portfolio": SAMPLE_PORTFOLIO, "limit": 1}))
    assert len(top["positions"]) == 2
    assert top["positions"][0]["weight"] >= top["positions"][1]["weight"]
    assert len(acts["transactions"]) == 1
    assert acts["transactions"][0]["date"] == "2026-10-28"


@pytest.mark.anyio
async def test_minimal_holding_is_enough():
    """Agents shouldn't have to invent ids, names or asset classes."""
    portfolio = {"holdings": [{"symbol": "aapl", "quantity": 10, "costBasis": 100, "price": 150}]}
    async with Client(mcp) as client:
        summary = _json(await client.call_tool("get_portfolio_summary", {"portfolio": portfolio}))
        top = _json(await client.call_tool("get_concentration", {"portfolio": portfolio}))
    assert summary["unrealized"] == 500
    assert top["positions"][0]["symbol"] == "AAPL"


@pytest.mark.anyio
@pytest.mark.parametrize(
    "arguments, field",
    [
        ({"portfolio": {"holdings": [{"symbol": "X"}]}}, "quantity"),
        ({"portfolio": {"holdings": [{"symbol": "X", "quantity": -1, "costBasis": 1, "price": 1}]}}, "quantity"),
        ({"portfolio": {"holdings": [{"symbol": "X", "quantity": 1, "costBasis": 1, "price": 1,
                                       "assetClass": "stocks"}]}}, "assetClass"),
        ({"portfolio": SAMPLE_PORTFOLIO, "top_n": 0}, "top_n"),
        ({}, "portfolio"),
    ],
)
async def test_invalid_input_returns_a_tool_error_naming_the_field(arguments, field):
    async with Client(mcp) as client:
        result = await client.call_tool("get_concentration", arguments)
    assert result.is_error
    assert field in result.content[0].text


@pytest.mark.anyio
async def test_rejects_oversized_portfolios():
    holding = {"symbol": "X", "quantity": 1, "costBasis": 1, "price": 1}
    portfolio = {"holdings": [holding] * 501}
    async with Client(mcp) as client:
        result = await client.call_tool("get_portfolio_summary", {"portfolio": portfolio})
    assert result.is_error


@pytest.mark.anyio
async def test_sample_portfolio_resource_is_valid_tool_input():
    async with Client(mcp) as client:
        resource = await client.read_resource("finvision://sample-portfolio")
        portfolio = json.loads(resource.contents[0].text)
        summary = _json(await client.call_tool("get_portfolio_summary", {"portfolio": portfolio}))
    assert summary["marketValue"] > 0


@pytest.mark.anyio
async def test_runs_over_stdio_like_claude_code():
    """Launch the server the way an agent does: as a subprocess over stdio."""
    # Same launcher as the repo's .mcp.json, started from the repo root.
    repo_root = Path(__file__).resolve().parents[2]
    params = StdioServerParameters(
        command=sys.executable, args=["ai-service/run_mcp.py"], cwd=str(repo_root)
    )
    async with Client(params) as client:
        tools = (await client.list_tools()).tools
        summary = _json(await client.call_tool("get_portfolio_summary", {"portfolio": SAMPLE_PORTFOLIO}))
    assert {t.name for t in tools} == EXPECTED_TOOLS
    assert summary["marketValue"] > 0
