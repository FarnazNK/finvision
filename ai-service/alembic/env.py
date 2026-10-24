"""Alembic environment: migrates the database named by DATABASE_URL."""
from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finvision.db")

# Migrations are written by hand against explicit columns, so autogenerate
# metadata isn't needed and importing the app (with its side effects) is avoided.
target_metadata = None


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        literal_binds=True,
        render_as_batch=DATABASE_URL.startswith("sqlite"),
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(DATABASE_URL, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            # SQLite can't ALTER column types in place; batch mode copies the table.
            render_as_batch=connection.dialect.name == "sqlite",
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
