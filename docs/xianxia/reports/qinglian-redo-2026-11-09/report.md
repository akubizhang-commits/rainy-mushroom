# 青莲剑阵重做：阶段报告（2026-11-09）

## 状态

已完成：判定运行时、存档 schema、镜像同步、测试更新、素材layer抠图、Cocos web-mobile 构建。
未完成：
- 静态透明层（`qinglian-vortex-layer-v1.png`、`qinglian-pool-v1.png`）已生成并复制到运行时资源目录，但 Cocos 渲染尚未加载它们。
- 平衡复跑（qi / formation / yujian / qinglian 前后对照）未运行。
- 浏览器实机录像与截图未采集，`scripts/verify-qinglian-live.cjs` 尚未按新规格更新。

## 已实现的规格

- 冷却 9 秒、法力 8、解锁等级不变。
- 持续 3 秒，每秒一轮，判定次数 3。
- 每轮只判定一个环：第 1 轮外层 16 瓣（20%），第 2 轮中层 12 瓣（35%），第 3 轮内层 8 瓣（45%）。单瓣伤害 = 环占比 ÷ 瓣数。
- 旋转顺时针，内层 10.05 rad/s，中层 8.17 rad/s，外层 6.6 rad/s。外层的 6.6 rad/s 超过一整圈（2π），因此每瓣每轮必然扫过范围内的目标。
- 目标数不限（`target_cap` 为 null）。同一目标三轮合计 36 次命中，伤害合计为整招预算。
- 存档 schema 由 89 改为 90，仅影响塔模式存档，旧档按开发期约定重置。

## 规格冲突与采用的做法（需用户确认）

1. 原三环半径为 90/150/200。同一目标要获得 36 次命中，三环都必须覆盖目标，因此三环统一为半径 200，环之间的区别只在瓣数、转速与透明度。这改变了视觉上的分层。
2. 判定剑从阵眼辐射到 200，不再是 0.35R 起点的透镜。
3. 参考图的环是透视椭圆，判定为俯视圆。参考图只抠出静态底层，不参与旋转和判定。
4. 三轮判定按一秒一轮进行。每瓣判定只看它在本轮内能否扫过目标方位，超过一圈仍只计一次。

## 测试

- `node --test tests/xianxia-tower-skill-forms.test.mjs tests/qinglian-formation-art.test.mjs tests/xianxia-tower-stage-growth.test.mjs tests/xianxia-skill-point-budget.test.mjs tests/xianxia-tower-skill-presentation.test.mjs`：161 通过，0 失败。
- 全量 `npm test`：2401 个测试，2400 通过，1 失败（"encyclopedia shows fixed stats…"，基线已知失败）。基线为 2399 个测试、2398 通过、1 失败。新增失败为 0。
- `npm run cocos:build`：成功（web-mobile），日志 `cocos-pilot/temp/pilot-builds/web-mobile.log`。
- `npm run cocos:test`：6 通过，0 失败。

## 素材

- 脚本：`scripts/art/qinglian_vortex_layer.py`（PIL 13.0.0）。背景实测中位数为 RGB(75,75,74)，与计划中的 70 不同，已按实测使用。
- 输出：`design/xianxia-qinglian-2026-11-09/processed/qinglian-vortex-layer-v1.png`、`qinglian-pool-v1.png`、`qa-on-dark.png`。
- 参考原图 sha256 `8c5bd7025457571f0e6660e7f6ac9ba24126f42c166d7700d079300b7eacde1e`，运行后未改动。
- 未调用 Scenario。

## 未覆盖的风险

- 每瓣对同一目标各结算一次，因此每次命中都会单独经过防御计算。群怪场景的伤害会高于旧版（旧版上限为 6 个目标，且每目标只结算一次），平衡数据须跑完后才能给出数字。
- 命中反馈强度由 0.6 降为 0.35，以免 36 次命中过于频繁。
