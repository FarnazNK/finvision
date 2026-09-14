# AWS deployment

FinVision's FastAPI backend can be deployed to AWS Lambda through AWS SAM.

## Architecture

GitHub Actions (OIDC) -> AWS SAM / CloudFormation -> Lambda Function URL -> Neon PostgreSQL

CloudWatch captures Lambda logs. The SAM template keeps the portfolio deployment small with 512 MB memory, a 30-second timeout, reserved concurrency of 2, and 7-day log retention.

## One-time GitHub configuration

Create a GitHub Environment named `aws` and configure:

Repository/environment variables:
- `AWS_ROLE_ARN` — IAM role trusted by GitHub OIDC
- `AWS_REGION` — for example `us-east-1`

Environment secrets:
- `AWS_DATABASE_URL` — production PostgreSQL connection string
- `AWS_JWT_SECRET` — random secret of at least 32 characters
- `AWS_SERVICE_API_KEY` — random key for privileged research ingestion

No long-lived AWS access key is required by the workflow.

## Deploy

Run **Deploy backend to AWS Lambda** from GitHub Actions, or push a backend/AWS infrastructure change after `AWS_ROLE_ARN` is configured.

The workflow prints the Lambda Function URL after deployment.

## Cost controls

This is designed for a low-traffic portfolio deployment, not unlimited free hosting. The template caps reserved concurrency at 2 and retains CloudWatch logs for 7 days. Monitor AWS Billing/Budgets after deployment.
