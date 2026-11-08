// Fixed authored identities. No player level or random input. Regenerate offline only.
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
export const FIXED_EQUIPMENT=freeze({
  "eq_sword_iron": {
    "base": {
      "physicalAttack": 5,
      "magicAttack": 5
    },
    "affixes": []
  },
  "eq_armor_basic": {
    "base": {
      "physicalDefense": 1
    },
    "affixes": []
  },
  "eq_ring_basic": {
    "base": {
      "magicDefense": 1
    },
    "affixes": []
  },
  "eq_sword_suwen": {
    "base": {
      "physicalAttack": 16,
      "magicAttack": 16,
      "strength": 3,
      "intelligence": 3,
      "awareness": 2
    },
    "affixes": [
      {
        "type": "physical",
        "value": 3
      },
      {
        "type": "magic",
        "value": 3
      },
      {
        "type": "attackSpeed",
        "value": 3
      },
      {
        "type": "onHit",
        "value": 2
      }
    ]
  },
  "eq_sword_qingfeng": {
    "base": {
      "physicalAttack": 24,
      "magicAttack": 24,
      "strength": 6,
      "intelligence": 6,
      "awareness": 2
    },
    "affixes": [
      {
        "type": "physical",
        "value": 6
      },
      {
        "type": "magic",
        "value": 6
      },
      {
        "type": "attackSpeed",
        "value": 4
      },
      {
        "type": "onHit",
        "value": 2
      }
    ]
  },
  "eq_sword_guiyan": {
    "base": {
      "physicalAttack": 32,
      "magicAttack": 32,
      "strength": 9,
      "intelligence": 9
    },
    "affixes": [
      {
        "type": "physical",
        "value": 4
      },
      {
        "type": "magic",
        "value": 4
      },
      {
        "type": "attackSpeed",
        "value": 5
      },
      {
        "type": "onHit",
        "value": 2
      },
      {
        "type": "flow",
        "value": 6,
        "target": "yujian"
      }
    ]
  },
  "eq_sword_songfeng": {
    "base": {
      "physicalAttack": 36,
      "magicAttack": 15,
      "strength": 18
    },
    "affixes": [
      {
        "type": "physical",
        "value": 4
      },
      {
        "type": "magic",
        "value": 4
      },
      {
        "type": "attackSpeed",
        "value": 5
      },
      {
        "type": "onHit",
        "value": 2
      },
      {
        "type": "flow",
        "value": 6,
        "target": "qi"
      }
    ]
  },
  "eq_sword_shoushan": {
    "base": {
      "physicalAttack": 30,
      "magicAttack": 50,
      "intelligence": 15,
      "awareness": 3
    },
    "affixes": [
      {
        "type": "physical",
        "value": 6
      },
      {
        "type": "magic",
        "value": 6
      },
      {
        "type": "attackSpeed",
        "value": 5
      },
      {
        "type": "onHit",
        "value": 2
      },
      {
        "type": "skill",
        "value": 6,
        "target": "sj_arc"
      }
    ]
  },
  "eq_sword_liuquan": {
    "base": {
      "physicalAttack": 54,
      "magicAttack": 54,
      "strength": 15,
      "intelligence": 15
    },
    "affixes": [
      {
        "type": "physical",
        "value": 14
      },
      {
        "type": "magic",
        "value": 14
      },
      {
        "type": "attackSpeed",
        "value": 6
      },
      {
        "type": "onHit",
        "value": 2
      },
      {
        "type": "flow",
        "value": 6,
        "target": "yujian"
      }
    ]
  },
  "eq_sword_caiyun": {
    "base": {
      "physicalAttack": 48,
      "magicAttack": 19,
      "strength": 24
    },
    "affixes": [
      {
        "type": "physical",
        "value": 8
      },
      {
        "type": "magic",
        "value": 8
      },
      {
        "type": "attackSpeed",
        "value": 6
      },
      {
        "type": "bleedConversion",
        "value": 50
      },
      {
        "type": "bleed",
        "value": 2
      },
      {
        "type": "flow",
        "value": 6,
        "target": "qi"
      }
    ]
  },
  "eq_sword_panxi": {
    "base": {
      "physicalAttack": 45,
      "magicAttack": 75,
      "intelligence": 27,
      "awareness": 4
    },
    "affixes": [
      {
        "type": "physical",
        "value": 14
      },
      {
        "type": "magic",
        "value": 14
      },
      {
        "type": "attackSpeed",
        "value": 6
      },
      {
        "type": "onHit",
        "value": 2
      },
      {
        "type": "skill",
        "value": 6,
        "target": "sj_arc"
      }
    ]
  },
  "eq_sword_lingxi": {
    "base": {
      "physicalAttack": 69,
      "magicAttack": 69,
      "strength": 18,
      "intelligence": 18,
      "awareness": 5
    },
    "affixes": [
      {
        "type": "physical",
        "value": 16
      },
      {
        "type": "magic",
        "value": 16
      },
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "bleedConversion",
        "value": 50
      },
      {
        "type": "bleed",
        "value": 2
      },
      {
        "type": "flow",
        "value": 6,
        "target": "yujian"
      }
    ]
  },
  "eq_sword_ningshuang": {
    "base": {
      "physicalAttack": 68,
      "magicAttack": 27,
      "strength": 33,
      "intelligence": 3,
      "awareness": 5
    },
    "affixes": [
      {
        "type": "physical",
        "value": 16
      },
      {
        "type": "magic",
        "value": 16
      },
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "onHit",
        "value": 2
      },
      {
        "type": "flow",
        "value": 6,
        "target": "qi"
      }
    ]
  },
  "eq_sword_xingluo": {
    "base": {
      "physicalAttack": 63,
      "magicAttack": 105,
      "intelligence": 36,
      "strength": 3,
      "awareness": 5
    },
    "affixes": [
      {
        "type": "physical",
        "value": 24
      },
      {
        "type": "magic",
        "value": 24
      },
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "onHit",
        "value": 2
      },
      {
        "type": "skill",
        "value": 6,
        "target": "sj_arc"
      }
    ]
  },
  "eq_sword_zhaodan": {
    "base": {
      "physicalAttack": 104,
      "magicAttack": 104,
      "strength": 24,
      "intelligence": 24
    },
    "affixes": [
      {
        "type": "physical",
        "value": 22
      },
      {
        "type": "magic",
        "value": 22
      },
      {
        "type": "attackSpeed",
        "value": 10
      },
      {
        "type": "onHit",
        "value": 2
      },
      {
        "type": "flow",
        "value": 3,
        "target": "qi"
      },
      {
        "type": "skillLevel",
        "value": 1,
        "target": "炼气"
      }
    ]
  },
  "eq_sword_dingyue": {
    "base": {
      "physicalAttack": 84,
      "magicAttack": 140,
      "intelligence": 51,
      "awareness": 6
    },
    "affixes": [
      {
        "type": "physical",
        "value": 32
      },
      {
        "type": "magic",
        "value": 32
      },
      {
        "type": "attackSpeed",
        "value": 10
      },
      {
        "type": "onHit",
        "value": 2
      },
      {
        "type": "skill",
        "value": 6,
        "target": "sj_arc"
      }
    ]
  },
  "eq_sword_tingyu": {
    "base": {
      "physicalAttack": 81,
      "magicAttack": 81,
      "strength": 18,
      "intelligence": 18
    },
    "affixes": [
      {
        "type": "physical",
        "value": 14
      },
      {
        "type": "magic",
        "value": 14
      },
      {
        "type": "attackSpeed",
        "value": 7
      },
      {
        "type": "onHit",
        "value": 3
      },
      {
        "type": "flow",
        "value": 8,
        "target": "yujian"
      },
      {
        "type": "element",
        "value": 2,
        "target": "all"
      }
    ]
  },
  "eq_sword_zhufeng": {
    "base": {
      "physicalAttack": 80,
      "magicAttack": 32,
      "strength": 30
    },
    "affixes": [
      {
        "type": "physical",
        "value": 10
      },
      {
        "type": "magic",
        "value": 10
      },
      {
        "type": "attackSpeed",
        "value": 7
      },
      {
        "type": "onHit",
        "value": 3
      },
      {
        "type": "flow",
        "value": 8,
        "target": "qi"
      },
      {
        "type": "element",
        "value": 2,
        "target": "all"
      }
    ]
  },
  "eq_sword_zhenyue": {
    "base": {
      "physicalAttack": 75,
      "magicAttack": 125,
      "intelligence": 33,
      "awareness": 5
    },
    "affixes": [
      {
        "type": "physical",
        "value": 18
      },
      {
        "type": "magic",
        "value": 18
      },
      {
        "type": "attackSpeed",
        "value": 7
      },
      {
        "type": "onHit",
        "value": 3
      },
      {
        "type": "flow",
        "value": 8,
        "target": "formation"
      },
      {
        "type": "element",
        "value": 2,
        "target": "all"
      }
    ]
  },
  "eq_sword_qingxiao": {
    "base": {
      "physicalAttack": 117,
      "magicAttack": 117,
      "strength": 27,
      "intelligence": 27
    },
    "affixes": [
      {
        "type": "physical",
        "value": 22
      },
      {
        "type": "magic",
        "value": 22
      },
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "onHit",
        "value": 3
      },
      {
        "type": "flow",
        "value": 8,
        "target": "yujian"
      },
      {
        "type": "element",
        "value": 2,
        "target": "all"
      }
    ]
  },
  "eq_sword_liuxia": {
    "base": {
      "physicalAttack": 116,
      "magicAttack": 46,
      "strength": 48
    },
    "affixes": [
      {
        "type": "physical",
        "value": 18
      },
      {
        "type": "magic",
        "value": 18
      },
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "onHit",
        "value": 3
      },
      {
        "type": "flow",
        "value": 8,
        "target": "qi"
      },
      {
        "type": "element",
        "value": 2,
        "target": "all"
      }
    ]
  },
  "eq_sword_xuanjun": {
    "base": {
      "physicalAttack": 108,
      "magicAttack": 180,
      "intelligence": 51,
      "awareness": 7
    },
    "affixes": [
      {
        "type": "physical",
        "value": 26
      },
      {
        "type": "magic",
        "value": 26
      },
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "onHit",
        "value": 3
      },
      {
        "type": "flow",
        "value": 8,
        "target": "formation"
      },
      {
        "type": "element",
        "value": 2,
        "target": "all"
      }
    ]
  },
  "eq_sword_hanguang": {
    "base": {
      "physicalAttack": 159,
      "magicAttack": 159,
      "strength": 33,
      "intelligence": 33,
      "awareness": 9
    },
    "affixes": [
      {
        "type": "physical",
        "value": 31
      },
      {
        "type": "magic",
        "value": 31
      },
      {
        "type": "attackSpeed",
        "value": 10
      },
      {
        "type": "bleedConversion",
        "value": 50
      },
      {
        "type": "bleed",
        "value": 3
      },
      {
        "type": "flow",
        "value": 8,
        "target": "yujian"
      },
      {
        "type": "element",
        "value": 2,
        "target": "all"
      }
    ]
  },
  "eq_sword_duanliu": {
    "base": {
      "physicalAttack": 160,
      "magicAttack": 64,
      "strength": 49,
      "intelligence": 17,
      "awareness": 9
    },
    "affixes": [
      {
        "type": "physical",
        "value": 26
      },
      {
        "type": "magic",
        "value": 26
      },
      {
        "type": "attackSpeed",
        "value": 10
      },
      {
        "type": "bleedConversion",
        "value": 50
      },
      {
        "type": "bleed",
        "value": 3
      },
      {
        "type": "flow",
        "value": 8,
        "target": "qi"
      },
      {
        "type": "element",
        "value": 2,
        "target": "all"
      }
    ]
  },
  "eq_sword_hechuan": {
    "base": {
      "physicalAttack": 142,
      "magicAttack": 236,
      "intelligence": 66,
      "strength": 3,
      "awareness": 9
    },
    "affixes": [
      {
        "type": "physical",
        "value": 36
      },
      {
        "type": "magic",
        "value": 36
      },
      {
        "type": "attackSpeed",
        "value": 10
      },
      {
        "type": "onHit",
        "value": 3
      },
      {
        "type": "flow",
        "value": 8,
        "target": "formation"
      },
      {
        "type": "element",
        "value": 2,
        "target": "all"
      }
    ]
  },
  "eq_sword_chengming": {
    "base": {
      "physicalAttack": 252,
      "magicAttack": 101,
      "strength": 63,
      "intelligence": 21
    },
    "affixes": [
      {
        "type": "physical",
        "value": 44
      },
      {
        "type": "magic",
        "value": 44
      },
      {
        "type": "attackSpeed",
        "value": 12
      },
      {
        "type": "onHit",
        "value": 3
      },
      {
        "type": "flow",
        "value": 8,
        "target": "qi"
      },
      {
        "type": "element",
        "value": 2,
        "target": "all"
      }
    ]
  },
  "eq_sword_kunwu": {
    "base": {
      "physicalAttack": 237,
      "magicAttack": 395,
      "intelligence": 87,
      "awareness": 11
    },
    "affixes": [
      {
        "type": "physical",
        "value": 46
      },
      {
        "type": "magic",
        "value": 46
      },
      {
        "type": "attackSpeed",
        "value": 12
      },
      {
        "type": "onHit",
        "value": 3
      },
      {
        "type": "flow",
        "value": 8,
        "target": "formation"
      },
      {
        "type": "element",
        "value": 2,
        "target": "all"
      }
    ]
  },
  "eq_sword_wangshu": {
    "base": {
      "physicalAttack": 221,
      "magicAttack": 221,
      "strength": 36,
      "intelligence": 36
    },
    "affixes": [
      {
        "type": "physical",
        "value": 21
      },
      {
        "type": "magic",
        "value": 21
      },
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "onHit",
        "value": 5
      },
      {
        "type": "flow",
        "value": 12,
        "target": "yujian"
      },
      {
        "type": "element",
        "value": 4,
        "target": "all"
      }
    ]
  },
  "eq_sword_biluo": {
    "base": {
      "physicalAttack": 245,
      "magicAttack": 98,
      "strength": 72
    },
    "affixes": [
      {
        "type": "physical",
        "value": 21
      },
      {
        "type": "magic",
        "value": 21
      },
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "onHit",
        "value": 5
      },
      {
        "type": "flow",
        "value": 12,
        "target": "qi"
      },
      {
        "type": "element",
        "value": 4,
        "target": "all"
      }
    ]
  },
  "eq_sword_qiyao": {
    "base": {
      "physicalAttack": 203,
      "magicAttack": 338,
      "intelligence": 69,
      "awareness": 10
    },
    "affixes": [
      {
        "type": "physical",
        "value": 26
      },
      {
        "type": "magic",
        "value": 26
      },
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "onHit",
        "value": 5
      },
      {
        "type": "flow",
        "value": 12,
        "target": "formation"
      },
      {
        "type": "element",
        "value": 4,
        "target": "all"
      }
    ]
  },
  "eq_sword_jinghong": {
    "base": {
      "physicalAttack": 306,
      "magicAttack": 306,
      "strength": 51,
      "intelligence": 51
    },
    "affixes": [
      {
        "type": "physical",
        "value": 32
      },
      {
        "type": "magic",
        "value": 32
      },
      {
        "type": "attackSpeed",
        "value": 10
      },
      {
        "type": "onHit",
        "value": 5
      },
      {
        "type": "flow",
        "value": 12,
        "target": "yujian"
      },
      {
        "type": "element",
        "value": 4,
        "target": "all"
      }
    ]
  },
  "eq_sword_xiaohan": {
    "base": {
      "physicalAttack": 310,
      "magicAttack": 124,
      "strength": 96
    },
    "affixes": [
      {
        "type": "physical",
        "value": 26
      },
      {
        "type": "magic",
        "value": 26
      },
      {
        "type": "attackSpeed",
        "value": 10
      },
      {
        "type": "onHit",
        "value": 5
      },
      {
        "type": "flow",
        "value": 12,
        "target": "qi"
      },
      {
        "type": "element",
        "value": 4,
        "target": "all"
      }
    ]
  },
  "eq_sword_tianshu": {
    "base": {
      "physicalAttack": 278,
      "magicAttack": 463,
      "intelligence": 99,
      "awareness": 13
    },
    "affixes": [
      {
        "type": "physical",
        "value": 38
      },
      {
        "type": "magic",
        "value": 38
      },
      {
        "type": "attackSpeed",
        "value": 10
      },
      {
        "type": "onHit",
        "value": 5
      },
      {
        "type": "flow",
        "value": 12,
        "target": "formation"
      },
      {
        "type": "element",
        "value": 4,
        "target": "all"
      }
    ]
  },
  "eq_sword_xuanwei": {
    "base": {
      "physicalAttack": 401,
      "magicAttack": 401,
      "strength": 63,
      "intelligence": 63,
      "awareness": 16
    },
    "affixes": [
      {
        "type": "physical",
        "value": 44
      },
      {
        "type": "magic",
        "value": 44
      },
      {
        "type": "attackSpeed",
        "value": 12
      },
      {
        "type": "bleedConversion",
        "value": 50
      },
      {
        "type": "bleed",
        "value": 5
      },
      {
        "type": "flow",
        "value": 12,
        "target": "yujian"
      },
      {
        "type": "element",
        "value": 4,
        "target": "all"
      }
    ]
  },
  "eq_sword_zhuiri": {
    "base": {
      "physicalAttack": 410,
      "magicAttack": 164,
      "strength": 123,
      "intelligence": 3,
      "awareness": 16
    },
    "affixes": [
      {
        "type": "physical",
        "value": 38
      },
      {
        "type": "magic",
        "value": 38
      },
      {
        "type": "attackSpeed",
        "value": 12
      },
      {
        "type": "bleedConversion",
        "value": 50
      },
      {
        "type": "bleed",
        "value": 5
      },
      {
        "type": "flow",
        "value": 12,
        "target": "qi"
      },
      {
        "type": "element",
        "value": 4,
        "target": "all"
      }
    ]
  },
  "eq_sword_luotian": {
    "base": {
      "physicalAttack": 360,
      "magicAttack": 600,
      "intelligence": 126,
      "strength": 3,
      "awareness": 16
    },
    "affixes": [
      {
        "type": "physical",
        "value": 50
      },
      {
        "type": "magic",
        "value": 50
      },
      {
        "type": "attackSpeed",
        "value": 12
      },
      {
        "type": "onHit",
        "value": 5
      },
      {
        "type": "flow",
        "value": 12,
        "target": "formation"
      },
      {
        "type": "element",
        "value": 4,
        "target": "all"
      }
    ]
  },
  "eq_sword_zhaoyuan": {
    "base": {
      "physicalAttack": 520,
      "magicAttack": 208,
      "strength": 156
    },
    "affixes": [
      {
        "type": "physical",
        "value": 62
      },
      {
        "type": "magic",
        "value": 62
      },
      {
        "type": "attackSpeed",
        "value": 14
      },
      {
        "type": "onHit",
        "value": 5
      },
      {
        "type": "element",
        "value": 4,
        "target": "all"
      }
    ]
  },
  "eq_sword_taiheng": {
    "base": {
      "physicalAttack": 540,
      "magicAttack": 540,
      "strength": 84,
      "intelligence": 84
    },
    "affixes": [
      {
        "type": "physical",
        "value": 38
      },
      {
        "type": "magic",
        "value": 38
      },
      {
        "type": "attackSpeed",
        "value": 14
      },
      {
        "type": "onHit",
        "value": 5
      },
      {
        "type": "element",
        "value": 4,
        "target": "all"
      },
      {
        "type": "skillLevel",
        "value": 1,
        "target": "all"
      }
    ]
  },
  "eq_armor_qingma": {
    "base": {
      "physicalDefense": 11,
      "strength": 6,
      "awareness": 2,
      "vitality": 2
    },
    "affixes": [
      {
        "type": "healthRegen",
        "value": 0.2
      }
    ]
  },
  "eq_armor_chentie": {
    "base": {
      "physicalDefense": 36,
      "strength": 18,
      "vitality": 4
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 3
      },
      {
        "type": "healthRegen",
        "value": 0.2
      }
    ]
  },
  "eq_armor_bichen": {
    "base": {
      "physicalDefense": 30,
      "intelligence": 15,
      "awareness": 3,
      "vitality": 4
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 8
      },
      {
        "type": "healthRegen",
        "value": 0.3
      }
    ]
  },
  "eq_armor_houlin": {
    "base": {
      "physicalDefense": 67,
      "strength": 18,
      "vitality": 6
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 4
      },
      {
        "type": "healthRegen",
        "value": 0.3
      }
    ]
  },
  "eq_armor_liufeng": {
    "base": {
      "physicalDefense": 57,
      "intelligence": 21,
      "awareness": 4,
      "vitality": 6
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 10
      },
      {
        "type": "healthRegen",
        "value": 0.4
      }
    ]
  },
  "eq_armor_fushan": {
    "base": {
      "physicalDefense": 106,
      "strength": 27,
      "intelligence": 3,
      "awareness": 5,
      "vitality": 8
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 6
      },
      {
        "type": "healthRegen",
        "value": 0.4
      }
    ]
  },
  "eq_armor_ninglu": {
    "base": {
      "physicalDefense": 90,
      "intelligence": 30,
      "strength": 3,
      "awareness": 5,
      "vitality": 8
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 12
      },
      {
        "type": "healthRegen",
        "value": 0.5
      }
    ]
  },
  "eq_armor_yunwen": {
    "base": {
      "physicalDefense": 149,
      "strength": 36,
      "vitality": 11
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "healthRegen",
        "value": 0.5
      }
    ]
  },
  "eq_armor_shouyi": {
    "base": {
      "physicalDefense": 129,
      "intelligence": 42,
      "awareness": 6,
      "vitality": 11
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 16
      },
      {
        "type": "healthRegen",
        "value": 0.6
      }
    ]
  },
  "eq_armor_humai": {
    "base": {
      "physicalDefense": 81,
      "strength": 30,
      "vitality": 11
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 5
      },
      {
        "type": "healthRegen",
        "value": 0.3
      }
    ]
  },
  "eq_armor_dangyu": {
    "base": {
      "physicalDefense": 69,
      "intelligence": 33,
      "awareness": 5,
      "vitality": 11
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 10
      },
      {
        "type": "healthRegen",
        "value": 0.4
      }
    ]
  },
  "eq_armor_zhenyue": {
    "base": {
      "physicalDefense": 132,
      "strength": 42,
      "vitality": 15
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 6
      },
      {
        "type": "healthRegen",
        "value": 0.4
      }
    ]
  },
  "eq_armor_jingbo": {
    "base": {
      "physicalDefense": 114,
      "intelligence": 48,
      "awareness": 7,
      "vitality": 15
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 14
      },
      {
        "type": "healthRegen",
        "value": 0.5
      }
    ]
  },
  "eq_armor_jinsuo": {
    "base": {
      "physicalDefense": 189,
      "strength": 57,
      "intelligence": 3,
      "awareness": 9,
      "vitality": 19
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "healthRegen",
        "value": 0.5
      }
    ]
  },
  "eq_armor_huilan": {
    "base": {
      "physicalDefense": 165,
      "intelligence": 63,
      "strength": 3,
      "awareness": 9,
      "vitality": 19
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 18
      },
      {
        "type": "healthRegen",
        "value": 0.6
      }
    ]
  },
  "eq_armor_mingche": {
    "base": {
      "physicalDefense": 255,
      "strength": 58,
      "intelligence": 20,
      "vitality": 24
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 10
      },
      {
        "type": "healthRegen",
        "value": 0.6
      }
    ]
  },
  "eq_armor_yuheng": {
    "base": {
      "physicalDefense": 225,
      "intelligence": 84,
      "awareness": 11,
      "vitality": 24
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 22
      },
      {
        "type": "healthRegen",
        "value": 0.7
      }
    ]
  },
  "eq_armor_panshi": {
    "base": {
      "physicalDefense": 172,
      "strength": 72,
      "vitality": 26
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 6
      },
      {
        "type": "healthRegen",
        "value": 0.4
      }
    ]
  },
  "eq_armor_wuyin": {
    "base": {
      "physicalDefense": 150,
      "intelligence": 66,
      "awareness": 10,
      "vitality": 26
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 14
      },
      {
        "type": "healthRegen",
        "value": 0.5
      }
    ]
  },
  "eq_armor_budong": {
    "base": {
      "physicalDefense": 249,
      "strength": 84,
      "vitality": 34
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 8
      },
      {
        "type": "healthRegen",
        "value": 0.5
      }
    ]
  },
  "eq_armor_taisu": {
    "base": {
      "physicalDefense": 219,
      "intelligence": 93,
      "awareness": 13,
      "vitality": 34
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 18
      },
      {
        "type": "healthRegen",
        "value": 0.6
      }
    ]
  },
  "eq_armor_xingmu": {
    "base": {
      "physicalDefense": 336,
      "strength": 111,
      "intelligence": 3,
      "awareness": 16,
      "vitality": 42
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 10
      },
      {
        "type": "healthRegen",
        "value": 0.6
      }
    ]
  },
  "eq_armor_xuansu": {
    "base": {
      "physicalDefense": 300,
      "intelligence": 120,
      "strength": 3,
      "awareness": 16,
      "vitality": 42
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 22
      },
      {
        "type": "healthRegen",
        "value": 0.7
      }
    ]
  },
  "eq_armor_wugou": {
    "base": {
      "physicalDefense": 430,
      "strength": 144,
      "vitality": 48
    },
    "affixes": [
      {
        "type": "attackSpeed",
        "value": 12
      },
      {
        "type": "healthRegen",
        "value": 0.4
      },
      {
        "type": "lowHealthShield",
        "value": 14
      }
    ]
  },
  "eq_armor_chengxiao": {
    "base": {
      "physicalDefense": 390,
      "intelligence": 156,
      "awareness": 20,
      "vitality": 52
    },
    "affixes": [
      {
        "type": "castSpeed",
        "value": 26
      },
      {
        "type": "healthRegen",
        "value": 0.2
      },
      {
        "type": "safeRecovery",
        "value": 0.6
      }
    ]
  },
  "eq_ring_anxi": {
    "base": {
      "magicDefense": 9,
      "strength": 12
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 2
      },
      {
        "type": "critBonus",
        "value": 3
      },
      {
        "type": "skillDamage",
        "value": 1
      }
    ]
  },
  "eq_ring_huyuan": {
    "base": {
      "magicDefense": 33,
      "strength": 18
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 3
      },
      {
        "type": "critBonus",
        "value": 6
      },
      {
        "type": "skillDamage",
        "value": 3
      }
    ]
  },
  "eq_ring_wenmai": {
    "base": {
      "magicDefense": 36,
      "awareness": 3,
      "strength": 15
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 4
      },
      {
        "type": "skillDamage",
        "value": 5
      }
    ]
  },
  "eq_ring_qinglu": {
    "base": {
      "magicDefense": 62,
      "strength": 24
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 4
      },
      {
        "type": "critBonus",
        "value": 8
      },
      {
        "type": "skillDamage",
        "value": 5
      }
    ]
  },
  "eq_ring_wenpo": {
    "base": {
      "magicDefense": 67,
      "intelligence": 27,
      "awareness": 4
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 5
      },
      {
        "type": "skillDamage",
        "value": 6
      }
    ]
  },
  "eq_ring_shoudan": {
    "base": {
      "magicDefense": 98,
      "strength": 33,
      "intelligence": 3,
      "awareness": 5
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 5
      },
      {
        "type": "critBonus",
        "value": 11
      },
      {
        "type": "skillDamage",
        "value": 6
      }
    ]
  },
  "eq_ring_huichun": {
    "base": {
      "magicDefense": 106,
      "intelligence": 36,
      "strength": 3,
      "awareness": 5
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 6
      },
      {
        "type": "skillDamage",
        "value": 8
      }
    ]
  },
  "eq_ring_dingxin": {
    "base": {
      "magicDefense": 139,
      "strength": 36,
      "intelligence": 12
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 7
      },
      {
        "type": "critBonus",
        "value": 14
      },
      {
        "type": "skillDamage",
        "value": 8
      }
    ]
  },
  "eq_ring_changning": {
    "base": {
      "magicDefense": 149,
      "intelligence": 51,
      "awareness": 6
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 8
      },
      {
        "type": "skillDamage",
        "value": 10
      }
    ]
  },
  "eq_ring_xuxi": {
    "base": {
      "magicDefense": 75,
      "strength": 30
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 5
      },
      {
        "type": "critBonus",
        "value": 11
      },
      {
        "type": "skillDamage",
        "value": 6
      }
    ]
  },
  "eq_ring_huming": {
    "base": {
      "magicDefense": 81,
      "intelligence": 33,
      "awareness": 5
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 5
      },
      {
        "type": "skillDamage",
        "value": 8
      }
    ]
  },
  "eq_ring_hanyuan": {
    "base": {
      "magicDefense": 123,
      "strength": 48
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 7
      },
      {
        "type": "critBonus",
        "value": 14
      },
      {
        "type": "skillDamage",
        "value": 8
      }
    ]
  },
  "eq_ring_guizhen": {
    "base": {
      "magicDefense": 132,
      "intelligence": 51,
      "awareness": 7
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 7
      },
      {
        "type": "skillDamage",
        "value": 10
      }
    ]
  },
  "eq_ring_ningyuan": {
    "base": {
      "magicDefense": 177,
      "strength": 53,
      "intelligence": 13,
      "awareness": 9
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 8
      },
      {
        "type": "critBonus",
        "value": 17
      },
      {
        "type": "skillDamage",
        "value": 10
      }
    ]
  },
  "eq_ring_bujing": {
    "base": {
      "magicDefense": 189,
      "intelligence": 66,
      "strength": 3,
      "awareness": 9
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 9
      },
      {
        "type": "skillDamage",
        "value": 12
      }
    ]
  },
  "eq_ring_jingshui": {
    "base": {
      "magicDefense": 240,
      "strength": 63,
      "intelligence": 21
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 10
      },
      {
        "type": "critBonus",
        "value": 18
      },
      {
        "type": "skillDamage",
        "value": 12
      }
    ]
  },
  "eq_ring_weiming": {
    "base": {
      "magicDefense": 255,
      "intelligence": 87,
      "awareness": 11
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 11
      },
      {
        "type": "skillDamage",
        "value": 7
      },
      {
        "type": "dotDamage",
        "value": 12
      }
    ]
  },
  "eq_ring_taihe": {
    "base": {
      "magicDefense": 161,
      "strength": 72
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 8
      },
      {
        "type": "critBonus",
        "value": 17
      },
      {
        "type": "skillDamage",
        "value": 9
      }
    ]
  },
  "eq_ring_guiyuan": {
    "base": {
      "magicDefense": 172,
      "intelligence": 69,
      "awareness": 10
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 8
      },
      {
        "type": "skillDamage",
        "value": 11
      }
    ]
  },
  "eq_ring_shouzhen": {
    "base": {
      "magicDefense": 234,
      "strength": 96
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 10
      },
      {
        "type": "critBonus",
        "value": 20
      },
      {
        "type": "skillDamage",
        "value": 11
      }
    ]
  },
  "eq_ring_chengshen": {
    "base": {
      "magicDefense": 249,
      "intelligence": 99,
      "awareness": 13
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 10
      },
      {
        "type": "skillDamage",
        "value": 13
      }
    ]
  },
  "eq_ring_zhenxin": {
    "base": {
      "magicDefense": 318,
      "strength": 123,
      "intelligence": 3,
      "awareness": 16
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 12
      },
      {
        "type": "critBonus",
        "value": 22
      },
      {
        "type": "skillDamage",
        "value": 13
      }
    ]
  },
  "eq_ring_zhuixing": {
    "base": {
      "magicDefense": 336,
      "intelligence": 126,
      "strength": 3,
      "awareness": 16
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 12
      },
      {
        "type": "skillDamage",
        "value": 15
      }
    ]
  },
  "eq_ring_guyuan": {
    "base": {
      "magicDefense": 410,
      "strength": 156
    },
    "affixes": [
      {
        "type": "critChance",
        "value": 14
      },
      {
        "type": "critBonus",
        "value": 28
      },
      {
        "type": "skillDamage",
        "value": 15
      }
    ]
  },
  "eq_ring_dingwei": {
    "base": {
      "magicDefense": 430,
      "intelligence": 162,
      "awareness": 20
    },
    "affixes": [
      {
        "type": "cooldownReduction",
        "value": 15
      },
      {
        "type": "skillDamage",
        "value": 10
      },
      {
        "type": "formationDamage",
        "value": 12
      }
    ]
  }
})
