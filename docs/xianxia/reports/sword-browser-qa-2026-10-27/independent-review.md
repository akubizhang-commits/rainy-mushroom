# Independent review: enemy render-pool capacity

2026-10-27. Scope: the enemy pool allocation in `SurvivorBattleArt.ts` and the two density regressions in `survivor-character-render.test.mjs`. Source and evidence were read-only; this report is the only file written.

**Conclusion:** no blocking correctness issue found in the scoped fix. The new capacity covers the current worst-case enemy rendering demand. Rebuilt browser measurements and full-suite validation remain with the main thread.

## Correctness

`Math.max(N.enemies, 2 * LIMITS.pools.enemies)` currently yields 404 slots: the logical pool holds at most 202 enemies, and the render loop consumes one slot per visible body plus one additional slot for each visible `elite_beetle`. Therefore demand is `visibleEnemies + visibleElites <= 404`. Ordinary enemies, including the boss, consume one body slot. Visibility culling occurs before either allocation.

Previously, the shared pool stopped at 160 slots; elites allocate their aura before their body, so aura demand could displace bodies and terminate the loop early. Increasing capacity removes that shortage for all current logical-pool compositions without changing simulation limits, spawn behavior, or visibility rules. The allocation applies to both classic and xianxia rendering.

`SpritePool.next()` creates nodes only when a requested slot does not exist. This is a lazy ceiling, not 404 eager allocations: 202 visible ordinary enemies require 202 slots, and 202 visible elites require 404. `end()` deactivates unused slots; subsequent rendering reuses them.

## Targeted verification

Executed:

```sh
node --test --test-name-pattern='all pooled' tests/survivor-character-render.test.mjs
```

**2 passed, 0 failed.** The tests execute the actual TypeScript art implementation with a lightweight Cocos scene-graph stub and real `SurvivorRun`:

- 202 visible gnats produce 202 body frames.
- 202 visible elites produce 202 body frames and 202 aura frames.
- Moving ten enemies offscreen leaves 192 body frames.
- Rendering an empty run reports zero active enemy slots; rendering the populated run again does not grow the allocated slot array.

The fixtures deliberately fill the 202-slot logical pool through `_spawnOne`; they are capacity regressions, not evidence that normal spawning produces 202 simultaneous elites. Their coordinates fit within the tested viewport. The tests demonstrate frame allocation/counting and stable slot-array length, not GPU rendering, per-node identity assertions, or pixel-level visibility. Offscreen aura counts and node active flags are not separately asserted, although the inspected loop culls before aura allocation and `end()` deactivates the unused range.

## Existing browser evidence and limits

At review time, the pre-fix evidence was named `results.json` (the main thread plans to rename it `before.json`). All four recorded case endpoints—two repetitions each of `rain-orbit` and `line-formation`—show 200 logical enemies and 160 enemy sprite slots. The evidence reports no browser errors and explicitly identifies injected static density fixtures. It supports the original capacity shortfall; it is **not** an after-fix measurement. Pool counts include auras and should not be labeled body counts when elites are present.

The increased ceiling retains up to 404 allocated enemy nodes after peak demand until the art instance is destroyed. Empty-run cleanup deactivates nodes rather than freeing the high-water allocation. Browser after-results should therefore distinguish active slots from retained nodes and measure frame/draw-call costs with the corrected body coverage. Prior timing numbers measured an under-rendered scene and cannot establish the fix's performance.

The nearby legacy comment still describes a 160-node enemy budget; the effective allocation now overrides that budget. This documentation mismatch does not invalidate the capacity calculation. No broader cleanup is proposed.

No rebuilt-browser run, full-suite run, human play, mobile-device performance, or unrelated art/playtest audit was performed in this review.
