# 六阶直立兽首 Boss 母图验收与接入

2026-11-01。用户提供原图，按 scenario-game-assets 检查。静态母图通过；不代表完整动作制作完成。

| 原型 | 母图识别 | 实际位置 | 运行资源 |
|---|---|---|---|
| 震岳犀王 | 犀首鼻角、岩甲、双臂双腿直立，保留兽足 | 第7层第20波 Boss | `cocos-pilot/assets/resources/tower-monsters/rhino.png` |
| 苍鬃牛魔王 | 牛首双弯角、苍灰披鬃、粗壮直立躯干、分蹄及牛尾 | 第8层第20波 Boss | `cocos-pilot/assets/resources/tower-monsters/yak.png` |

两个角色均符合六至八阶“保留兽首与物种特征、躯体趋近人形”的方向。关节、角尖、尾部完整；缩小后仍能区分两族。灰色背景可本地去除，不需要重画。

## 保留与处理

各子目录 `original.png` 保留用户原图，`previous-runtime.png` 保留替换前四足运行图；`extracted-alpha.png` 是原尺寸去背景版，`reference-alpha.png` 为1024透明参考，`size-review.png` 为三种底色的小尺寸检查。`inspection.json` 保存尺寸、边界、哈希和处理记录。

用 `prepare.py rhino` / `prepare.py yak` 本地提取灰底，未调用付费 API，Scenario 成本0。透明运行图256px，Boss显示画布220，脚底锚点0.9；未缩至128再放大。资源meta保留，未改变关卡、属性、技能或奖励。两位现有Boss没有狂暴技能，不为换图追加狂暴。

## 验证

Cocos web-mobile 构建成功。`scripts/verify-humanoid-bosses.cjs` 在编译后的真实渲染器中，使用smoke内存存档，推进各自关卡到第20波，再暂停清理其他视觉对象以对照玩家；并非真实玩家战斗难度测试。UI因进入测试入口显示“演武场”，但实际fixture使用第7/8层TowerRun，报告记录楼层、波次、Boss名称和技能。

`game-review/report.json`：两个分辨率1280×720、844×390下，两个Boss均确认256px贴图、220显示画布、正确名称与六阶标签、暂停稳定、死亡移除与单次击杀记录。人工复核画面主体完整，无明显灰底框，脚底与玩家基线一致。截图 `7-1280.png`、`7-844.png`、`8-1280.png`、`8-844.png`。

相关37项回归通过（spider-lady、monster-scaling、tower-loot、monster-animation、unique-bosses）；运行表生成检查通过。本次只接入静态母图，没有把旧四足动画套到新身体上；移动、攻击、受击和死亡专属序列仍待后续制作与逐动作验收。
