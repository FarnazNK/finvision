# Real public filings and market data

## SEC EDGAR connector

FinVision now supports a public filings explorer on the **Markets** page, backed by the official [SEC EDGAR submissions API](https://www.sec.gov/about/developer-resources). It is structured public API ingestion rather than unauthorized HTML scraping. Enter a valid **CIK** (for example, `320193` for Apple), submit, and review recent 10-K, 10-Q and 8-K filings with links back to the SEC.

Set a descriptive contact in the backend environment:

```bash
FINVISION_SEC_USER_AGENT="FinVision Research research-contact@your-domain.example"
```

Replace the example contact with an address you actually control. Never publish personal contact details from application source code. The SEC requests declared user agents and a fair-access maximum of 10 requests per second. The server caches each company's response for 15 minutes. This does not guarantee the SEC will serve requests from every hosted environment. Production multi-instance deployments should use a shared cache, request budget and retry/backoff for 429/503 responses.

SEC filings are regulatory disclosures, **not live prices**. Market prices use the existing optional Finnhub adapter configured with `FINNHUB_API_KEY`. The Markets UI explicitly identifies external provider quotes versus demo portfolio values, and does not claim quotes are real-time. The simulated market feed still exists for demonstrations, and holdings/overview figures remain demo/simulated unless connected to a verified price source.

## Verification

```bash
cd ai-service
pytest -q
```

Tests mock the SEC HTTP request (no network calls in CI) and check input validation, caching and output. Configure the SEC contact in the deployed backend environment to enable live filing retrieval.

## Next steps

Add provider timestamps and an explicit stale/delayed flag; server-side portfolio repricing; shared caching and scheduled ingestion; alerting for provider outages; license-compliant market-data redistribution; and tenant-isolated research indexing. Avoid presenting scraped website HTML as reliable structured financial data.
