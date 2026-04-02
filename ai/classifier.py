"""
ai/classifier.py — AI classification pipeline.

Classifies incoming emails into one of six labels:
    Work | Personal | Spam | Finance | Promotions | Social

Uses the Anthropic Claude API (claude-haiku — fast and cheap for this task).
Falls back to keyword heuristics if the API key is not set or the call fails.

Setup:
    pip3 install anthropic
    export ANTHROPIC_API_KEY="sk-ant-..."
"""

import logging
import os
import threading

logger = logging.getLogger(__name__)

VALID_LABELS = {"Work", "Personal", "Spam", "Finance", "Promotions", "Social"}

_SYSTEM_PROMPT = (
    "You are an email classifier. "
    "Classify the given email into exactly one of these six categories: "
    "Work, Personal, Spam, Finance, Promotions, Social. "
    "Reply with only the category name — no explanation, no punctuation."
)


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def classify_async(msg_id: int, subject: str, body: str) -> None:
    """
    Non-blocking entry point. Called by smtp/server.py and api/app.py
    immediately after a message is stored in the DB.
    Spawns a daemon thread and returns.
    """
    t = threading.Thread(
        target=_classify,
        args=(msg_id, subject, body),
        daemon=True,
        name=f"classifier-{msg_id}",
    )
    t.start()


# ---------------------------------------------------------------------------
# Classification worker
# ---------------------------------------------------------------------------

def _classify(msg_id: int, subject: str, body: str) -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()

    if api_key:
        category = _classify_with_llm(subject, body, api_key)
    else:
        logger.warning(
            "ANTHROPIC_API_KEY not set — using keyword fallback for msg %d", msg_id
        )
        category = _keyword_classify(subject, body)

    from database import db
    db.update_category(msg_id, category)
    logger.info("Message %d → '%s'", msg_id, category)


def _classify_with_llm(subject: str, body: str, api_key: str) -> str:
    """Call Claude claude-haiku-4-5 and return a validated category label."""
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        user_content = f"Subject: {subject}\n\nBody:\n{body[:2000]}"

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=16,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )

        raw = message.content[0].text.strip()
        # Normalise capitalisation and validate
        for label in VALID_LABELS:
            if label.lower() == raw.lower():
                return label

        logger.warning("LLM returned unexpected label %r — using fallback", raw)
        return _keyword_classify(subject, body)

    except ImportError:
        logger.warning("'anthropic' package not installed — pip3 install anthropic")
        return _keyword_classify(subject, body)
    except Exception as exc:
        logger.error("LLM classification error: %s", exc)
        return _keyword_classify(subject, body)


# ---------------------------------------------------------------------------
# Keyword fallback
# ---------------------------------------------------------------------------

def _keyword_classify(subject: str, body: str) -> str:
    text = (subject + " " + body).lower()

    if any(w in text for w in (
        "invoice", "payment", "bank", "transaction", "receipt",
        "refund", "wire transfer", "account balance", "credit card",
    )):
        return "Finance"

    if any(w in text for w in (
        "offer", "sale", "discount", "promo", "deal", "% off",
        "unsubscribe", "limited time", "buy now", "shop now",
    )):
        return "Promotions"

    if any(w in text for w in (
        "winner", "lottery", "click here", "free money", "urgent",
        "verify your account", "congratulations you have won",
        "nigerian prince", "claim your prize",
    )):
        return "Spam"

    if any(w in text for w in (
        "meeting", "deadline", "project", "report", "colleague",
        "office", "task", "sprint", "pull request", "ticket",
        "conference", "agenda", "schedule",
    )):
        return "Work"

    if any(w in text for w in (
        "follow", "friend", "like", "comment", "share",
        "twitter", "instagram", "facebook", "linkedin",
        "posted", "tagged you",
    )):
        return "Social"

    return "Personal"
