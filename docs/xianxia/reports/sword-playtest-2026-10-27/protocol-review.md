# Fixed-seed sword playtest: independent protocol review

Date: 2026-10-27. Scope: source inspection, read-only probes, and protocol design. This report is the only file written by this review. The recorder, host changes, and parent page belong to the main implementation.

**Status: human play is pending.** No human session, device acceptance, or completed recorder round-trip is claimed here. The proposal is suitable for a bounded diagnostic comparison once the parity gates below pass. It does not establish population difficulty, route balance, or enjoyment.

## Contract to freeze

- Explicit opt-in: `ruleset=xianxia&playtest=1&route=line` or `route=formation`. Reject invalid routes visibly rather than silently relabeling a run. Test missing parameters and `equipment=1` conflicts; playtest must not activate equipment storage.
- Both routes use seed `sword-balance-0`, ruleset `xianxia`, simulation viewport `{width:720,height:1560}`, `firstRun:true`, empty bonuses, omitted equipment, and no timed-win/debug override.
- Start every attempt from a new in-memory default profile, including “again” and camp/re-entry. Do not import persistent profile values. Keep the ordinary host path unchanged.
- Capture constructor options and actual initial state, not only the query. Record initial stats, HP/maxHP, weapon/passive inventory, level, equipment absence, profile/settings, route, attempt ID, protocol version, controller identity, and source identity.
- End at natural `won`/`lost`, explicit abandonment, or a declared 1,020-second simulation limit consistent with the existing harness. Abandonment, technical interruption, and timeout remain separate outcomes even when the run API calls abandonment `lost`.

“No equipment/bonuses” describes initial state. Legal in-run passives, pills, realm bonuses, and evolutions remain enabled. Never inject XP, HP, weapons, time, rerolls, or guaranteed route offers to help a session complete.

## Findings from actual source

| Area | Observed behavior | Confound / required handling |
|---|---|---|
| Constructor | `js/survivor/SurvivorRun.js:constructor` requires a nonempty string seed; defaults ruleset to `survivor`, viewport to 720×1560, bonuses to `{}`, and firstRun to false. Equipment is normalized only when supplied for xianxia. Debug timed victory defaults off. | Set the entire contract explicitly; a seed alone is insufficient. |
| Viewport | `clampViewport` clamps width to 320–1000 and height to 480–1800. `Spawner.js:spawnRadiusFor` uses viewport diagonal plus margin; its constructor also derives `crossLimit` from width. | Viewport changes gameplay, not just presentation. A read-only probe measured spawn radius 919.0692637965811 at 720×1560 versus 794.3023900274328 at 720×1280. Assert the effective viewport and spawner values. |
| Host setup | `cocos-pilot/assets/scripts/SurvivorView.ts` uses 720×1280 `FIXED_WIDTH`, obtains `view.getVisibleSize()`, and normally starts with `String(Date.now())`, visible dimensions, `Meta.bonuses(profile)`, and tutorial-derived firstRun. | These defaults differ from the bot harness. Override in the opt-in path and verify the running build actually used them. |
| Preview profile | `previewStorage` copies each persistent key on first read, then holds writes in memory. Equipment mode uses its own persistent store. | “In memory” does not mean “fresh.” Existing upgrades/tutorial/settings can enter ordinary xianxia preview. Playtest storage must begin empty without source reads, and bypass equipment mode before store construction. |
| Bonuses | `Meta.js:bonuses` maps permanent levels to maxHP, might, movement, pickup, and regeneration. `SurvivorSave.js:defaultProfile` has zero permanent levels and defaults sound/vibration on, reduceFlash off. | Inspect actual zero bonus values, not crystal balance. Profile settlement and tutorial flags must not alter the next attempt. Record any accessibility/settings variation. |
| firstRun | Search of current root `js` finds the constructor assignment but no gameplay consumer of `firstRun`. Host first-run tutorial presentation is separate. | Preserve true for parity, but do not claim it currently changes enemy difficulty or draft generosity. Tutorial familiarity is still a human confound. |
| Rendering | `SurvivorBattleArt.ts:sync` centers the world on the player and culls using host width/height. `SurvivorView.ts:updateBounds` reserves different top space for ordinary play, pills, and boss UI. | A fixed simulation viewport does not fix what humans can see. Record actual visible world size, safe insets, CSS frame size, device pixel ratio, orientation, and input method. Prefer a fixed 720:1560 display aspect; flag clipping/resize. |
| Input | `SurvivorInput.ts` samples touch/keyboard per host frame, normalizes keyboard diagonals, ignores touch starts in the upper third, and resets input on modal/lifecycle transitions. | Mouse/touch and keyboard have different control precision. Use one declared method within a paired comparison. Verify iframe focus, cancellation, release, and resume behavior. |
| Timing | Host clamps frame dt to 0–0.1 seconds. `SimClock.js` uses 1/60-second steps and a five-step cap. `advance()` can stop early when a step enters levelup or terminal state. | Record actual executed steps; requested clock steps or `round(dt*60)` can invent simulation. Keep wall time, simulated ticks, pauses, and dropped time distinct. |
| Choices | `choose(i, expectedOfferId)` returns success/failure; queued levels can produce another offer without a simulation step. Host gates normal cards for 0.4 seconds and breakthroughs for 1.6 seconds. | Record accepted choices in total order with offer ID and full card identity. Tick alone does not order multiple choices. UI waiting is wall time, not simulation difficulty. |
| Source boundary | Browser host imports generated `shared/js` TypeScript; Node harness imports root JS. `scripts/cocos/sync-shared.mjs` generates copies and a hash manifest. | A root-source fingerprint alone cannot prove the served browser bundle matches it. Verify shared parity, build identity, and loaded build freshness. |

