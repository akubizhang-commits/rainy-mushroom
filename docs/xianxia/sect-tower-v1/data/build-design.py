"""Reproduce proposal data. Does not import, edit, or validate game runtime."""
import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CATALOG = json.loads((ROOT / "beast-catalog.json").read_text())
BEASTS = {b["id"]: b for b in CATALOG["beasts"]}
FAMILIES = list(dict.fromkeys(b["family"] for b in BEASTS.values()))
HEAVY = {"tiger", "bear", "ape", "crocodile"}
BOSS_IDS = ["boar_boss", "wolf_boss", "spider_boss", "crocodile_boss", "snake_boss", "bear_boss", "falcon_boss", "ape_boss", "tiger_boss_zhenyan"]
SPECS = [
    ("獠牙石坪", "boar", "boar", "裂岩獠王"),
    ("啸月竹林", "wolf", "boar", "啸月狼王"),
    ("盘丝溶洞", "spider", "wolf", "盘丝蛛后"),
    ("伏潭石涧", "crocodile", "boar", "伏潭鳄王"),
    ("赤鳞湿泽", "snake", "spider", "赤鳞蟒王"),
    ("玄岩洞窟", "bear", "wolf", "撼地熊王"),
    ("啸风山崖", "tiger", "wolf", "裂风隼王"),
    ("群妖祭坛", "wolf", "spider", "撼岩猿王"),
    ("镇魇封台", "tiger", "wolf", "镇魇白虎"),
]
HP = [1, 1.10, 1.22, 1.35, 1.50, 1.67, 1.85, 2.05, 2.28]
DAMAGE = [1, 1.06, 1.12, 1.19, 1.26, 1.34, 1.42, 1.51, 1.60]
COUNTS = [10, 12, 14, 16, 10, 16, 18, 20, 22, 12, 20, 22, 24, 26, 14, 24, 26, 28, 30, 8]
LAYER_POOLS = {
    1: ["boar", "wolf", "spider"],
    2: ["wolf", "bat", "boar", "spider"],
    3: ["spider", "scorpion", "wolf", "bat"],
    4: ["crocodile", "ape", "boar", "wolf", "scorpion"],
    5: ["snake", "crocodile", "bat", "spider"],
    6: ["bear", "centipede", "ape", "boar", "scorpion"],
    7: ["tiger", "falcon", "bat", "ape", "wolf", "snake"],
    8: ["wolf", "crocodile", "scorpion", "centipede", "spider", "bear"],
    9: ["tiger", "falcon", "crocodile", "ape", "centipede", "snake"],
}
ELITE_POOLS = {
    1: ["boar", "wolf", "spider"], 2: ["wolf", "bat", "boar"],
    3: ["spider", "scorpion", "bat"], 4: ["crocodile", "ape", "wolf"],
    5: ["snake", "crocodile", "spider"], 6: ["bear", "centipede", "ape"],
    7: ["tiger", "falcon", "bat"], 8: ["crocodile", "scorpion", "centipede"],
    9: ["tiger", "falcon", "crocodile"],
}


def composition(floor, wave, count, primary, support):
    pool = LAYER_POOLS[floor]
    light = next(f for f in pool if f not in HEAVY)
    if wave <= 3:
        family = pool[wave - 1]
        if family not in HEAVY:
            return {family: count}
        heavy_count = math.floor(count * .4)
        return {family: heavy_count, light: count - heavy_count}
    others = [f for f in pool if f != primary]
    chosen = [primary, others[(wave - 4) % len(others)]]
    if wave >= 11:
        chosen.append(others[(wave - 3) % len(others)])
    if all(f in HEAVY for f in chosen):
        chosen[-1] = light
    weights = [.6, .4] if len(chosen) == 2 else [.5, .3, .2]
    amounts = [math.floor(count * w) for w in weights]
    amounts[-1] += count - sum(amounts)
    result = dict(zip(chosen, amounts))
    surplus = max(0, sum(result.get(f, 0) for f in HEAVY) - math.floor(count * .4))
    receiver = next(f for f in chosen if f not in HEAVY)
    # Retain each authored species while keeping heavy bodies within 40%.
    for family in chosen:
        if family in HEAVY:
            take = min(surplus, max(0, result[family] - 1))
            result[family] -= take
            result[receiver] += take
            surplus -= take
    assert surplus == 0
    return result


