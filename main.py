"""
main.py — Entry point for the AI-Powered E-Mail System.

Starts three servers in daemon threads:
  • SMTP  (port 25  by default)
  • POP3  (port 110 by default)
  • REST API  (port 8080)

Then blocks the main thread until Ctrl-C.

Usage
-----
    # Standard ports (requires root / CAP_NET_BIND_SERVICE on Linux):
    sudo python3 main.py

    # Unprivileged ports for development:
    SMTP_PORT=2525 POP3_PORT=1100 python3 main.py
    or edit config.py directly.
"""

import logging
import os
import sys
import threading

# Allow env-var overrides before importing config so tests can patch ports
if "SMTP_PORT" in os.environ:
    import config; config.SMTP_PORT = int(os.environ["SMTP_PORT"])
if "POP3_PORT" in os.environ:
    import config; config.POP3_PORT = int(os.environ["POP3_PORT"])
if "API_PORT" in os.environ:
    import config; config.API_PORT = int(os.environ["API_PORT"])

import config  # noqa: E402 (import after potential env-var patch)
from database import db
from smtp.server import SMTPServer
from pop3.server import POP3Server
from api.app import run as run_api

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

from api.log_handler import setup_logging
setup_logging()

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

def main() -> None:
    logger.info("Initialising database at %s", config.DB_PATH)
    db.init_db()

    smtp_server = SMTPServer()
    pop3_server = POP3Server()

    threads = [
        threading.Thread(target=smtp_server.start, name="SMTP-Server", daemon=True),
        threading.Thread(target=pop3_server.start, name="POP3-Server", daemon=True),
        threading.Thread(target=run_api, name="REST-API", daemon=True),
    ]

    for t in threads:
        t.start()

    logger.info(
        "All servers started — SMTP:%d  POP3:%d  REST-API:%d",
        config.SMTP_PORT, config.POP3_PORT, config.API_PORT,
    )
    logger.info("Press Ctrl-C to stop.")

    try:
        threading.Event().wait()  # block forever
    except KeyboardInterrupt:
        logger.info("Shutting down.")
        smtp_server.stop()
        pop3_server.stop()


if __name__ == "__main__":
    main()
