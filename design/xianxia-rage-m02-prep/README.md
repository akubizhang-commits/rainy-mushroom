# 狂暴 M02 发动动作：Scenario 请求（已备好，未提交）

2026-11-21 晚备料，按建议在 2026-11-22 08:00（北京时间）额度刷新后再提交。今晚没有提交任何生成。

| 请求 | 形态 | 技能 | 参考图（本地绿幕） | seed |
|---|---|---|---|---|
| crocodile-humanoid-m02-request.json | 伏潭鳄王（Boss） | M02 狂暴 | design/xianxia-crocodile-humanoid-walk-scenario/reference-green.png | 202611201 |
| white-tiger-m02-request.json | 镇魇白虎（Boss） | M02 狂暴 | design/xianxia-white-tiger-walk-scenario/reference-green-v2-filled.png | 202611202 |
| bear-humanoid-elite-m02-request.json | 熊妖精英 | M02 狂暴 | design/xianxia-bear-humanoid-side-2026-11-13/reference-green.png | 202611203 |

合计 30 CU（每条 dry run 10 CU），与 Scenario 每日 50 CU 额度相符，剩余 20 CU 留给同日的其他确认动作。

## 提交前必须完成
1. 上传三张参考图，把返回的资产 ID 填入对应 JSON 的 `image` 和 `lastFrameImage`（首尾帧同图），并在 `uploadedImageAsset` 记录。
2. 先查 `scenario::usage`，确认当天未用额度；并发上限 2，按顺序提交。
3. 返回的 job 和 asset ID 原样记录到本目录。

## 设计约束（65 号标准）
- 动作不含红色、光效或能量。发动完成后的变红、Boss 基础体型 ×1.2 由游戏端处理，不在素材里烘焙。
- 发动动作需要在真实游戏中验收：前摇、发动完成、狂暴全程保持、到期、暂停、读档、死亡。
- 生成结果只作为素材候选，未经审核不接入。

## 2026-11-22 结果
- 第一窗口（30 CU）：鳄王 v1 偏棕、白虎 v1 变色，均未通过；熊妖精英片段可用，但熊妖图集归另一会话，未接入。
- 第二窗口（20 CU）：白虎 v2（禁止变色提示词）与鳄王 v2（游戏内原参考图重排版 v4）通过，导出到 `design/xianxia-rage-m02-2026-11-22/`，接入 `white-tiger-v1` / `crocodile-humanoid-v1` 的 `enrage` 片段并映射 M02。
- 真实游戏验收：`node scripts/verify-rage-m02-2026-11-22.cjs`，截图与报告在 `design/xianxia-rage-m02-2026-11-22/game-review/`。前摇播完 12 帧且不变红不放大；发动后变红 ×1.2，保持 15 秒；到期恢复；暂停冻结；击杀后倾倒淡出并移除。
- 所有原视频、拆帧和未通过版本均保留。
- 熊妖精英（铁掌，第6层）M02 已接入：原图集 3840×3936 放不下，新增 x=3840 的 256 像素侧列（图集宽 4096），旧帧位置和像素不变；真实游戏验收同上，通过。
- 同时修正尺寸问题：运行时按 bodySize×displayScale 设置精灵尺寸，与格子像素无关；11-09 起的导出器把小格（384/320）额外乘了 480/格宽，导致技能动作开始时比行走大 1.25 倍（犀牛 1.5 倍）。已把 11 个图集的小格 displayScale 乘回 格宽/480，技能首帧与行走首帧的高度比回到 0.94–1.05。
