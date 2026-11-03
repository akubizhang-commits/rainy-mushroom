# Landscape realm-row skill menu

2026-10-28 · Functional alpha · Menu implementation handoff

## Scope and result

Changed only `cocos-pilot/assets/scripts/TowerMenu.ts` and this report. Read the current file before editing; preserved the parent's latest `CORE_RANK_VALUES` import, dynamic denomination text, and header **妖丹按阶位折合一阶计价；掉落颗数另列**. No TowerView, shared/generated TS, core, test, script, prior report, or handoff file edits. No shared sync or build.

- `width >= height`: 1280-wide design, scaled by `width / 1280`; design height is the actual supplied height divided by that scale. Portrait retains the 720-wide design and its prior scale rule.
- Landscape library has a fixed left tree panel and fixed right detail panel. The tree pans on both axes; the detail body scrolls vertically and independently. Neither skill names nor icons navigate or open an overlay.
- All 12 non-evolution skills share the **炼气初学** row. All 4 evolutions share the **金丹初学** row. These are earliest-learning realm labels, not new gates. Floor, book, prerequisite, point and rank conditions still come from the existing core quote. No 筑基 unlock row was invented. Evolution rank 3 remains unavailable at the current level-27 cap.
- Kept 共用根基 / 御剑流 / 剑气流 / 剑阵流 labels and the original prerequisite/parent/passive mappings. Gray denotes category grouping, white solid lines first-learning prerequisites, gold dashes evolution parents, jade dots paired-passive requirements.
- Every skill has an original symbolic Graphics circle, lower-left level badge, name/cadence underneath, and sibling +/- controls. No raster assets were added. Symbols distinguish swords, arcs, rings, formations, shield, pickup, marks and gates; production art remains future work.
- Names and circle icons select the fixed detail pane. The initial selection is 御剑术. Re-selecting the same skill keeps its detail scroll; selecting another resets only the detail body to the top. Tree pan never changes just because selection or a transaction changed.
- +/- retain the real core quotes and actions, prices, disabled reasons, refund previews and actual committed results. Dependent names/counts appear under the node and complete from/to ranks in the right pane. Read-only, saved-pause, camp-only refund and stale-callback protections remain.
- Research, source-point explanation, legend and whole-respec entry remain in the independently scrolling detail area after skill details. Only the separate whole-respec action still has a confirmation overlay.
- Other camp pages now use the full 1232-unit content width in landscape. The hall uses four building columns; other cards and action rows expand to that content width. Portrait remains two building columns and 672-unit content.

## Measured layout for QA

Coordinates below are **logical units relative to the centered `TowerMenu` root**.

| Element | 844×390 input (1280×591.47 logical) | 1280×720 input |
| --- | --- | --- |
| Overall content band | top `175.73`, bottom `-203.73` | top `240`, bottom `-268` |
| Left tree panel | center `(-198,-14)`, `836×379.47` | center `(-198,-14)`, `836×508` |
| Tree ScrollView | center `(-198,-50)`, `820×297.47` | center `(-198,-50)`, `820×426` |
| Right detail panel | center `(426,-14)`, `380×379.47` | center `(426,-14)`, `380×508` |
| Detail ScrollView | center `(426,-58)`, `364×281.47` | center `(426,-58)`, `364×410` |
| Footer action row | center Y `-247.73`, height `80` | center Y `-312`, height `80` |

The small-landscape header ends above the content band; the footer starts 4 units below it. First-row +/- occupy tree-content Y `216..296`, fully inside the initial 297.47-unit tree viewport. The first four node columns fit its 820-unit width. The very small remaining vertical margin should be checked for pixel rounding in the browser.

Landscape nodes are 176 units wide with 192-unit column spacing. Circles are 96×96, badges 32×32, name targets 176×80, and +/- targets 80×80 with an 8-unit gap. At 844×390 the +/- targets are about **52.75×52.75 CSS-pixel equivalents**; at a 0.61 outer scale they remain 48.8×48.8. Portrait uses 208-unit nodes and 96×96 +/- targets (48×48 at 360 width).

The tree content uses top-left anchor `(0,1)` and extent **2372×1172** in landscape. Node-circle centers are at content Y `-84` (炼气) and `-696` (金丹). Columns are `x = 156 + 192*i`: `vajra`, `magnet`, `sj_yujian`, `sj_heart`, `sj_shadow`, `sj_arc`, `sj_line`, `sj_mark`, `sj_wanjian`, `sj_bone`, `sj_formation`, `sj_gate`. Evolutions share their parent's X: `evo_wanjian=540`, `evo_tiandi=1308`, `evo_wuwo=1692`, `evo_sixiang=2076`.

