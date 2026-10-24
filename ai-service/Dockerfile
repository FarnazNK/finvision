FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
EXPOSE 8000
# Apply schema migrations, then serve. Alembic is idempotent at head, so
# restarts are safe. With several replicas, run migrations as a one-off job.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