The initial xianxia probe returned `sj_yujian` level 1; might 10, cooldownMul 1, areaMul 1, moveSpeed 168, pickupRadius 140, regenPerSec 0, maxHp 100, damageTakenMul 1. Use these as an inspection snapshot for this source version, not permanent balance constants.

## Important replay gap: zero-step input is stateful

`SurvivorRun.setInput()` immediately updates `player.dirX/dirY` for nonzero input, even before a simulation step. A read-only reproduction:

```js
const options = {
  seed: 'sword-balance-0', ruleset: 'xianxia',
  viewport: { width: 720, height: 1560 }, firstRun: true,
};
const live = new SurvivorRun(options);
live.setInput(1, 0);
live.advance(1 / 120); // returns 0, but facing changes
live.setInput(0, 0);
live.advance(1 / 120); // executes 1 step

const stepsOnly = new SurvivorRun(options);
stepsOnly.setInput(0, 0);
stepsOnly.step();
// Both have simulationTick 1; facing differs:
// live: [1, 0], stepsOnly: [0, -1].
```

Thus “exact per-step input” alone does not guarantee exact state parity. Preserve ordered input calls at zero-step boundaries too, or an equivalent replayable command stream. One straightforward representation is a frame command containing the input actually passed to `setInput` and the actual step count, including zero. Replay applies that input and calls `step()` exactly that many times. Keep accepted choices and lifecycle commands in the same ordered stream. Compression must preserve zero-step facing changes and command order; avoid lossy numeric rounding.

Record pause/resume/abandon where required to reproduce state, especially exports while paused or after abandonment. Capture timestamps and dt separately for diagnostics; do not feed wall dt back into `advance` during deterministic step replay. Clock accumulator/dropped-time fields will not automatically match a step-driven replay; compare gameplay state separately and validate host timing telemetry separately.

## Required parity gates before collecting scored human data

These are acceptance requirements for the main implementation, not tests completed by this review.

