# Temporary sword-hit checkpoint regression

The preserved `qi-floor8-invalid-before-fix.json` came from a real Campaign journey. At floor 8, wave 20, time 485 seconds, the sword projectile retained hit IDs for summoned actors that had died. The old validator accepted only formal wave-plan IDs. Removing those IDs in a diagnostic clone made validation pass, but deleting receipts is not the fix: it would refund piercing target slots.

The final fix writes actual summon allocations into `monsterMechanics.summons`, retaining exact actor ID, owner ID, allocation sequence, kind, batch and spawn time after actor/owner death. Sword receipts may reference those exact allocated IDs. Checkpoint progression forbids removing or rewriting historical allocations. A merely plausible temporary-ID string is insufficient.

The old failed snapshot has no allocation history and remains invalid under the final validator. No history is invented to migrate it. `qi-after-floor7-campaign.json` is the earlier real Campaign save without an active run; restarting floor 8 from that save naturally produces the new ledger. `qi-resumed-with-history.json` records this continuation through floors 8 and 9, including normal finishFloor transactions and save/reload checks. Its adjacent `.campaign.json` is the resulting actual saved campaign.

Regression tests: `tests/xianxia-temporary-sword-checkpoint.test.mjs`, covering living/dead summons, owner death, deterministic restore, unknown/future/wrong-wave IDs, reuse of a warning's sequence, borrowing another owner's sequence, and immutable allocation history. The focused run with monster integration/mechanics tests passed 48/48.

An earlier namespace-only candidate was rejected by independent review because a legal owner plus a global sequence did not prove a real summon. Its exploratory replay is not final acceptance evidence. The canonical acceptance evidence is the fresh-ledger continuation above and the regression tests.

The two `historical_investigate-*.mjs` files archive the diagnostic sources at their original relative-import layout. They are evidence, not installed verification commands; do not execute them from this archived directory without restoring their original `scripts/` location. Final source hashes were captured before archival.

## Second independent failure: temporary spawn body size

Continuing the old 485-second snapshot in an isolated diagnostic module using the superseded namespace validator exposed another invalid state at 559 seconds. `qi-floor8-invalid-spawn-before-fix.json` preserves it. This diagnostic did not alter combat rules; it only allowed the original temporary sword receipts so the run could proceed.

The M05 summon at `(-886.6757006464136, -412.81402884223365)` passed placement checks for radius 24 but its real yak body radius is 26. It was outside the arena while waiting through its spawn grace period. The regression test in `xianxia-monster-integration.test.mjs` reproduces the exact original bad warning coordinate and forces materialization, so an earlier Boss kill cannot hide this case.

The final radius fix extracts the unchanged native radius lookup into `towerEnemyRadius` and uses it for temporary spawn candidate geometry, warning radius, release recheck, and final creation guard, including wall and pillar clearance. Damage, HP, speed, and rewards are unchanged. The full focused suite of temporary-checkpoint, monster integration/mechanics/scaling, and native enemy attacks passed 93/93 after this change. The earlier short natural continuation is ledger validation evidence; it predates this radius fix and is not claimed as final-source balance evidence.
