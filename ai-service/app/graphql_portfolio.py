"""Read-only, authenticated GraphQL portfolio queries with bounded complexity."""
from __future__ import annotations

from typing import Any

import strawberry
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from strawberry.fastapi import GraphQLRouter
from strawberry.types import Info

from .persistence import HoldingRecord, SessionLocal, UserRecord


@strawberry.type
class Holding:
    id: int
    symbol: str
    name: str
    asset_class: str
    currency: str


@strawberry.type
class PortfolioQuery:
    @strawberry.field
    def holdings(self, info: Info, limit: int = 20) -> list[Holding]:
        if not 1 <= limit <= 50:
            raise ValueError("limit must be between 1 and 50")
        user_id = info.context["user_id"]
        with SessionLocal() as session:
            records = session.scalars(
                select(HoldingRecord)
                .where(HoldingRecord.user_id == user_id)
                .order_by(HoldingRecord.id)
                .limit(limit)
            ).all()
            return [
                Holding(
                    id=record.id,
                    symbol=record.symbol,
                    name=record.name,
                    asset_class=record.asset_class,
                    currency=record.currency,
                )
                for record in records
            ]


schema = strawberry.Schema(query=PortfolioQuery)


def build_graphql_router(authenticate: Any, rate_limit: Any) -> GraphQLRouter:
    async def context(
        request: Request,
        user: UserRecord = Depends(authenticate),
        _: None = Depends(rate_limit),
    ) -> dict[str, Any]:
        document = (await request.body()).decode("utf-8", errors="replace")
        if len(document) > 4096:
            raise HTTPException(status_code=413, detail="GraphQL request too large")
        return {"user_id": user.id}

    return GraphQLRouter(
        schema,
        context_getter=context,
        graphiql=False,
        allow_queries_via_get=False,
    )
