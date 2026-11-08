# 周天剑阵 move: natural balance before/after

Harness: scripts/verify-tower-natural-balance.mjs, routes and seeds as listed, 18 attempts per floor. Before = commit 3b64a74e (exported to /tmp, identical except for this change). After = worktree HEAD. Each cell: first win attempt, losses, abandons.

| route | seed | floor | before | after |
|---|---|---|---|---|
| qi | 101 | 1 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 101 | 2 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 101 | 3 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 101 | 4 | win@2, lost 0, abandoned 1 | win@2, lost 0, abandoned 1 |
| qi | 101 | 5 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 101 | 6 | win@3, lost 1, abandoned 1 | win@3, lost 1, abandoned 1 |
| qi | 101 | 7 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 101 | 8 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 101 | 9 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 202 | 1 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 202 | 2 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 202 | 3 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 202 | 4 | win@2, lost 0, abandoned 1 | win@2, lost 0, abandoned 1 |
| qi | 202 | 5 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 202 | 6 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 202 | 7 | win@2, lost 0, abandoned 1 | win@2, lost 0, abandoned 1 |
| qi | 202 | 8 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| qi | 202 | 9 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 101 | 1 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 101 | 2 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 101 | 3 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 101 | 4 | win@3, lost 1, abandoned 1 | win@3, lost 1, abandoned 1 |
| array | 101 | 5 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 101 | 6 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 101 | 7 | win@2, lost 0, abandoned 1 | win@2, lost 0, abandoned 1 |
| array | 101 | 8 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 101 | 9 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 202 | 1 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 202 | 2 | win@2, lost 1, abandoned 0 | win@2, lost 1, abandoned 0 |
| array | 202 | 3 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 202 | 4 | win@3, lost 1, abandoned 1 | win@3, lost 1, abandoned 1 |
| array | 202 | 5 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 202 | 6 | win@1, lost 0, abandoned 0 | win@3, lost 1, abandoned 1 **changed** |
| array | 202 | 7 | win@2, lost 0, abandoned 1 | win@1, lost 0, abandoned 0 **changed** |
| array | 202 | 8 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| array | 202 | 9 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 101 | 1 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 101 | 2 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 101 | 3 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 101 | 4 | win@3, lost 1, abandoned 1 | win@3, lost 1, abandoned 1 |
| mixed | 101 | 5 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 101 | 6 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 101 | 7 | win@2, lost 0, abandoned 1 | win@2, lost 0, abandoned 1 |
| mixed | 101 | 8 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 101 | 9 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 202 | 1 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 202 | 2 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 202 | 3 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 202 | 4 | win@2, lost 0, abandoned 1 | win@2, lost 0, abandoned 1 |
| mixed | 202 | 5 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 202 | 6 | win@3, lost 1, abandoned 1 | win@3, lost 1, abandoned 1 |
| mixed | 202 | 7 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 202 | 8 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| mixed | 202 | 9 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 101 | 1 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 101 | 2 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 101 | 3 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 101 | 4 | win@2, lost 0, abandoned 1 | win@2, lost 0, abandoned 1 |
| lance | 101 | 5 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 101 | 6 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 101 | 7 | win@2, lost 0, abandoned 1 | win@2, lost 0, abandoned 1 |
| lance | 101 | 8 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 101 | 9 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 202 | 1 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 202 | 2 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 202 | 3 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 202 | 4 | win@3, lost 1, abandoned 1 | win@3, lost 1, abandoned 1 |
| lance | 202 | 5 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 202 | 6 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 202 | 7 | win@2, lost 0, abandoned 1 | win@2, lost 0, abandoned 1 |
| lance | 202 | 8 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| lance | 202 | 9 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 101 | 1 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 101 | 2 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 101 | 3 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 101 | 4 | win@5, lost 3, abandoned 1 | win@8, lost 5, abandoned 2 **changed** |
| formation | 101 | 5 | win@3, lost 1, abandoned 1 | win@1, lost 0, abandoned 0 **changed** |
| formation | 101 | 6 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 101 | 7 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 101 | 8 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 101 | 9 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 202 | 1 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 202 | 2 | win@2, lost 1, abandoned 0 | win@2, lost 1, abandoned 0 |
| formation | 202 | 3 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 202 | 4 | win@4, lost 2, abandoned 1 | win@5, lost 3, abandoned 1 **changed** |
| formation | 202 | 5 | win@3, lost 2, abandoned 0 | win@3, lost 1, abandoned 1 **changed** |
| formation | 202 | 6 | win@2, lost 0, abandoned 1 | win@1, lost 0, abandoned 0 **changed** |
| formation | 202 | 7 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 202 | 8 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |
| formation | 202 | 9 | win@1, lost 0, abandoned 0 | win@1, lost 0, abandoned 0 |

Floor 4 pure-sword (formation route) is the check from the plan. It is recorded as-is; no numbers were tuned.
