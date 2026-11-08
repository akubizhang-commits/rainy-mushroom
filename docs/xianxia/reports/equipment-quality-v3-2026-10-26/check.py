#!/usr/bin/env python3
"""Standalone exact arithmetic checks of a DESIGN contract, not gameplay simulation.
Run: python3 docs/xianxia/reports/equipment-quality-v3-2026-10-26/check.py
No dependencies, runtime imports, randomness, or source mutations.
"""
import itertools as it
import json
from pathlib import Path
CONFIG = json.loads((Path(__file__).resolve().parents[2] / "equipment/quality-v3.json").read_text())
from collections import Counter
from fractions import Fraction as F


def rounded(x):
    """Nonnegative half-up baseline integer damage."""
    return (2 * x.numerator + x.denominator) // (2 * x.denominator)


def strict_damage(n, e):
    """Accepted contract: unchanged baseline plus independently floored bonus."""
    if type(n) is not int or n < 0 or type(e) is not int or not 0 <= e <= 18:
        raise ValueError("invalid baseline or equipment")
    return n + n * e // 100


def draw(pity, rarity):
    assert 0 <= pity <= 19
    actual = "gold" if pity == 19 else rarity
    return actual, 0 if actual == "gold" else pity + 1, 1


def select_focus(state, focus, released):
    slot, cls = focus
    if slot not in ("weapon", "robe", "charm"):
        raise ValueError("unknown slot")
    if (slot == "weapon" and cls not in range(released)) or (slot != "weapon" and cls is not None):
        raise ValueError("unreleased class or duplicated shared slot")
    return {**state, "focus": focus}


def finalize(event):
    if event.get("equipmentApplied"):
        raise ValueError("equipment already finalized")
    n = rounded(event["baselineDamage"])
    return {**event, "equipmentApplied": True, "damage": strict_damage(n, event["e"])}


