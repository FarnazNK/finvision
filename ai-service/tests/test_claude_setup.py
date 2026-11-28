"""Tests for the Claude Code project setup in .claude/ (hooks, subagents, skills)."""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
CLAUDE = ROOT / ".claude"


def run_hook(name: str, event, project_dir: Path) -> subprocess.CompletedProcess:
    payload = event if isinstance(event, str) else json.dumps(event)
    return subprocess.run(
        [sys.executable, str(CLAUDE / "hooks" / name)],
        input=payload, capture_output=True, text=True, timeout=120,
        env={**os.environ, "CLAUDE_PROJECT_DIR": str(project_dir)},
    )


def edit(path) -> dict:
    return {"tool_name": "Edit", "tool_input": {"file_path": str(path)}}


def test_settings_hooks_point_at_existing_scripts():
    settings = json.loads((CLAUDE / "settings.json").read_text())
    commands = [h["command"] for groups in settings["hooks"].values()
                for group in groups for h in group["hooks"]]
    assert commands
    for command in commands:
        script = re.search(r"\.claude/hooks/[\w.-]+", command)
        assert script and (ROOT / script.group(0)).is_file(), command


def test_mcp_server_in_settings_is_registered():
    settings = json.loads((CLAUDE / "settings.json").read_text())
    servers = json.loads((ROOT / ".mcp.json").read_text())["mcpServers"]
    assert set(settings["enabledMcpjsonServers"]) <= set(servers)


@pytest.mark.parametrize("path", [
    ".env", ".env.production", "ai-service/.env", "certs/server.pem", "package-lock.json",
])
def test_protect_paths_blocks(tmp_path, path):
    result = run_hook("protect_paths.py", edit(tmp_path / path), tmp_path)
    assert result.returncode == 2
    assert "Blocked edit" in result.stderr


@pytest.mark.parametrize("path", [
    ".env.example", "package.json", "src/services/priceModel.ts", "ai-service/app/llm.py",
])
def test_protect_paths_allows(tmp_path, path):
    assert run_hook("protect_paths.py", edit(tmp_path / path), tmp_path).returncode == 0


@pytest.mark.parametrize("payload", ["not json", "[]", "{}"])
def test_hooks_never_block_on_bad_input(tmp_path, payload):
    assert run_hook("protect_paths.py", payload, tmp_path).returncode == 0
    assert run_hook("check_file.py", payload, tmp_path).returncode == 0


def test_check_file_reports_python_syntax_errors(tmp_path):
    bad = tmp_path / "bad.py"
    bad.write_text("def f(:\n    return 1\n")
    result = run_hook("check_file.py", edit(bad), tmp_path)
    assert result.returncode == 2
    assert "bad.py" in result.stderr


def test_check_file_accepts_valid_python_and_other_files(tmp_path):
    good = tmp_path / "good.py"
    good.write_text("def f():\n    return 1\n")
    assert run_hook("check_file.py", edit(good), tmp_path).returncode == 0
    notes = tmp_path / "notes.md"
    notes.write_text("# notes\n")
    assert run_hook("check_file.py", edit(notes), tmp_path).returncode == 0


@pytest.mark.skipif(not (ROOT / "node_modules" / ".bin" / "eslint").is_file(),
                    reason="frontend dependencies not installed")
def test_check_file_runs_eslint_on_typescript():
    target = ROOT / "src" / "__claude_hook_probe.ts"
    target.write_text("export const x = (y: any) => y;\n")  # violates no-explicit-any
    try:
        result = run_hook("check_file.py", edit(target), ROOT)
    finally:
        target.unlink()
    assert result.returncode == 2
    assert "no-explicit-any" in result.stderr


def frontmatter(path: Path) -> dict:
    match = re.match(r"^---\n(.*?)\n---\n", path.read_text(), re.S)
    assert match, f"{path} has no frontmatter"
    fields = dict(line.split(":", 1) for line in match.group(1).splitlines() if ":" in line)
    return {k.strip(): v.strip() for k, v in fields.items()}


@pytest.mark.parametrize("path", sorted((CLAUDE / "agents").glob("*.md")), ids=lambda p: p.stem)
def test_subagents_are_well_formed_and_read_only(path):
    meta = frontmatter(path)
    assert meta["name"] == path.stem
    assert len(meta["description"]) > 40
    tools = {t.strip() for t in meta["tools"].split(",")}
    assert not tools & {"Edit", "Write", "MultiEdit", "NotebookEdit"}


@pytest.mark.parametrize("path", sorted((CLAUDE / "skills").glob("*/SKILL.md")),
                         ids=lambda p: p.parent.name)
def test_skills_are_well_formed(path):
    meta = frontmatter(path)
    assert meta["name"] == path.parent.name
    assert len(meta["description"]) > 40


def test_claude_md_mentions_every_subagent_and_skill():
    text = (ROOT / "CLAUDE.md").read_text()
    for agent in (CLAUDE / "agents").glob("*.md"):
        assert f"`{agent.stem}`" in text
    for skill in (CLAUDE / "skills").glob("*/SKILL.md"):
        assert f"`{skill.parent.name}`" in text
