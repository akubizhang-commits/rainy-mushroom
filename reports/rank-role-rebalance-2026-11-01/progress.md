# Approved rank/role and equipment implementation

Spec: design/balance/balance-check-monster-rank-role-2026-11-01.md and balance-check-equipment-output-budget-2026-11-01.md.

Completed: frozen before data; 145 explicit archetypes with species/form/art metadata; per-floor exact normal and elite quotas; 47 unique elite encounters; F8/F9 wave18; canonical normal prototypes; rank baseline common across floors; 2.5HP/1.15damage elites; schema38; dynamic drop calibration; shared view resources.

Ruling: reuse current workspace codex/crafting-minigames because approved art and all current work are uncommitted here; do not fork old committed game state or revert other work.
Ruling: new role budget supersedes old early-elite HP discounts; retaining them would violate same-rank2.5 baseline. Normal early-wave0.7F4 remains authored exception.
Ruling: reserve original entities/assets, add rank variants and stable named encounter IDs. Additional IDs do not require new art/animation sets.
Completed: armor cap, focused tests, Cocos build, 18 menu/12 actor viewport checks, three stable natural campaigns, nine same-entry quality comparisons, independent review fixes and exact data replay. Final full suite: 1364 pass/334 fail; no failure names outside existing baseline report. Delivery: README.md. Remaining external evidence: human difficulty/device playtests and six stage2 mother images (prompts prepared); no static Scenario credits used.
