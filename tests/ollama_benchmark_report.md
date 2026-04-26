# Ollama Classifier Benchmark

- Cases: 100
- Correct: 94
- Accuracy: 94.00%
- Average latency: 552.1 ms

## Per-label metrics

| Label | Precision | Recall | F1 |
| --- | ---: | ---: | ---: |
| Work | 94.12% | 94.12% | 94.12% |
| Personal | 93.75% | 88.24% | 90.91% |
| Spam | 100.00% | 82.35% | 90.32% |
| Finance | 80.95% | 100.00% | 89.47% |
| Promotions | 100.00% | 100.00% | 100.00% |
| Social | 100.00% | 100.00% | 100.00% |

## Confusion matrix

| Expected \ Actual | Work | Personal | Spam | Finance | Promotions | Social |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Work | 16 | 0 | 0 | 1 | 0 | 0 |
| Personal | 1 | 15 | 0 | 1 | 0 | 0 |
| Spam | 0 | 1 | 14 | 2 | 0 | 0 |
| Finance | 0 | 0 | 0 | 17 | 0 | 0 |
| Promotions | 0 | 0 | 0 | 0 | 16 | 0 |
| Social | 0 | 0 | 0 | 0 | 0 | 16 |

## Wrong predictions

- W08: expected `Work`, got `Finance` (1.2 ms) tags=receipt, corporate_expense
  Subject: Receipt and expense item
- P04: expected `Personal`, got `Work` (0.8 ms) tags=ticket_word, events
  Subject: Concert ticket
- P05: expected `Personal`, got `Finance` (1.0 ms) tags=refund_word, friends
  Subject: Small refund
- S07: expected `Spam`, got `Finance` (0.8 ms) tags=refund, fraud
  Subject: Important tax message
- S08: expected `Spam`, got `Personal` (1053.0 ms) tags=attachment_bait, malicious
  Subject: Document shared with you
- S13: expected `Spam`, got `Finance` (3.5 ms) tags=impersonation, wire_transfer
  Subject: Urgent assistance needed

## Hardest tags

- `attachment_bait`: 0/1 correct (0.00%)
- `corporate_expense`: 0/1 correct (0.00%)
- `events`: 0/1 correct (0.00%)
- `fraud`: 0/1 correct (0.00%)
- `malicious`: 0/1 correct (0.00%)
- `refund_word`: 0/1 correct (0.00%)
- `ticket_word`: 0/1 correct (0.00%)
- `impersonation`: 1/2 correct (50.00%)
- `refund`: 1/2 correct (50.00%)
- `wire_transfer`: 1/2 correct (50.00%)
- `friends`: 2/3 correct (66.67%)
- `receipt`: 4/5 correct (80.00%)
- `family`: 4/4 correct (100.00%)
- `discount`: 3/3 correct (100.00%)
- `mixed_personal`: 3/3 correct (100.00%)
