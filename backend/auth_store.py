"""
SQLite-backed auth, settings, and session utilities for Alpha Agent Builder.
"""

from __future__ import annotations

import hashlib
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from typing import Any

from .runtime_paths import app_data_dir
from .secrets_store import _escape_env_value, parse_dotenv_content

DB_FILE = str(app_data_dir() / "alpha_agent_builder.db")


# Open a SQLite connection for auth and settings operations.
def _connect_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


# Initialize the database tables used by the builder app.
def init_db() -> None:
    with _connect_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER PRIMARY KEY,
                openai_api_key TEXT NOT NULL DEFAULT '',
                gemini_api_key TEXT NOT NULL DEFAULT '',
                github_token TEXT NOT NULL DEFAULT '',
                default_repo_url TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """
        )
        _migrate_user_settings_columns(conn)
        _migrate_legacy_api_keys_into_user_env(conn)


# Add columns introduced after initial schema (SQLite).
def _migrate_user_settings_columns(conn: sqlite3.Connection) -> None:
    rows = conn.execute("PRAGMA table_info(user_settings)").fetchall()
    names = {str(row[1]) for row in rows}
    if "user_env_text" not in names:
        conn.execute("ALTER TABLE user_settings ADD COLUMN user_env_text TEXT NOT NULL DEFAULT ''")
    if "user_env_saved" not in names:
        conn.execute("ALTER TABLE user_settings ADD COLUMN user_env_saved INTEGER NOT NULL DEFAULT 0")


# One-time copy of legacy per-field API keys into user_env_text for existing installs.
def _migrate_legacy_api_keys_into_user_env(conn: sqlite3.Connection) -> None:
    cursor = conn.execute(
        """
        SELECT user_id, openai_api_key, gemini_api_key, github_token, user_env_text, user_env_saved
        FROM user_settings
        """
    )
    for row in cursor.fetchall():
        if int(row["user_env_saved"] or 0):
            continue
        text_now = str(row["user_env_text"] or "").strip()
        if text_now:
            conn.execute(
                "UPDATE user_settings SET user_env_saved = 1 WHERE user_id = ?",
                (int(row["user_id"]),),
            )
            continue
        lines: list[str] = []
        oa = str(row["openai_api_key"] or "").strip()
        if oa:
            lines.append(f'OPENAI_API_KEY="{_escape_env_value(oa)}"')
        gm = str(row["gemini_api_key"] or "").strip()
        if gm:
            lines.append(f'GEMINI_API_KEY="{_escape_env_value(gm)}"')
            lines.append(f'GOOGLE_API_KEY="{_escape_env_value(gm)}"')
        gh = str(row["github_token"] or "").strip()
        if gh:
            lines.append(f'GITHUB_TOKEN="{_escape_env_value(gh)}"')
        if not lines:
            continue
        content = "\n".join(lines) + "\n"
        conn.execute(
            """
            UPDATE user_settings
            SET user_env_text = ?, user_env_saved = 1, updated_at = ?
            WHERE user_id = ?
            """,
            (content, datetime.now(timezone.utc).isoformat(), int(row["user_id"])),
        )


# Hash passwords before storing them in the database.
def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


_FIRST_TIME_USER_ENV_TEMPLATE = """# One line per variable (UPPER_SNAKE_CASE).
# Saved values stay on the server and are never shown in the browser again after save.

OPENAI_API_KEY=

GEMINI_API_KEY=

GOOGLE_API_KEY=

