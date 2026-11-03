"""Historical design-only economy and calibration; not current runtime rules.
See README.md and ../90-current-critical-hit-rules.md for the critical-hit override.
No game/save imports. Preserve the old model for historical reproduction.
"""
import csv
import hashlib
import io
import json
import math
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TOWER = json.loads((ROOT / "tower-design.json").read_text())
BEASTS = {b["id"]: b for b in json.loads((ROOT / "beast-catalog.json").read_text())["beasts"]}


def save(name, data):
    write_if_changed(name, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def write_if_changed(name, text):
    path = ROOT / name
    content = text.encode("utf-8")
    if not path.exists() or path.read_bytes() != content:
        path.write_bytes(content)


def csv_save(name, rows):
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
    write_if_changed(name, stream.getvalue())


def digest(data):
    return hashlib.sha256(json.dumps(data, ensure_ascii=False, sort_keys=True,
                                     separators=(",", ":")).encode("utf-8")).hexdigest()


# Damage is an entire cast/hit window budget, not per decorative sword.
SKILLS = [
    dict(id="sj_yujian", name="御剑术", kind="active", clear=0,
         damage=[1, 1.08, 1.16, 1.24, 1.32], cooldown=1.0,
         reach=[360, 380, 400, 420, 440], swords=[1, 1, 2, 2, 3],
         target_cap=[1, 1, 2, 2, 3], single_dps_factor=1.0, hit_assumption=.70,
         rule="每轮总伤害平分给飞剑；少目标可集中，单剑不贯穿，同一剑不重复命中"),
    dict(id="sj_arc", name="弦月斩", kind="active", clear=0,
         damage=[.90, 1, 1.10, 1.20, 1.30], cooldown=2.5,
         radius=[140, 150, 160, 175, 190], angle=90, target_cap=6,
         single_dps_factor=1/2.5, hit_assumption=.45,
         rule="固定90度扇区，同目标每次只命中一次"),
    dict(id="sj_wanjian", name="万剑诀", kind="active", clear=0,
         damage=[.20, .22, .24, .26, .28], hit_interval=.6,
         radius=[90, 95, 100, 105, 110], swords=[4, 4, 5, 5, 6], target_cap=6,
         single_dps_factor=1/.6, hit_assumption=.60,
         rule="所有环绕剑对同一目标共享0.6秒命中间隔，不按剑数乘伤害"),
    dict(id="sj_line", name="剑破虚空", kind="active", clear=1,
         damage=[1.25, 1.35, 1.45, 1.55, 1.65], cooldown=4,
         reach=[360, 390, 420, 450, 480], width=28, target_cap=[3, 3, 4, 4, 5],
         single_dps_factor=1/4, hit_assumption=.65,
         rule="直线单次贯穿，同目标只命中一次；每目标使用表中伤害"),
    dict(id="sj_shadow", name="分光连斩", kind="active", clear=1,
         damage=[1.10, 1.20, 1.30, 1.40, 1.50], cooldown=4, delay=.65,
         radius=[80, 90, 100, 110, 120], target_cap=6,
         single_dps_factor=1/4, hit_assumption=.50,
         rule="固定位置延迟爆发，一次一印，同目标同印只结算一次"),
    dict(id="sj_formation", name="两仪剑阵", kind="active", clear=2,
         damage=[.14, .155, .17, .185, .20], cooldown=8, duration=3,
         hit_interval=.5, ticks=6, radius=[110, 120, 130, 140, 150], target_cap=8,
         single_dps_factor=6/8, hit_assumption=.55,
         rule="生成后0.5秒首次伤害，共6跳；多个阵眼共享同目标账本"),
    dict(id="sj_heart", name="剑心通明", kind="passive", clear=0,
         crit_chance=[.02, .03, .04, .05, .06], crit_bonus=.5,
         rule="暴击额外伤害仅按不含心法增益的直伤计算；不暴击持续伤害和触发伤害"),
    dict(id="sj_mark", name="青萍剑意", kind="passive", clear=1,
         wound_share=[.02, .025, .03, .035, .04], duration=2,
         rule="有效直伤的对应比例转为两秒剑痕；新命中将预算并入剩余伤害，不复制旧预算；最多4%直伤"),
    dict(id="sj_bone", name="剑骨", kind="passive", clear=1,
         damage_bonus=[.01, .015, .02, .025, .03], speed_bonus=[.01, .02, .03, .04, .05],
         rule="增伤相加，不再叠加冷却缩减"),
    dict(id="sj_gate", name="剑开天门", kind="passive", clear=2,
         proc_damage=[.08, .10, .12, .14, .16], radius=[60, 70, 80, 90, 100],
         share=[.01, .0125, .015, .0175, .02], icd=3, target_cap=4,
         rule="有效直伤按share积累爆发预算，初始0、保留10秒；击杀时最多花已有预算，多个受击目标分摊，不递归"),
    dict(id="vajra", name="护体剑罡", kind="passive", clear=0,
         reduction=[.02, .03, .04, .05, .06], rule="常驻减伤相加，全部局外/心法常驻减伤合计上限10%"),
    dict(id="magnet", name="聚灵阵", kind="passive", clear=0,
         pickup_bonus=[.08, .12, .16, .20, .24], rule="只扩大拾取半径，不增加掉落数量或修为价值"),
]
ACTIVE_PRICE = [20, 30, 50, 80, 120]
PASSIVE_PRICE = [10, 20, 35, 55, 80]
LEVEL_CLEAR = [0, 0, 1, 3, 5]
for skill in SKILLS:
    skill["prices"] = ACTIVE_PRICE if skill["kind"] == "active" else PASSIVE_PRICE
    skill["max_level"] = 5
    skill["level_clear_requirements"] = [max(skill["clear"], n) for n in LEVEL_CLEAR]
BY_SKILL = {s["id"]: s for s in SKILLS}
EVOLUTIONS = [
    dict(id="evo_wanjian", name="万剑归宗", parent="sj_yujian", passive="sj_heart",
         rule="常规飞剑每轮合计1.188A；每8秒六段剑雨，各段每目标0.352A；原目标平均伤害上限为原Lv5的110%，剑雨最多6目标"),
    dict(id="evo_wuwo", name="周天剑域", parent="sj_wanjian", passive="sj_bone",
         rule="外圈系数为原Lv5的110%，内圈为50%；每目标0.6秒窗口只取较高一次，不叠圈"),
    dict(id="evo_tiandi", name="一剑开天", parent="sj_line", passive="sj_mark",
         rule="改为0.9秒蓄势＋释放后5.1秒冷却，单击2.7225A，平均不超过原Lv5的110%；贯穿上限5"),
    dict(id="evo_sixiang", name="四象剑阵", parent="sj_formation", passive="sj_gate",
         rule="四个阵眼共享六跳，每跳0.22A、冷却8秒，每目标总伤害不超过原Lv5的110%"),
]
for e in EVOLUTIONS:
    e.update(price=240, clear=6, parent_level=5, passive_level=3, max_level=1)

# Kill-time counter arithmetic. Waves below are full-clear reporting buckets,
# never a condition for retaining kills, cultivation, cores, or counter remainder.
NORMAL_CORE_EVERY_KILLS = 20


def normal_kill_reward(remainder):
    return divmod(remainder + 1, NORMAL_CORE_EVERY_KILLS)


core_remainder = 0
economy_rows, wave_rows = [], []
for floor in TOWER["floors"]:
    fid = floor["floor"]
    core_sum = xp_sum = contribution = 0
    for w in floor["waves"]:
        normal = w["normal_count"]
        common_core = 0
        for _ in range(normal):
            earned_core, core_remainder = normal_kill_reward(core_remainder)
            common_core += earned_core
        elite_core = sum(g["count"] * {1: 3, 2: 5, 3: 8, 4: 10, 5: 12, 6: 15, 7: 18}[g["rank"]]
                         for g in w["enemy_groups"] if BEASTS[g["archetype"]]["role"] == "elite")
        boss_core = sum(g["count"] * {1: 10, 2: 15, 3: 20, 4: 25, 5: 30, 6: 35, 7: 40}[g["rank"]]
                        for g in w["enemy_groups"] if BEASTS[g["archetype"]]["role"] == "boss")
        xp = sum(g["count"] * g["rank"] * {"normal": 1, "elite": 5, "boss": 10}[BEASTS[g["archetype"]]["role"]]
                 for g in w["enemy_groups"])
        c = 2 + (5 if w["kind"] == "elite" else 0) + (45 + 5*(fid-1) if w["kind"] == "boss" else 0)
        clear_core_bonus = 5*(fid-1) if w["kind"] == "boss" else 0
        core = common_core + elite_core + boss_core + clear_core_bonus
        core_sum += core
        xp_sum += xp
        contribution += c
        wave_rows.append(dict(floor=fid, wave=w["wave"], cultivation=xp, core_units=core,
                              clear_core_bonus=clear_core_bonus,
                              contribution=c, normal_counter_after=core_remainder))
    economy_rows.append(dict(floor=fid, cultivation=xp_sum, core_units=core_sum,
                             clear_core_bonus=5*(fid-1),
                             normal_counter_after=core_remainder, first_core_bonus=10,
                             first_core_total=core_sum+10, contribution=contribution,
                             first_contribution_bonus=50, first_contribution_total=contribution+50))

REALMS = ("炼气", "筑基", "金丹")
def cultivation_bonus(level):
    return ((level-1)//9)*.09 + ((level-1)%9)*.0025
CULTIVATION = [dict(level=l, realm=REALMS[(l-1)//9], realm_step=(l-1)%9+1,
                    xp_total=30*(l-1)+15*(l-1)**2,
                    attack_bonus=round(cultivation_bonus(l), 6), hp_bonus=round(cultivation_bonus(l), 6))
               for l in range(1, 28)]
def cultivation_level(xp):
    return max(row["level"] for row in CULTIVATION if row["xp_total"] <= xp)

ECONOMY = {
    "schema_version": 3, "status": "confirmed_rules_design_not_runtime",
    "decision_source": "../18-decision-register.md",
    "save_policy": "new_mode_fresh_profile_no_legacy_import_or_migration",
    "skill_persistence": "permanent_confirmed",
    "cultivation_persistence": "permanent_confirmed", "core_unit_values": [1, 5, 20],
    "currency_uses": {
        "spirit_stones": ["cultivation"], "core_units": ["skill_books"],
        "contribution": ["draws", "out_of_combat_supplies", "weapon_refine"],
    },
    "tower_cultivation_boundary": {
        "max_realm": "金丹", "status": "user_confirmed",
        "permits_yuanying_breakthrough": False,
        "scope": "first_release_character_all_sources_including_peiyuan",
    },
    "cultivation_cap": {
        "status": "user_confirmed",
        "max_level": 27, "max_stage": "金丹圆满", "max_xp": CULTIVATION[-1]["xp_total"],
        "max_attack_bonus": .20, "max_hp_bonus": .20,
        "overflow": "not_banked_not_converted",
        "persists_across": ["death", "return_to_sect", "new_attempt", "app_restart"],
        "other_rewards": "cores_and_contribution_unchanged",
    },
    "core_visual_quality": ["下品", "中品", "上品"],
    "normal_core_every_kills": NORMAL_CORE_EVERY_KILLS,
    "normal_counter_persists_on_kill": True,
    "reward_settlement": {
        "kill_rewards": "record_once_per_unique_kill_at_kill_time",
        "normal_counter": "persist_with_each_kill_not_wave_clear",
        "death_and_retreat": "retain_all_killed_loot_including_unfinished_wave_and_uncollected",
        "reload": "same_recorded_kill_never_awards_twice",
        "wave_reward": "only_on_full_clear_while_alive",
        "floor_reward": "only_on_full_floor_clear_while_alive",
        "first_clear_reward": "once_per_floor",
        "reward_tables": "full_clear_totals_not_partial_wave_entitlements",
        "healing_drops": "live_in_tower_pickup_only_never_post_death_reward_or_revive",
    },
    "attempt_rules": {
        "entry_cost": 0, "retry_start_wave": 1, "cleared_floors_persist": True,
        "reentry_floor": "next_unlocked_floor",
        "new_attempt_skill_remaining_cooldown": 0,
        "cooldown_reset_includes_evolutions": True, "skip_own_windup": False,
        "pause_resume": "restore_battle_state_without_healing_or_cooldown_reset",
    },
    "health_rules": {
        "inherit_remaining_hp_on": ["exit_tower", "enter_tower", "next_floor", "app_restart"],
        "death_return_hp": 1,
        "out_of_combat_regen_max_hp_fraction_per_minute": .01,
        "offline_out_of_combat_regen": True,
        "in_tower_regen_max_hp_fraction_per_minute": 0,
        "paused_or_background_battle_counts_as_out_of_combat": False,
        "regen_cap": "max_hp",
        "recovery_clock": "persist_hp_and_last_reliable_time_without_double_counting",
        "in_tower_healing_drops": True,
    },
    "starter": {"core_units": 20, "contribution": 300, "learned": {"sj_yujian": 1},
                "supplies": {"回春丹": 3}, "grant_once_per_new_profile": True},
    "book_active_prices": ACTIVE_PRICE, "book_passive_prices": PASSIVE_PRICE,
    "skill_loadout": {"active": 4, "passive": 4, "evolution": 2,
                      "acquisition_and_upgrade": "out_of_combat_only",
                      "free_points_on_wave_or_breakthrough": False},
    "first_release_class": "剑修",
    "first_release_equipment_slots": ["weapon", "robe", "pendant"],
    "class_exclusivity": {
        "beast": {"only_class": "御兽师", "first_release_enabled": False},
        "talisman": {"only_class": "符师", "first_release_enabled": False},
    },
    "first_release_draw_pools": ["weapon_draw"],
    "weapon_draw": dict(status="user_confirmed", enabled=True, cost=100,
                        rates=[.40, .35, .20, .05], pity=20,
                        identities=["eq_sword_suwen", "eq_sword_qingxiao", "eq_sword_zhenyue"]),
    "beast_draw": dict(status="user_confirmed_future_beastmaster_only", enabled=False,
                       only_class="御兽师", cost=100, rates=[.55, .30, .12, .03], pity=30),
    "draw_rules": {
        "quality_order": ["下品", "中品", "上品", "极品"],
        "independent_pity_per_pool": True,
        "pity": "guaranteed_top_quality_on_pity_th_draw_without_prior_top_quality",
        "top_quality_resets_pity_immediately": True,
        "pity_guarantees_identity": False, "paid_draws": False,
        "duplicates": "same_identity_same_or_lower_quality_returns_contribution_by_drawn_quality",
    },
    "duplicate_contribution": [2, 4, 8, 16],
    "supplies": {
        "回春丹": {"cost": 5, "heal_max_hp_fraction": .50, "cap": "max_hp"},
        "培元丹": {"cost": 20, "cultivation": 50, "max_xp": CULTIVATION[-1]["xp_total"]},
    },
    "supply_rules": {
        "currency": "contribution", "use": "out_of_combat_only", "daily_limit": None,
        "combat_slots": [], "combat_damage_bonus": 0,
        "at_full_hp_or_cultivation_cap": "reject_without_consuming_inventory",
        "partial_effect": "clamp_to_cap",
        "save": "atomically_save_cost_inventory_and_hp_or_cultivation",
    },
    "equipment_damage_bonus_cap": .30,
    "equipment_damage_rule": "same_bonus_percentages_and_cap_for_all_classes",
    "equipment_refine_included_in_damage_cap": True,
    "future_beastmaster_balance": {
        "status": "future_design_no_coefficients_or_runtime",
        "adjust": "weapon_base_damage_or_attack_coefficient",
        "compare": "weapon_plus_beast_total_output_at_equal_investment",
    },
    "refine_costs": [40, 60, 80, 100],
    "refine_slots": ["weapon"], "refine_max_level": 4,
    "robe": {"status": "starter_basic_only", "hp_bonus": 0,
             "draw_enabled": False, "quality_upgrade_enabled": False, "refine_enabled": False},
    "pendant": "starter_cosmetic_no_paid_stats_v1",
    "floors": economy_rows, "cultivation_levels": CULTIVATION,
    "storage_cap": 2_000_000_000,
}

# Concrete affordable purchase path. A failed gate never spends the currency.
PLAN = [
    ("sj_yujian", 2), ("sj_arc", 2), ("sj_heart", 1), ("vajra", 1),
    ("sj_line", 1), ("sj_bone", 1), ("magnet", 1), ("sj_yujian", 3),
    ("sj_line", 2), ("sj_arc", 3), ("sj_heart", 2), ("sj_formation", 1),
    ("sj_bone", 2), ("vajra", 2), ("magnet", 2), ("sj_formation", 2),
    ("sj_line", 3), ("sj_yujian", 4), ("sj_heart", 3), ("sj_arc", 4),
    ("sj_formation", 3), ("sj_bone", 3), ("vajra", 3), ("magnet", 3),
    ("sj_yujian", 5), ("sj_line", 4), ("sj_formation", 4), ("sj_arc", 5),
    ("sj_line", 5), ("sj_formation", 5), ("sj_heart", 4), ("sj_bone", 4),
    ("vajra", 4), ("magnet", 4), ("sj_heart", 5), ("sj_bone", 5),
    ("vajra", 5), ("magnet", 5),
]
learned = {"sj_yujian": 1, "sj_arc": 1}  # starter20 cores used to buy arc
balance = 0
cursor = 0
progress = []
xp = 0
for row in economy_rows:
    balance += row["first_core_total"]
    xp = min(ECONOMY["cultivation_cap"]["max_xp"], xp + row["cultivation"])
    purchases = []
    while cursor < len(PLAN):
        sid, level = PLAN[cursor]
        s = BY_SKILL[sid]
        assert learned.get(sid, 0) == level-1
        cost = s["prices"][level-1]
        if row["floor"] < s["level_clear_requirements"][level-1] or balance < cost:
            break
        balance -= cost
        learned[sid] = level
        purchases.append(f'{s["name"]}Lv{level}({cost})')
        cursor += 1
    progress.append(dict(after_floor=row["floor"], earned=row["first_core_total"],
                         core_balance=balance, cultivation_level=cultivation_level(xp),
                         purchases=purchases, skills=dict(learned)))

# Single-target static DPS and fixed archetype attributes; no per-floor multipliers.
RANKS = [
    dict(rank=i+1, normal_hp=n, elite_hp=e, boss_hp=b, contact_damage=d,
         elite_attack_damage=round(d*1.5), boss_major_damage=round(d*2),
         rank_damage_note="ordinary/contact; elite and boss attacks telegraphed")
    for i, (n, e, b, d) in enumerate(zip(
        [50, 72, 100, 132, 168, 208, 252],
        [180, 280, 430, 620, 850, 1100, 1380],
        [1800, 2700, 3800, 5200, 7000, 9000, 11500],
        [6, 8, 10, 12, 14, 16, 18]))
]
FAMILY_HP = dict(boar=1, wolf=.7, spider=.65, tiger=1.35, snake=.8, bear=1.8,
                 falcon=.6, bat=.55, scorpion=1, centipede=1.15, ape=1.45, crocodile=1.35)
SPEED = dict(boar=.70, wolf=1.05, spider=.65, tiger=.90, snake=.75, bear=.55,
             falcon=1, bat=1.05, scorpion=.65, centipede=.85, ape=.75, crocodile=.55)
ATTRS = []
for beast in BEASTS.values():
    rank, role, family = beast["rank"], beast["role"], beast["family"]
    factor = (1.05 if family in ("tiger", "bear", "crocodile") else 1) if role == "boss" else FAMILY_HP[family]
    hp = round(RANKS[rank-1][role+"_hp"] * factor)
    damage = RANKS[rank-1][{"normal": "contact_damage", "elite": "elite_attack_damage", "boss": "boss_major_damage"}[role]]
    ATTRS.append(dict(id=beast["id"], name=beast["name"], role=role, rank=rank, hp=hp,
                      damage=damage, move_speed=round(220*SPEED[family]), family_hp_factor=factor))
ATTR_BY_ID = {a["id"]: a for a in ATTRS}

def passive_multiplier(levels):
    level = levels.get("sj_heart", 0)
    heart = BY_SKILL["sj_heart"]["crit_chance"][level-1] * .5 if level else 0
    level = levels.get("sj_bone", 0)
    bone = BY_SKILL["sj_bone"]["damage_bonus"][level-1] if level else 0
    level = levels.get("sj_mark", 0)
    mark = BY_SKILL["sj_mark"]["wound_share"][level-1] if level else 0
    level = levels.get("sj_gate", 0)
    gate = BY_SKILL["sj_gate"]["share"][level-1] if level else 0
    # Boss with no deaths: gate contribution is deliberately zero.
    return 1 + heart + bone + mark


def dps(levels, cultivation, equipment_bonus=0, uptime_scale=1):
    total = 0
    for sid in ("sj_yujian", "sj_arc", "sj_line", "sj_formation"):
        lv = levels.get(sid, 0)
        if lv:
            s = BY_SKILL[sid]
            total += s["damage"][lv-1] * s["single_dps_factor"] * s["hit_assumption"]
    a = 100*(1+cultivation_bonus(cultivation))
    assert 0 <= equipment_bonus <= ECONOMY["equipment_damage_bonus_cap"]
    return total*a*passive_multiplier(levels)*(1+equipment_bonus)*uptime_scale


tiers = {
    "入门": (dict(sj_yujian=1, sj_arc=1), 1, 0),
    "阶段": (dict(sj_yujian=3, sj_arc=3, sj_line=3, sj_formation=3,
                  sj_heart=3, sj_bone=3, vajra=3, magnet=3), 14, .10),
    "上限": (dict(sj_yujian=5, sj_arc=5, sj_line=5, sj_formation=5,
                  sj_heart=5, sj_bone=5, vajra=5, magnet=5), 27,
             ECONOMY["equipment_damage_bonus_cap"]),
}
calibration = []
for floor in TOWER["floors"]:
    boss = ATTR_BY_ID[floor["boss_id"]]
    for tier, (levels, cultivation, bonus) in tiers.items():
        damage = dps(levels, cultivation, bonus)
        calibration.append(dict(floor=floor["floor"], boss=boss["name"], rank=boss["rank"],
                                boss_hp=boss["hp"], player_tier=tier,
                                equipment_damage_bonus=bonus,
                                player_max_hp=round(100*(1+cultivation_bonus(cultivation)), 3),
                                robe_hp_bonus=ECONOMY["robe"]["hp_bonus"],
                                assumed_effective_dps=round(damage, 3),
                                boss_ttk_seconds=round(boss["hp"]/damage, 2),
                                low_uptime_ttk=round(boss["hp"]/(damage*.8), 2),
                                high_uptime_ttk=round(boss["hp"]/(damage*1.2), 2)))

route_calibration = []
for floor in TOWER["floors"]:
    fid = floor["floor"]
    previous = progress[fid-2] if fid > 1 else None
    levels = previous["skills"] if previous else dict(sj_yujian=1, sj_arc=1)
    cultivation = previous["cultivation_level"] if previous else 1
    boss = ATTR_BY_ID[floor["boss_id"]]
    damage = dps(levels, cultivation, 0)  # no paid equipment or assumed lucky draws
    route_calibration.append(dict(floor=fid, before_floor_skills=levels, cultivation=cultivation,
                                  boss_hp=boss["hp"], dps=round(damage, 2),
                                  ttk=round(boss["hp"]/damage, 2)))

for s in SKILLS:
    assert len(s["prices"]) == s["max_level"] == 5
    if s["kind"] == "active":
        assert all(a <= b for a, b in zip(s["damage"], s["damage"][1:]))
        assert s["damage"][-1]/s["damage"][0] <= 1.45
assert math.isclose(.06*.5+.04+.03+.02, .12)
assert ECONOMY["equipment_damage_bonus_cap"] == tiers["上限"][2] == .30
assert ECONOMY["robe"]["hp_bonus"] == 0
assert max(a["rank"] for a in ATTRS) <= 7
assert [BEASTS[f"tiger_{r}"]["rank"] for r in ("normal", "elite", "boss")] == [3, 4, 6]
assert [BEASTS[f"crocodile_{r}"]["rank"] for r in ("normal", "elite", "boss")] == [2, 3, 4]
assert len(wave_rows) == 180 and all(r["core_balance"] >= 0 for r in progress)
assert economy_rows[0]["core_units"] == 63
assert all(r["contribution"] == 100+5*(r["floor"]-1) for r in economy_rows)
assert all(a["core_units"] <= b["core_units"] for a, b in zip(economy_rows, economy_rows[1:]))
assert all(math.isclose(sum(ECONOMY[k]["rates"]), 1) for k in ("weapon_draw", "beast_draw"))
assert all(all(0 <= level <= 5 for level in r["skills"].values()) for r in progress)
assert [r["realm"] for r in CULTIVATION[::9]] == list(REALMS)
assert all(r["realm"] in REALMS and 1 <= r["realm_step"] <= 9 for r in CULTIVATION)
assert CULTIVATION[-1]["realm"] == ECONOMY["tower_cultivation_boundary"]["max_realm"]
assert CULTIVATION[-1]["xp_total"] == 10920
assert [cultivation_level(xp) for xp in (10919, 10920, 10921, 10**9)] == [26, 27, 27, 27]
assert all(r["attack_bonus"] <= .20 and r["hp_bonus"] <= .20 for r in CULTIVATION)
assert math.isclose(1.188 + 6*.352/8, 1.32*1.1)
assert math.isclose(2.7225/6, (1.65/4)*1.1)
assert max(ECONOMY["duplicate_contribution"]) < ECONOMY["weapon_draw"]["cost"]

# Approved first-release contracts. These validate generated design data only;
# kill idempotency, saves, cooldowns, and HP persistence still need runtime tests.
assert ECONOMY["cultivation_persistence"] == "permanent_confirmed"
assert ECONOMY["cultivation_cap"]["status"] == "user_confirmed"
assert CULTIVATION[-1]["level"] == ECONOMY["cultivation_cap"]["max_level"] == 27
assert CULTIVATION[-1]["attack_bonus"] == ECONOMY["cultivation_cap"]["max_attack_bonus"] == .20
assert CULTIVATION[-1]["hp_bonus"] == ECONOMY["cultivation_cap"]["max_hp_bonus"] == .20
assert ECONOMY["normal_counter_persists_on_kill"] is True
assert normal_kill_reward(18) == (0, 19)
assert normal_kill_reward(19) == (1, 0)  # Still earned when the wave is unfinished.
assert all(normal_kill_reward(n) == ((n+1)//20, (n+1)%20) for n in range(20))
assert ECONOMY["starter"] == {
    "core_units": 20, "contribution": 300, "learned": {"sj_yujian": 1},
    "supplies": {"回春丹": 3}, "grant_once_per_new_profile": True,
}
assert ECONOMY["first_release_draw_pools"] == ["weapon_draw"]
assert ECONOMY["weapon_draw"]["enabled"] and not ECONOMY["beast_draw"]["enabled"]
assert len(set(ECONOMY["weapon_draw"]["identities"])) == 3
assert (ECONOMY["weapon_draw"]["cost"], ECONOMY["weapon_draw"]["rates"],
        ECONOMY["weapon_draw"]["pity"]) == (100, [.40, .35, .20, .05], 20)
assert (ECONOMY["beast_draw"]["cost"], ECONOMY["beast_draw"]["rates"],
        ECONOMY["beast_draw"]["pity"]) == (100, [.55, .30, .12, .03], 30)
assert ECONOMY["duplicate_contribution"] == [2, 4, 8, 16]
assert ECONOMY["draw_rules"]["independent_pity_per_pool"]
assert ECONOMY["draw_rules"]["top_quality_resets_pity_immediately"]
assert not ECONOMY["draw_rules"]["pity_guarantees_identity"]
assert ECONOMY["class_exclusivity"] == {
    "beast": {"only_class": "御兽师", "first_release_enabled": False},
    "talisman": {"only_class": "符师", "first_release_enabled": False},
}
assert ECONOMY["first_release_equipment_slots"] == ["weapon", "robe", "pendant"]
assert ECONOMY["refine_slots"] == ["weapon"]
assert ECONOMY["refine_costs"] == [40, 60, 80, 100]
assert ECONOMY["refine_max_level"] == 4
assert ECONOMY["equipment_refine_included_in_damage_cap"]
assert not any(ECONOMY["robe"][k] for k in ("draw_enabled", "quality_upgrade_enabled", "refine_enabled"))
assert ECONOMY["supplies"] == {
    "回春丹": {"cost": 5, "heal_max_hp_fraction": .50, "cap": "max_hp"},
    "培元丹": {"cost": 20, "cultivation": 50, "max_xp": 10920},
}
assert ECONOMY["supply_rules"]["use"] == "out_of_combat_only"
assert ECONOMY["supply_rules"]["daily_limit"] is None
assert ECONOMY["supply_rules"]["combat_slots"] == []
assert ECONOMY["supply_rules"]["combat_damage_bonus"] == 0
health = ECONOMY["health_rules"]
assert health["inherit_remaining_hp_on"] == ["exit_tower", "enter_tower", "next_floor", "app_restart"]
assert health["death_return_hp"] == 1
assert health["out_of_combat_regen_max_hp_fraction_per_minute"] == .01
assert health["offline_out_of_combat_regen"] is True
assert health["in_tower_regen_max_hp_fraction_per_minute"] == 0
assert not health["paused_or_background_battle_counts_as_out_of_combat"]
assert health["in_tower_healing_drops"]


def keys_recursive(data):
    if isinstance(data, dict):
        for key, value in data.items():
            yield key
            yield from keys_recursive(value)
    elif isinstance(data, list):
        for value in data:
            yield from keys_recursive(value)


obsolete_keys = {"cultivation_cap_proposal", "normal_counter_persists_on_wave_commit",
                 "robe_quality_step_costs", "exchange_progress", "redemption_progress"}
assert not any(k.startswith("choice") or k in obsolete_keys for k in keys_recursive(ECONOMY))

# Pure capped-effect arithmetic, not an implementation of inventory/save handling.
def capped_gain(current, amount, cap):
    return max(0, min(amount, cap-current))


effect_examples = []
for current, amount, cap, expected in [
    (1, 50, 100, 50), (80, 50, 100, 20), (100, 50, 100, 0),
    (1, 60, 120, 60), (119, 60, 120, 1), (120, 60, 120, 0),
    (10900, 50, 10920, 20), (10920, 50, 10920, 0),
]:
    assert capped_gain(current, amount, cap) == expected
    effect_examples.append(dict(current=current, requested=amount, cap=cap,
                                applied=expected, consume_inventory=expected > 0))
recovery_examples = []
for max_hp in (100, 120):
    for minutes, in_tower, offline in [(1, False, False), (1, False, True),
                                       (100, False, True), (100, True, True)]:
        rate = health["in_tower_regen_max_hp_fraction_per_minute"] if in_tower else health[
            "out_of_combat_regen_max_hp_fraction_per_minute"]
        hp = health["death_return_hp"]
        restored = hp + capped_gain(hp, max_hp*rate*minutes, max_hp)
        expected = hp if in_tower else min(max_hp, hp+max_hp*.01*minutes)
        assert math.isclose(restored, expected)
        recovery_examples.append(dict(max_hp=max_hp, start_hp=hp, minutes=minutes,
                                      in_tower=in_tower, offline=offline, result_hp=restored))

book_rows = []
for s in SKILLS:
    for level in range(1, 6):
        params = {k: (v[level-1] if isinstance(v, list) else v) for k, v in s.items()
                  if k not in ("id", "name", "kind", "clear", "prices", "level_clear_requirements", "max_level", "rule")}
        book_rows.append(dict(id=s["id"], name=s["name"], level=level, price=s["prices"][level-1],
                              requires_clear=s["level_clear_requirements"][level-1],
                              effects=json.dumps(params, ensure_ascii=False), rule=s["rule"]))
skill_data = {"status": "design_not_runtime", "skills": SKILLS, "evolutions": EVOLUTIONS}
rank_data = {"status": "static_calibration_not_runtime",
             "player_reference": {"attack": 100, "hp": 100, "move_speed": 220},
             "rank_table": RANKS, "archetypes": ATTRS}
wave_groups = [
    {**{"floor": f["floor"]}, **{key: w[key] for key in
                                ("wave", "normal_count", "planned_required", "enemy_groups")}}
    for f in TOWER["floors"] for w in f["waves"]
]
monster_counts = Counter()
for wave in wave_groups:
    assert sum(g["count"] for g in wave["enemy_groups"]) == wave["planned_required"]
    for group in wave["enemy_groups"]:
        monster_counts[BEASTS[group["archetype"]]["role"]] += group["count"]
assert len(TOWER["floors"]) == 9
assert all(len(f["waves"]) == 20 for f in TOWER["floors"])
assert len(book_rows) == 60 and len(EVOLUTIONS) == 4
assert monster_counts == {"normal": 4716, "elite": 45, "boss": 9}

# Fingerprints of the approved numeric baseline, captured before this rule update.
# Any later playtest adjustment must deliberately review/update these guards.
protected_baselines = {
    "skill-books-v2.json": (skill_data, "d0f200bd0d42ec9bd280dade5e55198dbe214bff1d23e00c526a0228330d5344"),
    "skill-levels-v2.csv": ([{k: str(v) for k, v in r.items()} for r in book_rows],
                          "0a02cd342fd3ebfc0ac3e725ad689527ecf07e505dc9de072cf9638fa9cdc479"),
    "rank-attributes.json": (rank_data, "cee966c1361895faf053307501bdcfc9cf6320f3513dd8bc583f57040e6b7f94"),
    "tower_wave_groups": (wave_groups, "3cd30c7a77d12354b5a17f93c48d9b21c3f70b504dd41ef82e8902b14aa9fac2"),
    "income-v2.csv": (economy_rows, "7d98d458c39a7b62ab13a9b11f54517d63f6937f37b9c0fdf0bce2e47b9561fb"),
    "wave-rewards-v2.csv": (wave_rows, "134cd43a821724005c808e5c6ef6563957db1225be8723a0409fdae882934c45"),
}
for name, (data, expected) in protected_baselines.items():
    assert digest(data) == expected, f"Approved numeric baseline changed: {name}"

all_book_cost = sum(sum(s["prices"]) for s in SKILLS)-20 + sum(e["price"] for e in EVOLUTIONS)
total_core = 20+sum(r["first_core_total"] for r in economy_rows)
total_contribution = 300+sum(r["first_contribution_total"] for r in economy_rows)
remaining = all_book_cost-total_core
repeat_min = economy_rows[-1]["core_units"]-1
repeat_max = economy_rows[-1]["core_units"]+1
total_cultivation = sum(r["cultivation"] for r in economy_rows)
cap_xp = ECONOMY["cultivation_cap"]["max_xp"]
peiyuan_gap = max(0, cap_xp-total_cultivation)
peiyuan_count = math.ceil(peiyuan_gap/ECONOMY["supplies"]["培元丹"]["cultivation"])
example_huichun_uses = 9  # Optional arithmetic example, not required or sufficient healing.
example_huichun_buys = max(0, example_huichun_uses-ECONOMY["starter"]["supplies"]["回春丹"])
assert (total_core, total_contribution, total_cultivation) == (1118, 1830, 9726)
summary = dict(status="arithmetic_and_static_estimate_not_playtest",
               schema_version=3, decision_source=ECONOMY["decision_source"],
               first_nine_core_including_starter=total_core,
               first_nine_contribution_including_starter=total_contribution,
               first_nine_cultivation=total_cultivation,
               all_books_and_four_evolutions_cost_excluding_free_yujian=all_book_cost,
               repeat_floor9_to_collect_everything_range=[
                   max(0, math.ceil(remaining/repeat_max)), max(0, math.ceil(remaining/repeat_min))],
               income_budget_basis="first_clear_output_before_optional_medicine_refine_and_draws_not_clearability_or_draw_count",
               weapon_refine_0_to_4_contribution=sum(ECONOMY["refine_costs"]),
               optional_supply_arithmetic={
                   "status": "illustrative_choices_not_required_spend_or_healing_sufficiency",
                   "nine_huichun_uses": {"starter_used": 3, "purchased": example_huichun_buys,
                                        "contribution": example_huichun_buys*ECONOMY["supplies"]["回春丹"]["cost"]},
                   "peiyuan_after_nine_full_clears_without_prior_pills": {
                       "starting_xp": total_cultivation, "missing_xp": peiyuan_gap,
                       "pills": peiyuan_count, "contribution": peiyuan_count*ECONOMY["supplies"]["培元丹"]["cost"],
                       "final_xp": cap_xp,
                       "discarded_overflow": peiyuan_count*ECONOMY["supplies"]["培元丹"]["cultivation"]-peiyuan_gap,
                   },
               },
               calibration_assumptions={
                   "class": "剑修", "equipment_damage_bonus_cap": .30,
                   "refine_included_in_equipment_cap": True,
                   "beast_damage": 0, "combat_pill_damage_bonus": 0,
                   "robe_hp_bonus": 0, "base_max_hp": 100, "cultivation_capped_max_hp": 120,
                   "entry_hp": "inherited_remaining_hp_not_assumed_full",
                   "scope": "single_target_static_dps_no_survival_recovery_or_floor_duration_simulation",
                   "future_beastmaster_balance": "not_designed_or_validated",
               },
               route=progress, route_static_boss_check=route_calibration,
               design_assertions={
                   "status": "passed_design_data_and_arithmetic_only",
                   "skill_level_rows": len(book_rows), "evolutions": len(EVOLUTIONS),
                   "floors": len(TOWER["floors"]), "waves": len(wave_rows),
                   "monster_counts": dict(monster_counts), "monsters_total": sum(monster_counts.values()),
                   "approved_baseline_sha256": {name: expected for name, (_, expected) in protected_baselines.items()},
                   "rules_checked": [
                       "permanent_cultivation_27_10920_jindan_20_percent",
                       "normal_core_counter_at_each_kill_including_unfinished_wave",
                       "inherited_hp_death_1_outdoor_offline_1_percent_no_tower_regen",
                       "weapon_only_first_release_and_future_beastmaster_pool_rates_pity",
                       "class_exclusivity_no_sword_pet_talisman_or_combat_pill_slots",
                       "no_draw_selection_or_exchange_progress",
                       "duplicate_2_4_8_16_and_once_only_starter",
                       "outdoor_huichun_5_half_hp_peiyuan_20_50_xp_capped",
                       "weapon_only_refine_40_60_80_100_equipment_30_percent_basic_robe_zero_hp_bonus",
                   ],
                   "capped_effect_examples": effect_examples,
                   "recovery_arithmetic_examples": recovery_examples,
                   "runtime_or_playtest_acceptance": False,
               })
compact_summary = {k: v for k, v in summary.items()
                   if k not in ("route", "route_static_boss_check", "design_assertions")}
save("economy-v2.json", ECONOMY)
save("skill-books-v2.json", skill_data)
save("rank-attributes.json", rank_data)
save("economy-v2-report.json", summary)
save("economy-summary.json", compact_summary)
csv_save("income-v2.csv", economy_rows)
csv_save("wave-rewards-v2.csv", wave_rows)
csv_save("rank-calibration.csv", calibration)
csv_save("skill-levels-v2.csv", book_rows)
print("PASS: confirmed rule contracts; 9 floors / 180 reward waves / 4770 monsters; "
      "60 skill levels / 4 evolutions; 6 approved numeric fingerprints unchanged; "
      "kill-time counter; capped medicine and outdoor recovery arithmetic; "
      "weapon-only 30% calibration, basic robe 0% HP. Design/static model only, not runtime or playtest.")
print(json.dumps(compact_summary, ensure_ascii=False))
print("Route boss TTK:", [(r["floor"], r["ttk"]) for r in route_calibration])
