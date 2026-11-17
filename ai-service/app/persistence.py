"""Persistent user and portfolio storage.

SQLite is the local-development default; production should set DATABASE_URL to
PostgreSQL. The ORM models keep the API independent from either database.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finvision.db")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
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
    quantity: Mapped[float] = mapped_column(Float)
    cost_basis: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    user: Mapped[UserRecord] = relationship(back_populates="holdings")


class BillingAccount(Base):
    """A user's Stripe customer and subscription state.

    Kept in its own table (not new columns on `users`) so `create_all` can add
    it to an existing database without a migration. Only the Stripe webhook
    changes `status`; the browser never decides who is on Pro.
    """

    __tablename__ = "billing_accounts"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    stripe_customer_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )
    # Stripe subscription status: active, trialing, past_due, canceled, ... or "none".
    status: Mapped[str] = mapped_column(String(32), default="none")
    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class StripeEventRecord(Base):
    """Stripe event IDs already applied. Stripe retries webhook deliveries, so
    an event is recorded in the same transaction as its effect and skipped if
    it arrives again."""

    __tablename__ = "stripe_events"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    type: Mapped[str] = mapped_column(String(100))
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


Base.metadata.create_all(engine)
