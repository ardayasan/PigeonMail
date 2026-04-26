"""
Compatibility wrapper for the Ollama-based mail classifier.

Use ai.ollama_classifier directly for new code.
"""

from .ollama_classifier import classify_async, classify_email

__all__ = ["classify_async", "classify_email"]
