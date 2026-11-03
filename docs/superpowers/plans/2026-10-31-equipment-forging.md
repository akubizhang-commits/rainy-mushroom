# 炼器系统 Implementation Plan

> 使用 superpowers:executing-plans 在当前会话连续实现；用户已批准设计并明确要求开发，无需再次批准。

**Goal:** 落实名称独占、确定炼制、购器和器材掉落。
**Architecture:** 纯JS共享配置和Campaign事务，Cocos横屏双栏界面；沿用当前素材，新增图只交付prompt。
**Tech Stack:** JavaScript、Cocos TypeScript、node:test。
**Spec:** docs/superpowers/specs/2026-10-31-equipment-crafting-and-material-drops-design.md

## Global Constraints
- A24/B23/C24；A/B品质1—3，C1—4；141配方、69商品。
- 不付费生成素材、不清理其他工作；在当前包含未提交游戏源码的工作目录接续，不从缺失当前源码的HEAD另建工作树。
- 横屏；保留原素材；当前模式存档升级，不操作其他模式。

## Review Focus
- 旧抽奖入口绕过渠道：配置与生成器共同过滤。
- 保存失败、请求重试、旧窗口：Campaign统一事务和序列回执。
- 材料总类数超过旧11项上限：动态白名单与汇总校验。
- 材料缺口跳转/小屏滚动：两栏裁切和底部操作常驻。
- 开局两件上品、分解套利：实际价格检查和报告，不假装实机通过。

## Tasks
- [x] 1. 新建TowerEquipmentSources.js、TowerForging.js、TowerForgeMaterials.js；测试渠道完整与141实例合法；修改生成器渠道池及合法品质。
- [x] 2. Profile材料注册、TowerMaterialLoot掉落与Campaign craftGear/buyGear事务、序列回执及版本；测试失败原子性、来源限制、重试与存读。
- [x] 3. TowerMenu炼制/购器/抽奖页与背包/图鉴来源；复用场景、物品表现，不生成付费图。
- [x] 4. 新材料prompt包、10000种子/层掉落经济检查、专项测试与Cocos构建、横屏操作验证、独立审阅。

## Execution ledger
- 已批准设计；素材未提供前用明确材料名称和现有通用物品显示承载功能，最终10图待用户生成后替换，不伪称新图完成。

- 实施完成：共享配置、Campaign事务、Cocos工坊、背包/图鉴、prompt包和独立审阅。
- 验证：常用web-mobile构建与双横屏实际操作通过；完整平衡及真机性能保留未评估项，见验收报告。
- 旧测试同步：抽奖名称总数改为24，材料总数21；旧装备测试灵器门槛5400/19级更正为当前已实现6601/21级，未修改游戏境界公式。
- 实机和新材料最终原画不声称已交付；用户授权只出prompt。
