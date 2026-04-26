# config.py — Central configuration for the mail server
# Change ports here if running as non-root (e.g. SMTP_PORT = 2525, POP3_PORT = 1100)

from pathlib import Path

SMTP_HOST = "0.0.0.0"
SMTP_PORT = 2525

POP3_HOST = "0.0.0.0"
POP3_PORT = 1100

API_HOST = "0.0.0.0"
API_PORT = 8080

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = str(BASE_DIR / "mail.db")

# Local domain — only deliver mail addressed to this domain
LOCAL_DOMAIN = "localhost"

# Maximum message size in bytes (10 MB)
MAX_MESSAGE_SIZE = 10 * 1024 * 1024

# Idle session limits for socket-based protocols
SMTP_IDLE_TIMEOUT_SECONDS = 120
SMTP_DATA_TIMEOUT_SECONDS = 180
POP3_IDLE_TIMEOUT_SECONDS = 120

# Secret used for REST API token generation
API_SECRET = "change-me-in-production"
