# Inline skill tree and menu loot presentation

2026-10-28 · Functional alpha · UI implementation handoff

## Ownership

Changed only these repository files:

- `cocos-pilot/assets/scripts/TowerMenu.ts`
- `docs/xianxia/reports/tower-loot-inline-2026-10-28/ui-implementation.md`

Read the gamestudio skill, its `references/ui-ux-audit.md`, current `CODEX_HANDOFF.md` / `DEBUG_HANDOFF.md`, and the owning Growth, Campaign, Loot and menu code. Did not edit TowerView, generated shared TS, core, tests, scripts, or handoff files. Did not sync shared modules, build, commit, or operate the player's browser/save. Temporary verification harnesses are outside the repository under `/tmp`.

## Exact changes

### One tree, inline details and transactions

- Kept all 16 skills on the same scrollable tree: two common roots plus the original 御剑 / 剑气 / 剑阵 branches. Kept prerequisite, evolution-parent and paired-passive mappings. Gray category lines, white prerequisite lines, gold dashed replacement lines and jade dotted passive lines remain distinct, with the legend preserved.
- Replaced each whole-node detail button with a name/rank button and sibling `−` / `＋` buttons. The containing node has no Button, so a transaction cannot bubble into name/detail selection.
- `＋` dispatches the existing `{ type: 'learnSkill', id }`. `−` obtains `decreaseSkillQuote(state, id)` from shared TowerGrowth and dispatches only `{ type: 'decreaseSkill', id }`; it never sends a proposed refund/allocation or edits campaign state.
- Nodes display current/max rank, next-rank point and first-book price, disabled reason, refund amount, and the names/from/to ranks of dependent reductions. After a committed decrement the clicked node shows the actual returned points and changed ranks from the action result. Common +/- clicks have no confirmation.
- Names toggle a single detail section immediately below that row. It shares the main scroll and contains effects, next-rank cost, decrement preview, prerequisites, book ownership and automatic-use rules. Changing selection removes the old section and anchors the newly selected row at its previous screen position. Closing a detail does not navigate.
- Tree height is content-driven. Each row accommodates its longest price/reason/refund text. Connection lanes resume below the inserted detail section instead of drawing through its text.
- Added row anchors around transactions and detail toggles. Both the host's synchronous redraw and the menu's result-feedback redraw preserve the clicked row's vertical position; existing scroll-bound clamping still applies.
- Retained generation guards against stale callbacks, read-only checks, the saved-paused-snapshot requirement for tower learning, and camp-only decrement restrictions. Disabled nodes remain inspectable. Failure results are shown inline without optimistic state/refund changes.
- Retained limited research and whole respec. Only whole respec still uses a blocking dialog; its open state is separate from the selected skill, so it does not discard that selection.

### Touch/layout

- Tree node width: 208 design units; branch column spacing: 228.
- Name target: 200 × 96; +/- targets: 96 × 96, with an 8-unit gap. At a 360-pixel-wide viewport and the existing 720-wide design scale, +/- are 48 × 48 CSS-pixel equivalents.
- Skill names use 32-unit text, rank/detail hints 26, node prices/reasons 28, and signs 46. The rank hint has room for `10/10 · 详情` without shrinking.
- Existing main-scroll inertia, nonelastic behavior and `cancelInnerEvents` remain. No permanent battle HUD was added.

### Finalized loot/value presentation

The later user instruction superseded the initial request to leave the old core label alone.

- Kept `state.cores` as the sole scalar wallet. All menu balances, book/research prices, affordability messages, refund explanations, gift descriptions and earned totals now say **妖丹值**.
- Added the nearby explanation: **按一阶折算：一至七阶每颗对应1至7点；书价不变**. The main viewport starts below its measured height.
- Imported `CORE_DROP_RULES` from shared TowerLoot and read it by **`CORE_DROP_RULES[floor]`**, matching the actual 1–9 indexed object.
- Each tower-selection card displays **清层妖丹掉落 X–Y颗，折合 A–B点**. Clear bonuses and first-clear bonuses remain separate, labeled in 妖丹值. Removed the old fixed `core_units` approximation from those cards.
- Added the explicit rule that early withdrawal/death keeps actual drops only and never receives a top-up to the full-floor minimum.
- Reused a `lastBattle()` card on the tower and home pages. Optional `lastResult.coreLoot` displays the previous run's dropped count, equivalent value and nonzero rank breakdown. It says this is already included in earned totals. It is not presented as current inventory, and old results without `coreLoot` remain supported.

## Integration identifiers

