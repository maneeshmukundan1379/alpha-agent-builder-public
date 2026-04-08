"""
Helpers for storing generated agent secrets locally.
"""

from __future__ import annotations

import re
from pathlib import Path


_KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _escape_env_value(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


# Parse KEY=value lines (and optional `export`) from a user-provided .env file body.
def parse_dotenv_content(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw_line in (text or "").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, _, rest = line.partition("=")
        key = key.strip()
        if not _KEY_RE.match(key):
            continue
        val = rest.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in ('"', "'"):
            val = val[1:-1]
            val = val.replace("\\" + '"', '"').replace("\\" + "'", "'")
        out[key] = val
    return out


# Write the generated agent `.env` from the user's global Env file content.
def write_agent_environment(agent_dir: Path, user_env_text: str) -> None:
    env_path = agent_dir / ".env"
    merged: dict[str, str] = dict(parse_dotenv_content(user_env_text))

    if not merged:
        env_path.write_text("", encoding="utf-8")
        return

    lines = [f'{key}="{_escape_env_value(val)}"' for key, val in sorted(merged.items())]
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# Return whether an agent has a saved .env file with content.
def has_saved_secrets(agent_dir: Path) -> bool:
    env_path = agent_dir / ".env"
    return env_path.exists() and bool(env_path.read_text(encoding="utf-8").strip())


# Build a safe .env.example file based on the required secret keys.
def build_env_example(secret_names: list[str]) -> str:
    if not secret_names:
        return "# No required secrets for this template.\n"
    return "".join(f"{secret_name}=\n" for secret_name in secret_names)
