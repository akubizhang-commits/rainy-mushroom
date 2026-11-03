# Growth feedback implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make equipment and early skill investment visibly improve combat while pacing nine-floor cultivation and teaching.

**Architecture:** Keep the existing pure JS combat/Campaign transaction boundary. Store balance data in shared tables and authored JSON, regenerate content and Cocos shared modules. Reset obsolete tower schemas through the existing mode-local policy.

**Tech Stack:** ES modules, Node test runner, Python content generator, Cocos TypeScript host.

**Spec:** User-approved six-part proposal in this chat; prior evidence in `docs/xianxia/sect-tower-v1/53-growth-feedback-review.md`.

## Constraints and rulings

- Preserve unrelated dirty files, paid art and other modes. Work in the current checkout because the approved runtime is largely uncommitted here; do not discard it through a clean checkout.
- Keep automatic attacks, landscape UI, atomic saves and repeated-reward checks.
- Weapon base attack: iron5, yellow15/30/45/75; dark-tier bases scaled to its unlock realm, with minimum exceeding yellow75. Affixes remain additive fixed/percentage bonuses.
- Empty slot has zero weapon base. Represent equipment presence in combat loadout; preserve iron identity fallback solely for legacy structural compatibility.
- Sword primary curve:1.2/1.5/1.8 then 10% per rank. Secondary swords each30% of primary, only target other enemies; no idle-target concentration bonus. Arc first hit retains the prior shape-stage peak; remainder splits across later hits.
- Cultivation attack1.08 per minor step,1.35 per breakthrough; HP unchanged.
- XP cumulative180/630/1350/2300/3476/5037/6600/8625/10920.
- Tutorial progress retains0–3 as awarded-stage marker, not a farmable count: sword at start, arc after floor1 wave8, orbit after floor2 wave1. Replays cannot advance this marker early.
- At level10 one special offensive skill can be learned; second unlock at11, third at12. Flight remains utility. This preserves choice without making all new skills available at once.

## Review focus

Empty weapon removal must survive save/restore; secondary shots must not steal primary collision or duplicate single-target damage; tutorial cannot be farmed by replaying wave1; zero-XP units must still validate; old saves reset only the tower key.

## Tasks

- [x] Add failing experience/kill-threshold/target-allocation/tutorial regression tests.
- [x] Implement base attack, primary/secondary sword damage and presentation, arc segment weighting.
- [x] Implement cultivation, exact XP budgets, fixed monster baselines, staged learning and schema reset.
- [x] Update affected former-balance tests to the new contract; retain atomicity and anti-duplication tests.
- [x] Regenerate content/Cocos modules, run targeted and full suites, run nine-floor combat/performance probes, obtain fresh review and fix actionable findings.

## Execution ledger

- Baseline: full suite started before edits; report `/tmp/rainy-growth-before.log`.
- Completed 2026-10-30. Xuan base attack selected as 100/150/220/300; existing affix ranges retained.
- Full suite: baseline 1796 pass/41 fail; after 1804 pass/41 fail, identical failure names. This is not an all-green suite.
- Independent review found missing level 11/12 skill gate presentation; fixed through the shared gate helper and a regression test.
- Content generation check and Creator web-mobile build passed. Both landscape UI probes passed.
- Nine-floor combat probes completed, including losses; detailed results and remaining balance limits are recorded in `docs/xianxia/sect-tower-v1/54-growth-feedback-implementation.md`.
