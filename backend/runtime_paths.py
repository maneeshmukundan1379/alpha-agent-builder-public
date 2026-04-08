"""
Persistent application data root (SQLite, generated agents, git cache).

Set ALPHA_APP_DATA_DIR for Docker / cloud (e.g. /data with a volume).
If unset, defaults to the project root next to backend/ (local dev).
"""

from __future__ import annotations

import os
from pathlib import Path

_CODE_ROOT = Path(__file__).resolve().parent.parent


def app_data_dir() -> Path:
    raw = (os.environ.get("ALPHA_APP_DATA_DIR") or "").strip()
    if raw:
        path = Path(raw).expanduser().resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path
    return _CODE_ROOT
