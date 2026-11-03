## [P2 — Closed] Result popup reported capped-out loot as retained and collected

- **Severity:** Medium (P2).
- **Location:** `cocos-pilot/assets/scripts/TowerView.ts:163–179`; pause display at lines 224–225.
- **Original finding:** The new loot breakdown was reconstructed from the uncapped Run snapshot after settlement. It bypassed Campaign’s credited result and the deliberate omission of `lastResult.coreLoot` when the wallet cap prevented credit. Consequently, the popup reported loot as retained/collected even when the saved wallet received none, and disagreed with the recent-battle card.
- **Original reproduction:** Load a valid schema-3 campaign with `cores = 2000000000`. Start floor 1 with seed 12, use the existing playtest assist and normal skill hits until the first graded core drops, then abandon and submit `finishFloor`. Under the original denomination table, the validated snapshot contained one rank-1 drop with value 1. Settlement succeeded with `earned.cores = 0`, wallet still `2000000000`, and no `lastResult.coreLoot`. The production popup generated:

  ```text
  已保留：修为 3 · 妖丹值 1 · 贡献 0
  掉落 1颗：1阶×1
  按一阶折合1点，已自动收取。
  ```

- **Resolution:** Parent changed `afterFinish` to display `lastResult.earned`, and passes credited value plus the first-clear award into `lootText`. The raw drop breakdown now explicitly discloses overflow instead of saying it was collected. Pause also calculates credited value from the attempt’s starting balance.
- **Regression evidence:** `tests/xianxia-tower-host-tools.test.mjs:400–465` drives actual host pause/withdraw buttons, real Run kills, Campaign transactions and reloads. Cases cover zero/one point of wallet headroom and a complete floor-three first clear: one credited point, both fixed awards included in overflow, and 160 contribution credited once. `tests/xianxia-tower-skill-decrease.test.mjs:333–357` and `:420–437` now use `CORE_RANK_VALUES` for metadata validation and kill-value accounting. Both targeted files pass **35/35** with the updated nonlinear denominations `[0, 1, 6, 24, 30, 36, 42, 48]`.
- **Limitation:** The host tests execute production TypeScript with rendering/platform boundaries replaced by the existing Node harness. They verify displayed text and saved state, not browser hit-testing or layout. No runtime/host source, player save, full suite or build was changed/run during this regression update.

## [P2 — Closed in source] Cocos transformed the refund iterator into one bogus change

- **Severity:** Medium (P2).
- **Location:** `js/xianxia/TowerGrowth.js:345`, the returned `changes` array in `decreaseSkillQuote`.
- **Original finding / reproduction:** Parent’s built-browser QA found that `[...changes.values()]` became `[].concat(changes.values())`. That produces a one-element array containing a `MapIterator`, rather than change records. Refund previews consequently displayed `未装备undefined→undefined`. The earlier source-only review and Node tests missed this compilation-specific failure.
- **Resolution:** Parent replaced the spread with `Array.from(changes.values())`; the source fix is confirmed. A scan of the newly added production code found no other Map/Set/iterator spreads. The older Campaign migration Set spread predates this change and was outside that scan’s new-code scope.
- **Regression evidence:** `tests/xianxia-tower-host-tools.test.mjs:468–508` checks the real host’s 16-point cascade preview and committed feedback for the concrete skill names/ranks, rejects `undefined`/`NaN`/`未装备`, verifies books and currency remain unchanged, and confirms a callback retained from the old tree cannot act again. It passes in the targeted **35/35** run.
- **Limitation:** The host harness strips TypeScript but does not run Creator’s Babel array-spread transform. This test protects the host’s change-record contract; it cannot independently certify the generated build fix. Rebuild and compiled-browser verification remain with the parent.
