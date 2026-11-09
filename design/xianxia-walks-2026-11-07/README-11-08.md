# 蟒王/蛇女、蛛姬、摄魂蝠妖行走已接入（2026-11-08，Scenario 30 CU）
三条都按昨晚备好的请求提交，参数没改（`../xianxia-walks-2026-11-08-prep/`）。参考图复用已验收母图，先补了透明空洞。

| 形态 | job | 视频 asset | seed | 循环窗口 |
|---|---|---|---|---|
| snake-lady | job_vgf9UbB2dCi9SPg67JoAEyZx | asset_fqjFrTZ357sRDdjg3hTcYv4z | 202611081 | 源帧 26 起 61 帧（2.54 秒） |
| spider-lady | job_8FjxAAQLZzVfZwNxP36vMemC | asset_GiXsjaKVs9zafFzYWg3MqoRH | 202611082 | 源帧 59 起 57 帧（2.38 秒） |
| bat-humanoid | job_pti9NSXRpR7FwqQBu7RanuhP | asset_RzSugjr5Kp1VsyjEyt1NLxL5 | 202611083 | 源帧 63 起 38 帧（1.58 秒） |

原片和逐帧在 `../xianxia-<形态>-walk-scenario/`。

## 导出
- 沿用 `export.py`，每族 16 帧、480 格子、1920² 图集，没有帧碰到画布边缘，不需要 displayScale。
- 蛛姬立绘的主体高只有 0.6953（身体横向展开），所以行走按这个高度缩放，没有用其他族的 0.805。

## 接入
- 三族加入行走族，只在实际位移时播放。普攻（蛇女 shot/bite、蛛姬 bite/web、蝠妖 shot/bite）和技能都保持立绘。蛇女的毒息发射点不变。
- 改前副本：`TowerMonsterArt.before-11-08.ts`、`animation.test.before-11-08.mjs`。
- 测试新增三条行走测试。两条旧断言原本要求蛛姬、蛇女不加载动作图集，已改为只加载自己的行走图集；储备的蛛后（spider-queen）仍是立绘。

## 验证
- 定向测试 102/102 通过（`tests-targeted-11-08.tap`），构建成功（`build-11-08.log`）。
- `verify-11-08.cjs` 实机 36 组通过：spider_boss（第 3 层）、spider_normal_r4、spider_elite_f5_w15_n4、snake_boss（第 5 层）、snake_normal_r4、snake_elite_f8_w10_n2、bat_normal_r4、bat_elite_f4_w15_n4、bat_elite_f6_w15_n4，每项都测了左右两个方向和两种横屏尺寸。
  - 检查项：真实位移、16 帧完整循环、暂停、静止和出招回立绘、技能保持立绘、击杀清理、存档不变。
  - 这一批的脚底检查改成比较实际脚底位置。原来的检查比较节点 y，换了 anchor 后节点 y 本来就会不同。
- 截图在 `game-review-11-08/`，总览 `screens.png`。

## 已知问题
- 蛇女的尾尖在循环中段会翘起来。
- 蛛姬腿部动作幅度小，远看像原地抖动。
- 蝠妖迈步时身体偏正面。
- 真机没有验证。
