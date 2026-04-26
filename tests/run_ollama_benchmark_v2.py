from __future__ import annotations

import json
import sys
import time
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.ollama_classifier import VALID_LABELS, classify_email
from tests.ollama_benchmark_cases_v2 import CASES_V2


ROOT = Path(__file__).resolve().parent
REPORT_JSON = ROOT / "ollama_benchmark_v2_report.json"
REPORT_MD = ROOT / "ollama_benchmark_v2_report.md"


def metrics_for(rows: list[dict]) -> dict:
    correct = sum(1 for r in rows if r["is_correct"])
    confusion = {exp: {act: 0 for act in VALID_LABELS} for exp in VALID_LABELS}
    for row in rows:
        confusion[row["expected"]][row["actual"]] += 1

    per_label = {}
    for label in VALID_LABELS:
        tp = sum(1 for r in rows if r["expected"] == label and r["actual"] == label)
        fp = sum(1 for r in rows if r["expected"] != label and r["actual"] == label)
        fn = sum(1 for r in rows if r["expected"] == label and r["actual"] != label)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
        per_label[label] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
        }

    return {
        "cases": len(rows),
        "correct": correct,
        "accuracy": round(correct / len(rows), 4) if rows else 0.0,
        "avg_latency_ms": round(sum(r["latency_ms"] for r in rows) / len(rows), 2) if rows else 0.0,
        "confusion": confusion,
        "per_label": per_label,
        "wrong_cases": [r for r in rows if not r["is_correct"]],
    }


def render_language_section(name: str, stats: dict) -> list[str]:
    lines = []
    lines.append(f"## {name}")
    lines.append("")
    lines.append(f"- Cases: {stats['cases']}")
    lines.append(f"- Correct: {stats['correct']}")
    lines.append(f"- Accuracy: {stats['accuracy']:.2%}")
    lines.append(f"- Average latency: {stats['avg_latency_ms']:.1f} ms")
    lines.append("")
    lines.append("| Label | Precision | Recall | F1 |")
    lines.append("| --- | ---: | ---: | ---: |")
    for label, m in stats["per_label"].items():
        lines.append(f"| {label} | {m['precision']:.2%} | {m['recall']:.2%} | {m['f1']:.2%} |")
    lines.append("")
    lines.append("| Expected \\ Actual | " + " | ".join(VALID_LABELS) + " |")
    lines.append("| --- |" + " ---: |" * len(VALID_LABELS))
    for expected in VALID_LABELS:
        vals = [str(stats["confusion"][expected][actual]) for actual in VALID_LABELS]
        lines.append(f"| {expected} | " + " | ".join(vals) + " |")
    lines.append("")
    lines.append("Wrong predictions:")
    if not stats["wrong_cases"]:
        lines.append("- None")
    else:
        for row in stats["wrong_cases"]:
            lines.append(
                f"- {row['id']}: expected `{row['expected']}`, got `{row['actual']}` "
                f"({row['latency_ms']:.1f} ms) tags={', '.join(row['tags'])}"
            )
            lines.append(f"  Subject: {row['subject']}")
    lines.append("")
    return lines


def main() -> None:
    results = []
    started = time.perf_counter()

    for case in CASES_V2:
        t0 = time.perf_counter()
        actual = classify_email(case["subject"], case["body"])
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        row = {**case, "actual": actual, "latency_ms": latency_ms, "is_correct": actual == case["expected"]}
        results.append(row)
        print(
            f"{case['id']} [{case['lang']}]: expected={case['expected']:<11} "
            f"actual={actual:<11} ok={row['is_correct']} latency_ms={latency_ms:.1f}"
        )

    by_lang = defaultdict(list)
    for row in results:
        by_lang[row["lang"]].append(row)

    summary = {
        "total_cases": len(results),
        "total_correct": sum(1 for r in results if r["is_correct"]),
        "total_accuracy": round(sum(1 for r in results if r["is_correct"]) / len(results), 4),
        "total_runtime_ms": round((time.perf_counter() - started) * 1000, 2),
        "english": metrics_for(by_lang["en"]),
        "turkish": metrics_for(by_lang["tr"]),
        "results": results,
    }

    REPORT_JSON.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    lines = ["# Ollama Classifier Benchmark V2", ""]
    lines.append(f"- Total cases: {summary['total_cases']}")
    lines.append(f"- Total correct: {summary['total_correct']}")
    lines.append(f"- Total accuracy: {summary['total_accuracy']:.2%}")
    lines.append("")
    lines.extend(render_language_section("English", summary["english"]))
    lines.extend(render_language_section("Turkish", summary["turkish"]))
    REPORT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print("")
    print(f"English accuracy: {summary['english']['accuracy']:.2%} ({summary['english']['correct']}/{summary['english']['cases']})")
    print(f"Turkish accuracy: {summary['turkish']['accuracy']:.2%} ({summary['turkish']['correct']}/{summary['turkish']['cases']})")
    print(f"Report JSON: {REPORT_JSON}")
    print(f"Report MD: {REPORT_MD}")


if __name__ == "__main__":
    main()
