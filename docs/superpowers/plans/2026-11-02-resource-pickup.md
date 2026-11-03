# Resource pickup implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make stones and materials visible on the ground and collect them by proximity.

**Architecture:** Keep kill-derived reward totals as the accounting authority. Add conserved pickup receipts, grouped ground drops and collected receipt IDs to the simulation; Campaign credits only collected rewards, and terminal runs collect all remaining receipts.

**Tech Stack:** Shared JavaScript simulation, Cocos TypeScript view, Node tests, existing Cocos browser verification.

**Spec:** User approved the full description in this chat on 2026-11-02.

## Global constraints

- Radius 100 world units; Ning Shen levels 1/2/3 produce 120/135/150.
- Drops remain at least 0.5 simulation seconds, then fly toward the player.
- No timeout within the floor. Same nearby item stacks; different items retain distinct icons.
- Win, death and withdrawal collect remaining resources without reducing rewards.
- Healing retains its existing radius and expiry; XP remains immediate.
- Reuse existing art. Preserve current workspace changes; snapshot touched files before edits.
- Pause freezes pickup movement. Save/load preserves pending and collected receipts.

## Review focus

- Duplicate, missing or forged receipts must be rejected.
- Repeated checkpoints and failed writes must not duplicate resources.
- Boss rare material pity must agree between simulation and Campaign.
- Terminal collection must work even if the player is dead.
- Many simultaneous drops must remain legible without replaying feedback after load.

### Task 1: Simulation and accounting

Files: new `js/xianxia/TowerPickups.js`, `tests/xianxia-resource-pickup.test.mjs`; update `TowerRun.js`, `TowerCampaign.js`.

- [x] Write and run failing tests for delay, exact radius, flight, merging, pause/load, conserved receipts and terminal collection.
- [x] Implement receipt derivation, creation, movement, validation and Campaign collected deltas.
- [x] Test rare pity, repeated checkpoint, storage failure, stale receipts and totals after exit.

### Task 2: Presentation

Files: `cocos-pilot/assets/scripts/TowerView.ts`, `js/xianxia/TowerSkillPresentation.js`, `TowerGrowth.js`.

- [x] Draw existing material icons, stack counts, landing bounce and arrival icon/quantity feedback.
- [x] Trigger material notices from pickup arrivals instead of kills; update Ning Shen copy.
- [x] Sync shared modules and run focused presentation/regression tests.

### Task 3: Integration

- [x] Build Cocos web-mobile.
- [x] Exercise actual game at 1280×720 and 844×390: ground retention, flight, arrival, pause, heal, terminal collection.
- [x] Run affected reward, campaign and pickup tests, review task diff and record evidence.

## Execution record

- Implementation authorized by user; native execution in current workspace.
- Existing workspace contains substantial unrelated changes; task baseline saved under `reports/resource-pickup-2026-11-02/before/`. No blanket staging or cleanup.
- Tasks 1–2: 34 focused tests pass; independent review findings on restored arrival feedback and label capacity fixed with regression tests.
- Browser first run caught an iterator-spread transpilation error; replaced it with Array.from and moved grouping into the tested presentation module.
- Broad comparison: 98/136 pass; all 38 failures reproduce in the isolated pre-task baseline, no new failures.
- Task 3 complete: final Cocos build succeeds; browser PASS at 1280×720 and 844×390, screenshots visually inspected after loading cover clears; 97-stack labels and no replay on restore verified.
- Existing icon check passes: 92 item icons at 98% fit and 76 reading illustrations.