def cost_snapshot(h0, rate):
    raw = F(h0) * rate
    cost = (raw.numerator + raw.denominator - 1) // raw.denominator
    return {"h0": h0, "cost": cost, "refundCap": cost // 2}


def gear_hp(h0, eh):
    return h0 + h0 * eh // 100


def main():
    count = Counter()
    weapons = [(r, l, b + l) for r, b in enumerate(q["weaponBasePct"] for q in CONFIG["qualities"]) for l in range(5)]
    robes = [(r, l, b + l) for r, b in enumerate(q["robeBasePct"] for q in CONFIG["qualities"]) for l in range(5)]
    # Existing five permanent upgrade level domains, including speed/pickup/regen.
    metas = list(it.product(range(6), range(6), range(4), range(4), range(4)))
    reductions = [(mode, raw, min(raw, cap))
                  for mode, cap in (("normal", 60), ("special", 75))
                  for raw in range(101)]
    maximum = 0
    for (_, _, w), (_, _, h), trait in it.product(weapons, robes, range(-3, 7)):
        e = w + trait
        assert 0 <= e <= 18 and h <= 8
        score = (100 + e) * (100 + h)
        assert score <= 12744 < 13000
        maximum = max(maximum, score)
        count["loadouts"] += 1
        # Factorized exhaustive products: all gear*meta, all gear*reduction.
        # Shared r cancels and meta cancels. Do not claim their full cross rows ran.
        for hp_lv, might_lv, speed_lv, pickup_lv, regen_lv in metas:
            a, hp = 100 + 5 * might_lv, 100 + 10 * hp_lv
            assert a * (100 + e) <= a * 118
            assert hp * (100 + h) <= hp * 108
            assert 0 <= speed_lv <= 3 and 0 <= pickup_lv <= 3 and 0 <= regen_lv <= 3
            assert a * hp * score <= a * hp * 12744
            count["loadout_meta_rows"] += 1
        for _, _, dr in reductions:
            incoming = 100 - dr
            assert incoming > 0
            # EHP ratio cancels identical incoming factor on both sides.
            assert (100 + h) * incoming <= 108 * incoming
            assert score * incoming <= 12744 * incoming
            count["loadout_reduction_rows"] += 1

    # Every integer percent admitted by base+level+trait, including zero (unequipped).
    bonuses = sorted({0} | {w + t for _, _, w in weapons for t in range(-3, 7)})
    bases = [F(0), F(1, 100), F(49, 100), F(1, 2), F(51, 100),
             F(1), F(149, 100), F(3, 2), F(2), F(10), F(100)]
    for base, m, (_, _, dr), e, category in it.product(
            bases, range(6), reductions, bonuses,
            ("direct", "dot", "summon", "reflect", "secondary")):
        n = rounded(base * F(100 + 5 * m, 100) * F(100 - dr, 100))
        out = strict_damage(n, e)
        assert n <= out and 100 * out <= 118 * n
        assert n != 0 or out == 0
        count["rounded_damage_rows"] += 1

    # All admitted final integer baselines in 0..1000 and all budgets 0..18.
    # Zero equipment must exactly preserve every baseline; monotone in budget.
    for n, e in it.product(range(1001), bonuses):
        out = strict_damage(n, e)
        assert n <= out and 100 * out <= n * (100 + e)
        assert e != 0 or out == n
        assert n != 0 or out == 0
        if e < 18:
            assert out <= strict_damage(n, e + 1)
        count["strict_integer_rows"] += 1
    # Concrete failures of naive independent nearest rounding and repeated envelope.
    assert rounded(F(3, 2) * F(118, 100)) == 2
    assert rounded(F(149, 100)) == 1
    assert rounded(F(149, 100) * F(118, 100)) == 2
    assert F(118, 100) ** 2 > F(118, 100)
    for a0, e, category in it.product(bases, bonuses, ("dot", "summon", "reflect", "secondary")):
        snapshot = {"baselineDamage": a0 * F(1, 5), "e": e}
        finished = finalize(snapshot)
        assert finished["damage"] == strict_damage(rounded(a0 * F(1, 5)), e)
        # Delayed descendant retains original baseline, never finalized parent damage.
        descendant = finalize({**snapshot, "baselineDamage": snapshot["baselineDamage"] * F(1, 2)})
        assert descendant["damage"] == strict_damage(rounded(a0 * F(1, 10)), e)
        try:
            finalize(finished)
        except ValueError:
            pass
        else:
            raise AssertionError("double equipment application accepted")
        count["snapshot_lineage_rows"] += 1

    # Same reinforcement/trait: gold vs blue. Also strongest gold vs weakest blue.
    for wl, hl, t in it.product(range(5), range(5), range(-3, 7)):
        gold = (108 + wl + t) * (104 + hl)
        blue = (104 + wl + t) * (102 + hl)
        assert 100 * gold <= 130 * blue
        count["gold_blue_rows"] += 1
    assert F(12744, 10302) < F(13, 10)

    # Fixed budget benchmark removes equipment identically, preserving baseline meta.
    for budget, e, h, m in it.product((0, 1, 10, 100, 10000), bonuses, range(9), range(6)):
        baseline = F(budget * (100 + 5 * m), 100)
        equipped = baseline * F(100 + e, 100) * F(100 + h, 100)
        normalized = equipped / F((100 + e) * (100 + h), 10000)
        assert normalized == baseline
        # Integer damage is NOT invertible by dividing by the nominal factor.
        assert strict_damage(rounded(baseline), 0) == rounded(baseline)
        count["fixed_budget_rows"] += 1

    # Integer HP bonus floored, baseline HP unchanged. All current HP values,
    # healing amounts, shield/regen derived from H0, awakening explicitly refills Hgear.
    for h0, eh in it.product((0, 1, 12, 100, 150), range(9)):
        hg = gear_hp(h0, eh)
        assert h0 <= hg and 100 * hg <= 108 * h0
        for current, heal in it.product(range(hg + 1), (0, 1, h0, h0 + 1)):
            healed = min(hg, current + heal) if current > 0 else 0
            assert healed - current <= heal
            assert 0 <= healed <= hg
            assert F(h0, 100) <= F(hg, 100)  # regen budget still exactly H0/100
            count["hp_heal_rows"] += 1
        for new_h0 in (h0, h0 + 100):
            filled = gear_hp(new_h0, eh)
            assert filled == new_h0 + new_h0 * eh // 100
            count["awakening_fill_rows"] += 1
    # Dynamic exception counterexample: repeated full refills regrant extra HP.
    assert 3 * (gear_hp(100, 8) - 100) == 24 > 8
    for h0, percent in it.product(range(1, 301), range(1, 5)):
        snapshot = cost_snapshot(h0, F(percent, 100))
        for eh in range(9):
            current_equipped_hp = h0 + h0 * eh // 100
            for later_h0 in (h0, h0 + 100):
                # Event carries frozen cost/refund, not current equipped max or later H0.
                assert snapshot["cost"] == (h0 * percent + 99) // 100
                assert snapshot["refundCap"] < snapshot["cost"]
                assert current_equipped_hp >= h0 and later_h0 >= h0
            count["self_cost_snapshot_rows"] += 1
    # Exact finite probability tree: all released class counts, slots, pity states,
    # qualities, identities. Future full catalogue: 7*4 + 4 + 4 = 36 identities.
    assert 7 * 4 + 4 + 4 == 36
    for released in range(1, 8):
        focuses = [("weapon", c) for c in range(released)] + [("robe", None), ("charm", None)]
        for focus, pity in it.product(focuses, range(20)):
            mass = F(0)
            for rarity, prob in ((q["id"], F(q["chancePct"], 100)) for q in CONFIG["qualities"]):
                for identity in range(4):
                    actual, new_pity, marks = draw(pity, rarity)
                    assert marks == 1
                    assert new_pity == (0 if actual == "gold" else pity + 1)
                    assert pity != 19 or actual == "gold"
                    mass += prob / 4
                    count["loot_tree_edges"] += 1
            assert mass == 1
    # Switching among any of nine possible full-catalogue focus choices has no state effect.
    focuses = [("weapon", c) for c in range(7)] + [("robe", None), ("charm", None)]
    for p, left, right in it.product(range(20), focuses, focuses):
        original = {"pity": p, "marks": 23, "sand": 100, "focus": left}
        changed = select_focus(original, right, 7)
        assert changed["focus"] == right
        assert {k: changed[k] for k in ("pity", "marks", "sand")} == {
            k: original[k] for k in ("pity", "marks", "sand")}
        assert draw(changed["pity"], "blue") == draw(original["pity"], "blue")
        count["focus_switch_pairs"] += 1
    for released in range(1, 8):
        try:
            select_focus({"pity": 19, "marks": 40}, ("weapon", released), released)
        except ValueError:
            count["unreleased_focus_rejections"] += 1
        else:
            raise AssertionError("unreleased focus accepted")
    q = F(95, 100)
    distribution = [q ** (n - 1) * F(5, 100) for n in range(1, 20)] + [q ** 19]
    assert sum(distribution) == 1
    expected = sum(F(i + 1) * p for i, p in enumerate(distribution))
    assert expected == sum(q ** i for i in range(20))
    count["first_gold_outcomes"] = 20
    # Exchange costs, no bonus marks/pity reset; spending twelve delays forty to fifty-two.
    assert 40 - 12 < 40 and 52 - 12 == 40
    assert sum(q["chancePct"] for q in CONFIG["qualities"]) == 100
    assert [q["name"] for q in CONFIG["qualities"]] == ["下品", "中品", "上品", "极品"]
    assert min(q["weaponBasePct"] for q in CONFIG["qualities"]) + CONFIG["traitPct"]["negative"] == 0
    gold_share = 1 / expected
    shares = {q["id"]: (gold_share if q["id"] == "gold" else (1-gold_share)*F(q["chancePct"],95)) for q in CONFIG["qualities"]}
    assert sum(shares.values()) == 1
    all_duplicate = sum(shares[q["id"]]*q["duplicateSpiritStones"] for q in CONFIG["qualities"])
    old_duplicate = (1-gold_share)*(F(65,95)*20+F(30,95)*40)+gold_share*80
    assert all_duplicate < old_duplicate
    for n in range(1001):
        assert strict_damage(n, 0) == n
    result = {
        "quality_names": [q["name"] for q in CONFIG["qualities"]], "quality_rates_pct": [q["chancePct"] for q in CONFIG["qualities"]],
        "long_run_quality_shares": {k:float(v) for k,v in shares.items()},
        "all_duplicate_mean_spirit_stones_per_draw": float(all_duplicate),
        "v2_all_duplicate_mean_spirit_stones_per_draw": float(old_duplicate),
        "five_all_green_probability": float(F(40,100)**5),
        "status": "PASS: exact arithmetic DESIGN model only",
        "counts": dict(count),
        "rounding_contract": "n0 + floor(n0 * ePct / 100); exact unchanged zero-equipment baseline; strict per-event <=1.18",
        "rejected_alternatives": ["residual bonus ledger", "non-refillable reserveHP"],
        "max_damage_factor": "1.18", "max_hp_factor": "1.08",
        "max_static_product": str(F(maximum, 10000)),
        "max_static_product_decimal": maximum / 10000,
        "strongest_gold_vs_weakest_blue_product": float(F(12744, 10302)),
        "meta_profiles": len(metas), "reduction_states": len(reductions),
        "factorized_cartesian_domain_not_directly_iterated": len(weapons) * len(robes) * 10 * len(metas) * len(reductions),
        "quality_version": CONFIG["version"], "quality_count": len(CONFIG["qualities"]), "catalogue_identities": 36, "released_one_class_identities": 12,
        "expected_first_gold_draws": float(expected),
        "long_run_gold_fraction": float(1 / expected),
        "probability_reach_guaranteed_draw": float(q ** 19),
        "first_gold_quantiles": {
            str(p): next(n for n in range(1, 21) if sum(distribution[:n]) >= F(p, 100))
            for p in (50, 90, 95)
        },
        "scope": "Enumerated domains printed in source; no runtime integration, gameplay, winrate, retention, or collection-time simulation."
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
