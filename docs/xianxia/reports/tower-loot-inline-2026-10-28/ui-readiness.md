# Inline skill tree / graded loot browser acceptance

Status: **Nonlinear loot/labels/save acceptance passed: 16 cases, 155 pointer clicks, 75 screenshots.** See `ui-denomination-summary.json` and `ui-denomination-review.md`. The newly requested landscape game, fixed joystick, skill circles, realm rows and right-hand details pane are not in the accepted artifact and require a new build/acceptance round. Do not repeat the old layout.

Earlier `ui-browser-acceptance.json`, `ui-browser-camp-rerun.json`, `ui-browser-undefined-diagnostic.json`, and associated screenshots are preserved as **superseded first-build evidence**, not the verdict on the rebuilt artifact. Their functional-pass fields do not override the first build's confirmed UI failure; see `ui-first-build-summary.json`.

Only `scripts/verify-tower-loot-inline-ui.cjs` and this report directory's `ui-*` files are owned by this QA task. No runtime, host, build or sync changes were made.

## Preflight completed

- Node syntax check passed.
- Four artificial camp fixtures passed real Campaign validation and encoder roundtrip. Skill ranks, permanent books and evolution ranks are acquired with Campaign transactions; only explicitly listed camp source fields are seeded.
- Variable point costs and feasible special/evolution cascades were checked against the current source.
- The bundled Playwright package exists at the requested path.
- Invoking the script without `--check` or `--build-ready` intentionally fails before launching a browser.
- Current controls: `learnSkill-<id>`, `decreaseSkill-<id>`, `技能节点-<id>`, `技能行-<id>`. Details are under `同页技能详情` inside `十六技能树`.

The machine-readable preparation record is `ui-script-check.json`. It is source/fixture evidence only, not browser evidence.

## Run after buildready

```sh
UI_CHROMIUM_EXECUTABLE=/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell node scripts/verify-tower-loot-inline-ui.cjs --build-ready
```

Default preview URL:

```text
http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1
```

`PREVIEW_URL` may override it. The script neither starts a server nor builds/syncs the project.

The requested Playwright package expects browser revision 1234, which is absent. The explicit override uses installed Playwright headless revision 1247 (Chromium 155.0.8059.12), not a user browser. Set the same `UI_CHROMIUM_EXECUTABLE` for a targeted rerun:

```sh
UI_SIZES=390x844 UI_RUN_TAG=first node scripts/verify-tower-loot-inline-ui.cjs --build-ready
UI_CASES=loot UI_SIZES=360x640 UI_RUN_TAG=loot-rerun node scripts/verify-tower-loot-inline-ui.cjs --build-ready
```

Default matrix: 390×844, 360×640, 1280×800, 720×1280, 1080×2400; four independent scenarios per viewport.

| Scenario | Pointer acceptance |
| --- | --- |
| `camp` | All 16 names and +/- controls in one tree; real + clicks update rank/points without extra navigation; costs 2/3/2; actual − refunds; gifts disabled; same-page details; control stays visible after upgrade; connection screenshots; value/first-rank/book-price wording; persisted allocations |
| `refunds` | Evolution rank-2 refund of 4 points; special dependency cascade; evolution dependency cascade including mixed 2+4 refund; retained permanent books and zero book fee when relearning; saved result after reload |
| `paused` | Real tower entry and pause; actual clicks on disabled minus and restricted plus; basic/known passive upgrades to level 3; rank-4, new passive, special and evolution restrictions; full combat state excluding updated loadout remains frozen; saved paused allocation and pointer resume |
| `loot` | Explicit independent playtest assist toggled with pointer; genuine movement/Run stepping until a visible rank-4+ core; battlefield screenshot; exact pause counts/ranks/value; identical loot seed, receipts, visuals and future plan after reload; actual floor-9 full clear; clear/first-clear awards separate; settlement/reload totals; ordinary fixture raw remains unchanged |

Every UI activation uses `page.mouse.click` with coordinates obtained by read-only Cocos inspection. Scrolling uses actual mouse-wheel input. No synthetic Button events or direct host skill/navigation calls are used.

Each scenario launches a fresh nonpersistent Playwright context. There is no user save read, user browser connection, liveIAB, persistent profile or imported storage state.

The loot scenario uses explicit playtest invincibility/one-hit assist and accelerated real `Run.advance` steps with movement input. Enemy positions, enemy HP, kills, loot, rewards and battle snapshots are never fabricated. These runs establish UI and persistence behavior; they are **not natural progression or balance evidence**.

## Evidence and remaining review

The eventual `ui-browser-<tag>.json` lists every actual pointer click, coordinates, disabled state, immediate campaign allocation, checks, screenshots, runtime exceptions, console errors/warnings, HTTP failures, failed requests and served script identity. Each screenshot has a sibling JSON scene/geometry capture.

The rebuilt UI matrix completed and representative screenshots at all five sizes were inspected for parent connector visibility, actual graded-core rendering, text legibility/clipping and small-viewport detail layout. Optional read-only Graphics path capture supplements screenshots; component presence alone is not claimed as proof of visible parent connections.

The final script rejects `undefined` / `NaN` in production labels, validates built preview/transaction `changes` as actual objects, and checks the exact rendered refund value, related skill names/ranks, absence of spurious cascades, and committed feedback after real pointer clicks.

The targeted run independently summed `CORE_RANK_VALUES[coreRank]` over actual kill receipts using `[0,1,6,24,30,36,42,48]`. It checked normal and capped retreat/reload at all five sizes, and one full first-clear settlement. The current compiled camp +/−, same-page details, value header and denomination tables were also checked at every size.
