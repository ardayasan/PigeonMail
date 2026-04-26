import json
import unittest
from unittest.mock import patch

from ai import ollama_classifier


class KeywordGuardrailTests(unittest.TestCase):
    def test_strong_finance_signal_bypasses_model(self):
        label = ollama_classifier.classify_email(
            "Invoice reminder",
            "Please review the invoice, billing statement, and payment receipt.",
        )
        self.assertEqual(label, "Finance")

    def test_weak_schedule_signal_does_not_force_work(self):
        scores = ollama_classifier._keyword_scores(
            "Flight itinerary",
            "Your boarding gate changed. Please review the schedule.",
        )
        self.assertEqual(ollama_classifier._keyword_winner(scores), "Personal")

    def test_personal_prediction_is_corrected_to_work(self):
        corrected = ollama_classifier._post_check_override(
            "Personal",
            "Subject: check-in Body: please review the sprint ticket before the milestone",
            0.70,
            {"Work": 4.0, "Personal": 0.2, "Spam": 0.0, "Finance": 0.0, "Promotions": 0.0, "Social": 0.0},
        )
        self.assertEqual(corrected, "Work")

    def test_personal_mail_with_receipt_stays_personal(self):
        label = ollama_classifier.classify_email(
            "Sunday plan",
            (
                "Hey, are you still free on Sunday? We can cook at home. "
                "I found the receipt from dinner last week and can send the exact amount later, "
                "but no rush. I still have your jacket and book here. Love, E"
            ),
        )
        self.assertEqual(label, "Personal")

    def test_phishing_style_security_notice_is_spam(self):
        label = ollama_classifier.classify_email(
            "Final verification notice",
            (
                "We identified unusual activity associated with your account and limited access "
                "to secure features. To avoid interruption, verify your information today using "
                "the secure portal below and complete the confirmation page."
            ),
        )
        self.assertEqual(label, "Spam")


class OllamaResponseTests(unittest.TestCase):
    def test_structured_response_is_used_when_confident(self):
        with patch.object(ollama_classifier, "_select_model", return_value="qwen2.5:7b"), patch.object(
            ollama_classifier,
            "_post_json",
            return_value={
                "message": {
                    "content": json.dumps(
                        {
                            "category": "Social",
                            "confidence": 0.93,
                            "reason": "Platform notification about comments and mentions.",
                        }
                    )
                }
            },
        ):
            label = ollama_classifier.classify_email(
                "You have updates waiting",
                "Someone mentioned you in a discussion and commented on your post.",
            )
        self.assertEqual(label, "Social")

    def test_low_confidence_response_falls_back_to_keywords(self):
        with patch.object(ollama_classifier, "_select_model", return_value="qwen2.5:7b"), patch.object(
            ollama_classifier,
            "_post_json",
            return_value={
                "message": {
                    "content": json.dumps(
                        {
                            "category": "Personal",
                            "confidence": 0.31,
                            "reason": "Uncertain.",
                        }
                    )
                }
            },
        ):
            label = ollama_classifier.classify_email(
                "Sprint milestone",
                "We need to finalize the deliverable and review the pull request.",
            )
        self.assertEqual(label, "Work")

    def test_invalid_json_response_falls_back_to_keywords(self):
        with patch.object(ollama_classifier, "_select_model", return_value="qwen2.5:7b"), patch.object(
            ollama_classifier,
            "_post_json",
            return_value={"message": {"content": "not json"}},
        ):
            label = ollama_classifier.classify_email(
                "Limited time offer",
                "Save big today only. Unsubscribe anytime.",
            )
        self.assertEqual(label, "Promotions")


if __name__ == "__main__":
    unittest.main()
