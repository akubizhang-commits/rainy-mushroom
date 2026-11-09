# 赤鬃猪妖冲锋（charge）已接入（2026-11-08，Meowa 15 积分）
参数和昨天的 bite 相同：Meowa V2、HD、480p、首尾帧同图、24 帧档、高帧率、不去背、绿底、prompt 不优化。
- job_583de17961ed4cc485355d7f4b1893d5，花 15 积分，余额从 20 降到 5。
- 参考图复用行走用的 `reference-green.png`。prompt 在 `prompt.txt`。
- 原片 `v1/task/meowa_animation.webp`：640px，73 帧。逐帧在 `raw-frames/`。

## 导出（`export.py`）
- 共 20 帧。前摇取源帧 0–18（压低身体、刨蹄），生效取 20–44（低头冲撞、原地快跑），收招取 46–64（急停、挺直）。
- 缩放和对齐方式和 bite 相同；anchor [.5809,.9211]。
- 原有的行走和 bite 共 36 帧逐字节保留，图集改为 8 列，3840×3360（56 帧）。接入前的运行时文件存为 `runtime-before.png/json`。

## 接入（`TowerMonsterArt.ts`，改前副本 `TowerMonsterArt.before.ts`）
- boar-humanoid 的 charge 普攻播放 charge 片段，bite 仍播 bite 片段，M06 仍是立绘。
- 图集校验器的片段名白名单里加了 `charge`（低阶妖猪用的是 `charge-start/loop/end`，不受影响）。

## 验证
- 定向测试 102/102 通过：猪妖测试改为 charge 三阶段必须落在对应帧段，图集 3840×3360、56 帧。
- 构建成功。
- `verify.cjs` 按真实攻击计时测 boar_normal_r4 的 bite 和 charge，左右两个方向 × 两种横屏共 8 组通过，每段都播满 20 帧。charge 测试把怪物放在距离玩家 200 处，满足冲锋触发距离。
- `verify-charge-first.cjs` 先测 charge 再测 bite，用来截取冲锋生效帧（`game-review-charge/zoom.png`）。bite 的截图在 `game-review-bite/`。

## 已知问题
- 图集 3840×3360，未压缩 RGBA 约 49 MiB，现在是怪物动作图集里最大的（低阶妖猪 4096×3072 约 48 MiB）。微信真机的内存还没验证。
- 冲锋生效段只有 3 帧，却要播 0.6 秒，动起来可能显得卡顿。连续播放效果还没看过。
- 真机没有验证。
