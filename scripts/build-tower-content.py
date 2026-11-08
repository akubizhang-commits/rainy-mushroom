"""Copy approved design data into engine-independent runtime constants."""
import json
import math
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = root / "docs/xianxia/sect-tower-v1/data"
tables = {
    "FLOORS": ("tower-design.json", "floors"),
    "ARCHETYPES": ("rank-attributes.json", "archetypes"),
    "SKILLS": ("skill-books-v2.json", "skills"),
    "EVOLUTIONS": ("skill-books-v2.json", "evolutions"),
    "ECONOMY": ("economy-v2.json", None),
    "FLOOR01": ("floor01-encounters.json", None),
    "FLOOR01_BOSS": ("floor01-boss.json", None),
    "MONSTER_RANK_BASELINE": ("rank-attributes.json", "rank_role_baseline"),
}
def positive(value):
    return type(value) in (int, float) and math.isfinite(value) and value > 0


def validate_monster_scaling(data):
    floors, archetypes = data["FLOORS"], data["ARCHETYPES"]
    baseline = data["MONSTER_RANK_BASELINE"]
    assert baseline["version"] == 2
    elite_hp = baseline["elite_hp_multiplier_by_rank"]
    assert len(elite_hp) == 10 and elite_hp[0] == 0
    assert all(positive(value) and value > 1 for value in elite_hp[1:])
    assert positive(baseline["elite_damage_multiplier"]) and baseline["elite_damage_multiplier"] > 1
    assert [f["floor"] for f in floors] == list(range(1, 10)), "Expected nine ordered floors"
    ids = {a["id"] for a in archetypes}
    assert len(ids) == len(archetypes), "Duplicate archetype IDs"
    for a in archetypes:
        assert positive(a["floor_hp_factor"]) and positive(a["floor_speed_factor"]), a["id"]
    for floor in floors:
        scale = floor["floor_stat_scale"]
        assert scale["version"] == 4 and scale["reference_level"] == floor["floor"] * 3
        for key in ("normal_hp", "elite_hp", "boss_hp", "normal_damage", "elite_damage",
                    "boss_damage", "boss_heavy_damage", "early_normal_hp_multiplier"):
            assert positive(scale[key]), f"Invalid floor {floor['floor']} {key}"
        assert scale["normal_hp"] < scale["elite_hp"] < scale["boss_hp"]
        if "early_elite_through_wave" in scale:
            assert type(scale["early_elite_through_wave"]) is int and 1 <= scale["early_elite_through_wave"] <= 20
            assert positive(scale["early_elite_hp_multiplier"]) and scale["early_elite_hp_multiplier"] <= 1
        assert scale["normal_damage"] < scale["elite_damage"] < scale["boss_damage"] < scale["boss_heavy_damage"]
        assert scale["early_normal_through_wave"] == (5 if floor["floor"] == 4 else 4)
        assert scale["early_normal_hp_multiplier"] == (.7 if floor["floor"] == 4 else 1)
        assert len(floor["waves"]) >= 20
        for wave in floor["waves"]:
            assert all(group["archetype"] in ids for group in wave["enemy_groups"])
    first = floors[0]["floor_stat_scale"]
    assert data["FLOOR01"]["floor_stat_scale"] == first
    canonical = {a["id"]: a for a in archetypes}
    for id, alias in data["FLOOR01"]["enemies"].items():
        assert id in canonical, f"Unknown first-floor alias: {id}"
        assert positive(alias.get("body_radius")), f"Invalid first-floor body_radius: {id}"
        assert alias == {**canonical[id], "body_radius": alias["body_radius"]}, \
            f"First-floor alias differs from canonical archetype: {id}"
    boss = data["FLOOR01_BOSS"]
    boar = next(a for a in archetypes if a["id"] == boss["id"])
    assert boss["stats_resolved"] is True
    assert boss["hp"] == first["boss_hp"] * boar["floor_hp_factor"]
    assert boss["move_speed"] == boar["move_speed"] * boar["floor_speed_factor"]
    for attack in boss["attacks"]:
        assert attack["damage_class"] in ("light", "heavy")
        expected = first["boss_heavy_damage"] if attack["damage_class"] == "heavy" else first["boss_damage"]
        assert attack["damage"] == expected


def render():
    data = {}
    for name, (filename, key) in tables.items():
        value = json.loads((source / filename).read_text())
        data[name] = value[key] if key else value
    validate_monster_scaling(data)
    output = "// Generated from approved sect/tower design tables. Run scripts/build-tower-content.py.\n"
    for name, value in data.items():
        output += f"export const {name} = " + json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + ";\n"
    return output


if __name__ == "__main__":
    output = render()  # Validate every source before touching the generated file.
    target = root / "js/xianxia/TowerContent.js"
    if sys.argv[1:] == ["--check"]:
        if target.read_text() != output:
            raise SystemExit("TowerContent.js is stale; run scripts/build-tower-content.py")
        print("Eight approved tower content tables are current")
    elif sys.argv[1:]:
        raise SystemExit("Usage: build-tower-content.py [--check]")
    else:
        target.write_text(output)
        print("Generated eight approved tower content tables")
