# Skill-tree hint verification — 2026-10-28

Result: PASS. Shared working directory; no commits or resets.

## Reviewed UI and exact edits

- `cocos-pilot/assets/scripts/TowerMenu.ts`: retained the incoming implementation. The blue `↑` uses the same `growthQuote` as the footer, is absent when a purchase is blocked (including the realm cap), and sits at `(38, -34)` in a 20×28 node. Its right edge aligns with the 96px icon. The existing level badge stays at `(-34, -34)` with its numeral centered. Added only a two-line comment explaining this placement; no additional behavior change was necessary.
- The incoming grey `前置技能` line remains at row y=-96, only for level-zero skills referenced by an actual skill prerequisite, evolution parent, or evolution passive. Earlier placement in a branch does not qualify a skill.
- `tests/xianxia-tower-host-tools.test.mjs`: added eight eligibility cases (realm cap with spare points, no points, stage lock, tutorial lock, missing prerequisite, unlocked first rank, current rank, absolute maximum); added purchase/refund transition coverage at the realm cap; added all-16-skill prerequisite true/false coverage and learn/refund label transitions. Asserted numeral centering, arrow baseline/right edge/color, footer eligibility agreement, and non-interactive hints. Updated the three viewport row-children assertions to accept only the applicable prerequisite label.
- `scripts/verify-tower-skill-hints.cjs`: new independent Playwright smoke, serving the built output on its own ephemeral localhost port. Checks seven fixtures at three viewport sizes against the compiled menu and writes `browser.json` and screenshots here.

No art or shared business logic was manually edited. The requested standard build ran its normal release preparation, fingerprint generation, and synchronization of 46 shared modules.

## Executed verification

1. `node --test tests/xianxia-tower-host-tools.test.mjs` — **76/76 passed**.
2. `node /Applications/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript/lib/tsc.js --noEmit --project cocos-pilot/tsconfig.json` — **exit 0, zero diagnostics**, including a post-build run.
3. `npm run cocos:build` — **exit 0**, built web-mobile. Creator log: `cocos-pilot/temp/pilot-builds/web-mobile.log`.
4. `TOWER_HOST_BUNDLE="$PWD/cocos-pilot/build/web-mobile/assets/main/index.8bccf.js" node --test tests/xianxia-tower-host-tools.test.mjs` — **76/76 passed**. This host option exercises the emitted icon loader/helpers; the menu itself is still sourced from TypeScript in that test harness.
5. `node scripts/verify-tower-skill-hints.cjs` — **21/21 compiled-menu cases passed**, zero browser page errors. Viewports: 1280×720, 844×390, 390×844.

## Browser evidence and limits

`browser.json` records the eligibility, current numeral, centered alignment, arrow geometry and colors, and actual versus expected prerequisite IDs for each case. Each context used `?ruleset=xianxia&tower=1&smoke=1`. Fixtures were detached presentation states passed to the actual compiled menu. Assertions confirmed campaign state and localStorage stayed unchanged.

Visually inspected `hints-1280x720.png`, `hints-844x390.png`, and `hints-390x844.png`: blue arrow sits to the right of the centered badge numeral without overlap; grey prerequisite lines are readable beneath level-zero skill captions; fixed footer controls are visible in all three layouts.

This focused browser script verifies rendering with artificial menu fixtures. It does not claim pointer-driven purchasing, scrolling through every stage, or real-save persistence. Purchases/refunds, eligibility transitions, selection/scroll retention, and save isolation are covered by the host suite. The older landscape script with stale assertions was not run.
