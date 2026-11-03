# Independent review: sword supply experiment

Reviewed 2026-10-27. Scope: `scripts/survivor/sword-supply.mjs`, `tests/xianxia-supply.test.mjs`, the imported runner/policy/progression logic, and saved datasets. This review writes only this file. No source, runtime, handoff, or dataset edits.

**Decision: the experiment is valid for its stated fixed policy; do not adopt weight20.** No blocking implementation defect found. The candidate fails the predeclared acceptance rule in two of four route/split cells. Prefer one bounded defensive-choice experiment next, rather than further supply-weight sweeps.

## Dataset integrity and exclusions

- Include only `exploration-verified` (40 runs: control/weight20 × line/formation × seeds 0–9) and `holdout` (40 runs: same arms/routes × seeds 20–29). Every filename, seed, arm, route, and committed choice count was checked. Both protocols specify 1,020 seconds.
- Preserve `exploration` as **excluded**, not an additional sample. The reported reason for rerunning was the old broad script fingerprint treating the concurrently added, unrelated `sword-supply-opportunities.mjs` as drift.
- All **40 initial exploration records are byte-for-byte identical to their corresponding verified records**, including choices, outcomes, times, and marks—not merely equivalent win/loss results. Do not pool the duplicate records.
- The initial saved manifests contain the old broader script enumeration; the new opportunities script is absent from those starting snapshots. These files alone do not reconstruct the failed end-of-run diagnostic. The concurrent-addition explanation is supplied by the operator; the outcome equivalence and corrected manifest scope are independently verified.
- Each final source manifest has 64 entries: 60 files under `js` and exactly four runner scripts: `sword-supply.mjs`, `sword-formation-cost.mjs`, `sword-balance.mjs`, and `bot.mjs`. These cover the runner's current local script imports; unrelated reporting scripts are appropriately excluded.
- Both control manifests equal their protocol sources and current workspace hashes. Both candidate manifests differ only at `js/survivor/Progression.js`; that hash equals the independently computed hash of `patchSupply(currentSource)`. No runtime change is present relative to these manifests.

## Implementation and validation

`patchSupply` changes exactly one owned-weapon candidate weight site. Only xianxia owned `sj_line`, `sj_shadow`, and `sj_formation` upgrades receive weight 20. New-weapon weights, passive weights, other weapons, classic rules, candidate eligibility, and card shapes remain unchanged. This is a late-weapon-class intervention, not a primary-ID-only intervention: an owned secondary `sj_shadow` is affected too.

The parent copies source into temporary directories, patches only the candidate copy, launches the same `costRun`/`weapon-first`/`steer('spore')` policy in both arms, checks source fingerprints, and cleans temporary copies. New output records use exclusive creation. The workspace runtime is not patched.

The same policy does **not** mean identical realized inputs, offers, or combat trajectories. Changed weighted selection can change cards, then combat and steering decisions. Guarantees retain their logic but use the changed weights when selecting among eligible weapons. Therefore “guarantees unchanged” means their rules, not their resulting selections.

Validation performed:

- `node --test tests/xianxia-supply.test.mjs tests/xianxia-formation-cost.test.mjs`: **3/3 passed**.
- Independent temporary-copy matrix: **480 cases passed**, covering both rulesets, target levels 4/5/9/10/19, all three late weapons, missing/Lv1/Lv4/Lv5 states, evolved flags, and weapon-slot limits. Candidate cards remain identical; only the intended weights differ.
- All **80 final records** replayed through inventory reconstruction: **1,420 choice.before snapshots and 4,260 offered cards validated**, along with final states. Candidate legality is the same in both arms, so the unchanged runtime pool is appropriate for this check; patched weights were checked separately.
- Reconstructed full offered cards and reapplied `costPicker`: **1,420/1,420 selected cards match** the fixed policy. No fallback heal cards occur in these records, so policy verification does not require an unavailable historical HP snapshot.
- Both old cost manifests, **38 hashes each**, still match current source.

These are saved-record and source checks, not a fresh full simulation of all 80 runs.

### Nonblocking test-coverage finding

**Low — `tests/xianxia-supply.test.mjs:20–23`.** The committed fixture owns all three late weapons at Lv2, so it cannot detect an accidental change to *new* late-weapon weights or test capped/evolved eligibility. Its five-weapon, eight-slot synthetic inventory is useful for broad comparisons but does not exercise normal four-slot boundaries. Add missing late weapons at target levels 9/10, capped/evolved weapons, and a full-slot case when this test is next maintained. The independent 480-case check passed these boundaries for the reviewed implementation; this is not a reason to reject the existing dataset or block the decision.

## Acceptance recomputed from raw records

The protocol requires, **for each route in each split**, strictly more primary-Lv5 runs, no reduction in primary evolution count, and candidate mean survival at least 95% of control. Counts below have denominator 10 per arm. All 80 final runs ended in loss, so survival means observed time to death, not timeout-censored duration.

