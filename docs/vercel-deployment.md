# Free portfolio API deployment on Vercel

Deploy only this personal portfolio demo on Vercel Hobby. The plan is free within
its quotas and is restricted to non-commercial personal projects. Do not enable
paid upgrades or paid model/data providers to run the demo.

## Project setup
1. Import this GitHub repository into your Vercel Hobby account.
2. Set Root Directory to `ai-service` and Framework Preset to FastAPI.
3. Do not use the frontend npm build command for this API project.
4. Set `DATABASE_URL` to your Neon **Free** pooled PostgreSQL URL, using
   `postgresql+psycopg://...` with `sslmode=require`.
5. Set a long random `FINVISION_JWT_SECRET` and
   `FINVISION_ALLOWED_ORIGINS=https://farnaznk.github.io`.
6. Leave `ANTHROPIC_API_KEY` and `FINNHUB_API_KEY` unset for the offline demo.
7. Deploy and copy the actual production URL returned by Vercel.

The application already creates its tables when imported. Reuse the existing
database; do not replace it with ephemeral SQLite. Database credentials belong
in Vercel environment variables, never in GitHub source or the browser bundle.

## Connect the frontend
Set GitHub repository variable `VITE_AI_SERVICE_URL` to the deployed API origin
(no path), then rerun the `Deploy public demo` workflow. The Pages build now uses
this variable. GitHub Pages requires this variable for backend features. Without it, production
uses same-origin requests rather than calling Render.

## Verify and update the resume
- `GET /health`: must return 200 and JSON.
- `GET /docs`: must display the interactive API reference.
- Verify registration/login and portfolio persistence with synthetic test data.
- Link the resume's Backend API label to the actual production URL plus `/docs`.
Do not guess a vercel.app hostname before deployment.

The research document store and rate limiter are process-local and do not persist
across function instances. This is a limited portfolio demo, not the clinic service.
Keep Render running until the replacement is verified, then remove the old service
through its normal account controls to stop any existing hosting charges.

For the live-api-smoke workflow, also set GROUNDED_API_URL and SECURESHOP_API_URL
to their verified new origins. The workflow fails clearly until all are set.