1. **Initial-state and storage isolation.** Compare human-host, recorder replay, and bot construction for both routes. Use synthetic populated/corrupt backing storage with read/write spies; playtest must neither import nor mutate it. Test restart, return to camp, normal xianxia, classic mode, and conflicting equipment query. Assert stats/inventory/options after each fresh start.
2. **Input/step round-trip.** Exercise 30/60/120-Hz schedules, alternating dt, zero dt, stalls above the cap, analog partial movement, diagonal input, release, and the zero-step reproduction above. Assert actual tick increments equal recorded executed-step counts. Cover a multi-step frame interrupted by levelup, death, and boss transitions.
3. **Ordered choices.** Cover multiple queued offers at one tick, stale IDs, invalid indices, double-clicks, hidden tabs, pre-unlock clicks, and pause/resume during breakthrough presentation. Only successful choices enter the accepted-choice list; rejected attempts may be separate telemetry. Before replaying each choice, verify offer ID, target level, full offered cards, index, and selected kind/ID/level. Refuse a mismatch rather than choosing a fallback.
4. **State and event equality.** Replay a host recording in the served browser and in Node against matching sources. Compare initial, periodic, choice-boundary, boss, and terminal checkpoints: player position/facing/HP/stats; state/tick; level/XP/pending levels; inventory/evolutions/pills; active entities and relevant combat state. Compare ordered gameplay events and final summary/aggregates. Include a natural run for each route; synthetic fixtures for unreachable branches are clearly marked fixtures.
5. **Observational recorder.** Run identical command streams with recording on/off and assert equal gameplay checkpoints and events. Drain events once and fan out to recorder and renderer; recording must not consume events ahead of the host or lose terminal-frame/choice-generated events. Snapshot mutable data before subsequent steps or pool recycling change it.
6. **Damage and health accounting.** Validate overkill, lethal incoming damage, capped healing, regeneration, heal cards, realm maxHP increases, breakthrough refill, extraction healing, and several steps in one frame. Verify terminal events are included exactly once and repeated export is idempotent.
7. **Build/source identity.** Require a fingerprint over actual run dependencies and data, a separate bot policy identity, and host/recorder/build identity. Verify generated copies and that the loaded browser bundle belongs to the recorded manifest. Missing or mismatched identity makes a comparison ineligible. Do not include unrelated art/report edits in the gameplay digest. Freeze sources during collection.
8. **Parent export and lifecycle.** For postMessage, validate both `event.origin` and the expected iframe `event.source`; use an explicit target origin. Validate payload schema/version and attempt ID, bound payload size, and reject stale/duplicate/cross-frame messages. Ensure “download” exports the completed attempt intended, with explicit partial status for interrupted runs. Test reset before export, page reload, lost focus, and re-entry.
9. **Practical host check.** In the served build, verify aspect/visibility, readable offers, focusable controls, no stuck movement after returning from the parent, visible session identity, and successful JSON download/replay. Source-text host tests alone do not establish this.

## Measurement definitions

- Use `swordDamage` fields from `js/xianxia/SwordCombat.js`: sum `amount` as nominal damage, `effectiveAmount` as effective damage, and `overkillAmount` separately. Group by sourceId, base/evolved, and boss/ordinary target; retain event tick/ID where available. Never label nominal damage “damage dealt to HP.”
- Existing `sword-balance.mjs` totals nominal `amount`; `sword-diagnostics.mjs` already separates these fields. Do not compare a new effective metric directly with old nominal totals.
- Use `playerHurt.amount` and `.effectiveAmount` for incoming damage, with source/attacker and tick. On lethal hits the former may exceed remaining HP; subsequent loss processing clamps player HP to zero.
- HP delta is not damage taken: healing, maxHP changes, and breakthrough refill intervene. `heal.amount` can be the requested amount before capping, and heal cards/realm commits are not fully described by heal events. Sample HP/maxHP at each actual step and before/after accepted choices; preserve explicit incoming damage. Do not infer gross healing from net frame HP change.
- Report simulation survival seconds, terminal category, boss spawn/defeat times, first choice, level, route weapon acquired/upgraded/evolved times, choices, effective damage splits, incoming damage, and HP/maxHP timeline. Keep wall completion time, presentation waits, pause duration, and frame stalls as separate measures.
- A route label is intent, not guaranteed acquisition. Record when the route weapon never appears or is declined. Route weapons such as `sj_line` and `sj_formation` cannot be newly applied before target level 10 in current `SurvivorRun._canApplyCard`.

## Bounded human-versus-bot procedure

