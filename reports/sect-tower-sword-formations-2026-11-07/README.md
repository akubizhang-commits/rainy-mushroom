# 周天剑阵迁移与青莲剑阵：验收报告（2026-11-07）

Worktree: `.worktrees/sect-tower-sword-formations`，分支 `codex/sect-tower-sword-formations`。
状态：未合并，未推送。合并前需要用户决定，见“待用户决定”。

## 提交

功能与验证提交（`git log 3b64a74e..HEAD`）：

- 5a6c20d4 feat(xianxia): 周天剑阵移至炼气中期，新增青莲剑阵于炼气巅峰
- 267d3145 chore(xianxia): 塔模式存档 schema 88 升至 89
- eb984fed feat(xianxia): 青莲剑阵渲染、图标与镜像同步
- 4b37e55d test: 更新青莲剑阵的技能数与消耗期望
- 3ccb49ac docs(xianxia): 青莲剑阵状态报告、平衡对照与证据路径
- 8db4cd47 docs(xianxia): 记录青莲剑阵报告所需的无头启动排查
- d2f3db0e docs(xianxia): 记录 tower-status-icons 加载失败的根因与平衡范围
- 922e9586 fix(xianxia): 去掉技能徽章中未定义的 bonus 项（功法页空白）
- 615e83cc docs(xianxia): 记录功法页根因与最终验证
- 13bcad75 docs(xianxia): 主线验证与青莲剑阵三方平衡
- 5cedb446 test(xianxia): 实机验证青莲剑阵与周天剑阵移动，并完成 8×3 平衡

基线提交 3b64a74e 是把主检出的未提交工作区打包成的一个提交（3152 个文件）。
这不是批准的基线 fb03ce48。见“待用户决定”第 1 项。

## 设计结果

- 周天剑阵（sj_wanjian）：从炼气巅峰迁到炼气中期，解锁等级 7 → 4。数值与机制不变（冷却 6 秒、持续 4 秒、剑数 4–8、同目标间隔 0.6 秒）。
- 青莲剑阵（sj_qinglian）：炼气巅峰，解锁 7 级，主动技能，属剑阵流派。
  - 冷却 9 秒，法力 8，同目标间隔 0.5 秒，目标上限 6。
  - 三层判定环：内 4 剑 / 中 6 剑 / 外 8 剑；半径 90 / 150 / 200 像素（约 0.6m / 1.2m / 2.0m）；伤害份额 20% / 35% / 45%。
  - 整招预算不随层数增加，每招最多两次脉冲（0 秒与 0.5 秒）。
  - 不减速。
  - 视觉瓣数 8 / 12 / 16，只有偶数序号瓣参与判定，外层透明度低于内层。

## 测试

全量 `node --test tests/*.test.mjs`：

| 运行 | 测试数 | 通过 | 失败 | 输出文件 |
|---|---|---|---|---|
| 基线 3b64a74e | 2389 | 2286 | 103 | baseline/full-tap.txt |
| 最终 5cedb446 | 2399 | 2367 | 32 | full-tap-final.txt |

- 最终运行的 32 个失败名称全部出现在基线的 103 个失败名称中。新增失败为 0。
- 保留的既有失败仍需在后续步骤处理。
- 存档测试：`tests/xianxia-tower-campaign.test.mjs` 检查旧版本存档只重置塔模式的存档键，其他键不变，并且只写一次。

## 构建

- `node scripts/cocos/build.mjs web-mobile`：退出码 0。
- 日志：build/web-mobile.log，包含 `build Task (web-mobile) Finished`，`error TS` 为 0 行。
- 另有两份较早的构建日志在 build/ 下，分别用于完整资源和重跑；它们没有出现完成行，只作为历史保留。
- 镜像同步 `scripts/cocos/sync-shared.mjs` 可重复运行，结果一致。

## 平衡

同一个矩阵有三类对照文件：

- balance/comparison.md：自然路线 harness，改动前后的逐层结果（qi、array、formation 等路线）。
- balance/comparison-2026-11-07.md：8 层 × 3 流派（qi、formation、yujian）的 `verify-monster-mechanics-balance.mjs` 改动前后对照，fixture 为 entry 模式。
- balance/comparison-vs-2026-11-06-2026-11-07.md：与 `reports/skill-school-curve-2026-11-06/` 的逐格对照。

