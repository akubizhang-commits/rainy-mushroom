# 青莲剑阵重做：浏览器实机验证

- 分支：codex/qinglian-redo-2026-11-09（基线 e5b65c59）
- 运行时：js/xianxia 最后一次改动为 9607eaff；构建产物为 `npm run cocos:build` 生成的 cocos-pilot/build/web-mobile
- 验证脚本：scripts/verify-qinglian-live.cjs（输出目录已改为 browser/）
- 运行命令：`node scripts/verify-qinglian-live.cjs`，结果 PASS，无页面错误
- 原始数据：browser/live-results.json；运行日志：browser/live-run-log.txt
- 浏览器：Playwright chromium headless shell（~/Library/Caches/ms-playwright/chromium_headless_shell-1247）
- 视口：1280×720 与 844×390，均为横屏，均在同一构建上运行

## 检查结果

| 检查项 | 结果 | 依据 |
|---|---|---|
| 解锁门槛（炼气七层巅峰才可学） | 通过 | 两个视口均为：Lv6 学习失败，Lv7 学习成功；browser/learn-1280x720.png、learn-844x390.png |
| 施放后持续 3 秒 | 通过 | 每轮的 zoneSeconds 为 3；browser/live-results.json pulseLog |
| 每秒一轮（3 轮） | 通过 | 两次施放的轮次时间均为 0.783 / 1.783 / 2.783 秒（施放后的游戏时间），两个视口一致 |
| 顺序：外层 → 中层 → 内层 | 通过 | 每轮的每目标命中数为 16 → 12 → 8；第 1 轮对应外层（16 瓣）。以命中数识别环，不是直接读取画面上的环 |
| 内层快、外层慢 | 通过（静态几何） | 角速度为内层 10.05、中层 8.17、外层 6.6 rad/s，顺时针；由 forms.qinglianPetalPose 计算，未从画面测量 |
| 无目标上限 | 通过 | 10 个射程内目标在每一轮都被命中，没有截断 |
| 同一目标 36 次命中 | 通过 | 每次施放，每个射程内目标的命中为 16 + 12 + 8 = 36；两次施放共 72（hitsWholeWindow） |
| 射程外目标不受伤 | 通过 | 距离 262 的目标命中 0 次，伤害 0 |
| 冷却 9 秒 | 通过 | 两个视口的冷却间隔均为 9 秒（cooldownIntervals [9]） |
| 暂停冻结 | 通过 | 暂停时游戏时间 0.8167 不变，持续 1.2 秒真实时间；轮次编号也不变。browser/sj_qinglian-paused-1280x720.png、paused-844x390.png 显示暂停面板 |
| 恢复 | 通过 | 恢复后 phase 为 playing，时间继续推进；browser/sj_qinglian-after-resume-*.png |
| 死亡 | 通过（人工触发） | 脚本把玩家 hp 置 0 并推进一帧，phase 变为 lost，区域清空。这不是真实战斗中的死亡，只验证了结算路径 |
| 退出清理 | 通过 | 退出后 screen 为 camp，run 已清空；browser/sj_qinglian-exit-*.png |
| 页面错误 | 通过 | 无 pageerror |
| 画面中环的旋转与外层先展开 | 无法验证 | 只看了静态截图（sj_qinglian-cast-1280x720.png 显示施放瞬间的敌人与人物，环的细节不易辨认），未逐帧检查录像。录像在 browser/video-sj_qinglian-*/ |

## 与规格不符或需要说明的地方

1. 伤害分布。每个射程内目标的伤害合计约 2358.99（两次施放），与 36 次命中与预算一致。距离 25 的目标多出 556.77（合计 2915.76）。脚本只统计青莲的命中次数，两次施放都是 72 次，所以这部分差额不来自青莲的轮次判定。我推断是玩家的普通攻击优先打最近的敌人，但没有单独计量，这一点未经验证。
2. 死亡由脚本注入生命值为 0 触发，不是战斗中自然死亡。
3. 运行时实现中，每瓣在每一轮最多命中同一目标一次。这与规格"每一瓣对同一目标各结算一次"一致。
4. 没有发现与规格不符的运行时行为。规格未改动。

## 平衡复跑

- 数据：balance/before-after.md、balance/group-before.json、balance/group-after.json。
- 这些"后"数据生成于 2026-11-09 11:56 至 12:04，之后 js/xianxia 没有改动（最后改动为 9607eaff），因此沿用，没有重跑。
- 群怪场景（10 个目标全部在 200 px 内，6 层，7 级，1 阶）：单目标伤害 1556.3 → 1556.4，基本不变；10 目标总伤害 7538.2 → 13260.9，约 +76%。取消目标上限后，群怪伤害随命中目标数线性上升。按用户要求，本次不调数值。
- 逐层对照（2–9 层 × 3 流派，每层 4 局）：qi 与 yujian 不变。qinglian 流派中，3 层胜场 2 → 3，6 层受伤 1033.5 → 1475.7，8 层受伤 5001.8 → 3924.8。详见 balance/before-after.md。

## 产物

- browser/：sj_qinglian 与 sj_wanjian 的施放、暂停、恢复、死亡、退出截图，学习截图，视频（video-*/），live-results.json，live-run-log.txt
- build-web-mobile-final.txt：构建日志，构建成功
- full-test-final.txt：全量测试，2403 项，2402 通过，1 失败（encyclopedia shows fixed stats…，与基线相同，基线 baseline/fail-names.txt，不计入新增）
