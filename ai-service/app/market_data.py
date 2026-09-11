"""Server-side Finnhub market-data adapter with a small in-process cache."""
from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any

import httpx


class MarketDataError(RuntimeError):
    """Raised when the provider cannot return a valid market-data response."""


@dataclass
class _CacheEntry:
    expires_at: float
    value: Any


class FinnhubClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://finnhub.io/api/v1",
        timeout: float | None = None,
        cache_ttl: float | None = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else os.getenv("FINNHUB_API_KEY", "")
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout or float(os.getenv("FINVISION_MARKET_TIMEOUT", "8"))
        self.cache_ttl = cache_ttl or float(os.getenv("FINVISION_MARKET_CACHE_TTL", "30"))
        self._cache: dict[str, _CacheEntry] = {}

    def quote(self, symbol: str) -> dict[str, Any]:
        return self._get("quote", {"symbol": _normalize_symbol(symbol)})

    def candles(self, symbol: str, resolution: str, start: int, end: int) -> dict[str, Any]:
        return self._get(
            "stock/candle",
            {
                "symbol": _normalize_symbol(symbol),
                "resolution": resolution,
                "from": start,
                "to": end,
            },
        )

    def search(self, query: str) -> dict[str, Any]:
        return self._get("search", {"q": query.strip()})

    def _get(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        if not self.api_key:
            raise MarketDataError("FINNHUB_API_KEY is not configured")
        cache_key = f"{path}:{sorted(params.items())}"
        cached = self._cache.get(cache_key)
        if cached and cached.expires_at > time.monotonic():
            return cached.value
        request_params = {**params, "token": self.api_key}
        try:
            response = httpx.get(
                f"{self.base_url}/{path}",
                params=request_params,
                timeout=self.timeout,
            )
            response.raise_for_status()
            value = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise MarketDataError("Finnhub request failed") from exc
        if not isinstance(value, dict):
            raise MarketDataError("Finnhub returned an invalid response")
        self._cache[cache_key] = _CacheEntry(
            expires_at=time.monotonic() + self.cache_ttl,
            value=value,
        )
        return value


def _normalize_symbol(symbol: str) -> str:
    normalized = symbol.strip().upper()
    if not normalized or len(normalized) > 20 or not normalized.replace(".", "").isalnum():
        raise ValueError("Invalid market symbol")
    return normalized
