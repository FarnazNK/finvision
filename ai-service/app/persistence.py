"""Persistent user and portfolio storage.

SQLite is the local-development default; production sets DATABASE_URL to
PostgreSQL. The schema is owned by Alembic migrations (``ai-service/alembic``).
For local SQLite only, tables are created on import so ``uvicorn`` and the test
suite work without a migration step.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

# Money and quantities are stored as exact decimals, never binary floats.
# 8 decimal places covers fractional shares and crypto units; 6 covers
# per-unit prices below one cent.
QUANTITY_PRECISION = (20, 8)
PRICE_PRECISION = (20, 6)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finvision.db")
IS_SQLITE = DATABASE_URL.startswith("sqlite")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class UserRecord(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    holdings: Mapped[list["HoldingRecord"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class HoldingRecord(Base):
    __tablename__ = "holdings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    symbol: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(200))
    asset_class: Mapped[str] = mapped_column(String(30), default="equity")
    quantity: Mapped[Decimal] = mapped_column(Numeric(*QUANTITY_PRECISION, asdecimal=True))
    # Per-unit cost basis in the holding's currency.
    cost_basis: Mapped[Decimal] = mapped_column(Numeric(*PRICE_PRECISION, asdecimal=True))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    user: Mapped[UserRecord] = relationship(back_populates="holdings")


if IS_SQLITE:
    Base.metadata.create_all(engine)
