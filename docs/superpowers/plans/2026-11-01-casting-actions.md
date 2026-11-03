# Casting actions implementation plan

> Use superpowers:executing-plans; implement and validate in this session.

**Goal:** Implement the approved movable, exclusive attack actions and separate cast/attack speeds.
**Architecture:** A shared timing table produces cast schedules; the action scheduler maintains eligibility ages each simulation step. Run owns effects and snapshots; presentation reads the same timing.
**Tech Stack:** JavaScript modules, node:test, Canvas, generated Cocos TypeScript.
**Spec:** docs/superpowers/specs/2026-11-01-casting-and-attack-speed-design.md

## Constraints
- Keep unrelated ongoing workspace changes. Work here because the current uncommitted equipment and combat implementations are dependencies; do not reset or bulk commit.
- No static asset generation, no changes to equipment budgets, no damage compensation without evidence.
- Positive phases use simulation ticks; movement stays independent; effect clocks stay independent.

## Review focus
- Save during windup and multi-shot actions restores exact release times.
- Missing targets must not block the scheduler or consume stored swords.
- Cast speed never speeds up DOT, projectiles or basic attacks.
- Eligible skills age while another action runs; basic gets at most one bypass.
- Death and transition never release pending attacks.

## Tasks
- [x] 1. Add timing and fairness behavior tests, observe failures; implement timing schedule and scheduler in TowerSkillTiming/TowerAttackActions.
- [x] 2. Add live Run release/restore tests; integrate schedules, delayed activation, targeting, and eligibility maintenance into TowerRun.
- [x] 3. Update presentation using the timing source; expose current cast/attack timings without inventing equipment values.
- [x] 4. Run focused tests, full suite, sync shared Cocos, review and fix relevant regressions. Record limitations and balance evidence.

## Execution ledger
- Baseline snapshots saved under reports/casting-actions-2026-11-01/before.
- User explicitly authorized development from approved proposal; continue without a second plan approval.

- Core verification: 168/168 tests pass; final full suite: 1,753 tests, 1,429 pass, 324 fail. Baseline had 341 failing test names; final comparison has no newly failing names. This is not a clean full-suite claim.
- Cocos web-mobile build completed; browser training verified at 1280×720 and 844×390, with a movable cast and visible progress bar.
- Code review identified two P2 issues (convergence line origin/direction and basic-attack art direction); both fixed and re-reviewed. No remaining P1/P2 found in the targeted review.
- Additional boundary fixes: cancel pending body actions on death/wave transitions/victory, validate direction/exclusivity, and show orbit art only after activation.
- Numerical evidence: seven fixed entry fixtures completed; stationary mixed builds gain substantial throughput from fairness. No automatic damage compensation applied.
- Gear cast-speed value remains zero in the current equipment module; final affix production/ranges remain outside this task.
- Detailed evidence and limitations: `reports/casting-actions-2026-11-01/README.md`.
