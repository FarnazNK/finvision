"""A scripted stand-in for the Anthropic client, so the tool loop, retry and
fallback paths can be tested without network access or an API key."""
from __future__ import annotations

from types import SimpleNamespace
from typing import Callable, Union


def text(t: str):
    return SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text=t)])


def tool_calls(*names: str):
    return SimpleNamespace(
        stop_reason="tool_use",
        content=[SimpleNamespace(type="tool_use", name=n, id=f"tu_{i}", input={})
                 for i, n in enumerate(names)],
    )


Step = Union[SimpleNamespace, BaseException, Callable[[], SimpleNamespace]]


class ScriptedClient:
    """Returns (or raises) the scripted steps in order and records each request."""

    def __init__(self, *steps: Step):
        self.steps = list(steps)
        self.requests: list[dict] = []
        self.messages = self

    def create(self, **kwargs):
        self.requests.append(kwargs)
        if not self.steps:
            raise AssertionError("model called more times than scripted")
        step = self.steps.pop(0)
        if isinstance(step, BaseException):
            raise step
        return step() if callable(step) else step
