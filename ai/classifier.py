"""
ai/classifier.py — Local AI classification pipeline.

Classifies incoming emails into one of six labels:
    Work | Personal | Spam | Finance | Promotions | Social

Uses Hugging Face Transformers zero-shot classification (facebook/bart-large-mnli).
Falls back to keyword heuristics if the model fails or is unavailable.
"""

import logging
import threading

logger = logging.getLogger(__name__)

VALID_LABELS = ["Work", "Personal", "Spam", "Finance", "Promotions", "Social"]

# Global variable for lazy loading the model pipeline
_classifier_pipeline = None
_pipeline_lock = threading.Lock()

def _get_classifier():
    """Lazy load the Hugging Face zero-shot classification pipeline."""
    global _classifier_pipeline
    if _classifier_pipeline is None:
        with _pipeline_lock:
            # Double check inside lock to prevent race conditions
            if _classifier_pipeline is None:
                try:
                    from transformers import pipeline
                    logger.info("Initializing Hugging Face zero-shot classifier (facebook/bart-large-mnli)...")
                    _classifier_pipeline = pipeline(
                        "zero-shot-classification",
                        model="facebook/bart-large-mnli"
                    )
                except ImportError:
                    logger.warning("'transformers' package not installed. Fallback to keywords will be used.")
                    raise
                except Exception as e:
                    logger.error("Failed to load Hugging Face model: %s", e)
                    raise
    return _classifier_pipeline


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def classify_async(msg_id: int, subject: str, body: str) -> None:
    """
    Non-blocking entry point. Called by smtp/server.py
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
    try:
        category = _classify_with_hf(subject, body)
    except Exception as e:
        logger.warning(
            "Hugging Face classification failed for msg %d (%s) — using keyword fallback.", msg_id, e
        )
        category = _keyword_classify(subject, body)

    from database import db
    db.update_category(msg_id, category)
    logger.info("Message %d → '%s'", msg_id, category)


def _classify_with_hf(subject: str, body: str) -> str:
    """Call Hugging Face zero-shot pipeline and return the best category."""
    classifier = _get_classifier()
    
    # Combine subject and body, truncate to avoid blowing up the token context window limit
    # BART-large supports up to ~1024 tokens. 2500 chars is broadly safe.
    text_to_classify = f"Subject: {subject}\n\nBody:\n{body}"[:2500]
    
    result = classifier(
        text_to_classify,
        candidate_labels=VALID_LABELS,
        multi_label=False # Forces softmax across just these candidates
    )
    
    # The pipeline sorts the labels by descending confidence score
    top_label = result['labels'][0]
    
    if top_label not in VALID_LABELS:
        raise ValueError(f"Extracted label {top_label} is not in VALID_LABELS")
        
    return top_label


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
