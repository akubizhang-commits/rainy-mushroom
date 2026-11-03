"""Author first-floor encounter timing without changing the tower/economy budget."""
import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TOWER = json.loads((ROOT / "tower-design.json").read_text())["floors"][0]
ATTRS = {a["id"]: a for a in json.loads((ROOT / "rank-attributes.json").read_text())["archetypes"]}
REWARDS = [r for r in csv.DictReader((ROOT / "wave-rewards-v2.csv").open()) if r["floor"] == "1"]

# Each tuple is warning start in simulation seconds, portal, archetype, count.
# Half-health batches have a separate event-relative clock and are registered at wave start.
SPECS = [
    ("初识獠牙", "单侧", ["E", "SE"], "横移绕过厚肩，站到猪群侧面。",
     [(0, "W", "boar_normal", 5), (4, "W", "boar_normal", 5)]),
    ("青风追迹", "斜翼", ["S", "SW"], "狼追得更快，先引成一线再转向。",
     [(0, "N", "wolf_normal", 6), (4, "NE", "wolf_normal", 6)]),
    ("八足近身", "单侧", ["W", "NW"], "辨认低矮的蛛群与抬足前摇；本层没有蛛网。",
     [(0, "E", "spider_normal", 7), (4, "SE", "spider_normal", 7)]),
    ("猪狼合围", "错向", ["S", "SE"], "猪挡路、狼从侧面追；不要贴着猪群折返。",
     [(0, "W", "boar_normal", 5), (3, "N", "wolf_normal", 7), (6, "W", "boar_normal", 4)]),
    ("赤牙试锋", "精英单列", ["S", "SE"], "先看到赤牙刨地，再横移躲开第一次冲撞。",
     [(0, "N", "boar_elite", 1), (2, "W", "boar_normal", 3),
      (6, "E", "spider_normal", 4), (8, "SW", "boar_normal", 3)]),
    ("换边而行", "交替双侧", ["N", "NE"], "来敌从两侧交替，留意下一批方向再换位。",
     [(0, "W", "boar_normal", 5), (3, "E", "wolf_normal", 4),
      (6, "SW", "boar_normal", 4), (9, "SE", "wolf_normal", 3)]),
    ("绕开蛛丛", "折角", ["S", "SW"], "沿空侧绕过慢速蛛群，避免退到猪面前。",
     [(0, "E", "boar_normal", 5), (3, "N", "spider_normal", 4),
      (6, "E", "boar_normal", 5), (9, "NW", "spider_normal", 4)]),
    ("双翼压迫", "交替双侧", ["S", "N"], "两翼先后进入，朝尚未形成夹击的一端移动。",
     [(0, "W", "boar_normal", 6), (2, "E", "wolf_normal", 4),
      (6, "NW", "boar_normal", 6), (8, "SE", "wolf_normal", 4)]),
    ("开口留南", "三向留口", ["S", "SW"], "北侧形成压力，南边不出新怪，但不是无敌区。",
     [(0, "NW", "boar_normal", 7), (2, "NE", "spider_normal", 5),
      (6, "W", "boar_normal", 6), (8, "E", "spider_normal", 4)]),
    ("霜背接力", "精英错峰", ["S", "SW"], "两只头狼隔8秒警示入场；扑击资格轮转。",
     [(0, "N", "wolf_elite", 1), (2, "W", "boar_normal", 4),
      (4, "E", "wolf_normal", 5), (8, "NE", "wolf_elite", 1),
      (10, "NW", "boar_normal", 3)]),
    ("三族初阵", "三向留口", ["S", "SE"], "猪占路、蛛收口、狼追身；先引出一条可走的线。",
     [(0, "W", "boar_normal", 5), (2, "N", "spider_normal", 6),
      (5, "NE", "wolf_normal", 4), (8, "NW", "boar_normal", 5)]),
    ("空侧轮转", "折角", ["W", "SW"], "空侧换到西面，不照搬上一波的退路。",
     [(0, "N", "boar_normal", 6), (3, "E", "wolf_normal", 6),
      (6, "SE", "spider_normal", 5), (9, "NE", "boar_normal", 5)]),
    ("引线破阵", "纵向接力", ["W", "NW"], "南北错峰，观察侧面出口；直线技能可打穿队列。",
     [(0, "N", "boar_normal", 6), (2, "S", "spider_normal", 7),
      (6, "SE", "wolf_normal", 5), (9, "NE", "boar_normal", 6)]),
    ("回旋石坪", "交替双侧", ["N", "NW"], "较大总量分四批，避免一口气填满全场。",
     [(0, "W", "boar_normal", 7), (3, "E", "wolf_normal", 7),
      (6, "SE", "spider_normal", 6), (10, "SW", "boar_normal", 6)]),
    ("赤腹守隘", "精英错峰", ["E", "NE"], "两只精英蛛近身抬足攻击；仍无毒网，不新增机制。",
     [(0, "W", "spider_elite", 1), (2, "N", "boar_normal", 4),
      (4, "SW", "spider_normal", 4), (8, "S", "spider_elite", 1),
      (10, "NW", "wolf_normal", 3), (12, "W", "boar_normal", 3)]),
    ("乘隙反击", "单侧接力", ["E", "SE"], "集中来敌适合区域技能，保留从侧面转出的空间。",
     [(0, "W", "boar_normal", 6), (3, "NW", "wolf_normal", 7),
      (6, "SW", "spider_normal", 5), (9, "W", "boar_normal", 6)]),
    ("三路来敌", "三向留口", ["N", "NE"], "敌群从其余方向进入，先转去空侧再应对追击。",
     [(0, "S", "boar_normal", 7), (3, "W", "spider_normal", 7),
      (6, "E", "wolf_normal", 6), (10, "SW", "boar_normal", 6)]),
    ("疾缓相间", "斜翼", ["S", "SE"], "狼先迫近，猪随后堵路；绕蛛走，不硬挤重叠群。",
     [(0, "NE", "wolf_normal", 4), (2, "W", "boar_normal", 7),
      (5, "N", "spider_normal", 6), (8, "NW", "boar_normal", 7),
      (11, "E", "wolf_normal", 4)]),
    ("阵前合练", "三向留口", ["W", "SW"], "复习三族混编，30只总量仍受24只同屏上限约束。",
     [(0, "N", "boar_normal", 7), (2, "E", "spider_normal", 5),
      (5, "SE", "wolf_normal", 6), (8, "NE", "boar_normal", 4),
      (11, "S", "spider_normal", 4), (14, "E", "boar_normal", 4)]),
    ("裂岩獠王", "首领留口", ["S", "SW"], "先躲直冲与拱击；半血二连冲每段重新警示，清尽余妖才过层。",
     [(0, "N", "boar_boss", 1), (0, "W", "boar_normal", 2),
      (0, "E", "wolf_normal", 1), (0, "NE", "spider_normal", 1)]),
]
PORTAL_POS = {
    "N": (33, 870), "NE": (695, 660), "E": (828, -60), "SE": (695, -780),
    "S": (33, -990), "SW": (-629, -780), "W": (-762, -60), "NW": (-629, 660),
}
PORTAL_NAMES = {"N": "北", "NE": "东北", "E": "东", "SE": "东南", "S": "南",
                "SW": "西南", "W": "西", "NW": "西北"}
