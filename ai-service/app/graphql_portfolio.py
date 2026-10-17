"""Read-only, authenticated GraphQL portfolio queries with bounded complexity."""
from __future__ import annotations

from typing import Any

import strawberry
from graphql import GraphQLError, parse
from graphql.language.ast import FieldNode, OperationDefinitionNode
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
        raw = await request.body()
        if len(raw) > 4096:
            raise HTTPException(status_code=413, detail="GraphQL request too large")
        try:
            payload = await request.json()
            query = payload["query"]
            if not isinstance(query, str):
                raise ValueError("Invalid query")
            parsed = parse(query)
            if len(parsed.definitions) != 1:
                raise ValueError("Only one operation is allowed")
            operation = parsed.definitions[0]
            if not isinstance(operation, OperationDefinitionNode):
                raise ValueError("Fragments are not supported")
            if operation.operation.value != "query":
                raise ValueError("Read-only GraphQL queries required")
            fields = operation.selection_set.selections
            if len(fields) != 1 or not isinstance(fields[0], FieldNode):
                raise ValueError("Only one root field is allowed")
            if fields[0].name.value != "holdings":
                raise ValueError("Only holdings queries are allowed")
            subfields = fields[0].selection_set
            if subfields is None or len(subfields.selections) > 8:
                raise ValueError("Invalid field selection")
            if any(
                not isinstance(field, FieldNode) or field.name.value.startswith("__")
                for field in subfields.selections
            ):
                raise ValueError("Fragments and introspection are disabled")
        except (ValueError, KeyError, TypeError, GraphQLError):
            raise HTTPException(status_code=400, detail="Invalid GraphQL query") from None
        return {"user_id": user.id}

    return GraphQLRouter(
        schema,
        context_getter=context,
        graphql_ide=None,
        allow_queries_via_get=False,
    )