GITHUB_TOKEN=
"""

_PATCH_USER_ENV_TEMPLATE = """# Add only the keys you want to add or replace.
# Omitted keys stay unchanged on the server.
# To clear a saved key, set it to an empty value, for example:
# OPENAI_API_KEY=
#
# Example updates:
# OPENAI_API_KEY=your_new_key
# GITHUB_TOKEN=your_new_token
"""


def _serialize_env_text(values: dict[str, str]) -> str:
    if not values:
        return ""
    lines = [f'{key}="{_escape_env_value(val)}"' for key, val in sorted(values.items())]
    return "\n".join(lines) + "\n"


def _mask_env_value(value: str) -> str:
    clean = (value or "").strip()
    if not clean:
        return "(empty)"
    if len(clean) <= 4:
        return "*" * len(clean)
    return f"{'*' * min(8, len(clean) - 4)}{clean[-4:]}"


# Normalize username or email identifiers for lookups.
def _normalize_identifier(identifier: str) -> str:
    return (identifier or "").strip().lower()


# Convert a user row into a JSON-friendly dictionary.
def _user_row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": int(row["id"]),
        "name": str(row["name"]),
        "username": str(row["username"]),
        "email": str(row["email"]),
        "created_at": str(row["created_at"]),
    }


# Return the settings row for a given user, creating a default one if needed.
def _ensure_settings_row(user_id: int) -> None:
    with _connect_db() as conn:
        conn.execute(
            """
            INSERT INTO user_settings (user_id)
            VALUES (?)
            ON CONFLICT(user_id) DO NOTHING
            """,
            (user_id,),
        )


# Return one user by username or email.
def get_user_record(identifier: str) -> dict[str, Any] | None:
    clean_identifier = _normalize_identifier(identifier)
    if not clean_identifier:
        return None

    with _connect_db() as conn:
        row = conn.execute(
            """
            SELECT id, name, username, email, password_hash, created_at
            FROM users
            WHERE username = ? OR email = ?
            LIMIT 1
            """,
            (clean_identifier, clean_identifier),
        ).fetchone()

    if not row:
        return None

    payload = _user_row_to_dict(row)
    payload["password_hash"] = str(row["password_hash"])
    return payload


# Create a user account and a matching default settings row.
def create_user(name: str, username: str, email: str, password: str) -> tuple[bool, str, dict[str, Any] | None]:
    clean_name = (name or "").strip()
    clean_username = _normalize_identifier(username)
    clean_email = _normalize_identifier(email)
    clean_password = password or ""
    if not all([clean_name, clean_username, clean_email, clean_password]):
        return False, "Please fill in all signup fields.", None

    try:
        with _connect_db() as conn:
            cursor = conn.execute(
                """
                INSERT INTO users (name, username, email, password_hash)
                VALUES (?, ?, ?, ?)
                """,
                (clean_name, clean_username, clean_email, _hash_password(clean_password)),
            )
            user_id = int(cursor.lastrowid)
        _ensure_settings_row(user_id)
        return True, "Signup successful.", get_user_by_id(user_id)
    except sqlite3.IntegrityError:
        return False, "Username or email already exists.", None


# Look up a user record by numeric id.
def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    with _connect_db() as conn:
        row = conn.execute(
            """
            SELECT id, name, username, email, created_at
            FROM users
            WHERE id = ?
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()
    return _user_row_to_dict(row) if row else None


# Create a new session token for an authenticated user.
def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with _connect_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id) VALUES (?, ?)",
            (token, user_id),
        )
    return token


# Authenticate a user and return a new session token.
def login_user(identifier: str, password: str) -> tuple[bool, str, dict[str, Any] | None, str | None]:
    clean_identifier = _normalize_identifier(identifier)
    clean_password = password or ""
    if not clean_identifier or not clean_password:
        return False, "Please enter username/email and password.", None, None

    user_record = get_user_record(clean_identifier)
    if not user_record:
        return False, "User not found.", None, None
    if user_record["password_hash"] != _hash_password(clean_password):
        return False, "Invalid password.", None, None

    token = create_session(int(user_record["id"]))
    return True, "Login successful.", get_user_by_id(int(user_record["id"])), token


# Resolve a session token back to its authenticated user.
def get_user_by_session(token: str) -> dict[str, Any] | None:
    clean_token = (token or "").strip()
    if not clean_token:
        return None

    with _connect_db() as conn:
        row = conn.execute(
            """
            SELECT u.id, u.name, u.username, u.email, u.created_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            LIMIT 1
            """,
            (clean_token,),
        ).fetchone()
    return _user_row_to_dict(row) if row else None


# Delete a session token when the user logs out.
def delete_session(token: str) -> None:
    with _connect_db() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", ((token or "").strip(),))