portals = []
for key, (x, y) in PORTAL_POS.items():
    # Inside the legal stone floor; no invisible spawns outside the arena.
    candidates = [dict(x=x+dx, y=y+dy) for dx, dy in
                  [(0, 0), (-92, 0), (92, 0), (0, -92), (0, 92),
                   (-92, -92), (92, 92), (-92, 92), (92, -92)]]
    portals.append(dict(id=key, name=PORTAL_NAMES[key], x=x, y=y, candidates=candidates))

waves = []
for index, (name, formation, reserved, lesson, tuples) in enumerate(SPECS):
    source = TOWER["waves"][index]
    batches = []
    for bi, (time, portal, enemy, count) in enumerate(tuples):
        batches.append(dict(id=f'f01w{index+1:02}b{bi+1:02}', trigger="wave_start",
                            at_s=time, portal=portal, archetype=enemy, count=count))
    if index == 19:
        for bi, (portal, enemy, count) in enumerate([
            ("NW", "boar_normal", 2), ("E", "wolf_normal", 1), ("NE", "spider_normal", 1)
        ], start=len(batches)+1):
            batches.append(dict(id=f"f01w20b{bi:02}", trigger="boss_half_hp_or_death",
                                at_s=0, portal=portal, archetype=enemy, count=count))
    for batch in batches:
        batch.update(warning_s=1.2 if "_elite" in batch["archetype"] or "_boss" in batch["archetype"] else .9,
                     emit_step_s=.22)
        # Elite/boss waves never fast-forward their authored introduction timing.
        # Ordinary empty-field waits may advance, but always show the full warning again.
        batch["unit_ids"] = [f'{batch["id"]}u{i+1:02}' for i in range(batch["count"])]
    waves.append(dict(id=source["id"], wave=index+1, name=name, kind=source["kind"],
                      formation=formation, reserved_portals=reserved, lesson=lesson,
                      concurrent_cap=TOWER["concurrent_cap"],
                      planned_required=source["planned_required"],
                      fast_forward_empty=source["kind"] == "normal",
                      batches=batches,
                      reward_budget={k: int(REWARDS[index][k]) for k in ["cultivation", "core_units", "contribution"]}))

