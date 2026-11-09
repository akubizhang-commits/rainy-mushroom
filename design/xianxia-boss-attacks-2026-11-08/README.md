# 震岳犀王横扫、苍鬃牛魔王重击已接入（2026-11-08，Scenario 20 CU）
两族都复用行走用的已验收母图，没有重画。

| 形态 | 普攻 | job | 视频 asset | 参考 asset | seed |
|---|---|---|---|---|---|
| rhino | sweep | job_RnRKPHCbn4qZGDiR6PgyQHRH | asset_S9iWzosYtJNV2rE7pxicF3uS | asset_xHFnkJEhmdCehpxpxQSjEUEk | 202611084 |
| yak | slam | job_YhtwdwUsVhdhTEwS7YRiWTWb | asset_Z8MZ9Ra8h1oxDtucdvKnoMPc | asset_8RR6aGBxSrQNvXhgcQZb5Aqs | 202611085 |

参数：P-Video 2 Pro、480p、5 秒、首尾帧同图、mode cost、promptUpsampler 关。原片和逐帧在 `rhino/`、`yak/`。

## 参考图
- `fill_green.py` 只填被包住、面积小于 1800px 的绿色空洞：犀王肩颈的去背小洞、拳缝；牛魔王一处 135px 小洞。
- 手臂和身体之间的大块空隙本来就是背景，不填。
- 补前版本 `*-reference-green-holes.png`，标红图 `*-holes.png`。

## 导出（`export.py rhino|yak`）
- 各 20 帧，前摇 9、生效 3、收招 8。
  - 犀王取源帧 20–40 / 40–50 / 50–96。
  - 牛魔王取源帧 16–52 / 52–60 / 60–96。
- 整段用一个缩放，让源片第 0 帧和运行时行走第 0 帧的身高、中心、脚底对齐。
- 牛魔王举拳时超出画布，所以整段收进画布，用 displayScale 1.0097 / anchor [.3553,.9012] 恢复大小和接地点。
- 原有行走帧逐字节保留（犀王 15 帧，牛魔王 16 帧），图集改为 2880²。接入前的运行时文件存为 `<形态>/runtime-before.png/json`。

## 接入（`TowerMonsterArt.ts`，改前副本 `TowerMonsterArt.before.ts`）
- 犀王只在 sweep 时播放 sweep 片段，charge 冲锋仍是立绘。
- 牛魔王在 slam 时播放 slam 片段。
- 两族技能（犀王 M20/M06/M07，牛魔王 M19/M15/M05）都保持原表现。

## 验证
- 定向测试 102/102 通过：犀王、牛魔王测试改为攻击三阶段必须落在对应帧段，犀王 charge 仍是立绘，图集 2880²。
- 构建成功。
- `verify.cjs` 按真实攻击计时测 rhino_boss（第 7 层）和 yak_boss（第 8 层），左右两个方向 × 两种横屏共 8 组通过，每组都播满 20 帧，暂停冻结和朝向也正确。
- 第一次截图有两张拍到了加载画面，就把截图前的等待加长后重拍，8 张都是战斗画面（`game-review/screens.png`）。

## 已知问题
- 犀王前摇时身体转成接近正面。
- 牛魔王下砸时整个身子蹲得很低，头部挡住了身体。
- 真机没有验证。
