# 8 floors x 3 schools: before/after (monster-mechanics harness)

Before: tree 3b64a74e (git archive) with the same harness copy. After: the worktree HEAD at the time of the run. Started 2026-11-08T06:41:10 (before) and 2026-11-08T06:41:05 (after).
Fixed fixtures, entry mode, seeds 101/211/307/401. Route mapping: qi = qi route; formation = 纯剑阵 route (周天 with 两仪); yujian = 御剑 route (new in this pass).
A cell marked `(=qi)` means the fixture was identical to the qi fixture and was not run again; its cell repeats the qi run.

| floor | route | before | after |
|---|---|---|---|
| 1 | qi | 4/4 won, median 832s | 4/4 won, median 832s |
| 1 | formation | 4/4 won, median 832s (=qi) | 4/4 won, median 832s (=qi) |
| 1 | yujian | 4/4 won, median 832s (=qi) | 4/4 won, median 832s (=qi) |
| 2 | qi | 4/4 won, median 838s | 4/4 won, median 838s |
| 2 | formation | 1/4 won, median 1132s ; 101:lost@w17,211:lost@w17,307:lost@w19 | 1/4 won, median 1132s ; 101:lost@w17,211:lost@w17,307:lost@w19 |
| 2 | yujian | 4/4 won, median 782s | 4/4 won, median 782s |
| 3 | qi | 4/4 won, median 668s | 4/4 won, median 668s |
| 3 | formation | 0/4 won, median - ; 101:timeout@w20,211:timeout@w20,307:timeout@w20,401:timeout@w20 | 4/4 won, median 766s |
| 3 | yujian | 4/4 won, median 723s | 4/4 won, median 723s |
| 4 | qi | 2/4 won, median 1194s ; 101:timeout@w20,401:timeout@w20 | 2/4 won, median 1194s ; 101:timeout@w20,401:timeout@w20 |
| 4 | formation | 0/4 won, median - ; 101:lost@w20,211:lost@w20,307:lost@w20,401:lost@w20 | 0/4 won, median - ; 101:timeout@w20,211:timeout@w20,307:timeout@w20,401:lost@w20 |
| 4 | yujian | 4/4 won, median 1156s | 4/4 won, median 1156s |
| 5 | qi | 4/4 won, median 786s | 4/4 won, median 786s |
| 5 | formation | 4/4 won, median 1125s | 4/4 won, median 829s |
| 5 | yujian | 4/4 won, median 724s | 4/4 won, median 724s |
| 6 | qi | 4/4 won, median 736s | 4/4 won, median 736s |
| 6 | formation | 4/4 won, median 944s | 4/4 won, median 944s |
| 6 | yujian | 4/4 won, median 802s | 4/4 won, median 802s |
| 7 | qi | 4/4 won, median 668s | 4/4 won, median 668s |
| 7 | formation | 4/4 won, median 690s | 4/4 won, median 690s |
| 7 | yujian | 4/4 won, median 629s | 4/4 won, median 629s |
| 8 | qi | 4/4 won, median 1004s | 4/4 won, median 1004s |
| 8 | formation | 0/4 won, median - ; 101:timeout@w20,211:timeout@w20,307:timeout@w20,401:timeout@w20 | 0/4 won, median - ; 101:timeout@w20,211:timeout@w20,307:timeout@w20,401:timeout@w20 |
| 8 | yujian | 4/4 won, median 1013s | 4/4 won, median 1013s |

Limits: these are the harness fixtures, not the 2026-11-06 fixtures (their producer is not in the repo), so the numbers are not directly comparable to reports/skill-school-curve-2026-11-06/. The yujian and formation routes are new in scripts/verify-monster-mechanics-balance.mjs.
