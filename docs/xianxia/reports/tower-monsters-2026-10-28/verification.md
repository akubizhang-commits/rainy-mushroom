# Tower monster integration verification — 2026-10-28

**PASS.** All nine approved static sprites render in the actual compiled Cocos battlefield at 1280×720 and 844×390. The smaller viewport uses the host's existing 1280×591.47 logical projection.

Validation:

- Creator's bundled TypeScript: `node /Applications/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript/lib/tsc.js --noEmit --project cocos-pilot/tsconfig.json` — exit 0, zero diagnostics before and after build.
- `npm run cocos:build` — successful web-mobile build; Creator completion marker at 2026-10-28 19:52:02. Log: `cocos-pilot/temp/pilot-builds/web-mobile.log`.
- `node --test tests/xianxia-tower-*.test.mjs tests/survivor-host.test.mjs` — **406/406 passed** after build.
- `node scripts/verify-tower-monsters.cjs` — **2/2 compiled browser cases passed**, zero page errors. Reuses the skill-hints verification server/browser infrastructure with its own paused training fixture, actual compiled `TowerView.draw()`, Cocos resources, scene graph, and GPU rendering.

Browser assertions and visual inspection:

- Nine loaded family frames and nine cache entries: boar, wolf, bear, tiger, ape, snake, crocodile, scorpion, centipede. Sprite widths stay within 64–110 logical units, preserve aspect ratio, and only flip horizontally.
- Spider, bat and falcon retain the existing vector beasts; all 12 labels remain present. Health bars, elite/boss rings, player and an overlapping poison projectile remain visible. The hostile warning layer is above sprites; foreground and labels are above warnings. Screenshots were opened and inspected at both requested sizes.
- Stable enemy IDs reuse nodes. Pruning the fixture leaves two nodes, restoring it returns to nine; camp leaves zero actors and no battle node. Destroy clears the cache and releases owned frame/texture/image references.
- Drawing leaves the fixture's combat state unchanged. Campaign state and persistent storage are unchanged; **zero memory-save or persistent writes during the fixture and cleanup**. Cocos startup performs its normal `storage` availability probe (set then remove), separately recorded; this is not a campaign save. `smoke=1` uses memory-only profile storage in a fresh browser context.

Artifacts:

- [1280×720 battlefield](battlefield-1280x720.png)
- [844×390 battlefield](battlefield-844x390.png)
- [Machine-readable browser checks](browser.json)

Scope: the fixture arranges paused actors for presentation checks; it is not a combat balance or locomotion test. These are static portraits with facing flips, not walking animations. Small monsters are deliberately compact at 844×390. Existing pale painted areas beneath snake/crocodile remain; no artwork or alpha edits were made during verification. The render integration does not alter combat radii/hitboxes.