spec = dict(
    status="executable_design_preview_not_game_runtime", version=1,
    floor=1, name=TOWER["name"],
    source_files=["tower-design.json", "rank-attributes.json", "wave-rewards-v2.csv"],
    arena=dict(x_min=-912, x_max=978, y_min=-1140, y_max=1020, y_up=True,
               player_start=dict(x=33, y=-60), player_radius=18, player_speed=220,
               solid_obstacles=[], portals=portals,
               landmarks=[dict(name="北阵碑", x=33, y=1120),
                          dict(name="西断柱", x=-1040, y=-60),
                          dict(name="东断柱", x=1110, y=-60),
                          dict(name="南阵门", x=33, y=-1240)]),
    spawn_rules=dict(min_player_distance=280, min_center_spacing=92, body_gap=16,
                     cap=24, queue_order="trigger_then_at_then_batch_then_unit",
                     reservation_counts_toward_cap=True,
                     freeze_location_at_warning=True, spawn_grace_s=.8,
                     post_spawn_damage_requires_new_attack=True,
                     no_valid_location="keep_pending_and_retry_with_full_warning",
                     relocation_stall_s=6, relocation_hard_timeout_s=15),
    enemies={key: {**ATTRS[key], "body_radius": radius} for key, radius in
             [("boar_normal", 26), ("wolf_normal", 22), ("spider_normal", 24),
              ("boar_elite", 34), ("wolf_elite", 30), ("spider_elite", 34), ("boar_boss", 42)]},
    waves=waves,
)

# Validate authoring contracts, not combat difficulty.
assert len(waves) == 20
assert len({w["formation"] for w in waves}) >= 4
all_ids = []
for authored, original in zip(waves, TOWER["waves"]):
    actual = Counter()
    for b in authored["batches"]:
        actual[b["archetype"]] += b["count"]
        all_ids.extend(b["unit_ids"])
        assert b["count"] <= 7 and b["count"] >= 1
        assert b["portal"] in PORTAL_POS and b["portal"] not in authored["reserved_portals"]
        assert b["warning_s"] >= .9
    expected = Counter({g["archetype"]: g["count"] for g in original["enemy_groups"]})
    assert actual == expected, (authored["wave"], actual, expected)
    assert sum(actual.values()) == authored["planned_required"]
    elite_times = [b["at_s"] for b in authored["batches"] if b["archetype"].endswith("_elite")]
    assert len(elite_times) <= 1 or min(b-a for a, b in zip(elite_times, elite_times[1:])) >= 8
    assert len(authored["reserved_portals"]) >= 1
assert len(all_ids) == len(set(all_ids)) == 378
assert sum(b["count"] for b in waves[-1]["batches"] if b["trigger"] == "boss_half_hp_or_death") == 4
assert sum(b["count"] for b in waves[-1]["batches"] if b["trigger"] == "wave_start" and b["archetype"] != "boar_boss") == 4
for p in portals:
    for point in p["candidates"]:
        assert spec["arena"]["x_min"]+54 <= point["x"] <= spec["arena"]["x_max"]-54
        assert spec["arena"]["y_min"]+54 <= point["y"] <= spec["arena"]["y_max"]-54
assert sum(w["reward_budget"]["cultivation"] for w in waves) == 452
assert sum(w["reward_budget"]["core_units"] for w in waves) == 63
assert sum(w["reward_budget"]["contribution"] for w in waves) == 100

(ROOT / "floor01-encounters.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2)+"\n")
with (ROOT / "floor01-batches.csv").open("w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["wave", "name", "formation", "trigger", "at_s",
                                          "portal", "archetype", "count", "warning_s"])
    writer.writeheader()
    for wave in waves:
        for b in wave["batches"]:
            writer.writerow({**{k: wave[k] for k in ["wave", "name", "formation"]},
                             **{k: b[k] for k in ["trigger", "at_s", "portal", "archetype", "count", "warning_s"]}})
print(f"PASS: {len(waves)} authored waves, {sum(len(w['batches']) for w in waves)} batches, "
      f"{len(all_ids)} unique enemies; unchanged composition/rewards; 8 finite boss adds; "
      "8 portals × 9 in-bounds candidates. No gameplay or art acceptance implied.")
