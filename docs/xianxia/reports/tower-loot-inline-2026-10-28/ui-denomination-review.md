# Nonlinear loot and save acceptance — passed

**16/16 cases passed, 155 actual pointer clicks, 75 screenshots.** Runtime exceptions, console errors, HTTP failures, failed requests and `undefined`/`NaN` production labels: **zero**.

Accepted scope: nonlinear denomination labels, real graded drop visuals, normal/capped retreat, exact reload persistence, actual settlement credit, and a camp inline +/−/details smoke check on the current compile.

**The subsequently requested landscape game, fixed bottom-left joystick, circular skill icons with cooldowns, large realm rows and right-hand selected-skill pane are not in this artifact. They need a separate acceptance round after the next buildready. No additional old-layout run is planned.**

## Build identity and matrix

Actual served application bundle:

```text
assets/main/index.77af0.js
SHA-256 873d426a53905196a7e1ee8be4d0057c0678a98d937a1a58538c40a9544ec833
```

The same response-body hash was captured across every case. Denominations were `[0,1,6,24,30,36,42,48]`.

| Cases | Viewports | Result |
| --- | --- | --- |
| Header/tower/help denomination table + camp +/−/gift/details | 390×844, 360×640, 1280×800, 720×1280, 1080×2400 | 5/5 pass |
| Actual graded drop → pause → reload → retreat → reload | Same five | 5/5 pass |
| Same path with only 3 points of remaining wallet capacity | Same five | 5/5 pass |
| Real full floor-9 first clear and settlement/reload | 390×844 | 1/1 pass |

All UI actions used actual mouse clicks and wheel scrolling. Every scenario used a fresh nonpersistent Playwright context. No liveIAB or user browser/profile/save was read or modified. QA made no runtime/host source edits, syncs or builds.

## Verified behavior

- Header states that grade determines first-rank-equivalent value and item count is separate.
- Tower/help list `1／6／24／30／36／42／48`; permanent book price still uses `妖丹值`.
- Current compiled camp + and − commit immediately, preserve the visible control, and show the correct invested-cost refund. Gift levels cannot be reduced. Details stay on the tree page; no undefined change names/ranks.
- Real kill receipts produce graded core graphics and rank labels. The visual drop's `amount` equals `CORE_RANK_VALUES[rank]`.
- Expected count/value is independently recomputed from actual kill receipts, using denomination lookup rather than the rank number.
- Reload preserves the exact paused snapshot: loot identity, kill receipts, visual drops, cooldowns and future drop plan.
- Pointer retreat credits only real earned value, grants no first-clear award, and saves the correct last result.
- Normal raw storage remains unchanged while the separate assisted playtest runs.

## Cap and first-clear evidence

| Viewport | Raw drop value | Credited value | Shown as not credited |
| --- | ---: | ---: | ---: |
| 390×844 | 30 | 3 | 27 |
| 360×640 | 24 | 3 | 21 |
| 1280×800 | 30 | 3 | 27 |
| 720×1280 | 24 | 3 | 21 |
| 1080×2400 | 24 | 3 | 21 |

Pause and retreat distinguish raw graded count/value from actual credit and overflow. At the cap, the existing save schema omits raw `coreLoot` from `lastResult` when it exceeds credited value; the credited result persists and the latest-result card does not falsely label all raw drops as credited.

The separate first-clear run produced four cores: one each at ranks 2, 3, 4 and 7. Independent value: `6 + 24 + 30 + 48 = 108`. Actual credit: `108 + 40 clear + 10 first-clear = 158`. Settlement displays “实际入账” from `lastResult`, and states first-clear rewards are included. Reload retains the same result.

These are explicit artificial high-progress/cap fixtures and assisted real simulation. They prove UI/save behavior, **not natural progression, farming rates or balance**.

## Evidence

- `ui-browser-final-denominations.json`: 15 cases across all five viewports.
- `ui-browser-final-first-clear.json`: full first-clear case.
- `ui-denomination-summary.json`: audited totals, per-case results, cap values and bundle hash.
- `ui-clicks-final.md`: all 155 actual click targets and coordinates.
- Each PNG has sibling scene/geometry JSON. Representative table, popup, cap and settlement images were visually reviewed across all five sizes; reviewed filenames are listed in the summary.

Captured warnings concern screenshot ReadPixels GPU stalls and Cocos window-size/deprecation messages. All warnings remain in raw reports.

Earlier failed builds and the prior 20-case matrix remain separate historical evidence. Their layout screenshots do not certify the forthcoming landscape redesign.
