"""
smtp/server.py — Socket-level SMTP server (RFC 5321).

Supported commands: EHLO, HELO, MAIL FROM, RCPT TO, DATA, RSET, NOOP, QUIT
Runs each client connection in a separate thread.
"""

import logging
import re
import socket
import threading

import config
from database import db

logger = logging.getLogger(__name__)

# Lazy import to avoid circular dependency at module load time
def _classify_async(msg_id: int, subject: str, body: str) -> None:
    from ai.classifier import classify_async
    classify_async(msg_id, subject, body)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ADDR_RE = re.compile(r"<([^>]*)>")


def _parse_address(arg: str) -> str | None:
    """Extract the email address from MAIL FROM:<addr> / RCPT TO:<addr>."""
    m = _ADDR_RE.search(arg)
    if m:
        return m.group(1).strip().lower()
    # Also accept bare address without angle brackets
    parts = arg.split(":", 1)
    if len(parts) == 2:
        return parts[1].strip().lower()
    return None


def _parse_headers(raw: str) -> tuple[str, str, list[dict]]:
    """
    Split a raw RFC 2822 / MIME message into (subject, body).
    Uses Python's email module to correctly decode base64 / quoted-printable bodies.
    """
    import email as _email_lib
    from email.header import decode_header
    msg = _email_lib.message_from_string(raw)
    
    # Decode subject header
    raw_subject = msg.get("Subject", "")
    decoded_parts = decode_header(raw_subject)
    subject = ""
    for part, charset in decoded_parts:
        if isinstance(part, bytes):
            subject += part.decode(charset or "utf-8", errors="replace")
        else:
            subject += part

    body = ""
    attachments = []
    if msg.is_multipart():
        # Walk MIME parts, collect first text/plain
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and not part.get_filename():
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset("utf-8") or "utf-8"
                    body = payload.decode(charset, errors="replace")
            elif part.get_filename():
                filename = part.get_filename()
                content_type = part.get_content_type()
                payload = part.get_payload(decode=True)
                if payload:
                    attachments.append({
                        "filename": filename,
                        "content_type": content_type,
                        "data": payload
                    })
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset("utf-8") or "utf-8"
            body = payload.decode(charset, errors="replace")
        else:
            # Fallback: plain text with no encoding
            body = str(msg.get_payload())

    return subject, body, attachments


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

class _Session:
    def __init__(self):
        self.helo_domain: str = ""
        self.mail_from: str = ""
        self.rcpt_to: list[str] = []
        self.data_mode: bool = False
        self.data_lines: list[str] = []
        self.data_size: int = 0

    def reset(self):
        self.mail_from = ""
        self.rcpt_to = []
        self.data_mode = False
        self.data_lines = []
        self.data_size = 0


# ---------------------------------------------------------------------------
# Client handler
# ---------------------------------------------------------------------------

