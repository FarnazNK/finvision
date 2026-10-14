"""Public SEC EDGAR submissions adapter, using official structured data rather than HTML scraping.

SEC requires a descriptive User-Agent and fair access (max 10 requests/second).
This endpoint is intentionally cached for 15 minutes to minimize upstream traffic.
"""
from __future__ import annotations

import os
import re
import time
import httpx

from .market_data import MarketDataError

_cache: dict[str, tuple[float, dict]] = {}


def recent_filings(cik: str, limit: int = 8) -> dict:
    normalized = cik.strip()
    if not re.fullmatch(r"\d{1,10}", normalized):
        raise ValueError("CIK must contain 1 to 10 digits")
    if not 1 <= limit <= 20:
        raise ValueError("limit must be between 1 and 20")
    agent = os.getenv("FINVISION_SEC_USER_AGENT", "").strip()
    if not agent or "@" not in agent:
        raise MarketDataError("SEC data requires FINVISION_SEC_USER_AGENT with a contact email")
    padded = normalized.zfill(10)
    now = time.monotonic()
    cached = _cache.get(padded)
    if cached and cached[0] > now:
        data = cached[1]
    else:
        try:
            response = httpx.get(
                f"https://data.sec.gov/submissions/CIK{padded}.json",
                headers={"User-Agent": agent, "Accept": "application/json"},
                timeout=8,
                follow_redirects=False,
            )
            response.raise_for_status()
            data = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise MarketDataError("SEC submissions are temporarily unavailable") from exc
        if not isinstance(data, dict) or not isinstance(data.get("filings"), dict):
            raise MarketDataError("Unexpected SEC response")
        _cache[padded] = (now + 900, data)
    recent = data.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    dates = recent.get("filingDate", [])
    accessions = recent.get("accessionNumber", [])
    documents = recent.get("primaryDocument", [])
    filings = []
    for form, date, accession, doc in zip(forms, dates, accessions, documents):
        if form not in {"10-K", "10-Q", "8-K"}:
            continue
        if not re.fullmatch(r"[0-9-]+", str(accession)) or "/" in str(doc):
            continue
        filings.append({
            "form": form,
            "filedAt": date,
            "url": f"https://www.sec.gov/Archives/edgar/data/{int(padded)}/{str(accession).replace('-', '')}/{doc}",
        })
        if len(filings) >= limit:
            break
    return {"company": data.get("name", "Unknown company"), "cik": padded, "source": "SEC EDGAR", "filings": filings}
