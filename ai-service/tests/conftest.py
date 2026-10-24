"""Test configuration: every run gets its own throwaway SQLite database."""
from __future__ import annotations

import os
import tempfile

# Must run before app.persistence is imported, because it reads DATABASE_URL
# at import time.
_db_dir = tempfile.mkdtemp(prefix="finvision-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_db_dir, 'test.db')}"
os.environ.setdefault("FINVISION_JWT_SECRET", "test-jwt-secret-that-is-long-enough-for-hs256")
# Plenty of headroom so tests don't trip the per-IP limiter.
os.environ.setdefault("FINVISION_RATE_LIMIT", "10000")
