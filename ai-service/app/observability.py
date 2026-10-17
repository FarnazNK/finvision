"""Small dependency-free observability hooks for local and hosted deployments."""
from __future__ import annotations

import logging
import time
from collections import Counter
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from prometheus_client import Counter as PromCounter, Histogram

API_REQUESTS = PromCounter('finvision_http_requests_total', 'HTTP requests', ['method', 'route', 'status'])
API_DURATION = Histogram('finvision_http_request_duration_seconds', 'HTTP latency', ['method', 'route'])

logger = logging.getLogger("finvision.api")
_request_counts: Counter[str] = Counter()


class RequestMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id", uuid4().hex)
        started = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        route = getattr(request.scope.get("route"), "path", "unmatched")
        API_REQUESTS.labels(request.method, route, str(response.status_code)).inc()
        API_DURATION.labels(request.method, route).observe(duration_ms / 1000)
        _request_counts[route] += 1
        response.headers["x-request-id"] = request_id
        logger.info(
            "request_complete method=%s path=%s status=%s duration_ms=%s request_id=%s",
            request.method,
            route,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response


def request_metrics() -> dict[str, int]:
    return dict(_request_counts)
