# Ollama Classifier Benchmark V2

- Total cases: 60
- Total correct: 50
- Total accuracy: 83.33%

## English

- Cases: 30
- Correct: 27
- Accuracy: 90.00%
- Average latency: 512.4 ms

| Label | Precision | Recall | F1 |
| --- | ---: | ---: | ---: |
| Work | 100.00% | 100.00% | 100.00% |
| Personal | 100.00% | 80.00% | 88.89% |
| Spam | 100.00% | 60.00% | 75.00% |
| Finance | 62.50% | 100.00% | 76.92% |
| Promotions | 100.00% | 100.00% | 100.00% |
| Social | 100.00% | 100.00% | 100.00% |

| Expected \ Actual | Work | Personal | Spam | Finance | Promotions | Social |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Work | 5 | 0 | 0 | 0 | 0 | 0 |
| Personal | 0 | 4 | 0 | 1 | 0 | 0 |
| Spam | 0 | 0 | 3 | 2 | 0 | 0 |
| Finance | 0 | 0 | 0 | 5 | 0 | 0 |
| Promotions | 0 | 0 | 0 | 0 | 5 | 0 |
| Social | 0 | 0 | 0 | 0 | 0 | 5 |

Wrong predictions:
- EN09: expected `Personal`, got `Finance` (0.9 ms) tags=refund_word, friends
  Subject: Small refund
- EN13: expected `Spam`, got `Finance` (0.5 ms) tags=impersonation, wire_transfer
  Subject: Urgent private request
- EN15: expected `Spam`, got `Finance` (0.8 ms) tags=refund, fraud
  Subject: Tax refund release

## Turkish

- Cases: 30
- Correct: 23
- Accuracy: 76.67%
- Average latency: 1055.0 ms

| Label | Precision | Recall | F1 |
| --- | ---: | ---: | ---: |
| Work | 100.00% | 80.00% | 88.89% |
| Personal | 45.45% | 100.00% | 62.50% |
| Spam | 80.00% | 80.00% | 80.00% |
| Finance | 100.00% | 60.00% | 75.00% |
| Promotions | 100.00% | 100.00% | 100.00% |
| Social | 100.00% | 40.00% | 57.14% |

| Expected \ Actual | Work | Personal | Spam | Finance | Promotions | Social |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Work | 4 | 1 | 0 | 0 | 0 | 0 |
| Personal | 0 | 5 | 0 | 0 | 0 | 0 |
| Spam | 0 | 1 | 4 | 0 | 0 | 0 |
| Finance | 0 | 1 | 1 | 3 | 0 | 0 |
| Promotions | 0 | 0 | 0 | 0 | 5 | 0 |
| Social | 0 | 3 | 0 | 0 | 0 | 2 |

Wrong predictions:
- TR03: expected `Work`, got `Personal` (1472.3 ms) tags=travel, expense
  Subject: Seyahat notu
- TR13: expected `Spam`, got `Personal` (1190.6 ms) tags=impersonation, wire_transfer
  Subject: Acil yardim
- TR19: expected `Finance`, got `Personal` (1209.5 ms) tags=statement, monthly
  Subject: Ekstre hazir
- TR20: expected `Finance`, got `Spam` (771.4 ms) tags=chargeback, credit
  Subject: Chargeback sonucu
- TR26: expected `Social`, got `Personal` (1058.1 ms) tags=mentions, network
  Subject: Yeni hareketler var
- TR27: expected `Social`, got `Personal` (1064.4 ms) tags=community, messages
  Subject: Kulup guncellemesi
- TR29: expected `Social`, got `Personal` (1201.1 ms) tags=invite, tagged
  Subject: Davet var

