# Primary sword supply opportunities — 2026-10-27

Inventory replay of existing weapon-first line/formation records only. No simulation or counterfactual draws.
Initial inventory: sj_yujian Lv1; no passives; committed level 1; weapon/passive slots from PLAYER (4/4). Each recorded pick updates inventory before the next draftCandidates call.

All primary and paired-passive levels, evolution flags, committed levels and evolution eligibility match choice.before and final. Every recorded offer kind:id is legal; every selected full card matches its reconstructed candidate/evolution. Recorded offers omit unselected card levels, so those levels cannot be independently checked. Current replay source hashes match both archived source manifests.

Primary state uses the pending target level: preUnlock (<10, missing); missingLegal (unowned candidate exists); missingBlocked (unowned after unlock but no room); learnedBelow5 (owned, upgrade candidate exists); full (Lv5, including evolved). “Full” means primary max level, not full inventory. All offer numerators count weapon cards, not evolution cards.

| Split / route | Runs | Pre-unlock offers/choices | Missing legal offers/choices | Missing blocked offers/choices | Learned <5 offers/choices | Full offers/choices | Learned / maxed |
|---|---:|---:|---:|---:|---:|---:|---:|
| exploration/line | 10 | 0/80 (0.0%) | 10/32 (31.3%) | 0/0 (n/a) | 21/52 (40.4%) | 0/7 (0.0%) | 10 / 3 |
| exploration/formation | 10 | 0/80 (0.0%) | 9/42 (21.4%) | 0/0 (n/a) | 27/59 (45.8%) | 0/13 (0.0%) | 9 / 4 |
| holdout/line | 10 | 0/80 (0.0%) | 10/26 (38.5%) | 0/0 (n/a) | 22/58 (37.9%) | 0/0 (n/a) | 10 / 0 |
| holdout/formation | 10 | 0/80 (0.0%) | 10/26 (38.5%) | 0/0 (n/a) | 28/72 (38.9%) | 0/16 (0.0%) | 10 / 5 |
| combined/line | 20 | 0/160 (0.0%) | 20/58 (34.5%) | 0/0 (n/a) | 43/110 (39.1%) | 0/7 (0.0%) | 20 / 3 |
| combined/formation | 20 | 0/160 (0.0%) | 19/68 (27.9%) | 0/0 (n/a) | 55/131 (42.0%) | 0/29 (0.0%) | 19 / 9 |
| all | 40 | 0/320 (0.0%) | 39/126 (31.0%) | 0/0 (n/a) | 98/241 (40.7%) | 0/36 (0.0%) | 39 / 12 |

## Learning and upgrade waits

| Split / route | Learn level min / median / max (learned n) | Completed upgrades | Completed level gap median / max | Right-censored waits | Censored observed choices median / max | End level median / max |
|---|---|---:|---|---:|---|---|
| exploration/line | 10 / 12 / 17 (10) | 21 | 1 / 6 | 7 | 0 / 3 | 17 / 24 |
| exploration/formation | 10 / 12 / 19 (9) | 25 | 2 / 6 | 5 | 1 / 3 | 21 / 23 |
| holdout/line | 10 / 10.5 / 16 (10) | 22 | 2 / 6 | 10 | 0 / 4 | 18 / 18 |
| holdout/formation | 10 / 10.5 / 16 (10) | 28 | 2 / 9 | 5 | 2 / 2 | 20 / 27 |
| combined/line | 10 / 11 / 17 (20) | 43 | 2 / 6 | 17 | 0 / 4 | 17.5 / 24 |
| combined/formation | 10 / 11 / 19 (19) | 53 | 2 / 9 | 10 | 1.5 / 3 | 21 / 27 |
| all | 10 / 11 / 19 (39) | 96 | 2 / 9 | 27 | 0 / 4 | 18 / 27 |

Across all records, primary offers were 137/367 (37.3%) of legal primary opportunities; 2 offered primary cards were not selected. Learn-level histogram: {"10":17,"11":5,"12":3,"13":3,"14":3,"15":3,"16":3,"17":1,"19":1}.
The unselected primary offers were: exploration/formation/sword-balance-7 target Lv22 chose evolve:sj_yujian; exploration/formation/sword-balance-9 target Lv21 chose evolve:sj_yujian.

