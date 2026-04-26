"""
pop3/server.py — Socket-level POP3 server (RFC 1939).

States: AUTHORIZATION → TRANSACTION → UPDATE (on QUIT)
Supported commands: USER, PASS, STAT, LIST, RETR, DELE, RSET, NOOP, QUIT
"""

import logging
import socket
import threading

import config
from auth.utils import hash_password
from database import db

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

class _Session:
    def __init__(self):
        self.state: str = "AUTHORIZATION"  # or "TRANSACTION"
        self.username: str = ""
        # List of (msg_id, size_bytes, deleted) — loaded at login, 1-indexed
        self.mailbox: list[dict] = []

    def load_mailbox(self) -> None:
        """Fetch messages from DB into the session cache."""
        messages = db.get_messages(self.username, include_deleted=False)
        self.mailbox = [
            {
                "id": m["id"],
                "size": len((m["subject"] or "") + (m["body"] or "")),
                "deleted": False,
                "raw": _format_message(m),
            }
            for m in messages
        ]

    def get_active(self) -> list[dict]:
        return [m for m in self.mailbox if not m["deleted"]]

    def msg_at(self, n: int) -> dict | None:
        """Return message at 1-based index n, or None if out of range."""
        if 1 <= n <= len(self.mailbox):
            return self.mailbox[n - 1]
        return None


def _format_message(m: dict) -> str:
    """Render a DB row as a minimal RFC 2822 message string."""
    lines = [
        f"From: {m['from_addr']}",
        f"To: {m['to_addr']}",
        f"Subject: {m.get('subject', '')}",
        f"Date: {m.get('received_at', '')}",
        "",
        m.get("body", ""),
    ]
    return "\r\n".join(lines)


# ---------------------------------------------------------------------------
# Client handler
# ---------------------------------------------------------------------------