1. Main implementer passes the parity gates and freezes a versioned build. Use a disposable profile and verify the visible test header and exported initial contract. Start recording only when the attempt starts; do not count asset loading as survival time.
2. Declare the comparison as **human decisions versus bot policy under the same initial rules**, unless choices are explicitly constrained. Fixed seed does not guarantee identical offers or encounter histories after differing choices and movement. Identical human replay is a recorder validation, not a second participant.
3. Generate fresh baselines for `line` and `formation`, each with existing `flee` and `spore` steering, seed 0, and the same source/options/time cap. Preserve exact picker/steering version. Existing bots inspect simulation entities directly, react each step, and use boss-specific movement; they are not matched human-perception controls. Do not select the best bot after seeing the human result.
4. Give a short unscored controls practice, identified separately. For scored play, explain: move with the chosen keyboard or touch method, attacks occur automatically, choose only displayed cards, pursue the assigned route when practical, and continue until victory/defeat or the declared limit. Do not promise early route access. Permit ordinary pause and record it.
5. Collect one scored attempt per route per participant as the bounded initial pass. Counterbalance route order across participants; for a single participant, declare the order and learning bias. Any retry has a new attempt ID and reason; retain failed/interrupted attempts rather than replacing them silently.
6. Let humans make choices freely for the practical comparison, logging deviations from bot priorities. If a later movement-only comparison is desired, use a separately labeled predeclared choice policy on each live offer; do not force an old bot’s choice list onto different offers.
7. Export immediately after each attempt and verify JSON replay/checkpoints before interpreting results. Ask briefly what was hard to see, whether choices were understandable, why the route was abandoned if applicable, and what caused the perceived death. Store observations separately from computed telemetry.
8. Report per-attempt paired tables and qualitative findings. One seed and a small human sample support diagnosis only. Avoid win-rate, route superiority, or “human-validated balance” claims; further seeds and participants would be a separate study.

## Checks performed in this review

Read-only constructor/viewport/facing probes produced the values and zero-step divergence above. The following existing suites ran successfully: 16 tests, 0 failures.

```sh
node --test tests/survivor-determinism.test.mjs \
  tests/survivor-host.test.mjs \
  tests/survivor-sync.test.mjs \
  tests/xianxia-incoming-damage.test.mjs
```

These establish selected existing determinism, source/manifest parity, host structure, and incoming-damage behavior at inspection time. They do not validate the planned recorder or page. Source inspection also consulted current `CODEX_HANDOFF.md`/`DEBUG_HANDOFF.md` entries on sword balance, diagnostic accounting, and supply experiments; their prior automated findings are not human evidence.

## Implementation review — 2026-10-27

Read-only review of the implemented host, recorder/replay, fingerprint/baseline generators, parent page, and targeted tests. Only this report was edited. Findings apply to the source inspected during concurrent main-thread work.

**Fix findings**

1. **[P1] Invalid playtest routes can activate persistent equipment mode.** `js/xianxia/Playtest.js:playtestConfig` returns null for an invalid/missing route. `SurvivorView.ts:39–40,65–66` interprets that as ordinary mode. Reproduced configuration: `?ruleset=xianxia&playtest=1&route=bad&equipment=1` yields null playtest configuration and true equipment mode; the host therefore constructs `EquipmentTestStore` with platform storage and allows its persistent actions. Distinguish “not requested” from “requested but invalid,” and block startup visibly before accessing profile/equipment stores in the latter case. Add missing/invalid-route tests with backing-storage spies. Valid playtest configurations already bypass equipment correctly.
2. **[P2] Restart is not a fresh profile.** `SurvivorView.ts:startRun` creates a new run/record, but `settle` retains rewards, tutorial flags, and settings in `this.profile`; the in-memory save is created only in the view constructor. Thus in-game “again” and camp/re-entry violate the per-attempt fresh-profile contract. Combat bonuses remain zero because playtest construction omits them, so this is not a demonstrated combat-stat leak. Reset the playtest profile/save per attempt; if settings intentionally persist, declare that exception and record it. Test settlement → again and camp → start against default profile state.
3. **[P2] Observations leak across attempt IDs.** `sword-playtest.html:65–78` never resets or keys the notes textarea when loading another route or receiving a new in-game attempt. Every message saves the current textarea as that record’s observation, so a note about attempt A is silently attached to B. Save notes by attempt ID, or clear/restore them when the ID changes. Test both route reload and in-game “again,” then export B and assert A’s note is absent.
4. **[P2] Restart confirmation overpromises recovery.** `sword-playtest.html:66` says the current record remains recoverable through “导出上次暂存,” but the first record from the replacement attempt overwrites the same localStorage key at line 76. After starting B, that button returns B, not A. Preserve a separate previous-attempt slot, or require/export A before replacing it and make the warning explicit. A two-attempt message sequence should verify the promised recovery behavior.