| Split / route | Primary Lv5 control → candidate | Primary evolution control → candidate | Mean survival seconds control → candidate | Survival ratio | Gate |
|---|---:|---:|---:|---:|---|
| Exploration / line | 3 → 2 | 2 → 0 | 376.24 → 347.54 | 92.37% | Fail all three |
| Exploration / formation | 4 → 7 | 0 → 1 | 355.07 → 360.65 | 101.57% | Pass |
| Holdout / line | 1 → 2 | 0 → 1 | 338.82 → 335.50 | 99.02% | Pass |
| Holdout / formation | 3 → 3 | 0 → 1 | 340.92 → 329.77 | 96.73% | Fail strict Lv5 increase |

The holdout formation evolution increase does not override its failed completion gate. Pooling formation's 7→10 completions across the two splits would conceal the failed replication and change the acceptance rule after observing results.

## Baseline continuity versus old weapon-first 20

“Old20” here means the old **20 seeds per route, 0–19**, at ordinary weight 10; it does not mean the weight20 candidate. The new combined controls use seeds **0–9 and 20–29**, also 20 per route.

| Route | Old20 primary Lv5 / evolution | New20 control primary Lv5 / evolution | Old20 mean survival | New20 control mean survival |
|---|---:|---:|---:|---:|
| Line | 3/20 / 2/20 | 4/20 / 2/20 | 350.31 s | 357.53 s |
| Formation | 9/20 / 1/20 | 7/20 / 0/20 | 358.74 s | 347.99 s |

All **20 overlapping runs** (both routes, seeds 0–9) match the old weapon-first records exactly. The old source manifests also match current source. The aggregate differences above reflect replacing seeds 10–19 with seeds 20–29; they are not evidence of baseline regression. These overlapping old/new summaries are not independent samples and should not be used as treatment arms.

## Fair inference

The result rejects **this weight change under this bot policy and acceptance rule**. It does not establish that supply never matters, that formation damage is sufficient, or that human play would behave the same way. Ten seeds per route/split are a small descriptive experiment, and a deterministic acceptance gate is not a statistical-significance claim.

The earlier opportunity audit found primary upgrade cards on 98/241 learned-but-not-maxed choices. That establishes intermittent supply under the old trajectories, not that doubling weight fixes the downstream survival/completion problem. Death truncates the available upgrade opportunities; longer runs can both acquire more cards and reach evolution gates. Conditioning on completed upgrades or survivors cannot isolate damage effectiveness.

Secondary displacement is plausible but not established. Mean selected `sj_yujian` cards (including its evolution) change 3.5→3.2 and 4.2→4.0 in exploration line/formation, and 4.0→4.0 and 4.3→4.2 in holdout. Different lifetimes and offer pools also change these counts. They are not a causal estimate of lost secondary damage.

Directly prioritizing a low-level starter over the primary is especially weak as the next test: across all 80 final records there are **zero** co-offers of an owned primary upgrade and starter upgrade while `sj_yujian` is below Lv3. Expanding to starter below Lv5 produces only four recorded co-offers, all starter Lv4 in exploration line (two corresponding seeds in each arm). There are none in either holdout route. A “protect starter until Lv3” policy would not test a meaningful difference on these recorded states.

## One next actionable hypothesis

**Hypothesis:** the fixed policy gives up useful damage reduction for passive progression often enough to shorten the life needed to finish the primary. Test defensive passive arbitration while preserving direct weapon choices.

Use ordinary weight 10 and the existing weapon-first policy. Compute its normal selected card first. **Only when that card is a non-vajra passive at Lv1–3, and a vajra card is also offered while owned vajra is below Lv3, select vajra instead.** Otherwise keep the original choice, including every weapon and evolution selection. Vajra's data defines damage reduction; this is a concrete survival intervention rather than another supply sweep.

This rule has **34 potential trigger choices in 26/40 final control runs**: exploration line 10 choices/8 runs, exploration formation 10/6, holdout line 6/6, holdout formation 8/6. These are opportunities on existing trajectories, not predicted counterfactual trigger counts. Unlike a direct starter-priority rule, it has adequate exposure on both routes. It avoids directly replacing a selected secondary weapon, though passive slot occupancy and subsequent offers can still change; it tests defensive-passive allocation, not a pure isolated damage-reduction coefficient.

Keep steering, enemies, progression weights, and all other priorities fixed. Run one paired exploration batch on seeds 0–9 and one fresh holdout on seeds 30–39, ten seeds per route per arm, with no intermediate retuning. Before running, freeze a survival-first gate: **at least 5% greater mean survival on each route, with primary-Lv5 and primary-evolution counts not below control, in both batches**. Record the existing outcomes plus how often the override fired. If it fails, reject this arbitration rule and stop this sequence of priority/weight adjustments; do not commission another general diagnostic report or tune its threshold against these same seeds. Any later combat/mechanic intervention should be a separately scoped decision.

## Retest and design-decision addendum — 2026-10-27

Targeted retest: `node --test tests/xianxia-supply.test.mjs` passed (1 test, 0 failures). The updated test covers 48 combinations: target levels 9/10/15, weapon slots 4/8, both rulesets, and missing/mixed/capped/evolved inventories. The original nonblocking test-coverage finding is addressed.

The final design decision supersedes the immediate strategy-batch recommendation above: conduct a fixed-seed human/bot comparison first to avoid optimizing solely for the bot. Do not launch another strategy batch now. Retain defensive passive arbitration only as a possible bounded follow-up informed by that comparison. The original review and the decision not to adopt weight20 remain unchanged.