与 2026-11-06 的对照结论：**两者不是同一口径，不能作为平衡通过依据。**
- 2026-11-06 使用 move/half 两种模式，楼层 2–9，种子 101 与 211。其生成脚本不在仓库中。
- 本次矩阵使用 entry 模式，楼层 1–8，种子 101、211、307、401，fixture 固定。
- 2026-11-06 的 move 模式在三个流派的所有楼层都胜，击杀数按楼层相同，不区分流派。

改动前后（同一 entry 矩阵）的主要变化：

- 纯剑阵（formation）第 3 层：改动前 0/4，改动后 4/4（中位 764 秒）。
- 纯剑阵第 5 层：中位 1125 秒降到 829 秒。
- 其他格（qi、yujian，以及 formation 的第 2、4、6–8 层）与改动前一致。

**第 4 层纯剑阵仍失败。** 改动前后都是 0/4。改动后为 timeout 3 次、lost 1 次。按约定没有调数值，等待用户决定。

## 实机验证

- 结果文件：live/live-results.json，`status: "PASS"`，`errors: []`。
- 视口：1280×720 与 844×390。
- 学习门槛：周天 Lv3 不可学、Lv4 可学；青莲 Lv6 不可学、Lv7 可学。
- 冷却：周天 6 秒；青莲 9 秒（两个视口的记录一致）。
- 青莲脉冲：两个视口都在施放后约 0.8 秒和 1.3 秒出现第 1、2 次脉冲，第二次施放后约 9.8 秒和 10.3 秒。
- 暂停与恢复：两个技能都能暂停并恢复（phase 从 paused 回到 playing）。
- 死亡与退出：两个技能在死亡后区域数为 0，运行结束，回到营地界面。
- 录像：live/video-learn-*、live/video-sj_wanjian-*、live/video-sj_qinglian-*（各视口一个目录，内含 webm）。
- 截图：live/learn-*.png、live/sj_wanjian-{cast,paused,after-resume,death,exit}-*.png、live/sj_qinglian-{cast,paused,after-resume,death,exit}-*.png。
- 注意：这次实机检查依赖 tower-status-icons 与 tower-skill-icons 中的未提交资源（见下）。
- 未验证：每次判定的单招预算没有完全隔离，普攻会干扰伤害归因。

## 存档

- 版本号：schema 89。
- 旧版本（88）存档被重置时，只替换塔模式存档键。其他键保持不变，没有额外写入。
- 证据：`tests/xianxia-tower-campaign.test.mjs` 中的测试。live-results.json 不包含存档重置段落，因此实机检查不作为存档证据。

## 待用户决定

1. **分支基线**：分支从 3b64a74e 开始，而不是批准的 fb03ce48。3b64a74e 包含主检出的 3152 个未提交文件。请决定接受该基线，或把工作区内容单独落地，然后按 fb03ce48 加功能提交重建分支。
2. **未跟踪资源**：tower-status-icons/*、tower-skill-icons/sj_moon*.png、sj_sancai.png 等（约 370 个文件）未被 git 跟踪。干净检出启动时会停在“画面未能载入”。这些文件是否纳入本分支提交，请由用户决定。在决定前，干净检出的启动与实机结果都无法复现。
3. **主线状态**：codex/crafting-minigames 的 reflog 显示有 d18fbd0f、7a2bb33f（合并本分支）、8cb05702、3213c983、cf4f36b9、e060c191 以及若干 cherry-pick，主检出 HEAD 为 8b07bacb。任务记录中没有对应的批准。请确认是否获批。在决定前，不推送、不再合并或改写该分支。
4. **平衡对照方式**：与 2026-11-06 的 cell-by-cell 对照已做，但口径不同，不能直接判定。请决定是否接受 entry 矩阵作为依据，或另行提供 2026-11-06 的 harness。
5. **第 4 层纯剑阵**：仍为 0/4，等待决定是否调数值。
6. **脉冲重绘**：每次判定的 0.25 秒效果会在剑阵本体上重画一遍莲瓣，形成约每 0.5 秒一次的亮度峰值。在录像中还没有确认是否明显。若明显，可只保留扩散环的闪光。

## 合并建议

暂不合并。先解决第 1、2、3 项。通过后，在 `codex/crafting-minigames` 上由用户决定 merge 方式（通常是 fast-forward 或 merge commit）。
