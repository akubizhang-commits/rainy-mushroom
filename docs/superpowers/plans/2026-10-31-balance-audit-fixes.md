# Balance Audit Fixes Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans and test-driven-development to implement each task. Independent economy and skill-geometry tasks may use dispatching-parallel-agents.

**Goal:** Resolve the 2026-10-31 audit findings for natural growth, skill delivery, equipment feedback, and monster encounters, without increasing the approved 35% equipment budget.

**Architecture:** Preserve the authoritative pure JS combat/Campaign modules and generated design tables. Fix authored encounter budgets and skill geometry at their source; maintain matching presentation. Add a bounded, transparent cultivation-pill allowance tied to cleared content and a reproducible natural-progression harness alongside fixed-fixture calibration.

**Tech Stack:** JavaScript modules, Node tests, generated JSON content, Cocos TypeScript host.

**Spec:** User instruction to fix all findings in reports/balance-check-2026-10-31, existing docs 54/56/59/62/64, and AGENTS.md. Numbers selected below are implementation choices, not previously user-approved targets.

## Global Constraints
- Landscape only; preserve paid art/source files. No unrelated workspace cleanup.
- Equipment output budget remains <=35%; normal save/load, atomic failure and reward deduplication remain required.
- Development saves may reset within this mode when schema changes.
- No runtime enemy scaling with player power and no simulation invulnerability or forced damage.
- Keep independent baseline and post-change evidence, including failures.

## Review Focus
- New-character first elite before the first level-up: resolve within the 20–40s target.
- Pill buying/using across save/reload, respec, repeat clears, and write failures cannot bypass the allowance.
- Orbit coverage and cross-skill changes cannot create unseen hitboxes or duplicate per-cast damage.
- Equipment and evolution bursts must retain budgets and intended replacement behavior.
- Simulations must report actual entry level/build, consumed currency, failures, source hashes, and duplicate fixtures.

## Tasks
- [x] 1. Economy: bound cumulative cultivation-pill use to 30% of cumulative first-cleared floor XP, quantized to 50-XP pills. No allowance before first clear; repeat clears do not increase it. Display eligibility/remaining allowance and test atomicity. This preserves pills as optional catch-up without free Lv7 starts.
- [x] 2. Skills: reproduce low-rank orbit coverage loss and cross-vs-arc progression gap; correct visible geometry and authored progression, preserving hit ledgers and skill identity. Correct outdated rank5 passive test; document evolution transition and low-tier equipment threshold behavior.
- [x] 3. Encounters: calibrate first elite against real Lv1 arc1 (initial candidate ~1900 actual HP), leaving normal mobs and later bosses independent. Investigate actual incoming damage/positioning for route losses before changing global values.
- [x] 4. Harness: natural entry levels from preceding floor budgets, proper legal skill purchases/equipment, and separate calibrated/end-level mode; add actual fresh-save journey including camp actions. Never present fixed gear as naturally acquired.
- [x] 5. Regression: red/green tests per changed behavior, rerun all relevant suites and generated-table check. Run natural first floor plus nine-floor multi-route fixtures, tracking timing and survival; adjust only evidence-supported authored knobs.
- [x] 6. Integrate: sync generated Cocos modules, build web-mobile, verify changed user-visible pills/skills in landscape where feasible.
- [x] 7. Record final design targets, before/after measurements and remaining measurement limits; review changes independently and address findings.

## Follow-up findings during validation

- The first-elite 0.3 candidate still took 48.43 seconds with real movement; final authored multiplier 0.22 passes three seeds at 38.58 seconds.
- Corrected the initial economy audit: contribution is per cleared wave, first floor 100, not 826 per monsters.
- Bot sector/capsule geometry and continuous projectile avoidance were corrected without changing monster attacks.
- Natural growth now previews a legal parent refund before acquiring an evolution and reserves its required points; old greedy allocation could starve evolutions forever.
- Real floor-eight snapshots exposed sword projectile hit receipts for dead summons being rejected; fixed by validated append-only allocation history. A second real failure from 24px placement of a 26px summon is fixed by sharing the exact body-radius authority across selection, telegraph, release and actor construction.

## Final verification

- Frozen-source natural campaigns: qi 9 floors / 10 attempts; array 9 / 10; mixed 9 / 9; all sourceStable true.
- Focused regression 323/323; full suite 2082/2249 with 167 known same-workspace failure names and no new failure names.
- Seven tables current, 67 shared modules matched, web-mobile built, two landscape UI checks passed.
- See reports/balance-fixes-2026-10-31/README.md for evidence, corrected contribution calculation, historical artifact overwrite disclosure and limits.
