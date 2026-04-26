"""
ai/ollama_classifier.py — Ollama-based email classification pipeline.

Primary path:
    1. Deterministic rule overrides for obvious cases
    2. Ollama structured-output classification
    3. Guardrail validation and low-confidence fallback

The final label is always one of:
    Work | Personal | Spam | Finance | Promotions | Social
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
import urllib.error
import urllib.request
from typing import Dict, Iterable, Optional

logger = logging.getLogger(__name__)

VALID_LABELS = ["Work", "Personal", "Spam", "Finance", "Promotions", "Social"]

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_CLASSIFIER_TIMEOUT", "45"))
MAX_TEXT_CHARS = 4000
MIN_CONFIDENCE = 0.62
POST_CHECK_PERSONAL_LIMIT = 0.80
MIN_KEYWORD_WIN_SCORES = {
    "Work": 2.2,
    "Personal": 0.8,
    "Spam": 2.2,
    "Finance": 2.6,
    "Promotions": 2.2,
    "Social": 2.2,
}
DEFAULT_MODEL = os.getenv("OLLAMA_CLASSIFIER_MODEL", "").strip()

MODEL_CANDIDATES = (
    "qwen2.5:14b",
    "qwen2.5:7b",
    "llama3.1:8b",
    "qwen2.5:3b",
    "llama3.2:3b",
)

MODEL_SELECTION_LOCK = threading.Lock()
SELECTED_MODEL: Optional[str] = None
TAGS_CACHE: Optional[set[str]] = None

WORD_BOUNDARY = r"(?<!\w){token}(?!\w)"
SPACE_FLEX = r"(?:[\s_\-/]+)"

LABEL_GUIDANCE = {
    "Work": (
        "Job, project, meeting, deadline, tasks, workplace coordination, "
        "engineering, client delivery, reports, tickets, pull requests."
    ),
    "Personal": (
        "Private person-to-person communication that is not work, finance, "
        "promotion, spam, or social notification."
    ),
    "Spam": (
        "Scam, phishing, fraud, malicious urgency, suspicious verification, "
        "fake rewards, deceptive links."
    ),
    "Finance": (
        "Invoices, payments, receipts, billing, refunds, subscription charges, "
        "banking, account balances, transactions."
    ),
    "Promotions": (
        "Marketing, discounts, deals, offers, newsletters, shopping, sales, "
        "coupons, buy-now messaging."
    ),
    "Social": (
        "Likes, comments, follows, connection requests, mentions, invitations, "
        "community or social-network notifications."
    ),
}

KEYWORD_WEIGHTS: Dict[str, Dict[str, float]] = {
    "Personal": {
        "love": 2.2,
        "weekend": 1.8,
        "dinner": 1.3,
        "jacket": 1.7,
        "book": 1.1,
        "camera": 1.1,
        "no rush": 1.4,
        "are you free": 1.7,
        "sunday": 1.2,
        "family": 1.6,
        "birthday": 1.6,
        "miss you": 2.0,
    },
    "Finance": {
        "invoice": 2.7,
        "payment": 2.5,
        "receipt": 2.2,
        "refund": 2.2,
        "billing": 2.0,
        "statement": 1.8,
        "bank": 2.0,
        "transaction": 2.4,
        "wire transfer": 3.1,
        "account balance": 2.7,
        "credit card": 2.5,
        "debit card": 2.5,
        "subscription renewal": 2.0,
        "renewal receipt": 2.4,
    },
    "Promotions": {
        "offer": 1.8,
        "discount": 2.4,
        "sale": 2.2,
        "deal": 2.0,
        "coupon": 2.1,
        "promo": 2.0,
        "unsubscribe": 2.0,
        "limited time": 2.2,
        "buy now": 2.5,
        "shop now": 2.5,
        "exclusive offer": 2.5,
        "special offer": 2.5,
        "save big": 2.3,
        "% off": 2.6,
        "newsletter": 1.7,
    },
    "Spam": {
        "winner": 2.3,
        "lottery": 3.2,
        "click here": 2.1,
        "free money": 3.5,
        "urgent": 1.5,
        "verify your information": 3.0,
        "verify your identity": 3.0,
        "verify your account": 3.5,
        "verification notice": 2.8,
        "security notice": 1.8,
        "unusual activity": 2.8,
        "suspicious activity": 2.8,
        "limited access": 2.5,
        "avoid interruption": 2.2,
        "secure portal": 2.6,
        "confirmation page": 2.6,
        "reward": 1.8,
        "congratulations you have won": 3.6,
        "nigerian prince": 4.5,
        "claim your prize": 3.8,
        "phishing": 3.2,
        "crypto giveaway": 3.0,
        "suspended account": 2.7,
        "act now": 1.8,
        "password reset": 1.2,
    },
    "Work": {
        "meeting": 2.3,
        "deadline": 2.6,
        "project": 2.3,
        "sprint": 2.5,
        "ticket": 2.2,
        "pull request": 3.0,
        "report": 2.0,
        "agenda": 2.0,
        "deliverable": 2.6,
        "milestone": 2.4,
        "backend team": 2.8,
        "integration tests": 2.9,
        "assigned tasks": 2.8,
        "colleague": 1.8,
        "office": 1.8,
        "conference": 1.8,
        "schedule": 1.3,
        "team": 1.0,
        "client": 1.4,
        "roadmap": 2.1,
        "deployment": 2.5,
    },
    "Social": {
        "follow": 1.8,
        "friend request": 2.4,
        "like": 1.7,
        "comment": 1.8,
        "share": 1.3,
        "tagged you": 2.5,
        "mentioned you": 2.3,
        "invited you to connect": 2.7,
        "notification": 1.2,
        "instagram": 2.4,
        "facebook": 2.4,
        "linkedin": 2.6,
        "twitter": 2.3,
        "x.com": 1.8,
        "discord": 2.2,
        "community": 1.6,
    },
}

STRONG_SIGNAL_THRESHOLDS: Dict[str, float] = {
    "Spam": 3.2,
    "Finance": 3.0,
    "Promotions": 3.2,
    "Work": 3.5,
    "Social": 3.2,
}

WORK_SIGNALS = (
    "meeting",
    "deadline",
    "project",
    "sprint",
    "ticket",
    "pull request",
    "report",
    "agenda",
    "deliverable",
    "milestone",
    "backend team",
    "integration tests",
    "assigned tasks",
    "team",
)

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": VALID_LABELS},
        "confidence": {"type": "number"},
        "reason": {"type": "string"},
    },
    "required": ["category", "confidence", "reason"],
}


def _compile_pattern(term: str) -> re.Pattern[str]:
    escaped_parts = [re.escape(part) for part in term.split()]
    token_pattern = SPACE_FLEX.join(escaped_parts)
    if term == "% off":
        token_pattern = r"\d+\s*%\s*off"
    return re.compile(WORD_BOUNDARY.format(token=token_pattern), re.IGNORECASE)


KEYWORD_PATTERNS: Dict[str, Dict[str, re.Pattern[str]]] = {
    label: {term: _compile_pattern(term) for term in weights}
    for label, weights in KEYWORD_WEIGHTS.items()
}


def classify_async(msg_id: int, subject: str, body: str) -> None:
    t = threading.Thread(
        target=_classify_and_store,
        args=(msg_id, subject, body),
        daemon=True,
        name=f"ollama-classifier-{msg_id}",
    )
    t.start()


def classify_email(subject: str, body: str) -> str:
    subject_text, body_text, prompt_text = _prepare_text(subject, body)
    if not prompt_text.strip():
        return "Personal"

    keyword_scores = _keyword_scores(subject_text, body_text)
    hard_label = _rule_override(keyword_scores)
    if hard_label is not None:
        logger.info("Rule override matched -> %s", hard_label)
        return hard_label

    try:
        model = _select_model()
        payload = _build_payload(model, prompt_text)
        response = _post_json("/api/chat", payload)
        parsed = _parse_ollama_response(response)
        category = parsed["category"]
        confidence = _coerce_confidence(parsed.get("confidence"))
        category = _validate_category(category)

        logger.info(
            "Ollama predicted %s with confidence %.4f using model %s",
            category,
            confidence,
            model,
        )

        if confidence < MIN_CONFIDENCE:
            fallback = _keyword_winner(keyword_scores)
            logger.info(
                "Low Ollama confidence %.4f; using keyword fallback -> %s",
                confidence,
                fallback,
            )
            return fallback

        return _post_check_override(category, prompt_text, confidence, keyword_scores)
    except Exception as exc:
        fallback = _keyword_winner(keyword_scores)
        logger.warning("Ollama classification failed (%s) -> %s", exc, fallback)
        return fallback


def _classify_and_store(msg_id: int, subject: str, body: str) -> None:
    category = classify_email(subject, body)
    from database import db
    from api.log_handler import user_event_broker

    db.update_category(msg_id, category)
    logger.info("Message %d -> '%s'", msg_id, category)

    msg = db.get_message_by_id(msg_id)
    if not msg:
        return

    payload = {
        "type": "message_updated",
        "message_id": msg_id,
        "category": category,
    }
    sender = msg["from_addr"].split("@", 1)[0].lower()
    recipient = msg["to_addr"].split("@", 1)[0].lower()
    user_event_broker.publish(recipient, payload)
    if sender != recipient:
        user_event_broker.publish(sender, payload)


def _prepare_text(subject: str, body: str) -> tuple[str, str, str]:
    subject_text = _normalize_text(subject)
    body_text = _normalize_text(body)
    text = f"Subject: {subject_text}\n\nBody:\n{body_text}".strip()
    return subject_text, body_text, text[:MAX_TEXT_CHARS]


def _normalize_text(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("&nbsp;", " ")
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _rule_override(keyword_scores: Dict[str, float]) -> Optional[str]:
    for label in ("Spam", "Finance", "Promotions", "Social", "Work"):
        if keyword_scores[label] >= STRONG_SIGNAL_THRESHOLDS[label]:
            return label
    return None


def _sum_matches(
    text: str,
    patterns: Dict[str, re.Pattern[str]],
    weights: Dict[str, float],
) -> float:
    total = 0.0
    for term, pattern in patterns.items():
        if pattern.search(text):
            total += weights[term]
    return total


def _keyword_scores(subject: str, body: str) -> Dict[str, float]:
    full_text = f"{subject}\n{body}".strip()
    scores = {label: 0.0 for label in VALID_LABELS}

    for label, weights in KEYWORD_WEIGHTS.items():
        patterns = KEYWORD_PATTERNS[label]
        subject_score = _sum_matches(subject, patterns, weights)
        body_score = _sum_matches(body, patterns, weights)
        full_score = _sum_matches(full_text, patterns, weights)
        scores[label] = max(full_score, subject_score * 1.6 + body_score)

    if all(score == 0.0 for label, score in scores.items() if label != "Personal"):
        scores["Personal"] = 0.2

    return scores


def _keyword_winner(keyword_scores: Dict[str, float]) -> str:
    winner = max(VALID_LABELS, key=lambda label: keyword_scores.get(label, 0.0))
    if keyword_scores[winner] < MIN_KEYWORD_WIN_SCORES[winner]:
        return "Personal"
    if winner == "Finance" and keyword_scores["Personal"] >= 1.6 and keyword_scores["Finance"] < 3.0:
        return "Personal"
    if winner == "Promotions" and keyword_scores["Personal"] >= 1.8 and keyword_scores["Promotions"] < 3.0:
        return "Personal"
    return winner


def _post_check_override(
    predicted_label: str,
    text: str,
    confidence: float,
    keyword_scores: Dict[str, float],
) -> str:
    lowered = text.lower()
    if predicted_label == "Personal" and confidence < POST_CHECK_PERSONAL_LIMIT:
        if keyword_scores["Work"] >= 2.5 or any(token in lowered for token in WORK_SIGNALS):
            logger.info("Post-check override: Personal -> Work")
            return "Work"
    return predicted_label


def _select_model() -> str:
    global SELECTED_MODEL

    if DEFAULT_MODEL:
        return DEFAULT_MODEL

    if SELECTED_MODEL is not None:
        return SELECTED_MODEL

    with MODEL_SELECTION_LOCK:
        if SELECTED_MODEL is not None:
            return SELECTED_MODEL

        tags = _available_models()
        for candidate in MODEL_CANDIDATES:
            if candidate in tags:
                SELECTED_MODEL = candidate
                logger.info("Selected Ollama model %s", candidate)
                return candidate

        if tags:
            SELECTED_MODEL = sorted(tags)[0]
            logger.warning(
                "Preferred Ollama models not found; falling back to installed model %s",
                SELECTED_MODEL,
            )
            return SELECTED_MODEL

        raise RuntimeError(
            "No Ollama models available. Install one with e.g. "
            "'ollama pull qwen2.5:7b' or set OLLAMA_CLASSIFIER_MODEL."
        )


def _available_models() -> set[str]:
    global TAGS_CACHE

    if TAGS_CACHE is not None:
        return TAGS_CACHE

    response = _get_json("/api/tags")
    models = set()
    for model in response.get("models", []):
        name = model.get("name")
        if isinstance(name, str) and name:
            models.add(name)

    TAGS_CACHE = models
    return models


def _build_payload(model: str, prompt_text: str) -> dict:
    rubric = "\n".join(f"- {label}: {guidance}" for label, guidance in LABEL_GUIDANCE.items())
    user_prompt = (
        "Classify the email into exactly one category.\n"
        "Return JSON only and follow the schema exactly.\n"
        "Use these categories and definitions:\n"
        f"{rubric}\n\n"
        "Rules:\n"
        "- Prefer Spam for deceptive verification or fake reward emails.\n"
        "- Prefer Finance for billing, invoices, receipts, refunds, or account charges.\n"
        "- Prefer Promotions for marketing emails even when they mention account benefits.\n"
        "- Prefer Social for platform notifications such as follows, comments, mentions, tags, or invites.\n"
        "- Prefer Work for project, team, meeting, engineering, or client coordination.\n"
        "- Prefer Personal only when the email is genuinely person-to-person and none of the above dominate.\n\n"
        f"Email:\n{prompt_text}"
    )
    return {
        "model": model,
        "stream": False,
        "format": OUTPUT_SCHEMA,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a strict email classifier. "
                    "Return valid JSON only. Choose one category."
                ),
            },
            {"role": "user", "content": user_prompt},
        ],
        "options": {"temperature": 0},
    }


def _post_json(path: str, payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{OLLAMA_HOST}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Ollama HTTP {exc.code}: {details}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Ollama connection error: {exc.reason}") from exc


def _get_json(path: str) -> dict:
    request = urllib.request.Request(
        f"{OLLAMA_HOST}{path}",
        headers={"Accept": "application/json"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Ollama HTTP {exc.code}: {details}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Ollama connection error: {exc.reason}") from exc


def _parse_ollama_response(response: dict) -> dict:
    message = response.get("message")
    if not isinstance(message, dict):
        raise ValueError("Ollama response missing message object")

    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise ValueError("Ollama response missing content")

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Ollama returned non-JSON content: {content!r}") from exc

    if not isinstance(parsed, dict):
        raise ValueError("Ollama JSON content must be an object")

    return parsed


def _validate_category(category: str) -> str:
    if category not in VALID_LABELS:
        raise ValueError(f"Unexpected category: {category!r}")
    return category


def _coerce_confidence(value: object) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid confidence value: {value!r}") from exc
    return max(0.0, min(1.0, confidence))


def _matched_terms(label: str, text: str) -> Iterable[str]:
    patterns = KEYWORD_PATTERNS[label]
    return [term for term, pattern in patterns.items() if pattern.search(text)]