floors, rows = [], []
for floor_id, (name, primary, support, boss) in enumerate(SPECS, 1):
    floor = {
        "floor": floor_id, "name": name, "main_family": primary, "boss_name": boss,
        "boss_id": BOSS_IDS[floor_id - 1], "boss_rank": BEASTS[BOSS_IDS[floor_id - 1]]["rank"],
        "concurrent_cap": 24 + 4 * (floor_id - 1),
        "unlock": "initial" if floor_id == 1 else f"clear-floor-{floor_id - 1}",
        "normal_family_pool": LAYER_POOLS[floor_id], "waves": [],
    }
    for wave_id, base_count in enumerate(COUNTS, 1):
        kind = "boss" if wave_id == 20 else "elite" if wave_id in (5, 10, 15) else "normal"
        count = 8 if kind == "boss" else base_count + 2 * (floor_id - 1)
        elites = 1 if wave_id == 5 else 2 if wave_id in (10, 15) else 0
        elite_family = ELITE_POOLS[floor_id][(5, 10, 15).index(wave_id)] if elites else primary
        wave = {
            "id": f"tower-f{floor_id:02}-w{wave_id:02}", "wave": wave_id, "kind": kind,
            "normal": composition(floor_id, wave_id, count, primary, support),
            "elite": {elite_family: elites} if elites else {},
            "boss_count": int(kind == "boss"), "normal_count": count,
            "planned_required": count + elites + int(kind == "boss"),
            "clear_rule": "pending=0 AND alive=0 AND killed=planned AND player_alive",
            "summon_batches": [
                {"trigger": "start", "count": 4},
                {"trigger": "boss_half_hp_or_death", "count": 4},
            ] if kind == "boss" else [],
        }
        wave["enemy_groups"] = [
            {"archetype": f"{family}_{role}", "rank": BEASTS[f"{family}_{role}"]["rank"], "count": n}
            for role in ("normal", "elite") for family, n in wave[role].items()
        ]
        if kind == "boss":
            wave["enemy_groups"].append({"archetype": floor["boss_id"], "rank": floor["boss_rank"], "count": 1})
        floor["waves"].append(wave)
        rows.append({
            "floor": floor_id, "floor_name": name, "wave": wave_id, "kind": kind,
            "normal": count, "elite": elites, "boss": wave["boss_count"],
            "planned_required": wave["planned_required"],
            "families": "+".join(f"{k}:{v}" for k, v in wave["normal"].items()),
            "elite_family": elite_family if elites else "",
            "ranked_groups": "+".join(f"{g['archetype']}@{g['rank']}:{g['count']}" for g in wave["enemy_groups"]),
        })
    floors.append(floor)

assert len(floors) == 9 and len(rows) == 180
assert len(FAMILIES) >= 12
assert len(BEASTS) == len(CATALOG["beasts"])
for family in FAMILIES:
    assert BEASTS[f"{family}_normal"]["rank"] < BEASTS[f"{family}_elite"]["rank"] < BEASTS[f"{family}_boss"]["rank"]
assert all(1 <= b["rank"] <= 7 for b in BEASTS.values())
assert [f["boss_rank"] for f in floors] == sorted(f["boss_rank"] for f in floors)
ids = set()
for floor in floors:
    assert len(floor["waves"]) >= 20
    assert {w["kind"] for w in floor["waves"]} == {"normal", "elite", "boss"}
    assert {f for w in floor["waves"] for f in w["normal"]} == set(floor["normal_family_pool"])
    assert len(floor["normal_family_pool"]) >= 3
    assert all(len(w["normal"]) >= 2 for w in floor["waves"][3:])
    for wave in floor["waves"]:
        assert sum(g["count"] for g in wave["enemy_groups"]) == wave["planned_required"]
        assert all(g["rank"] == BEASTS[g["archetype"]]["rank"] <= 7 for g in wave["enemy_groups"])
        assert wave["id"] not in ids
        ids.add(wave["id"])
        assert set(wave["normal"]) <= set(FAMILIES)
        assert set(wave["elite"]) <= set(FAMILIES)
        assert sum(wave["normal"].values()) == wave["normal_count"]
        assert wave["planned_required"] == sum(wave["normal"].values()) + sum(wave["elite"].values()) + wave["boss_count"]
        assert all(n > 0 for n in wave["normal"].values())
        assert sum(wave["normal"].get(f, 0) for f in HEAVY) <= wave["normal_count"] * .4
        if wave["kind"] == "boss":
            assert sum(b["count"] for b in wave["summon_batches"]) == wave["normal_count"] == 8
            assert wave["planned_required"] == 9

used = {BEASTS[g["archetype"]]["family"] for f in floors for w in f["waves"] for g in w["enemy_groups"]}
assert set(FAMILIES) == used
for family in ("bat", "scorpion", "centipede", "ape", "crocodile"):
    assert any(family in w["normal"] for f in floors for w in f["waves"])
    assert any(family in w["elite"] for f in floors for w in f["waves"])

(ROOT / "tower-design.json").write_text(json.dumps({
    "status": "design_v4_not_runtime", "catalog": "beast-catalog.json",
    "economy": "economy-v2.json", "attributes": "rank-attributes.json", "floors": floors,
}, ensure_ascii=False, indent=2) + "\n")
with (ROOT / "waves.csv").open("w", newline="") as stream:
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
print("PASS: 12 families; 38 ranked archetypes; tiger/croc swapped; <=rank7; 9x20 waves; mixed groups and finite budgets. Economy generated separately by build-economy-v2.py.")
