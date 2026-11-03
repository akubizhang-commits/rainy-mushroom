# 炼气初期武器空档修正

日期：2026-11-03。用户授权直接实施，随后明确纠正：新武器仅放进购买，不放进炼制。本次不调整原有装备、材料掉率或法器门槛。

## 实施结果

新增中品凡器青锋剑（eq_sword_qingfeng）。炼气二层（45修为）可购买和装备，72灵石，分解返28灵石；商店不限量，沿用原有容量和在塔禁止交易规则。没有材料消耗，没有炼制入口，直接调用 craftGear 也拒绝。单件确定产出，不进入机缘抽奖。

固定数值：基础物攻/法攻24/24，力量/智力6/6，神识2；物理/法术伤害各6%，攻速4%，附加伤害2%。沿用攻击浮动显示，因此界面基础物攻/法攻为19～29。装备数量从87增为88，获取目录从39增为40。原87件身份保留。

开局买素问剑；无修为丹、完整清怪的首层第8波结束达到51修为，回宗即可买青锋剑；法器仍需炼气四层225修为。仅靠击杀直推时，在第二层第4波达到225。青锋剑为可选过渡，不要求购买才能晋阶。

## 数据来源

FOUND：TowerEquipmentRoster、TowerEquipmentFixed、TowerForging、TowerEquipmentTiers、TowerInventory、TowerCampaign、TowerRun、TowerCultivationRewards、TowerContent，以及 Cocos TowerMenu。

FOUND：2026-11-01 equipment-fixed-identity 设计、2026-11-03 equipment-integer-budgets 设计；后者已补充凡器中品武器预算，离线生成器可重新生成相同青锋剑。

ABSENT：统一 design/registry/entities.yaml、design/gdd；本轮量化目标来自用户批准的方案。ABSENT：真人操作时长和长期玩家样本，分钟级空档和整体留存改善 NOT ASSESSED — NO DATA。

## 验证

- 专项测试24/24通过：新增武器6项、获取渠道、炼器事务、整数装备。
- 购买：500→428灵石、材料不变、确定发1把；保存失败不扣费，重试、重复请求和读档不会重复发奖。
- 44修为拒绝购买和穿戴；45修为允许；详情准确显示炼气二层。
- 对新武器发起炼制请求返回 invalid-source，状态和磁盘不变。
- 分解28小于买价72，没有买入分解套利。
- 隔离目录运行装备离线生成器成功，生成青锋剑与运行时数值完全一致。
- Cocos web-mobile 构建成功。真实编译页面在844×390、1280×720鼠标点击测试通过，浏览器无异常；商店武器2件，凡器炼制0件。
- 扩展旧测试有158项失败，移除本轮新装备的隔离对照同样158项，失败用例集合一致。未借此改写旧战斗、界面或经济断言；不能宣称全仓测试通过。

同为炼气四层、无其他装备或被动，调用实际 stats/characterCombatAttributes 后，攻击×相应伤害倍率：素问149.320336、青锋165.329472、归燕183.668320（物理和法术相同）。青锋比素问约+10.72%，归燕比青锋约+11.09%。这只比较伤害系数，不是包含命中率、攻速和敌人防御的实战DPS测量。

健康结论：本次确定性换装缺口已补；整体节奏仍需真人体验确认，不宣称全面平衡。

## 美术状态

未生成收费静态素材，未占用其他具名武器的图标。商店用“青锋”文字占位，详情沿用通用武器占位。专属图标待用户提供；见同目录 art-prompt.md。正式素材接入仍须通过 scripts/art/item_icon.py 的125/128主体规则。

## 复验

```sh
node --test tests/xianxia-opening-weapon.test.mjs tests/xianxia-acquisition-channels.test.mjs tests/xianxia-fixed-forging.test.mjs tests/xianxia-equipment-integer.test.mjs
node scripts/cocos/build.mjs web-mobile
node scripts/verify-opening-weapon-ui.cjs
```

截图和UI报告：reports/opening-weapon-2026-11-03/。