Cocos `scrollToOffset(new Vec2(x,y),0)` takes positive distances. Its `getScrollOffset()` reports **negative X** for leftward content displacement and positive Y. The menu explicitly accounts for that sign while retaining both axes across redraws. At 844×390, max tree distances are approximately `(1552,874.53)`.

Portrait fallback stacks a fixed tree panel above a fixed detail panel, each independently scrollable, rather than squeezing a 380-unit right column beside the tree.

## Actual cadence labels

Read from `GROWTH_SKILLS` / `GROWTH_EVOLUTIONS`; checked against `TowerRun._skills`. Long captions move the parenthesized cadence to a second line.

| ID | Node caption cadence | Meaning/source |
| --- | --- | --- |
| `sj_yujian` | `(1秒)` | `cooldown=1` |
| `sj_arc` | `(2.5秒)` | `cooldown=2.5` |
| `sj_wanjian` | `(命中0.6秒)` | Continuous orbit, `hit_interval=.6`, not a cast cooldown |
| `sj_shadow` | `(4秒)` | `cooldown=4` |
| `sj_line` | `(4秒)` | `cooldown=4` |
| `sj_formation` | `(8秒)` | Cast cooldown; .5-second damage interval remains separate in effects |
| `sj_heart`, `sj_mark`, `sj_bone`, `sj_gate`, `vajra`, `magnet` | `(常驻)` | No invented cast cooldown; gate detail separately states its 3-second trigger ICD |
| `evo_wanjian` | `(剑雨8秒)` | `rainCooldown=8`; detail also reads parent 御剑's 1-second interval |
| `evo_tiandi` | `(6秒)` | Full runtime cast cycle; does not substitute the 5.1-second post-release field |
| `evo_wuwo` | `(命中0.6秒)` | Continuous orbit hit interval |
| `evo_sixiang` | `(8秒)` | Cast cooldown, distinct from periodic damage ticks |

## Node selectors

| Purpose | Node name / path |
| --- | --- |
| Menu root | `TowerMenu` |
| Fixed left panel | `TowerMenu/技能树面板` |
| Two-axis ScrollView | `技能树面板/技能树二维卷轴` |
| Pan content | `技能树二维卷轴/境界技能树内容` |
| Skill container | `技能行-${id}` |
| Clickable circular symbol | `技能图标-${id}` |
| Lower-left badge | `技能图标-${id}/技能等级-${id}` |
| Name/cadence selection target | `技能节点-${id}` |
| Add / decrease targets | `learnSkill-${id}` / `decreaseSkill-${id}` |
| Fixed right panel | `TowerMenu/技能详情固定栏` |
| Independent detail ScrollView | `技能详情固定栏/技能详情独立卷轴` |
| Detail content | `技能详情独立卷轴/技能详情栏内容` |
| Whole-respec only overlay | `TowerMenu/全洗确认遮罩` |
| Other camp page ScrollView | `TowerMenu/事务卷轴` |

The menu's primary `scroll` is the tree ScrollView on the library page; `skillPaneScroll` is the separate detail ScrollView. `detailScroll` is reserved for the whole-respec dialog. Skill detail no longer has a close button or an inline expanding row. Footer labels remain 宗门 / 锁妖塔 / 技能树 / 武器.

## Verification and remaining risk

- Actual production menu TS transformed at the Cocos test boundary, with real Growth/Campaign/Loot modules and in-memory persistence: **passed at 844×390, 1280×720 and 360×640**. Covered all 16 symbols/badges, caption wrapping, two realm rows, independent pane bounds, initial small-landscape action visibility, two-axis pan preservation, detail scroll retention, real +/- and cascade refunds, failed-save retry, stale callbacks, read-only inspection and paused-learning guards.
- Latest `node --test tests/xianxia-tower-host-tools.test.mjs`: **25/25 passed**, including the parent's concurrent host/joystick/resize tests. This task did not edit those tests.
- Direct Cocos project TypeScript check (`tsc --noEmit --project cocos-pilot/tsconfig.json`): **zero diagnostics**. No build or sync.
- Preserved the current dynamic denomination `1 / 6 / 24 / 30 / 36 / 42 / 48` by reading `CORE_RANK_VALUES`, rather than restoring the obsolete 1–7 text.
- Browser/GPU rendering, touch drag cancellation, fine connection readability, long refund text and pixel rounding at 844×390 remain for the parent's coordinated browser pass. Node geometry checks are not screenshots or physical-device acceptance.
- `CODEX_HANDOFF.md` / `DEBUG_HANDOFF.md` were not modified because this task owns only the menu and this report. No cross-chat messages were sent.
