# Courtyard integration review

Date: 2026-10-27. Initial scope: read-only review of the parent integration and its gameplay dependencies. Follow-up explicitly authorized fixing the confirmed relocation finding in `Spawner.js` and the courtyard tests, and updating this report. No rendering code, generated shared modules, assets, or build outputs were edited.

## Result

**The one confirmed P2 finding is resolved and verified.** Valid courtyard enemies no longer relocate solely because they exceed the old infinite-map distance threshold. No P0/P1 issue was found in the inspected integration.

The reviewed rendering paths align the single background image, boundary, actors, and camera correctly. Normal courtyard asset ownership has matching release operations. Explicit arena configuration reaches both production xianxia runs and fixed playtest records. These statements are based on source inspection and the checks below, not a browser/device acceptance claim.

## Verified resolution — finite-field relocation

- `Spawner._relocate()` now uses radius containment for courtyard runs. Every radius-contained enemy is left unchanged, regardless of distance or behavior. A radius crossing any field boundary triggers the existing bounded safe-placement path, with one RNG draw and knockback reset.
- Legacy runs retain their distance threshold and cross/boss/charge exemptions.
- The real `relocation-3` reproduction now advances the enemy from `(-901.9873018918945,-593.1667106422713)` at tick 47 to `(-901.974603783789,-591.3334212845425)` at tick 48: normal chase movement, unchanged spawn RNG state.
- Added regressions verify the exact next-step position, enemy identity/HP, and RNG state; unchanged complete enemy state across 12 viewports × 9 player positions × 9 enemy positions × 6 behaviors; all four radius-boundary violations across those behaviors; one-shot relocation with no repeat draw; and unchanged legacy relocation/exemptions.
- Red/green evidence: the three new courtyard behavior tests failed before the fix; the new legacy check already passed. After the fix, `node --test tests/xianxia-courtyard.test.mjs tests/survivor-spawner.test.mjs` passed **41 tests, 0 failures** (15 courtyard + 26 spawner). Scoped `git diff --check` passed.
- Verified fixed `js/survivor/Spawner.js` SHA-256: `0d5982a6b8765fb5a1efb2cbe9e42690d607db8025c2021dcd1a323749b2be75`.
- No build, global tests, fingerprint regeneration, or shared synchronization was run in this follow-up, as requested. The parent must regenerate/sync the changed gameplay before final runtime validation; the earlier fingerprint/replay checks below describe the pre-fix review snapshot.

## Original P2 finding — resolved

- Severity: medium.
- Location: `js/xianxia/Courtyard.js:63–82`; consumer: `js/survivor/Spawner.js:246–257`.
- Issue: Candidate selection checks minimum player distance and prefers positions outside the viewport, but does not consider `spawner.relocateDistance`. A selected perimeter point can be beyond that distance. The next simulation tick classifies the newly spawned enemy as having drifted too far, moves it again, and consumes an additional spawn RNG draw.
- Impact: Stationary-player runs can contain an unnecessary enemy teleport immediately after spawning. The extra draw changes subsequent spawn composition/angles relative to the intended placement-only transformation. This remains deterministic for a given courtyard run; it is not a claim of nondeterministic execution. Positions remain inside the field.
- Pre-fix reproduction: Uses the actual fixed-step loop, ordinary first-wave enemy, and real seeded RNG; no injected enemy or mocked RNG is needed. The tick-48 output below is historical and is replaced by the verified result above.

```js
import { SurvivorRun } from './js/survivor/SurvivorRun.js'
const run = new SurvivorRun({
  seed: 'relocation-3',
  ruleset: 'xianxia',
  arena: 'courtyard-v1',
  viewport: { width: 720, height: 1800 },
})
Object.assign(run.player, { x: -894, y: 560 })
while (!run.enemies.count) run.step()
const enemy = run.enemies.active[0]
// tick 47:
// enemy = (-901.9873018918945, -593.1667106422713)
// distance to player = 1153.1943719620851
// run.spawner.relocateDistance = 1149.329665284211
run.step()
// tick 48:
// same enemy = (-514.8446995538146, -394.9816596752374)
// one extra spawn RNG draw; no new routine spawn is due
```

- Suggested fix: Reconcile the finite-field placement rule with relocation. Either prevent placement beyond the applicable relocation threshold when choosing courtyard candidates, or change courtyard relocation to avoid recycling a valid newly placed field enemy solely because of the old infinite-map threshold. Preserve the minimum safety distance, radius containment, bounded candidate work, and legacy behavior.
- Suggested regression: Run the reproduction above and a grid of player positions/viewports. Assert that a stationary player does not cause a just-spawned enemy to relocate on the next tick; check spawn RNG consumption as well as containment.

## Inspected paths

### Camera, background, and HUD

- `SurvivorBattleArt.ts:127–136,201–222,251–275`: image dimensions are validated as 1248×1664. The node is 3744×4992 world units and centered at `(0,204)`, consistent with source origin `(624,900)`, scale 3, and the declared image bounds. It is one image, not a repeated courtyard tile.
- World and courtyard ground receive the same camera translation and shake. The fallback ground retains its legacy modulo translation. Visibility culling uses the chosen camera center.
- The boundary uses `COURTYARD.bounds` in the world layer and is enabled for arena runs even when courtyard image loading fails. Resizing destroys/replaces the old courtyard and boundary nodes.
- `SurvivorBattleArt.ts:397–402`: boss, elite, and extraction indicators subtract the camera center before entering the screen-space indicator routine. `SurvivorView.updateBounds()` supplies screen-space safe-area/HUD bounds. The joystick and fullscreen glow remain in the screen layer.
- Nonblocking coverage note: `syncWanjian()` at lines 889 and 902 still computes HUD clipping from the player rather than the camera. With the current field and conventional mobile viewport sizes, the camera equals the player; no actual HUD overlap was reproduced. An unusually tall/wide presentation where the image camera clamps deserves an explicit camera-offset effect test before expanding viewport support. This is not counted as a confirmed gameplay/rendering defect.