**What passed / limits**

- The zero-step fix is effective for the reproduced facing gap: zero-count commands with changed vectors survive recording and replay. Consecutive identical vectors are coalesced; the tested streams remain equivalent.
- A separate read-only probe passed mixed zero-step input, a capped multi-step batch, a paused export, resumed movement, and explicit abandonment. Omitting pauses is consistent with current pause/resume methods for these selected gameplay-state checks; it does not preserve wall-time or pause-duration evidence.
- `abandon()` now returns true on success, so both the host’s conditional recording and replay’s acceptance check work. No obsolete missing-return finding is asserted.
- Valid opt-in mode uses empty-source in-memory storage; ordinary mode retains its previous storage/constructor branches. Event draining remains single-owner, with recorder and presentation sharing the drained array. No concrete ordinary-mode regression was found in this inspection.
- Parent reception checks origin, iframe source, and channel; the host uses an explicit same-origin target. The parent stores under a separate playtest key. These checks do not resolve the attempt/observation issues above.
- Replay validates initial/final selected state, offered cards, selected cards, and effective damage/incoming totals. It does **not** establish full per-step enemy/combat-state equality, sample-timeline equality, or human evidence. The gameplay fingerprint does not include host/recorder code or independently attest the served bundle. Shared-source checks passed; served-build freshness remains the main thread’s build/browser responsibility.
- The baseline generator currently declares one `weapon-first:spore` policy per route, rather than the earlier proposed two steering policies. Treat that as a narrower baseline, not a four-arm comparison.

**Exact verification run**

```sh
node --test tests/xianxia-playtest.test.mjs
# 4 passed, 0 failed.
node --test tests/survivor-host.test.mjs tests/survivor-sync.test.mjs \
  tests/survivor-save.test.mjs tests/survivor-meta.test.mjs
# 25 passed, 0 failed.
node scripts/survivor/playtest-fingerprint.mjs --check
# Passed.
```

Additional inline Node probes reproduced the invalid-route fallback and passed the mixed replay sequence described above; they wrote no fixtures or runtime files. No browser execution, new build, or human sample was performed by this review.

### Source re-review correction — 2026-10-27

All four implementation findings above are addressed in the current source; retain them as historical findings, not outstanding defects.

- **Invalid-request isolation:** `playtestRequested` now distinguishes requested mode from valid configuration. `equipmentFromSearch` excludes every playtest request; the constructor uses empty-source storage even for invalid requests, displays an error, disables start, and `startRun` independently rejects invalid configuration.
- **Fresh attempts:** each valid playtest start recreates the in-memory save/profile. Sound, vibration, and reduced-flash settings intentionally persist and are recorded in `presentation.settings`; this is the declared settings exception to the fresh-profile contract.
- **Observation separation:** the parent detects attempt-ID changes, preserves the preceding record with its notes, then clears the textarea before storing the new attempt.
- **Recovery:** separate latest/previous storage slots and recovery buttons replace the single-slot behavior. The confirmation explicitly describes the two-attempt retention limit.

The main implementer reports a rebuilt application and 839 passing tests, plus actual-browser checks: invalid-request start produced no run/equipment and no profile storage reads/writes (only an engine storage key); settled attempt A had runs=1, while attempt B reset runs/crystals/permanent levels/tutorial flags; A’s notes remained in the previous slot and B’s notes were blank. These are supplied validation results, not independently rerun in this source re-review.

This correction is limited to those four fixes. No additional scope, tests, or runtime edits were undertaken. Human play remains pending; full per-step enemy-state equality is not claimed.
