# 周天剑阵 move and 青莲剑阵: status report (2026-11-07)

Worktree: .worktrees/sect-tower-sword-formations, branch codex/sect-tower-sword-formations.
Base: 3b64a74e (user-approved baseline commit on codex/crafting-minigames).
Not merged. Not pushed.

## Commits
- 5a6c20d43 feat(xianxia): move 周天剑阵 to 炼气中期 and add 青莲剑阵 at 炼气巅峰
- 267d3145d chore(xianxia): bump tower campaign save schema 88 to 89
- eb984fed feat(xianxia): 青莲剑阵 renderer, icon and mirror sync
- 4b37e55d test: update skill count and cost expectations for 青莲剑阵

## Tests
- Baseline full run (3b64a74e): 2389 tests, 2286 pass, 103 fail. Output: baseline/full-tap.txt.
- Full run after changes: 2399 tests, 2296 pass, 103 fail. Output: full-tap-after.txt.
- Failing names are identical to the baseline set. Zero regressions, zero new failing names.
- New focused tests: qinglian ring geometry and sweep shares (tests/xianxia-tower-skill-forms.test.mjs), cast/pulse/restore run test, tests/qinglian-formation-art.test.mjs.

## Build
- node scripts/cocos/build.mjs web-mobile: exit 0. Log: build/web-mobile.log, zero "error TS" lines.
- Mirror sync (scripts/cocos/sync-shared.mjs) is idempotent.

## Balance (natural harness, 18 attempts per floor)
See balance/comparison.md. Only the formation route (纯剑阵) and mixed/lance/array routes change where 周天 is used. The qi route is identical.
- Floor 4 pure-sword, seed 101: first win moves from attempt 5 to attempt 8; losses 3 to 5. Seed 202: attempt 4 to attempt 5.
- Floor 4 still clears within 18 attempts on both seeds. The plan's failure criterion is not met, and no numbers were tuned.
- The harness is not the 2026-11-06 producer. Those reports are fixture-based and their producer is not in the repo, so no direct numeric comparison against them is claimed.

## Save reset
- Schema is 89. tests/xianxia-tower-campaign.test.mjs already loops over currentCampaignSchema-1 (88) and asserts that other keys are unchanged and that exactly one write happens. That is the existing evidence.

## Not completed
- Live browser verification (plan item 13) is not done. The built game loaded but showed its own "画面未能载入" failure screen in headless Chromium at 1280x720 and 844x390, with no console errors (live/boot-1280x720.png, live/boot-844x390.png). I did not determine whether the cause is the headless environment or the build. No cast, pause, death, or exit recording exists.
- Full 15-item plan items 13 and the design document (item 15) are incomplete. The icon is delivered as an SVG source and a 256x256 render.

## Open decisions for the user
- Whether to merge codex/sect-tower-sword-formations into codex/crafting-minigames. Not done here.
- Whether the live check should be retried with a real-GPU browser or the baseline build checked for the same headless failure.

## Browser boot investigation (2026-11-07, follow-up)
Question: does the load-failure screen come from the changes?

- Baseline 3b64a74e built from an exported snapshot (node scripts/cocos/build.mjs web-mobile, exit 0). Served and loaded with headless shell at 1280x720: same "画面未能载入，请检查网络后重试" screen. Evidence: live/boot-evidence/baseline-headless-shell-1280x720.png.
- Baseline with software GL flags (--use-gl=swiftshader --enable-unsafe-swiftshader): same screen. Evidence: baseline-headless-shell-swiftshader-1280x720.png.
- Baseline with full Chrome for Testing (cached chromium-1247): same screen. Evidence: baseline-chrome-for-testing-1280x720.png.
- Changed build (HEAD 3ccb49ac) with headless shell: same screen at 1280x720 and 844x390. Evidence: changed-headless-shell-*.png.
- Network: no failed requests and no 4xx responses during baseline boot (requestfailed/response listener).
- DOM text is empty in all runs because the message is drawn on the canvas, so DOM text cannot distinguish outcomes.

Conclusion: the load failure reproduces on the unchanged baseline in every configuration tried. It is not caused by this change. Its root cause is not identified.

## Unverified in this delivery
- Live in-game checks of 周天剑阵 (学习 at 炼气中期) and 青莲剑阵 (学习 at 炼气巅峰): cast, judgment hits, cooldown 6s/9s, pause, resume, death, exit cleanup. Not run; the game does not reach the tower screen in this environment.
- Screen recordings and gameplay screenshots at 1280x720 and 844x390: not produced.
- Verified instead: unit/geometry/runtime tests, full suite with zero regressions, build with zero TypeScript errors, natural balance harness before/after.

## Merge status
- Not merged. codex/crafting-minigames is checked out in the main checkout, which has uncommitted changes. Fast-forwarding it requires updating the main checkout's HEAD and working tree, which was not done. Ancestry is valid (`git merge-base --is-ancestor codex/crafting-minigames codex/sect-tower-sword-formations` succeeds). Merge must be run from the main checkout by the user, or the user must approve a different route.