def _handle_client(conn: socket.socket, addr: tuple) -> None:
    logger.info("SMTP connection from %s:%d", *addr)
    session = _Session()

    def send(line: str) -> None:
        logger.info("SMTP → %s [%s:%d]", line, *addr)
        conn.sendall((line + "\r\n").encode("utf-8", errors="replace"))

    try:
        send(f"220 {config.LOCAL_DOMAIN} ESMTP MailServer ready")

        buf = ""
        while True:
            chunk = conn.recv(4096)
            if not chunk:
                break
            buf += chunk.decode("utf-8", errors="replace")

            # Process all complete lines in buffer
            while "\n" in buf:
                line, buf = buf.split("\n", 1)
                line = line.rstrip("\r")
                
                # Log incoming line (unless it's potentially sensitive DATA, but we log the DATA command itself)
                if not session.data_mode:
                    logger.info("SMTP ← %s [%s:%d]", line, *addr)

                # ── DATA accumulation mode ──────────────────────────────
                if session.data_mode:
                    if line == ".":
                        logger.info("SMTP ← . (End of DATA) [%s:%d]", *addr)
                        # End of DATA — store message
                        raw = "\n".join(session.data_lines)
                        if session.data_size > config.MAX_MESSAGE_SIZE:
                            send("552 Message exceeds maximum size")
                            session.reset()
                            continue

                        subject, body, extracted_attachments = _parse_headers(raw)

                        for recipient in session.rcpt_to:
                            msg_id = db.add_message(
                                session.mail_from, recipient, subject, body, raw_content=raw
                            )
                            for att in extracted_attachments:
                                db.add_attachment(msg_id, att["filename"], att["content_type"], att["data"])
                            logger.info(
                                "Stored msg id=%d from=%s to=%s subject=%r",
                                msg_id, session.mail_from, recipient, subject,
                            )
                            _classify_async(msg_id, subject, body)

                        send("250 OK: Message queued")
                        session.reset()
                    else:
                        # RFC 5321 dot-stuffing: remove leading dot if present
                        if line.startswith("."):
                            line = line[1:]
                        session.data_lines.append(line)
                        session.data_size += len(line)
                    continue

                # ── Normal command mode ─────────────────────────────────
                upper = line.upper().strip()

                if upper.startswith("EHLO") or upper.startswith("HELO"):
                    parts = line.split(None, 1)
                    session.helo_domain = parts[1] if len(parts) > 1 else ""
                    send(f"250-{config.LOCAL_DOMAIN} Hello {session.helo_domain}")
                    send(f"250-SIZE {config.MAX_MESSAGE_SIZE}")
                    send("250 HELP")

                elif upper.startswith("MAIL FROM"):
                    addr_str = _parse_address(line)
                    if addr_str is None:
                        send("501 Syntax: MAIL FROM:<address>")
                    elif session.mail_from:
                        send("503 MAIL FROM already specified; use RSET")
                    else:
                        session.mail_from = addr_str
                        send(f"250 OK: sender <{addr_str}>")

                elif upper.startswith("RCPT TO"):
                    if not session.mail_from:
                        send("503 Need MAIL FROM first")
                    else:
                        addr_str = _parse_address(line)
                        if addr_str is None:
                            send("501 Syntax: RCPT TO:<address>")
                        elif not addr_str.endswith(f"@{config.LOCAL_DOMAIN}"):
                            logger.warning("SMTP relay denied for <%s> [%s:%d]", addr_str, *addr)
                            send(f"550 Relay denied for <{addr_str}>")
                        else:
                            session.rcpt_to.append(addr_str)
                            send(f"250 OK: recipient <{addr_str}>")

                elif upper == "DATA":
                    if not session.mail_from:
                        send("503 Need MAIL FROM first")
                    elif not session.rcpt_to:
                        send("503 Need at least one RCPT TO first")
                    else:
                        session.data_mode = True
                        session.data_lines = []
                        session.data_size = 0
                        send("354 End data with <CR LF>.<CR LF>")

                elif upper == "RSET":
                    session.reset()
                    send("250 OK: reset")

                elif upper == "NOOP":
                    send("250 OK")

                elif upper == "QUIT":
                    send(f"221 {config.LOCAL_DOMAIN} closing connection")
                    return

                elif upper == "":
                    pass  # ignore blank lines outside DATA

                else:
                    send("500 Command unrecognized")

    except (ConnectionResetError, BrokenPipeError):
        logger.info("SMTP client %s:%d disconnected", *addr)
    except Exception:
        logger.exception("Error in SMTP session from %s:%d", *addr)
    finally:
        conn.close()
        logger.info("SMTP connection closed for %s:%d", *addr)


# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------

class SMTPServer:
    def __init__(self):
        self._sock: socket.socket | None = None

    def start(self) -> None:
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._sock.bind((config.SMTP_HOST, config.SMTP_PORT))
        self._sock.listen(50)
        logger.info("SMTP server listening on %s:%d", config.SMTP_HOST, config.SMTP_PORT)

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
