"""
auth/utils.py — Password hashing and API token helpers.

Using SHA-256 for simplicity in this course project.
To upgrade to bcrypt, change only hash_password() and verify_password().
"""

import hashlib
import hmac
import time

import config


def hash_password(plaintext: str) -> str:
    """Return the SHA-256 hex digest of a plaintext password."""
    return hashlib.sha256(plaintext.encode("utf-8")).hexdigest()


def verify_password(plaintext: str, stored_hash: str) -> bool:
    """Constant-time comparison to prevent timing attacks."""
    return hmac.compare_digest(hash_password(plaintext), stored_hash)


# ---------------------------------------------------------------------------
# Simple stateless API tokens
# ---------------------------------------------------------------------------

def generate_token(username: str) -> str:
    """
    Produce a token of the form: sha256(username:timestamp:secret).
    The timestamp is embedded in the token so it can be extracted for
    expiry checks without a token store.
    """
    ts = str(int(time.time()))
    raw = f"{username.lower()}:{ts}:{config.API_SECRET}"
    digest = hashlib.sha256(raw.encode()).hexdigest()
    # Return as "username:timestamp:digest" so the receiver can re-derive
    return f"{username.lower()}:{ts}:{digest}"


def verify_token(token: str) -> str | None:
    """
    Validate a token and return the username if valid, else None.
    Tokens expire after 24 hours.
    """
    try:
        username, ts, digest = token.split(":", 2)
    except ValueError:
        return None

    # Check expiry (24 h)
    if time.time() - int(ts) > 86400:
        return None

    raw = f"{username}:{ts}:{config.API_SECRET}"
    expected = hashlib.sha256(raw.encode()).hexdigest()
    if hmac.compare_digest(expected, digest):
        return username
    return None