| Meaning | Node name |
| --- | --- |
| Skill container | `技能行-${id}` |
| Name/rank detail target | `技能节点-${id}` |
| Add target | `learnSkill-${id}` |
| Decrease target | `decreaseSkill-${id}` |
| Inline detail header | `同页技能详情` |
| Separate respec overlay | `全洗确认遮罩` |

The name target retains the prior `技能节点-*` identifier. Skill-detail overlays named `技能详情遮罩` are gone. The inline close button and respec close button are both labeled `关闭`; scope automated selectors to the visible inline section or respec overlay.

## Verification

### Passed

- Production TowerMenu TS transformed with `stripTypeScriptTypes`, Cocos nodes/events represented by the project's existing test boundary, and **actual TowerGrowth / TowerCampaign / TowerLoot** with in-memory storage:
  - direct name/plus/minus events; a 5-point root/dependent refund; gifted rank retained; book retained; reload valid;
  - scroll and selected detail retained through both host and local redraws;
  - real decrement save failure preserves state and raw storage, followed by successful retry;
  - already-owned special book is not charged again; a new special book is charged once across remove/relearn;
  - passive reductions downgrade evolution 2→1 and then 1→0 with the correct displayed refunds;
  - all nine floor-indexed count/value ranges, separate bonus wording, early-exit rule, optional previous-run receipt and legacy result rendering.
- Independent UI-contract fixture checks: 16 names / 32 action targets; target sizes; no clickable container; one main ScrollView for skill details; no skill overlay; switching from an upper detail to a lower row preserves that row; stale callbacks; read-only and unsaved-pause disabling; saved-pause low-tier learning; separate respec retaining selection.
- Geometry checks at **360×640, 390×844, 720×1280, 1080×2400 and 1280×800**, including fully leveled `10/10` rank hints. Node label line heights fit their allocated boxes. These are layout calculations, not browser/GPU/device acceptance.
- `node --test tests/xianxia-tower-skill-decrease.test.mjs`: **20/20 passed** against the concurrently supplied core/tests; these were not authored or edited by this UI task.
- TypeScript program using current root JS as **in-memory** shared TS (the same `.js` import removal and `@ts-nocheck` wrapper as the existing generator): **0 diagnostics**. No generated files were written.

### Concurrent integration caveats

- The existing `tests/xianxia-tower-host-tools.test.mjs` passed **9/9** before the concurrent TowerView loot rendering landed. Its latest unmodified rerun passed **7/9**: the two battle/tool cases fail with **`coreLootSummary is not defined`** because its VM context strips production imports but does not provide the newly imported function.
- A temporary copy of that same suite, with the actual `coreLootSummary` import/context binding and actual `CORE_DROP_RULES` binding added, passed **9/9**. Repository tests remain unchanged. The parent should update that mock context; no stubbed implementation or relaxed assertion was used for this pass.
- Direct project `tsc --noEmit` still depends on the parent regenerating shared modules: the on-disk copies do not yet expose `decreaseSkillQuote`, the new TowerLoot module, or TowerView's `coreLootSummary`. The in-memory check above validates the actual source interfaces without violating the no-sync/no-build ownership boundary.

Initial ad-hoc assertion corrections were verification-harness issues: normalize deliberate label line breaks, compare data across VM realms without prototype-sensitive equality, and use the catalog's actual `剑影分光` name. They did not require changing core behavior.

## Remaining UI acceptance / next step

Parent: update the host-test imports/context, perform the coordinated shared sync and build, then exercise the new controls in the browser. Check touch-drag cancellation, connection visibility around expanded rows, the long chain-refund case, a deep-row detail switch, gift-floor disabling, failed-save retry, full respec, and legacy/new last-result cards.

No browser screenshots, physical-device touch checks, GPU clipping checks, safe-area checks, localization matrix, or retention measurements were performed in this task. Node body text is 14 CSS-pixel equivalents at 360 width; names are 16 and secondary hints 13. Physical readability and dense-chain comfort remain a P2 device review item.

UI audit scores: Readable / UX / Accessibility / Commercial / Retention / Google Play Risk **not rated** from geometry and mocked nodes alone. No newly observed P0/P1 behavior failure remains in the real-core menu harness; generated-module integration and the host-test context still need the parent steps above.

## Handoff

- `CODEX_HANDOFF.md`: not edited; outside the two-file ownership boundary.
- `DEBUG_HANDOFF.md`: not edited; outside ownership, and no unresolved menu root-cause investigation.
- This report is the UI handoff. No cross-chat messages were sent.
