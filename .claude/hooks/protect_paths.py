#!/usr/bin/env python3
"""PreToolUse hook: stop the agent from editing files it must never touch.

Claude Code sends the pending tool call as JSON on stdin. Exiting with status 2
blocks the call, and the message on stderr is shown to the agent so it can
change course. Anything else (including malformed input) lets the call through,
because a bug in a hook must never block normal work.
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections.abc import Callable

# Example env files are documentation, not secrets, so they stay editable.
ALLOWED = re.compile(r"(^|/)\.env\.(example|sample|template)$")

# (pattern on the repo-relative path, only blocks existing files?, reason for the agent)
PROTECTED: list[tuple[re.Pattern[str], bool, str]] = [
    (
        re.compile(r"(^|/)\.env(\.[\w.-]+)?$"),
        False,
        "Environment files hold secrets. Edit .env.example and tell the user what to set.",
    ),
    (
        re.compile(r"\.(pem|key|p12|pfx)$"),
        False,
        "Private keys and certificates must never be written by an agent.",
    ),
    (
        re.compile(r"(^|/)package-lock\.json$"),
        False,
        "Don't hand-edit the lockfile. Change dependencies with npm install so integrity hashes stay valid.",
    ),
]


def repo_relative(path: str, project_dir: str) -> str:
    path = path.replace("\\", "/")
    root = project_dir.replace("\\", "/").rstrip("/")
    if root and path.startswith(root + "/"):
        path = path[len(root) + 1 :]
    while path.startswith("./"):
        path = path[2:]
    return path


def check(event: dict, project_dir: str, exists: Callable[[str], bool]) -> str | None:
    """Return the reason to block this tool call, or None to allow it."""
    tool_input = event.get("tool_input") or {}
    path = tool_input.get("file_path") or tool_input.get("notebook_path")
    if not isinstance(path, str) or not path:
        return None
    rel = repo_relative(path, project_dir)
    if ALLOWED.search(rel):
        return None
    for pattern, existing_only, reason in PROTECTED:
        if pattern.search(rel) and (not existing_only or exists(path)):
            return f"Blocked edit to {rel}: {reason}"
    return None


def main() -> int:
    try:
        event = json.load(sys.stdin)
    except (ValueError, OSError):
        return 0
    if not isinstance(event, dict):
        return 0
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or event.get("cwd") or ""
    reason = check(event, project_dir, os.path.exists)
    if reason:
        print(reason, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
