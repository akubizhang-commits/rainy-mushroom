# 撼地熊王 M09 撼岳掀浪（2026-11-09 晚，Meowa 15 积分）

- Meowa V2，参数和猪妖 bite/charge 相同：HD、480p、首尾帧同图、24 帧档、高帧率、不去背、绿底、prompt 不优化。job_f54bd5c8ecd7427291fe879444db77e8，余额 20 → 5（试用积分 11-09 24:00 过期）。
- 参考图复用熊妖行走的 `reference-green.png`。prompt 在 `bear-m09-meowa/prompt.txt`，提交脚本 `run.sh`，日志 `run.log`。
- 原片 `bear-m09-meowa/v1/.../meowa_animation.webp`：640px，73 帧，逐帧在 `raw-frames/`。

## 去掉多余的土块和裂缝
Meowa 没遵守“无土块、裂缝”，第 15–62 帧有黑红色土块和地面裂缝。`clean.py` 按颜色去掉：裂缝颜色约 16/2/5（G/R≈0.15），熊最暗的毛约 21/13/13（G/R≈0.59），所以只删“暗且几乎没有绿色”的区域；再从躯干区域做连通，脱离身体的土块一起去掉。结果在 `clean-frames/`，预览 `clean-preview.png`、`clean-mid.png`。第 28–36 帧（掀起的一瞬间）残留土块和偏色，没有选用。

## 导出（`export.py`）
- 12 帧：windup 4（源帧 6、11、16、22，下蹲插爪），active 2（38、41，双臂前推），recovery 6（44–66，收势）。
- 480 格合成后存 384 格（displayScale 1.25），接在现有帧后面；原有 68 帧坐标和字节都不变，图集 3840×3552 → 3840×3936，共 80 帧。接入前文件在 `export/runtime-before.*`。

## 接入
- `TowerMonsterArt.ts`：熊王技能表加 `M09:'heave'`；M09 也是生效当帧就收势，加进 instant 列表，收势从 active 帧开始播。白名单加 `heave`。改前文件 `TowerMonsterArt.ts.before`。
- 熊王的技能 M04/M07/M09 现在都有动作；熊妖精英的 M02 仍是立绘。

## 验证
- 定向测试 102/102 通过。
- 构建成功，`verify.cjs` 实机 8 组通过（M09 和 M07 × 左右 × 1280/844）。M09 观察到 12 个不同帧，收势从 heave-004 开始，朝向、暂停冻结、死亡清理、存档都正常。截图在 `game-review/`。
- 全量 `npm test`：2398/2399（`npm-test.log`）。唯一失败是 `xianxia-fixed-equipment.test.mjs` 图鉴装备美术缺口（eq_sword_wangshu），和怪物动作无关。

## 已知问题
- 去掉了掀起的一瞬间，下蹲直接切到双臂前推，中间少了过渡。
- 部分帧的脚边可能还有一两个像素的暗色残留。
- 图集 3840×3936，解码后约 58 MiB，未做手机内存检查。
