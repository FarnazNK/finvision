"""Keep the n8n workflows in ../n8n in sync with the API and docker-compose.

These checks run in CI without n8n: every connection points at a real node,
every API path a workflow calls is a real route, and every `$env` variable it
reads is passed to the n8n container by docker-compose.yml.
"""
import json
import re
from pathlib import Path

import pytest

from app.main import app

REPO = Path(__file__).resolve().parents[2]
WORKFLOWS = sorted((REPO / "n8n").glob("*.json"))
ROUTES = {getattr(route, "path", None) for route in app.routes} - {None}


def _compose_n8n_env() -> set[str]:
    compose = (REPO / "docker-compose.yml").read_text(encoding="utf-8")
    block = compose.split("\n  n8n:\n", 1)[1].split("\n\n", 1)[0]
    return set(re.findall(r"^\s+- ([A-Z0-9_]+)=", block, flags=re.M))


def test_workflows_exist():
    assert WORKFLOWS, "expected n8n workflow files in n8n/"


@pytest.mark.parametrize("path", WORKFLOWS, ids=lambda p: p.name)
def test_connections_point_at_real_nodes(path):
    workflow = json.loads(path.read_text(encoding="utf-8"))
    names = [node["name"] for node in workflow["nodes"]]
    assert len(names) == len(set(names)), "node names must be unique"
    for source, outputs in workflow["connections"].items():
        assert source in names
        for branch in outputs["main"]:
            for edge in branch:
                assert edge["node"] in names


@pytest.mark.parametrize("path", WORKFLOWS, ids=lambda p: p.name)
def test_api_calls_use_real_routes(path):
    text = path.read_text(encoding="utf-8")
    called = set(re.findall(r"FINVISION_API_URL }}(/[a-z0-9/_-]+)", text))
    assert called, "workflow should call the FinVision API"
    assert called <= ROUTES, f"unknown routes: {called - ROUTES}"


@pytest.mark.parametrize("path", WORKFLOWS, ids=lambda p: p.name)
def test_env_vars_are_provided_by_compose(path):
    used = set(re.findall(r"\$env\.([A-Z0-9_]+)", path.read_text(encoding="utf-8")))
    missing = used - _compose_n8n_env()
    assert not missing, f"add to the n8n service in docker-compose.yml: {sorted(missing)}"
