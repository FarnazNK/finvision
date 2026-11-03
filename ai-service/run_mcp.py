"""Launch the FinVision MCP server over stdio from any working directory.

Agents start MCP servers from wherever they happen to be running, so this
script puts `ai-service/` on the import path before starting the server.

    python ai-service/run_mcp.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.mcp_server import mcp  # noqa: E402

if __name__ == "__main__":
    mcp.run(transport="stdio")
