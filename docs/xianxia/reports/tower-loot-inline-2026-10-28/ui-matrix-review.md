# Rebuilt UI matrix — passed; new loot table pending

**20/20 cases passed across all five viewports.** The matrix was already running when the next loot denomination and cap-summary changes were announced. Preserve this as UI evidence; final loot/label acceptance requires the next parent-provided build.

Update: that targeted nonlinear loot/label acceptance has now passed; see `ui-denomination-review.md`. The later landscape redesign remains pending and is not covered by either artifact.

- 245 actual pointer clicks, including disabled controls.
- 75 screenshots, each with scene/geometry JSON.
- 30 production refund preview/feedback validations, including actual built change-object arrays and cascade names/ranks.
- Zero runtime exceptions, console errors, HTTP failures, failed requests, or `undefined`/`NaN` production labels.
- Camp, refunds/cascades, paused skills and assisted real-loot scenarios passed at 390×844, 360×640, 1280×800, 720×1280 and 1080×2400.
- LiveIAB and user profiles/saves were untouched. Every scenario used a new nonpersistent context. No runtime/host source, build or sync changes were made by QA.

## Artifact identity

Every scenario captured the same served application bundle:

```text
assets/main/index.de4c8.js
SHA-256 c30a7466543cc1e7a02a119bbb29fe08157a697bce0ea22e9f8da99dd18d9944
```

Browser: installed Playwright headless Chromium 155.0.8059.12, revision 1247, with the requested bundled Playwright package. The package's default revision 1234 was absent, so the explicit executable override was used.

The main bundle hash comes from the actual response bytes, not a source-file hash. Reloads also produced normal 304 responses; these have no new response body and the original 200 response hash is retained.

## Visual review

Representative screenshots at every size confirm:

- Single-skill refunds show “仅此技能降一级” without a spurious cascade.
- Special and evolution cascades show the actual affected skill names and rank transitions. Saved feedback matches the committed refund.
- Details stay within the same tree. No modal/secondary skill page is introduced.
- Tree connections remain visible; controls retain their position after transactions. Tall content scrolls within the existing viewport.
- Paused minus controls and restricted plus controls appear disabled.
- Real graded cores have rank labels and distinct rendered colors/marks. Loot pause/reload/settlement text is readable in the inspected images.

Reviewed images are enumerated in `ui-matrix-summary.json`. The earlier Map Iterator defect is resolved in this artifact. All first-build failures and their screenshots remain labeled as superseded.

## Loot results for this artifact only

These are artificial high-progress fixtures with explicit isolated playtest assist and real movement/Run stepping. They establish UI and persistence behavior, **not balance or natural farming rates**.

| Viewport | Dropped cores | Drop value | Clear + first-clear bonus | Credited value |
| --- | ---: | ---: | ---: | ---: |
| 390×844 | 38 | 114 | 40 + 10 | 164 |
| 360×640 | 37 | 108 | 40 + 10 | 158 |
| 1280×800 | 37 | 108 | 40 + 10 | 158 |
| 720×1280 | 40 | 120 | 40 + 10 | 170 |
| 1080×2400 | 42 | 128 | 40 + 10 | 178 |

Exact paused loot seed, receipts, visuals, cooldowns and future drop plan survived reload. Settlement totals and the latest-result card survived another reload. Ordinary fixture storage remained unchanged while the independent playtest ran.

## Remaining targeted work

After parent announces the nonlinear denomination/cap-summary buildready, inspect the final labels and run targeted loot/label cases. The script now independently totals `CORE_RANK_VALUES[coreRank]` from kill receipts instead of assuming value equals the rank number. Do not repeat the full skill matrix unless a new relevant change or failure justifies it.

Raw results: `ui-browser-final-build.json`. Audited counts and artifact identity: `ui-matrix-summary.json`.

Warnings retained in the report concern ReadPixels GPU stalls and Cocos window-size/deprecation messages. They were not runtime exceptions.
