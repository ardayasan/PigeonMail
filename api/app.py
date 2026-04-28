"""
api/app.py — REST API bridge (HTTP port 8080).

Used exclusively by the React Native mobile client. The mobile app never
opens raw sockets; all operations go through this JSON API.

Authentication: POST /auth/login  →  { "token": "..." }
Protected endpoints require:  Authorization: Bearer <token>

Endpoints
---------
POST   /auth/login              Authenticate, get token
POST   /auth/register           Register a new user
GET    /messages                List inbox (supports ?category= filter)
GET    /messages/<id>           Get full message
POST   /messages/send           Compose and send an email
DELETE /messages/<id>           Soft-delete a message
GET    /messages/categories     List distinct categories in inbox
"""

import logging
from functools import wraps

from flask import Flask, jsonify, request, Response, send_file
import json
import io
from flask import stream_with_context

import config
from auth.utils import generate_token, hash_password, verify_token
from database import db
import api.log_handler

logger = logging.getLogger(__name__)

app = Flask(__name__)


@app.teardown_request
def close_db_connection(_exc):
    db.close_conn()


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def _require_auth(f):
    """Decorator: validates Bearer token and injects 'current_user' kwarg."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header and request.args.get("token"):
            auth_header = "Bearer " + request.args.get("token")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed Authorization header"}), 401
        token = auth_header[7:]
        username = verify_token(token)
        if username is None:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, current_user=username, **kwargs)
    return wrapper


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "username and password required"}), 400

    pw_hash = hash_password(password)
    if not db.verify_user(username, pw_hash):
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_token(username)
    return jsonify({"token": token, "username": username}), 200


@app.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "username and password required"}), 400
    if len(username) < 3:
        return jsonify({"error": "username must be at least 3 characters"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400
    if db.user_exists(username):
        return jsonify({"error": "username already taken"}), 409

    pw_hash = hash_password(password)
    db.create_user(username, pw_hash)
    token = generate_token(username)
    return jsonify({"token": token, "username": username}), 201


# ---------------------------------------------------------------------------
# Message endpoints
# ---------------------------------------------------------------------------

@app.route("/messages", methods=["GET"])
@_require_auth
def list_messages(current_user: str):
    category_filter = request.args.get("category", "").strip()
    mailbox = request.args.get("mailbox", "inbox").strip()
    addr = current_user if "@" in current_user else f"{current_user}@{config.LOCAL_DOMAIN}"
    messages = db.get_mailbox_messages(addr, mailbox)

    if mailbox == "inbox":
        try:
            import poplib
            from config import POP3_HOST, POP3_PORT
            server = poplib.POP3("127.0.0.1", POP3_PORT)
            server.user(addr)
            server.pass_("API_INTERNAL_PASS_123")
            response, listings, octets = server.list()
            # Simulate fetching all messages to generate full POP3 logs
            for i in range(1, len(listings) + 1):
                server.retr(i)
            server.quit()
        except Exception as e:
            logger.error("POP3 fetch simulation failed: %s", e)

    if category_filter:
        messages = [m for m in messages if m.get("category") == category_filter]

    result = [
        {
            "id": m["id"],
            "from": m["from_addr"],
            "to": m["to_addr"],
            "subject": m["subject"],
            "received_at": m["received_at"],
            "category": m["category"],
            "is_starred": bool(m.get("is_starred")),
            "is_read": bool(m.get("is_read")),
            "is_deleted": bool(m.get("is_deleted")),
            "has_attachments": bool(m.get("has_attachments")),
        }
        for m in messages
    ]
    return jsonify(result), 200


@app.route("/messages/categories", methods=["GET"])
@_require_auth
def list_categories(current_user: str):
    addr = current_user if "@" in current_user else f"{current_user}@{config.LOCAL_DOMAIN}"
    categories = db.get_categories(addr)
    return jsonify(categories), 200

@app.route("/messages/stats", methods=["GET"])
@_require_auth
def get_stats(current_user: str):
    addr = current_user.lower() if "@" in current_user else f"{current_user.lower()}@{config.LOCAL_DOMAIN}"
    stats = db.get_mailbox_stats(addr)
    return jsonify(stats), 200


@app.route("/messages/<int:msg_id>", methods=["GET"])
@_require_auth
def get_message(msg_id: int, current_user: str):
    addr = current_user if "@" in current_user else f"{current_user}@{config.LOCAL_DOMAIN}"
    msg = db.get_message_by_id(msg_id)
    if msg is None:
        return jsonify({"error": "Message not found"}), 404
    if msg["to_addr"] != addr and msg["from_addr"] != addr:
        return jsonify({"error": "Forbidden"}), 403
    result = dict(msg)
    result["from"] = result.get("from_addr", "")
    result["to"]   = result.get("to_addr", "")
    return jsonify(result), 200

@app.route("/messages/<int:msg_id>/read", methods=["POST"])
@_require_auth
def mark_read(msg_id: int, current_user: str):
    addr = current_user.lower() if "@" in current_user else f"{current_user.lower()}@{config.LOCAL_DOMAIN}"
    msg = db.get_message_by_id(msg_id)
    if msg is None:
        return jsonify({"error": "Message not found"}), 404
    if msg["to_addr"] != addr and msg["from_addr"] != addr:
        return jsonify({"error": "Forbidden"}), 403

    db.mark_message_read(msg_id)
    return jsonify({"status": "read"}), 200

@app.route("/messages/send", methods=["POST"])
@_require_auth
def send_message(current_user: str):
    if request.is_json:
        data = request.get_json(silent=True) or {}
        to_raw = (data.get("to") or "").strip()
        subject = (data.get("subject") or "").strip()
        body = (data.get("body") or "").strip()
    else:
        to_raw = (request.form.get("to") or "").strip()
        subject = (request.form.get("subject") or "").strip()
        body = (request.form.get("body") or "").strip()

    # Parse multiple recipients (comma or semicolon separated)
    recipients = [r.strip().lower() for r in to_raw.replace(";", ",").split(",") if r.strip()]
    if not recipients:
        return jsonify({"error": "At least one recipient is required"}), 400

    invalid = [r for r in recipients if "@" not in r]
    if invalid:
        return jsonify({"error": f"Invalid email format: {', '.join(invalid)}"}), 400

    non_local = [r for r in recipients if not r.endswith(f"@{config.LOCAL_DOMAIN}")]
    if non_local:
        return jsonify({"error": f"Relay denied. Must send to @{config.LOCAL_DOMAIN}: {', '.join(non_local)}"}), 400

    from_addr = current_user.lower() if "@" in current_user else f"{current_user.lower()}@{config.LOCAL_DOMAIN}"

    # Collect attachments for SMTP send
    files = request.files.getlist("attachments")
    attachment_list = []
    for file in files:
        if file.filename:
            attachment_list.append({
                "filename": file.filename,
                "content_type": file.content_type or "application/octet-stream",
                "data": file.read(),
            })

    # Route through SMTP server — generates real protocol logs
    try:
        from smtp.client import send_via_smtp
        send_via_smtp(from_addr, recipients, subject, body, attachment_list or None)
    except Exception as exc:
        logger.error("SMTP send failed: %s", exc)
        return jsonify({"error": f"SMTP delivery failed: {exc}"}), 502

    return jsonify({"status": "queued", "recipients": recipients}), 201


@app.route("/messages/<int:msg_id>/star", methods=["POST"])
@_require_auth
def star_message(msg_id: int, current_user: str):
    addr = current_user if "@" in current_user else f"{current_user}@{config.LOCAL_DOMAIN}"
    msg = db.get_message_by_id(msg_id)
    if not msg or msg["to_addr"] != addr:
        return jsonify({"error": "Not found or forbidden"}), 403
    new_status = db.toggle_star(msg_id)
    return jsonify({"is_starred": bool(new_status)}), 200

@app.route("/messages/<int:msg_id>/attachments/<int:att_id>", methods=["GET"])
@_require_auth
def download_attachment(msg_id: int, att_id: int, current_user: str):
    addr = current_user if "@" in current_user else f"{current_user}@{config.LOCAL_DOMAIN}"
    msg = db.get_message_by_id(msg_id)
    if not msg or (msg["to_addr"] != addr and msg["from_addr"] != addr):
        return jsonify({"error": "Forbidden"}), 403
    
    att = db.get_attachment_data(att_id)
    if not att:
        return jsonify({"error": "Attachment not found"}), 404
    
    return send_file(
        io.BytesIO(att["data"]),
        mimetype=att["content_type"],
        as_attachment=True,
        download_name=att["filename"]
    )

@app.route("/logs/stream", methods=["GET"])
def stream_logs():
    def event_stream():
        q = api.log_handler.sse_handler.subscribe()
        try:
            while True:
                msg = q.get()
                yield f"data: {json.dumps(msg)}\n\n"
        finally:
            api.log_handler.sse_handler.unsubscribe(q)

    resp = Response(
        stream_with_context(event_stream()),
        content_type="text/event-stream",
    )
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp


@app.route("/messages/stream", methods=["GET"])
@_require_auth
def stream_messages(current_user: str):
    def event_stream():
        q = api.log_handler.user_event_broker.subscribe(current_user)
        try:
            yield f"data: {json.dumps({'type': 'connected'})}\n\n"
            while True:
                event = q.get()
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            api.log_handler.user_event_broker.unsubscribe(current_user, q)

    resp = Response(
        stream_with_context(event_stream()),
        content_type="text/event-stream",
    )
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp


@app.route("/messages/<int:msg_id>", methods=["DELETE"])
@_require_auth
def delete_message(msg_id: int, current_user: str):
    addr = current_user.lower() if "@" in current_user else f"{current_user.lower()}@{config.LOCAL_DOMAIN}"
    msg = db.get_message_by_id(msg_id)
    if msg is None:
        return jsonify({"error": "Message not found"}), 404
    if msg["to_addr"] != addr and msg["from_addr"] != addr:
        return jsonify({"error": "Forbidden"}), 403

    if msg["is_deleted"]:
        db.hard_delete_message(msg_id)
        return jsonify({"status": "permanently_deleted"}), 200

    db.soft_delete_message(msg_id)
    return jsonify({"status": "deleted"}), 200


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "domain": config.LOCAL_DOMAIN}), 200


def run() -> None:
    app.run(host=config.API_HOST, port=config.API_PORT, threaded=True, debug=False)
