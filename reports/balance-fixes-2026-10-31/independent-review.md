# Final focused review — 2026-10-31

## Conclusion

No additional actionable correctness findings in the reviewed final changes. This is a read-only review of production code; only this report was added. The reviewer previously authored the skill changes, so review of those particular files is a self-review, while encounter and natural-harness changes were reviewed separately from their author.

## Scope and checks

- `TowerGrowth.js`: cross now uses the arc total damage progression; the single-cast receipt and distinct geometry remain unchanged.
- `TowerSkillForms.js`: only low-rank orbit angular speed changes. Rendering and combat still share sword poses; the blade width, radial extent, inner gap and target-wide 0.6-second ledger remain intact.
- `TowerEnemyStats.js`: first-floor early elite multiplier applies through wave 5 only. Normal mobs, bosses, later elites and player-independent scaling remain unchanged.
- Authored `tower-design.json` / `floor01-encounters.json`: matching early-elite fields; builder validates the configured threshold and finite positive multiplier, and enforces identical first-floor scales.
- Natural harness: successful actions now retain before/after resources, including book and forge costs; existing output is rejected and default output is timestamped; hashes include both harness scripts; damage and visibility timing are explicitly separate and missing starts remain null. Healing and gear are acquired through normal Campaign transactions; gear purchases preserve the configured 20-contribution reserve. The bounded attempt policy and healing stop remain simulation policies, not claims of human impossibility.

## Verification

- `python3 scripts/build-tower-content.py --check`: all seven generated tables current.
- `node --test tests/xianxia-tower-first-elite-balance.test.mjs tests/xianxia-tower-skill-forms.test.mjs tests/xianxia-stone-skill-costs.test.mjs`: **87 passed, 0 failed**.
- No full-suite rerun and no changes to production files during this review.

## Limits

This review does not establish a nine-floor natural completion rate or visual acceptance. Natural-run reports must retain their actual failed/stopped outcomes and source-stability status; the first-elite arithmetic test alone does not prove practical time to kill.

## Natural-growth strategy independent review

Reviewed `scripts/lib/tower-natural-growth.mjs` and its integration in `scripts/verify-tower-natural-balance.mjs` separately from their author. The planner only returns action descriptions; its projected balances and skill ranks are never copied into Campaign. Every learning and refund action is re-quoted and committed by `TowerCampaignStore.act`; rejected planned actions stop the run and record the failure. Book costs are checked before planning refunds, and refunds are restricted to camp. Incomplete replacement plans leave the original build untouched. Ordinary growth reserves points for newly unlocked replacements without granting points or bypassing level gates.

The main loop starts with a fresh normal Campaign, pays for healing and gear with its finite balances, and resumes from Campaign snapshots after level-up learning. Movement uses `setInput` and the viewport; the natural loop contains no HP/XP edits or forced damage. Timeouts become abandoned runs, losses remain losses, and only Campaign settlement advances `clearedFloor`. Failed attempts retain only rewards earned under normal Campaign rules. This is a policy simulation, not a demonstrated human completion rate.

Targeted verification: `node --test tests/xianxia-natural-growth-strategy.test.mjs tests/xianxia-natural-balance-harness.test.mjs` — **7 passed, 0 failed**. No full-suite run or production changes were made for this review.

A separate temporary-projectile receipt issue was reported to the calibration author: checking an authored owner and a global sequence upper bound does not prove that that owner actually allocated the referenced temporary actor (zones also consume the sequence). The proposed resolution is a persistent, monotonically extending temporary-allocation ledger with exact owner/sequence binding, retaining entries after death/expiry. That change requires separate follow-up verification; this natural-growth approval does not approve the earlier namespace-only validator.

### Temporary-receipt follow-up

The namespace-only finding above is resolved in the subsequently reviewed implementation. Actual summons append exact `{id, ownerId, sequence, kind, batch, spawnedAt}` entries; live actors must match their allocation, and sword hit references must match an entry instead of merely falling below the global sequence counter. Checkpoint progression preserves the old allocation prefix and rejects rewriting/removing history or appending an entry using an already allocated sequence. Death and expiry do not return consumed projectile target slots.

Independently ran `node --test tests/xianxia-temporary-sword-checkpoint.test.mjs` — **7 passed, 0 failed**. The checks cover real summon hits/restoration, summon and owner death, unknown owners/future sequences/wrong waves, borrowing a zone's sequence, borrowing another owner's sequence, and append-only history. No further actionable finding in this focused follow-up; no production files changed by this reviewer. Historical snapshots lacking the required summon evidence are not assigned fabricated history.

### Actual summon-radius follow-up

Reviewed the subsequent `towerEnemyRadius` extraction and summon placement correction without changing production code. Independently compared all **40 authored archetypes** against the prior shared `TowerRun.radiusOf` expression; every collision radius is unchanged. Temporary spawn selection, batch reservations, spawn-warning circles, release checks and the final summon guard use the spawned archetype's actual radius. The shared legality check covers arena walls and pillars; rejected final positions do not allocate a temporary ID or append a receipt.

Independently ran the new `summon warnings and materialization fit the actual yak body at the arena edge` regression — **1 passed, 0 failed**. It exercises the 26px yak body instead of the previously assumed 24px placement clearance and validates the resulting full snapshot. No blocking finding; this focused correction is approved for integration and final shared-module synchronization.
