# n8n workflows

[`finvision-concentration-alert.json`](finvision-concentration-alert.json) checks a saved portfolio every weekday at 9:00 and sends an alert when any single position is above a threshold (25% by default). It stays quiet when everything is within the limit.

```
Weekdays at 9:00 ─┐
Run now ──────────┴─> Log in ─> Check concentration ─> Any position too big? ─ yes ─> Write alert ─> Send alert
                                                                           └─ no ──> All within limit
```

The workflow does no math itself. It calls `GET /api/portfolio/concentration`, which loads the signed-in user's saved holdings, prices them with live quotes and runs the same `analytics.concentration` function the AI assistant uses. A holding without a current price fails the request instead of quietly skewing the weights.

## Run it

1. Set these in your shell or a `.env` file next to `docker-compose.yml`:

   | Variable | What it's for |
   | --- | --- |
   | `FINVISION_EMAIL`, `FINVISION_PASSWORD` | The FinVision account whose saved holdings are checked |
   | `ALERT_WEBHOOK_URL` | Where alerts go: a Slack incoming webhook or a Discord webhook URL |
   | `FINVISION_ALERT_THRESHOLD` | Optional; default `0.25` (25%) |
   | `FINNHUB_API_KEY` | Needed for live prices |

2. Start everything with `docker compose up --build` and open n8n at <http://localhost:5678>.
3. Create an n8n owner account, then **Import from file** and choose `finvision-concentration-alert.json`. You can also import it from the command line:

   ```bash
   docker compose exec n8n n8n import:workflow --input=/workflows/finvision-concentration-alert.json
   ```

4. Click **Execute workflow** to test it once, then turn on **Active** for the weekday schedule.

The alert is posted as `{"text": ..., "content": ...}`. Slack reads `text` and Discord reads `content`.

## Notes

- The credentials are read from environment variables so the workflow can be imported without manual setup. For a shared n8n instance, move them into an n8n credential instead.
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` in `docker-compose.yml` allows the workflow to read those variables. n8n 2.x blocks this by default.
- `ai-service/tests/test_n8n_workflows.py` checks in CI that the workflow only calls real API routes and only reads variables that docker-compose provides.
