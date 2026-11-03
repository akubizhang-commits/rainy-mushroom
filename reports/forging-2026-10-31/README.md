# 炼器实现与验收记录

## 已接入

- 71件非初始装备按名称完全独占：24炼制专属、23可买可炼、24抽奖专属；3初始装备保留。
- 141配方、69商品，固定属性与品质，最高上品；全部极品仅来自抽奖集合。旧抽奖接口同步过滤。
- 10种器材，普通怪独立器材槽、精英/Boss固定主材及Boss凝灵晶；与炼丹和原灵石掉落分开抽样。
- Campaign统一制作/购买事务：存档失败回滚、持久化序列回执、重试去重、过期窗口拒绝、容量限制；制作/购买不消耗抽奖RNG。
- 炼器峰增加炼制/购器/抽奖入口；双栏滚动、固定品质、批量1—10件、材料来源跳转、背包材料分类及用途、装备图鉴渠道。
- 存档schema提升至26，旧版本仅重置本模式存档，按已确认开发约定执行。测试均使用隔离存档。

## 验证结果

- `regression.tap`：163/163通过（炼器、材料、装备属性与渠道、Campaign、炼丹、背包、图鉴）。
- `ui/ui.json`：844×390、1280×720，真实编译Cocos＋鼠标操作，制作、购买、双击只扣一次、材料详情、来源跳转、抽奖入口均通过，无页面脚本错误。最后一次使用常用 `/cocos-pilot/build/web-mobile`。
- `npm run cocos:build`：最终常用web-mobile构建成功；过程独立输出保存在本目录build下。实际默认构建包含相同最终修改。
- `balance.json`：9层各10000种子，主材与凝灵晶数量、五种通用器材分布通过；最便宜制作→分解净损失10贡献，无该项套利。
- 自然流程：四种装备策略各3次入塔；自炼另延长至8次，进入金丹、通关第6层。均不改角色HP/XP、不送装备或货币；机器人移动策略不是人工体验。
- 8次自炼首次记录筑基于模拟1605.284秒、金丹3187.169秒。未覆盖所有策略完整通关，不宣称整体平衡健康。
- 独立代码审阅后修复快速双击重复新提交；实际截图发现的Set转译显示问题已修复，并加入浏览器断言。
- 旧回归测试同步了新抽奖池数量、21种材料，以及此前已实现的灵器21级/6601修为门槛和十层境界参考值；没有为通过旧测试修改游戏境界/战斗预算。

早期 `extended-regression.tap`、`alchemy-regression.tap` 等为中间检查记录；最终判断以 `regression.tap` 和 `ui/ui.json` 为准。

## 素材与剩余限制

- `design/forging-materials/prompts.md`：10种材料逐张完整prompt、统一风格和透明PNG接入规范。
- 本轮没有Scenario/Meowa付费生成。新材料最终原画尚未生成；背包通过材料名称和通用图形承载，现有装备/场景继续复用。
- 收到新图后仍需裁切、125px主体、alpha检查和真实格子验收，不能把prompt包称作已完成原画。
- 桌面浏览器横屏通过，不代表微信移动真机60FPS；真机性能未测。
- 开局两件上品、高阶齐套速度、低层刷凝灵晶效率留待实玩；详见 `design/balance/balance-check-forging-2026-10-31.md`。

## 复验

```sh
node --test tests/xianxia-forging.test.mjs tests/xianxia-material-loot.test.mjs tests/xianxia-tower-equipment.test.mjs tests/xianxia-equipment-eight-tiers.test.mjs tests/xianxia-library.test.mjs tests/xianxia-alchemy.test.mjs tests/xianxia-tower-weapons.test.mjs tests/xianxia-tower-equipment-campaign.test.mjs tests/xianxia-tower-inventory.test.mjs
node scripts/verify-forging-balance.mjs
npm run cocos:build
FORGING_BUILD_ROOT=/cocos-pilot/build/web-mobile node scripts/verify-forging-ui.cjs
```