def _handle_client(conn: socket.socket, addr: tuple) -> None:
    logger.info("POP3 connection from %s:%d", *addr)
    session = _Session()

    def send(line: str) -> None:
        logger.info("POP3 → %s [%s:%d]", line, *addr)
        conn.sendall((line + "\r\n").encode("utf-8", errors="replace"))

    def send_multiline(lines: list[str]) -> None:
        """Send +OK response followed by lines, terminated by '.'"""
        for line in lines:
            # Dot-stuff: lines starting with '.' get an extra leading dot
            if line.startswith("."):
                conn.sendall(("." + line + "\r\n").encode("utf-8", errors="replace"))
            else:
                conn.sendall((line + "\r\n").encode("utf-8", errors="replace"))
        
        logger.info("POP3 → (multiline response ending with .) [%s:%d]", *addr)
        conn.sendall(b".\r\n")

    try:
        send(f"+OK {config.LOCAL_DOMAIN} POP3 server ready")

        buf = ""
        while True:
            conn.settimeout(config.POP3_IDLE_TIMEOUT_SECONDS)
            chunk = conn.recv(4096)
            if not chunk:
                break
            buf += chunk.decode("utf-8", errors="replace")

            while "\n" in buf:
                line, buf = buf.split("\n", 1)
                cmd_line = line.rstrip("\r").strip()
                parts = cmd_line.split(None, 1)
                cmd = parts[0].upper() if parts else ""
                arg = parts[1] if len(parts) > 1 else ""

                if cmd == "PASS":
                     logger.info("POP3 ← PASS [REDACTED] [%s:%d]", *addr)
                else:
                     logger.info("POP3 ← %s [%s:%d]", cmd_line, *addr)

                # ── AUTHORIZATION state ─────────────────────────────────
                if session.state == "AUTHORIZATION":

                    if cmd == "USER":
                        if not arg:
                            send("-ERR Syntax: USER username")
                        else:
                            session.username = arg.lower()
                            send(f"+OK {session.username}")

                    elif cmd == "PASS":
                        if not session.username:
                            send("-ERR USER first")
                        elif not arg:
                            send("-ERR Syntax: PASS password")
                        else:
                            pw_hash = hash_password(arg)
                            if db.verify_user(session.username, pw_hash):
                                session.load_mailbox()
                                session.state = "TRANSACTION"
                                count = len(session.mailbox)
                                total = sum(m["size"] for m in session.mailbox)
                                send(f"+OK {count} messages ({total} octets)")
                            else:
                                logger.warning("POP3 auth failed for user=%s [%s:%d]", session.username, *addr)
                                send("-ERR Invalid credentials")
                                session.username = ""

                    elif cmd == "QUIT":
                        send(f"+OK {config.LOCAL_DOMAIN} closing")
                        return

                    elif cmd == "NOOP":
                        send("+OK")

                    else:
                        send("-ERR Command not permitted in AUTHORIZATION state")

                # ── TRANSACTION state ───────────────────────────────────
                elif session.state == "TRANSACTION":

                    if cmd == "STAT":
                        active = session.get_active()
                        total_size = sum(m["size"] for m in active)
                        send(f"+OK {len(active)} {total_size}")

                    elif cmd == "LIST":
                        if arg:
                            try:
                                n = int(arg)
                                msg = session.msg_at(n)
                                if msg is None or msg["deleted"]:
                                    send(f"-ERR No such message {n}")
                                else:
                                    send(f"+OK {n} {msg['size']}")
                            except ValueError:
                                send("-ERR Syntax: LIST [msg]")
                        else:
                            active = session.get_active()
                            send(f"+OK {len(active)} messages")
                            lines = [
                                f"{i + 1} {session.mailbox[i]['size']}"
                                for i in range(len(session.mailbox))
                                if not session.mailbox[i]["deleted"]
                            ]
                            send_multiline(lines)

                    elif cmd == "RETR":
                        try:
                            n = int(arg)
                            msg = session.msg_at(n)
                            if msg is None or msg["deleted"]:
                                send(f"-ERR No such message {n}")
                            else:
                                raw = msg["raw"]
                                send(f"+OK {len(raw.encode())} octets")
                                send_multiline(raw.splitlines())
                        except (ValueError, TypeError):
                            send("-ERR Syntax: RETR msg")

                    elif cmd == "DELE":
                        try:
                            n = int(arg)
                            msg = session.msg_at(n)
                            if msg is None:
                                send(f"-ERR No such message {n}")
                            elif msg["deleted"]:
                                send(f"-ERR Message {n} already deleted")
                            else:
                                msg["deleted"] = True
                                send(f"+OK Message {n} deleted")
                        except (ValueError, TypeError):
                            send("-ERR Syntax: DELE msg")

                    elif cmd == "RSET":
                        for m in session.mailbox:
                            m["deleted"] = False
                        active = session.get_active()
                        send(f"+OK {len(active)} messages")

                    elif cmd == "NOOP":
                        send("+OK")

                    elif cmd == "UIDL":
                        # Optional but useful for clients
                        if arg:
                            try:
                                n = int(arg)
                                msg = session.msg_at(n)
                                if msg is None or msg["deleted"]:
                                    send(f"-ERR No such message {n}")
                                else:
                                    send(f"+OK {n} {msg['id']}")
                            except ValueError:
                                send("-ERR Syntax: UIDL [msg]")
                        else:
                            send("+OK")
                            lines = [
                                f"{i + 1} {session.mailbox[i]['id']}"
                                for i in range(len(session.mailbox))
                                if not session.mailbox[i]["deleted"]
                            ]
                            send_multiline(lines)

                    elif cmd == "QUIT":
                        # UPDATE phase: permanently remove deleted messages
                        deleted_ids = [
                            m["id"] for m in session.mailbox if m["deleted"]
                        ]
                        db.commit_deletes(session.username, deleted_ids)
                        count = len(deleted_ids)
                        send(f"+OK {config.LOCAL_DOMAIN} signing off ({count} deleted)")
                        return

                    else:
                        send("-ERR Unknown command")

    except socket.timeout:
        logger.info(
            "POP3 session timed out after %ds in %s state [%s:%d]",
            config.POP3_IDLE_TIMEOUT_SECONDS,
            session.state,
            *addr,
        )
        try:
            send("-ERR Session timeout due to inactivity")
        except OSError:
            pass
    except (ConnectionResetError, BrokenPipeError):
        logger.info("POP3 client %s:%d disconnected", *addr)
    except Exception:
        logger.exception("Error in POP3 session from %s:%d", *addr)
    finally:
        conn.close()
        logger.info("POP3 connection closed for %s:%d", *addr)


# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------

class POP3Server:
    def __init__(self):
        self._sock: socket.socket | None = None

    def start(self) -> None:
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._sock.bind((config.POP3_HOST, config.POP3_PORT))
        self._sock.listen(50)
        logger.info("POP3 server listening on %s:%d", config.POP3_HOST, config.POP3_PORT)

        while True:
            try:
                conn, addr = self._sock.accept()
                t = threading.Thread(
                    target=_handle_client, args=(conn, addr), daemon=True
                )
                t.start()
            except OSError:
                break

    def stop(self) -> None:
        if self._sock:
            self._sock.close()
