# 高阶苍鬃狼妖行走 · 2026-11-05

已接入 wolf-humanoid 专属行走。先核对正式投放：第8层228只、第9层143只，合计371只，含4/5阶普通与精英。复用 `design/xianxia-wolf-humanoid-2026-11-02/reference-alpha.png`，仅本地铺绿；Meowa余额0后Scenario一次生成10 CU，无重试生成、无后台任务。

## 资源与行为

原片 `original-v1.mp4` 为480²/24fps/124帧，原片和全部原帧保留。循环搜索、平移脚底对齐后选16帧，1.833秒，接缝/相邻平均变化比约0.41。原生480px，不逐帧缩放。最终1920²RGBA图集未压缩14.06MiB，按物种共享缓存；透明WebP、GIF及每帧见 `final/`。原母图哈希、选帧、任务和参数分别见production.json、final_outputs.json、request.json。

只在真实位移+普通approach时播放。停止、普通攻击和精英M05各施法阶段保持原表现，暂停冻结，死亡清理。低阶wolf独立图集及啸月狼王不变。高阶普通画布70.4px，精英沿用1.12倍，不改体型、碰撞、伤害、存档和投放；本组高阶狼无正式Boss/狂暴投放，不新增此类机制。

## 验证

- 40项专项通过；独立审查无重要问题，额外检查低阶/高阶同时加载隔离、精英尺寸和缓存销毁。
- Cocos构建通过，907文件固定副本与3份生产文件验收前后哈希一致。
- 四个正式原型×左右×1280×720/844×390，共16组实际引擎夹具通过：真实移动、16帧循环、停止、暂停、攻击及M05回退、名称、死亡单次账本、localStorage不变。普通和精英截图均检查；不是正式波次完整通关验收，未进行微信手机真机验收。
- 标签夹具最初未触发目标血量下降，名称不出现；初始化成残血也不触发已有“观察到掉血才选目标”规则，最终先渲染一次再下降1点血量重跑通过。仅修改夹具，失败报告保留。
- 全仓测试2272项，1948通过/324失败。与上轮相比有4个新失败名称，不能声称无新增失败。其余数量变化不归因本任务。
- 其中3项已单独重现：进化数值、剑罡单次脉冲、被动预算，测试只依赖js玩法模块，不加载本次TowerMonsterArt或动画资源。本轮未修改其玩法代码。第4项`sancai completion spends available route goals without dismantling core or replaying purchases`在复查时当前测试源码已不含该名称，未判定根因；共享工作区存在其他变更。完整证据见tests-full.tap、full-test-comparison.json、unrelated-failures-recheck.tap。未修改无关测试来消除失败。

## 归档

Scenario集合 `col_jdurPWiDHWvjeGe7Bx1sLVxm` 已存参考asset_87AF2wWiZgmFzqAFAAYHviZr、原片asset_aKNjXM4U2N1QCWAGGwYtDSGS、最终图集asset_amMt5dv8hAQFQgV1CRkgLGyz。原片和旧素材不删除。不宣称所有怪物动作已完成。

后续继续优先正式投放的动作缺口；高阶隼妖/虎妖等仍缺移动。妖猿/蝎/蜈蚣未投放，不列当前制作；蟒王等关键帧、M08回旋暂缓。DEBUG_HANDOFF未改：本次没有确认的新游戏渲染缺陷，夹具修正和非渲染回归失败在本报告记录。未Git提交或微信发布。