A completed upgrade gap starts immediately after learning/previous upgrade and includes the choice selecting the next upgrade. Level gap equals observed eligible choices; missed offers exclude a successful endpoint. Seconds measure recorded elapsed time.
A right-censored gap ends at the recorded run termination without a next upgrade. Its observed choices and seconds are lower bounds, never completed waits or hypothetical future misses. A terminal run with zero further choices still has a censored time interval. Records ending before learning contribute no upgrade interval.
Completed gap summaries are conditional on observing an upgrade and are biased toward shorter waits. Choice-weighted offer rates also give longer-surviving runs more weight. Pool weight shares are not three-card offer probabilities: guarantees, evolution insertion, and pill removal affect actual drafting.

Termination: {"outcomes":{"lost":40,"won":0,"timeout":0},"beforeUnlock":0,"neverLearned":1,"learnedBelow5":27,"full":12}. These existing trajectories cannot establish the effect of a 10→20 weight change; that requires the separate comparison harness.

## Per-run audit

| Split / route / seed | Learn level | Final primary | End level / outcome | Eligible offers/choices | Upgrade gaps (from→to: levels; * censored) |
|---|---:|---:|---|---:|---|
| exploration / formation / sword-balance-0 | 15 | 3 | 18 / lost | 3/9 (33.3%) | 1→2: 2, 2→3: 1, 3→4: 0* |
| exploration / formation / sword-balance-1 | 16 | 2 | 18 / lost | 2/9 (22.2%) | 1→2: 1, 2→3: 1* |
| exploration / formation / sword-balance-2 | 10 | 5 | 21 / lost | 5/8 (62.5%) | 1→2: 2, 2→3: 1, 3→4: 3, 4→5: 1 |
| exploration / formation / sword-balance-3 | — | 0 | 15 / lost | 0/6 (0.0%) |  |
| exploration / formation / sword-balance-4 | 10 | 5 | 21 / lost | 5/9 (55.6%) | 1→2: 1, 2→3: 2, 3→4: 3, 4→5: 2 |
| exploration / formation / sword-balance-5 | 12 | 5 | 23 / lost | 5/14 (35.7%) | 1→2: 1, 2→3: 1, 3→4: 4, 4→5: 5 |
| exploration / formation / sword-balance-6 | 10 | 5 | 21 / lost | 5/6 (83.3%) | 1→2: 1, 2→3: 2, 3→4: 1, 4→5: 1 |
| exploration / formation / sword-balance-7 | 19 | 2 | 23 / lost | 3/14 (21.4%) | 1→2: 2, 2→3: 2* |
| exploration / formation / sword-balance-8 | 14 | 3 | 22 / lost | 3/13 (23.1%) | 1→2: 1, 2→3: 6, 3→4: 1* |
| exploration / formation / sword-balance-9 | 11 | 4 | 22 / lost | 5/13 (38.5%) | 1→2: 3, 2→3: 1, 3→4: 4, 4→5: 3* |
| exploration / line / sword-balance-0 | 10 | 2 | 13 / lost | 2/4 (50.0%) | 1→2: 1, 2→3: 2* |
| exploration / line / sword-balance-1 | 13 | 5 | 21 / lost | 5/8 (62.5%) | 1→2: 1, 2→3: 1, 3→4: 1, 4→5: 1 |
| exploration / line / sword-balance-2 | 10 | 2 | 15 / lost | 2/6 (33.3%) | 1→2: 2, 2→3: 3* |
| exploration / line / sword-balance-3 | 13 | 1 | 13 / lost | 1/4 (25.0%) | 1→2: 0* |
| exploration / line / sword-balance-4 | 10 | 2 | 16 / lost | 2/7 (28.6%) | 1→2: 6, 2→3: 0* |
| exploration / line / sword-balance-5 | 10 | 5 | 17 / lost | 5/8 (62.5%) | 1→2: 1, 2→3: 1, 3→4: 3, 4→5: 2 |
| exploration / line / sword-balance-6 | 11 | 5 | 24 / lost | 5/12 (41.7%) | 1→2: 1, 2→3: 4, 3→4: 1, 4→5: 4 |
| exploration / line / sword-balance-7 | 17 | 1 | 17 / lost | 1/8 (12.5%) | 1→2: 0* |
| exploration / line / sword-balance-8 | 14 | 4 | 22 / lost | 4/13 (30.8%) | 1→2: 1, 2→3: 5, 3→4: 2, 4→5: 0* |
| exploration / line / sword-balance-9 | 14 | 4 | 23 / lost | 4/14 (28.6%) | 1→2: 2, 2→3: 6, 3→4: 1, 4→5: 0* |
| holdout / formation / sword-balance-10 | 12 | 3 | 18 / lost | 3/9 (33.3%) | 1→2: 1, 2→3: 3, 3→4: 2* |
| holdout / formation / sword-balance-11 | 10 | 4 | 17 / lost | 4/8 (50.0%) | 1→2: 4, 2→3: 1, 3→4: 2, 4→5: 0* |
| holdout / formation / sword-balance-12 | 10 | 5 | 22 / lost | 5/12 (41.7%) | 1→2: 2, 2→3: 1, 3→4: 6, 4→5: 2 |
| holdout / formation / sword-balance-13 | 15 | 1 | 17 / lost | 1/8 (12.5%) | 1→2: 2* |
| holdout / formation / sword-balance-14 | 16 | 1 | 18 / lost | 1/9 (11.1%) | 1→2: 2* |
| holdout / formation / sword-balance-15 | 12 | 5 | 23 / lost | 5/13 (38.5%) | 1→2: 1, 2→3: 5, 3→4: 2, 4→5: 2 |
| holdout / formation / sword-balance-16 | 11 | 5 | 22 / lost | 5/8 (62.5%) | 1→2: 1, 2→3: 2, 3→4: 1, 4→5: 2 |
| holdout / formation / sword-balance-17 | 10 | 5 | 23 / lost | 5/9 (55.6%) | 1→2: 1, 2→3: 3, 3→4: 3, 4→5: 1 |
| holdout / formation / sword-balance-18 | 10 | 4 | 17 / lost | 4/8 (50.0%) | 1→2: 3, 2→3: 3, 3→4: 1, 4→5: 0* |
| holdout / formation / sword-balance-19 | 10 | 5 | 27 / lost | 5/14 (35.7%) | 1→2: 1, 2→3: 1, 3→4: 2, 4→5: 9 |
| holdout / line / sword-balance-10 | 16 | 2 | 17 / lost | 2/8 (25.0%) | 1→2: 1, 2→3: 0* |
| holdout / line / sword-balance-11 | 11 | 4 | 16 / lost | 4/7 (57.1%) | 1→2: 3, 2→3: 1, 3→4: 1, 4→5: 0* |
| holdout / line / sword-balance-12 | 15 | 2 | 18 / lost | 2/9 (22.2%) | 1→2: 1, 2→3: 2* |
| holdout / line / sword-balance-13 | 10 | 4 | 18 / lost | 4/9 (44.4%) | 1→2: 1, 2→3: 4, 3→4: 3, 4→5: 0* |
| holdout / line / sword-balance-14 | 10 | 4 | 18 / lost | 4/9 (44.4%) | 1→2: 6, 2→3: 1, 3→4: 1, 4→5: 0* |
| holdout / line / sword-balance-15 | 10 | 3 | 17 / lost | 3/8 (37.5%) | 1→2: 1, 2→3: 4, 3→4: 2* |
| holdout / line / sword-balance-16 | 10 | 4 | 16 / lost | 4/7 (57.1%) | 1→2: 2, 2→3: 2, 3→4: 2, 4→5: 0* |
| holdout / line / sword-balance-17 | 13 | 3 | 18 / lost | 3/9 (33.3%) | 1→2: 1, 2→3: 4, 3→4: 0* |
| holdout / line / sword-balance-18 | 10 | 3 | 18 / lost | 3/9 (33.3%) | 1→2: 3, 2→3: 5, 3→4: 0* |
| holdout / line / sword-balance-19 | 11 | 3 | 18 / lost | 3/9 (33.3%) | 1→2: 1, 2→3: 2, 3→4: 4* |

Validation: {"beforeSnapshots":723,"finalSnapshots":40,"primaryAvailabilityChecks":723,"offeredCardsValidated":2169,"selectedCardsValidated":723,"errors":0}.

Reproduce: `node scripts/survivor/sword-supply-opportunities.mjs`.
Machine-readable JSON contains each reconstructed inventory, candidate list with weights, primary state, offer/selection flags, acquisition timeline, and completed/censored gaps.