### Resource lifecycle

- Courtyard ownership follows `ImageAsset.addRef()` → texture → sprite frame; `destroy()` releases the frame and texture and decrements the image reference, then clears fields.
- Missing-image and wrong-dimension paths fall back to the existing ground with a visible boundary. Completion checks root validity before acquiring courtyard ownership.
- Repeated layouts replace nodes without reacquiring the image. The render test exercises resize, switching to a legacy run, and final destruction.
- No missing release was identified in the normal load/resize/destroy paths. Actual Cocos deferred destruction and GPU resource lifetime were not exercised by the Node scene-graph fixture.

### Arena configuration and records

- `SurvivorView.ts:205` explicitly supplies `arena: 'courtyard-v1'` only for production xianxia runs. Classic runs do not receive it. `firstRun` does not independently enable the arena in `SurvivorRun`.
- `js/xianxia/Playtest.js:8` includes the arena in the fixed config passed to both the live run and `PlaytestRecord`. Replay reconstructs and validates that same config.
- The generated playtest fingerprint was stale at the start of inspection, then was refreshed by the concurrent parent work. The final `--check` passed. A record built with the actual exported `PLAYTEST_FINGERPRINT` replayed successfully; no current fingerprint mismatch is reported.
- `scripts/cocos/build.mjs:11–13` regenerates the fingerprint and shared modules before building. Final shared-module consistency tests passed. Old pre-change records are intentionally rejected by fingerprint/config validation.

### Geometry, collision, and reachability

- Player movement respects radius-inset rectangle bounds; the source/image rectangle is separate from the walkable rectangle.
- Routine, timed-event, elite, summon, and direct boss spawns use the courtyard placement path. `bossSpawn` reports the actual relocated coordinates.
- `SurvivorRun.js:261–274` clamps all active enemies after behavior, then clamps again after separation and rebuilds the grid before weapons/contact queries. No collidable enemy outside the rectangle was reproduced.
- Death loot is contained, existing pickups are brought into player-reachable bounds, and extraction placement and its event agree. Corner extraction completion tests pass.
- The P2 above concerns unnecessary relocation inside the field, not a failure of collision containment.

## Verification performed

1. `node --test tests/survivor-character-render.test.mjs tests/xianxia-courtyard.test.mjs tests/xianxia-playtest.test.mjs` — **26 passed, 0 failed**.
2. `node --test tests/survivor-sync.test.mjs` — **3 passed, 0 failed**.
3. `node scripts/survivor/playtest-fingerprint.mjs --check` — **passed on final check**.
4. Direct record/replay check using `playtestConfig`, `PlaytestRecord`, and the generated fingerprint — **arena `courtyard-v1`, replay matched**.
5. Read-only placement sweep over multiple viewports, player positions, and requested angles, followed by the real fixed-step reproduction above — **confirmed P2**.

The parent owns full-suite reruns, build, browser, and device verification. Those were not duplicated or claimed by this review.

## Reviewed source snapshot

These hashes identify the original, pre-fix inspected state while parent integration work was ongoing. The fixed Spawner hash is recorded in the resolution section above.

| File | SHA-256 |
| --- | --- |
| `cocos-pilot/assets/scripts/SurvivorBattleArt.ts` | `cd8eb76ed7ecbf9a2b219f5c8ef654ab9c48942a3280a43b70ce0fa95b4ca41b` |
| `cocos-pilot/assets/scripts/SurvivorView.ts` | `ee07d73bb19c23f430e3a92359087386bd373f23595d57091eac4632509e8321` |
| `js/xianxia/Playtest.js` | `3d655042b6799e67b67569552b461005922fe364d3339b467f233055f9ba92de` |
| `js/xianxia/PlaytestBuild.js` | `c8c22ac959e7b8841c0fb1c2b5deee5d64ce384212a6be385b6f37d35c40ca15` |
| `js/xianxia/Courtyard.js` | `9c6c2cb7004ccf90793589a155819a6ad88a3068ec56553e509505d37a6dc22d` |
| `js/survivor/SurvivorRun.js` | `ac5edf4b1791914b0cf05454b9aa56b464a688f6d706709561a709db9e883ffa` |
| `js/survivor/Spawner.js` | `94a63d9b841d463487f08e93250412bc83eb7f583f4725eb2043d7b3c1355c9c` |
| `js/survivor/Boss.js` | `840693d6d247a1703427ecab2a6287824c0f1cf8ae0dc8a76ad2255ad774bbc1` |

Handoff: follow-up changed only `js/survivor/Spawner.js`, `tests/xianxia-courtyard.test.mjs`, and this report. `CODEX_HANDOFF.md` and `DEBUG_HANDOFF.md` remain unchanged per the authorized write scope. The relocation finding is closed; the parent owns regeneration/sync, global tests, build, and browser acceptance.