# Return the saved integration settings for a user.
def get_user_settings(user_id: int) -> dict[str, Any]:
    _ensure_settings_row(user_id)
    with _connect_db() as conn:
        row = conn.execute(
            """
            SELECT updated_at, user_env_saved
            FROM user_settings
            WHERE user_id = ?
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()
    assert row is not None
    return {
        "updated_at": str(row["updated_at"] or ""),
        "user_env_saved": bool(int(row["user_env_saved"] or 0)),
    }


# Return whether the user has completed the one-time Env file setup (or legacy migration).
def user_env_configured(user_id: int) -> bool:
    _ensure_settings_row(user_id)
    with _connect_db() as conn:
        row = conn.execute(
            "SELECT user_env_saved FROM user_settings WHERE user_id = ? LIMIT 1",
            (user_id,),
        ).fetchone()
    assert row is not None
    return bool(int(row["user_env_saved"] or 0))


# Return the raw user `.env` file body for editing.
def get_user_env_file_text(user_id: int) -> str:
    _ensure_settings_row(user_id)
    with _connect_db() as conn:
        row = conn.execute(
            "SELECT user_env_text FROM user_settings WHERE user_id = ? LIMIT 1",
            (user_id,),
        ).fetchone()
    assert row is not None
    return str(row["user_env_text"] or "")


def get_user_env_variables(user_id: int) -> list[dict[str, str]]:
    parsed = parse_dotenv_content(get_user_env_file_text(user_id))
    return [
        {
            "key": key,
            "masked_value": _mask_env_value(value),
        }
        for key, value in sorted(parsed.items())
    ]


def get_user_env_editor_content(user_id: int) -> str:
    variables = get_user_env_variables(user_id)
    if not variables and not user_env_configured(user_id):
        return _FIRST_TIME_USER_ENV_TEMPLATE
    if not variables:
        return _PATCH_USER_ENV_TEMPLATE
    lines = [_PATCH_USER_ENV_TEMPLATE.rstrip(), "", "# Currently saved on the server (masked):"]
    lines.extend(f"# {item['key']}={item['masked_value']}" for item in variables)
    return "\n".join(lines).rstrip() + "\n"


# Persist the user's global `.env` text. Marks setup complete so builder and runs proceed.
def save_user_env_file(user_id: int, content: str) -> None:
    _ensure_settings_row(user_id)
    current = parse_dotenv_content(get_user_env_file_text(user_id))
    updates = parse_dotenv_content(content or "")
    merged = dict(current)
    for key, value in updates.items():
        if value == "":
            merged.pop(key, None)
        else:
            merged[key] = value
    now = datetime.now(timezone.utc).isoformat()
    with _connect_db() as conn:
        conn.execute(
            """
            UPDATE user_settings
            SET user_env_text = ?, user_env_saved = 1, updated_at = ?
            WHERE user_id = ?
            """,
            (_serialize_env_text(merged), now, user_id),
        )


# Parsed environment variables from the user's saved `.env` (full map for subprocesses).
def get_user_process_env(user_id: int) -> dict[str, str]:
    return parse_dotenv_content(get_user_env_file_text(user_id))


# Return secret-shaped dict for codegen / GitHub (compat with former Settings keys).
def get_user_secret_values(
    user_id: int,
    *,
    include_openai: bool = True,
    include_gemini: bool = True,
    include_github: bool = True,
) -> dict[str, str]:
    parsed = get_user_process_env(user_id)
    gem = (parsed.get("GEMINI_API_KEY") or parsed.get("GOOGLE_API_KEY") or "").strip()
    return {
        "openai_api_key": (parsed.get("OPENAI_API_KEY") or "").strip() if include_openai else "",
        "gemini_api_key": gem if include_gemini else "",
        "github_token": (parsed.get("GITHUB_TOKEN") or "").strip() if include_github else "",
    }


# Update the current user's basic profile fields.
def update_user_profile(user_id: int, *, name: str, username: str, email: str) -> tuple[bool, str, dict[str, Any] | None]:
    clean_name = (name or "").strip()
    clean_username = _normalize_identifier(username)
    clean_email = _normalize_identifier(email)
    if not all([clean_name, clean_username, clean_email]):
        return False, "Name, username, and email are required.", None

    try:
        with _connect_db() as conn:
            conn.execute(
                """
                UPDATE users
                SET name = ?, username = ?, email = ?
                WHERE id = ?
                """,
                (clean_name, clean_username, clean_email, user_id),
            )
        return True, "Profile updated.", get_user_by_id(user_id)
    except sqlite3.IntegrityError:
        return False, "Username or email already exists.", None


# Change the current user's password after verifying the old password.
def change_user_password(user_id: int, current_password: str, new_password: str) -> tuple[bool, str]:
    clean_current = current_password or ""
    clean_new = new_password or ""
    if not clean_current or not clean_new:
        return False, "Current password and new password are required."

    user_record = get_user_by_id(user_id)
    if not user_record:
        return False, "User not found."

    with _connect_db() as conn:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
            (user_id,),
        ).fetchone()
        if not row or str(row["password_hash"]) != _hash_password(clean_current):
            return False, "Current password is incorrect."
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (_hash_password(clean_new), user_id),
        )
    return True, "Password updated."
