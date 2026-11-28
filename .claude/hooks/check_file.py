#!/usr/bin/env python3
"""PostToolUse hook: check each file right after the agent edits it.

- Python: compile it (syntax errors), then run ruff on it if ruff is installed.
- TypeScript: run the project's ESLint on it if node_modules is installed.

Problems are printed to stderr with exit status 2, which Claude Code hands back
to the agent so it fixes them in the same turn. Missing tools, other file types
and malformed input are ignored: a hook must never block normal work.
"""

from __future__ import annotations

import json
import os
import py_compile
import shutil
import subprocess
import sys


def check_python(path: str, cwd: str | None) -> str | None:
    try:
        py_compile.compile(path, doraise=True)
    except py_compile.PyCompileError as exc:
        return str(exc.msg).strip()
    ruff = shutil.which("ruff")
    if ruff is None:
        return None
    result = subprocess.run(
        [ruff, "check", "--fix", path], capture_output=True, text=True, timeout=60, cwd=cwd
    )
    return result.stdout.strip() if result.returncode != 0 else None


def check_typescript(path: str, cwd: str | None) -> str | None:
    root = cwd or "."
    eslint = os.path.join(root, "node_modules", ".bin", "eslint")
    if not os.path.isfile(eslint):
        return None
    result = subprocess.run([eslint, path], capture_output=True, text=True, timeout=90, cwd=root)
    # ESLint exits 1 for lint errors and 2 for its own failures (bad config, bad option).
    # Only lint errors are the agent's to fix; a broken ESLint must not block edits.
    return result.stdout.strip() if result.returncode == 1 else None


def main() -> int:
    try:
        event = json.load(sys.stdin)
    except (ValueError, OSError):
        return 0
    if not isinstance(event, dict):
        return 0
    path = (event.get("tool_input") or {}).get("file_path")
    if not isinstance(path, str) or not os.path.isfile(path):
        return 0
    cwd = os.environ.get("CLAUDE_PROJECT_DIR") or event.get("cwd") or None
    try:
        if path.endswith(".py"):
            problems = check_python(path, cwd)
        elif path.endswith((".ts", ".tsx")):
            problems = check_typescript(path, cwd)
        else:
            return 0
    except (OSError, subprocess.SubprocessError):
        return 0
    if problems:
        print(f"Problems in {path}; fix them now:\n{problems}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
