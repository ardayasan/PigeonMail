"""
database/db.py — Thread-safe SQLite access layer.

Uses threading.local() so each thread gets its own connection,
avoiding cross-thread SQLite contention without a connection pool.
"""

import os
import sqlite3
import threading
from pathlib import Path

import config

_local = threading.local()
_SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def _get_conn() -> sqlite3.Connection:
    """Return the thread-local SQLite connection, creating it on first use."""
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(config.DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute("PRAGMA foreign_keys=ON")
    return _local.conn


def init_db() -> None:
    """Create tables if they do not already exist. Call once at startup."""
    schema = _SCHEMA_PATH.read_text()
    conn = _get_conn()
    conn.executescript(schema)
    conn.commit()


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

def create_user(username: str, password_hash: str) -> None:
    conn = _get_conn()
    conn.execute(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        (username.lower(), password_hash),
    )
    conn.commit()


def user_exists(username: str) -> bool:
    conn = _get_conn()
    row = conn.execute(
        "SELECT id FROM users WHERE username = ?", (username.lower(),)
    ).fetchone()
    return row is not None


def verify_user(username: str, password_hash: str) -> bool:
    conn = _get_conn()
    row = conn.execute(
        "SELECT password FROM users WHERE username = ?", (username.lower(),)
    ).fetchone()
    if row is None:
        return False
    return row["password"] == password_hash


# ---------------------------------------------------------------------------
# Message management
# ---------------------------------------------------------------------------

def add_message(from_addr: str, to_addr: str, subject: str, body: str, raw_content: str | None = None) -> int:
    """Insert a new message and return its assigned id."""
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO messages (from_addr, to_addr, subject, body, raw_content)
            VALUES (?, ?, ?, ?, ?)""",
        (from_addr, to_addr, subject, body, raw_content),
    )
    conn.commit()
    return cur.lastrowid

def add_attachment(msg_id: int, filename: str, content_type: str, data: bytes) -> None:
    conn = _get_conn()
    conn.execute(
        "INSERT INTO attachments (message_id, filename, content_type, data) VALUES (?, ?, ?, ?)",
        (msg_id, filename, content_type, data)
    )
    conn.commit()

def get_attachments_metadata(msg_id: int) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT id, filename, content_type FROM attachments WHERE message_id = ?", (msg_id,)
    ).fetchall()
    return [dict(r) for r in rows]

def get_attachment_data(att_id: int) -> dict | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT filename, content_type, data FROM attachments WHERE id = ?", (att_id,)
    ).fetchone()
    return dict(row) if row else None


def get_messages(to_addr: str, include_deleted: bool = False) -> list[dict]:
    """Return all messages for a recipient as a list of dicts."""
    conn = _get_conn()
    if include_deleted:
        rows = conn.execute(
            "SELECT * FROM messages WHERE to_addr = ? ORDER BY id",
            (to_addr.lower(),),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM messages WHERE to_addr = ? AND is_deleted = 0 ORDER BY id",
            (to_addr.lower(),),
        ).fetchall()
    return [dict(r) for r in rows]

def get_mailbox_messages(addr: str, mailbox: str = "inbox") -> list[dict]:
    """Return messages for a user based on mailbox folder."""
    conn = _get_conn()
    addr = addr.lower()
    if mailbox == "inbox":
        query = "SELECT * FROM messages WHERE to_addr = ? AND is_deleted = 0 AND (category != 'Spam' OR category IS NULL) ORDER BY id DESC"
    elif mailbox == "sent":
        query = "SELECT * FROM messages WHERE from_addr = ? AND is_deleted = 0 ORDER BY id DESC"
    elif mailbox == "starred":
        query = "SELECT * FROM messages WHERE to_addr = ? AND is_deleted = 0 AND is_starred = 1 ORDER BY id DESC"
    elif mailbox == "spam":
        query = "SELECT * FROM messages WHERE to_addr = ? AND is_deleted = 0 AND category = 'Spam' ORDER BY id DESC"
    elif mailbox == "trash":
        query = "SELECT * FROM messages WHERE to_addr = ? AND is_deleted = 1 ORDER BY id DESC"
    else:
        query = "SELECT * FROM messages WHERE to_addr = ? AND is_deleted = 0 ORDER BY id DESC"

    rows = conn.execute(query, (addr,)).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["has_attachments"] = conn.execute("SELECT 1 FROM attachments WHERE message_id = ? LIMIT 1", (d["id"],)).fetchone() is not None
        d["is_read"] = bool(d.get("is_read", 0))
        results.append(d)
    return results

def get_mailbox_stats(addr: str) -> dict:
    conn = _get_conn()
    addr = addr.lower()
    row = conn.execute(
        "SELECT COUNT(*) as c FROM messages WHERE to_addr = ? AND is_deleted = 0 AND is_read = 0 AND (category != 'Spam' OR category IS NULL)", 
        (addr,)
    ).fetchone()
    return {"inbox": row["c"]}

def get_message_by_id(msg_id: int) -> dict | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM messages WHERE id = ?", (msg_id,)
    ).fetchone()
    if row:
        d = dict(row)
        d["is_read"] = bool(d.get("is_read", 0))
        d["raw_content"] = d.get("raw_content", "")
        d["attachments"] = get_attachments_metadata(msg_id)
        return d
    return None


def soft_delete_message(msg_id: int) -> None:
    """Mark a single message as deleted (POP3 DELE / REST DELETE)."""
    conn = _get_conn()
    conn.execute(
        "UPDATE messages SET is_deleted = 1 WHERE id = ?", (msg_id,)
    )
    conn.commit()

def hard_delete_message(msg_id: int) -> None:
    """Permanently delete a message."""
    conn = _get_conn()
    conn.execute("DELETE FROM messages WHERE id = ?", (msg_id,))
    conn.commit()

def restore_message(msg_id: int) -> None:
    """Unmark a deletion (POP3 RSET)."""
    conn = _get_conn()
    conn.execute(
        "UPDATE messages SET is_deleted = 0 WHERE id = ?", (msg_id,)
    )
    conn.commit()


def mark_message_read(msg_id: int) -> None:
    """Mark a message as read."""
    conn = _get_conn()
    conn.execute("UPDATE messages SET is_read = 1 WHERE id = ?", (msg_id,))
    conn.commit()


def commit_deletes(to_addr: str, msg_ids: list[int]) -> None:
    """
    Permanently remove messages for a recipient that are in msg_ids.
    Called on POP3 QUIT after the session's deletion list is confirmed.
    """
    if not msg_ids:
        return
    conn = _get_conn()
    placeholders = ",".join("?" * len(msg_ids))
    conn.execute(
        f"DELETE FROM messages WHERE to_addr = ? AND id IN ({placeholders})",
        [to_addr.lower()] + msg_ids,
    )
    conn.commit()


def update_category(msg_id: int, category: str) -> None:
    """Called by the AI classifier once a label is determined."""
    conn = _get_conn()
    conn.execute(
        "UPDATE messages SET category = ? WHERE id = ?", (category, msg_id)
    )
    conn.commit()

def toggle_star(msg_id: int) -> int:
    """Toggles the starred status of a message and returns the new status."""
    conn = _get_conn()
    row = conn.execute("SELECT is_starred FROM messages WHERE id = ?", (msg_id,)).fetchone()
    if not row: return 0
    new_status = 0 if row["is_starred"] else 1
    conn.execute("UPDATE messages SET is_starred = ? WHERE id = ?", (new_status, msg_id))
    conn.commit()
    return new_status


def get_categories(to_addr: str) -> list[str]:
    """Return the distinct non-null categories present in a user's inbox."""
    conn = _get_conn()
    rows = conn.execute(
        """SELECT DISTINCT category FROM messages
            WHERE to_addr = ? AND is_deleted = 0 AND category IS NOT NULL""",
        (to_addr.lower(),),
    ).fetchall()
    return [r["category"] for r in rows]
