# FinVision API on Google Cloud Run

The React frontend can stay on GitHub Pages. Only the FastAPI service moves from
Render to Cloud Run. The existing Neon PostgreSQL database can remain unchanged.

## One-time Google Cloud setup

Use the Toronto region unless you have a reason to choose another:

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Deploy from the repository root:

```bash
gcloud run deploy finvision-api \
  --source ./ai-service \
  --region northamerica-northeast2 \
  --allow-unauthenticated
```

Cloud Run supplies `PORT`; the Dockerfile now respects it automatically.

## Runtime configuration

Configure these variables on the Cloud Run service:

- `DATABASE_URL` — existing Neon PostgreSQL connection string
- `FINVISION_JWT_SECRET` — long random signing secret
- `FINVISION_ALLOWED_ORIGINS` — include the GitHub Pages frontend origin
- `FINNHUB_API_KEY` — optional
- `ANTHROPIC_API_KEY` — optional
- `FINVISION_MODEL` — optional model override

Example:

```bash
gcloud run services update finvision-api \
  --region northamerica-northeast2 \
  --update-env-vars FINVISION_ALLOWED_ORIGINS=https://farnaznk.github.io
```

Prefer Google Secret Manager for database credentials and API keys instead of
putting secret values directly in shell history.

## GitHub Actions deployment

The repository includes `.github/workflows/deploy-cloud-run.yml`. It uses
Google Workload Identity Federation and expects these repository variables:

- `GCP_PROJECT_ID`
- `GCP_REGION` (optional; defaults to `northamerica-northeast2`)
- `GCP_WIF_PROVIDER`
- `GCP_SERVICE_ACCOUNT`

After the one-time service configuration is complete, run **Deploy FinVision API
to Cloud Run** from the GitHub Actions tab.

## Resume links

After deployment, use the Cloud Run URL for:

- `/docs`
- `/health`

Then update the README and resume links from the old Render host to the Cloud Run
host.
