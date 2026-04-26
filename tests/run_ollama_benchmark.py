from __future__ import annotations

import json
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.ollama_classifier import VALID_LABELS, classify_email
from tests.ollama_benchmark_cases import CASES


ROOT = Path(__file__).resolve().parent
REPORT_JSON = ROOT / "ollama_benchmark_report.json"
REPORT_MD = ROOT / "ollama_benchmark_report.md"


def per_label_metrics(results: list[dict]) -> dict[str, dict[str, float]]:
    metrics: dict[str, dict[str, float]] = {}
    for label in VALID_LABELS:
        tp = sum(1 for r in results if r["expected"] == label and r["actual"] == label)
        fp = sum(1 for r in results if r["expected"] != label and r["actual"] == label)
        fn = sum(1 for r in results if r["expected"] == label and r["actual"] != label)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
        metrics[label] = {
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
        }
    return metrics


def confusion_matrix(results: list[dict]) -> dict[str, dict[str, int]]:
    matrix = {expected: {actual: 0 for actual in VALID_LABELS} for expected in VALID_LABELS}
    for row in results:
        matrix[row["expected"]][row["actual"]] += 1
    return matrix


def tag_breakdown(results: list[dict]) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in results:
        for tag in row["tags"]:
            grouped[tag].append(row)

    breakdown = []
    for tag, rows in sorted(grouped.items()):
        correct = sum(1 for row in rows if row["is_correct"])
        breakdown.append(
            {
                "tag": tag,
                "count": len(rows),
                "correct": correct,
                "accuracy": round(correct / len(rows), 4),
            }
        )
    return breakdown


def render_markdown(summary: dict) -> str:
    lines = []
    lines.append("# Ollama Classifier Benchmark")
    lines.append("")
    lines.append(f"- Cases: {summary['total_cases']}")
    lines.append(f"- Correct: {summary['correct_cases']}")
    lines.append(f"- Accuracy: {summary['accuracy']:.2%}")
    lines.append(f"- Average latency: {summary['average_latency_ms']:.1f} ms")
    lines.append("")
    lines.append("## Per-label metrics")
    lines.append("")
    lines.append("| Label | Precision | Recall | F1 |")
    lines.append("| --- | ---: | ---: | ---: |")
    for label, stats in summary["per_label"].items():
        lines.append(
            f"| {label} | {stats['precision']:.2%} | {stats['recall']:.2%} | {stats['f1']:.2%} |"
        )
    lines.append("")
    lines.append("## Confusion matrix")
    lines.append("")
    lines.append("| Expected \\ Actual | " + " | ".join(VALID_LABELS) + " |")
    lines.append("| --- |" + " ---: |" * len(VALID_LABELS))
    for expected in VALID_LABELS:
        row = [str(summary["confusion_matrix"][expected][actual]) for actual in VALID_LABELS]
        lines.append(f"| {expected} | " + " | ".join(row) + " |")
    lines.append("")
    lines.append("## Wrong predictions")
    lines.append("")
    if not summary["wrong_cases"]:
        lines.append("No wrong predictions.")
    else:
        for row in summary["wrong_cases"]:
            lines.append(
                f"- {row['id']}: expected `{row['expected']}`, got `{row['actual']}` "
                f"({row['latency_ms']:.1f} ms) tags={', '.join(row['tags'])}"
            )
            lines.append(f"  Subject: {row['subject']}")
    lines.append("")
    lines.append("## Hardest tags")
    lines.append("")
    for row in sorted(summary["tag_breakdown"], key=lambda item: (item["accuracy"], -item["count"]))[:15]:
        lines.append(
            f"- `{row['tag']}`: {row['correct']}/{row['count']} correct ({row['accuracy']:.2%})"
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    results = []
    started_at = time.perf_counter()

    for case in CASES:
        t0 = time.perf_counter()
        actual = classify_email(case["subject"], case["body"])
        latency_ms = (time.perf_counter() - t0) * 1000
        results.append(
            {
                **case,
                "actual": actual,
                "latency_ms": round(latency_ms, 2),
                "is_correct": actual == case["expected"],
            }
        )
        print(
            f"{case['id']}: expected={case['expected']:<11} actual={actual:<11} "
            f"ok={actual == case['expected']} latency_ms={latency_ms:.1f}"
        )

    total_ms = (time.perf_counter() - started_at) * 1000
    correct_cases = sum(1 for row in results if row["is_correct"])
    summary = {
        "total_cases": len(results),
        "correct_cases": correct_cases,
        "accuracy": correct_cases / len(results),
        "total_runtime_ms": round(total_ms, 2),
        "average_latency_ms": round(sum(r["latency_ms"] for r in results) / len(results), 2),
        "per_label": per_label_metrics(results),
        "confusion_matrix": confusion_matrix(results),
        "wrong_cases": [row for row in results if not row["is_correct"]],
        "tag_breakdown": tag_breakdown(results),
        "prediction_counts": dict(Counter(row["actual"] for row in results)),
        "results": results,
    }

    REPORT_JSON.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    REPORT_MD.write_text(render_markdown(summary), encoding="utf-8")

    print("")
    print(f"Accuracy: {summary['accuracy']:.2%} ({summary['correct_cases']}/{summary['total_cases']})")
    print(f"Average latency: {summary['average_latency_ms']:.1f} ms")
    print(f"Report JSON: {REPORT_JSON}")
    print(f"Report MD: {REPORT_MD}")


if __name__ == "__main__":
    main()
