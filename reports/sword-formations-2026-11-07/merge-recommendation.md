# 合并建议：codex/sect-tower-sword-formations 到 codex/crafting-minigames（2026-11-07）

结论：不能用 `git merge --ff-only`。两条分支已经分叉，必须先由你选择合并方式（见“是否可以 ff-only”）。本建议不执行合并，也未推送。

## 分支与提交

- 分支：`codex/sect-tower-sword-formations`
- 写本报告前的分支头：`812307c7bba6bee8008cff0fe90640c8b33ee047`（提交 `chore(xianxia): track 周天/青莲 runtime assets and live evidence`）
- 本报告所在提交是新的分支头。
- 主检出：`/Users/zhangnu/WeChatProjects/rainy-mushroom`，分支 `codex/crafting-minigames`，HEAD `8b07bacb8208002a32cc977e58d4305089d7e33c`。
- 合并基点（与主线的 merge-base）：`8db4cd47`。

自 `fb03ce48` 起，分支共 24 个提交（最早一个是 `3b64a74e` 基线打包提交）：

```
812307c7 chore(xianxia): track 周天/青莲 runtime assets and live evidence
00fe6e4c docs(xianxia): add 周天/青莲剑阵 design and acceptance record
83cfda45 docs(xianxia): record real-browser checks for 周天/青莲剑阵 at 1280x720 and 844x390
c844047e docs(xianxia): rerun 8x3 school curve before and after 周天/青莲 change
c09a164a docs(xianxia): record full test results and save migration evidence
489b808e fix(xianxia): hold spider death pose until cleanup
b899478f test(xianxia): keep sword rift above monster warnings per user decision
9ffa8ab0 fix(xianxia): measure per-frame hoof anchors for boar charge frames
2b8dc47f test(xianxia): match icon-only first-clear reward rows in tower entry test
e0edf0e8 test(xianxia): stub targetDebuffIcons in material feedback fixture
77ecebec docs(xianxia): record user decisions for 青莲 report and isolate floor 4 pure-sword
10fb6b6c docs(xianxia): correct 青莲 report status and add 2026-11-06 cell comparison
5cedb446 test(xianxia): verify 青莲剑阵 and 周天 move in the live game and 8x3 balance
13bcad75 docs(xianxia): mainline verification and three-way balance for 青莲剑阵 handoff
615e83cc docs(xianxia): record skill page root cause and final verification
922e9586 fix(xianxia): remove undefined bonus term from skill badge (blank skill tree)
d2f3db0e docs(xianxia): record tower-status-icons root cause of load failure and balance scope
8db4cd47 docs(xianxia): record headless boot investigation for 青莲剑阵 report
3ccb49ac docs(xianxia): 青莲剑阵 status report, balance comparison and evidence paths
4b37e55d test: update skill count and cost expectations for 青莲剑阵
eb984fed feat(xianxia): 青莲剑阵 renderer, icon and mirror sync
267d3145 chore(xianxia): bump tower campaign save schema 88 to 89
5a6c20d4 feat(xianxia): move 周天剑阵 to 炼气中期 and add 青莲剑阵 at 炼气巅峰
3b64a74e chore(xianxia): baseline of uncommitted tower working state (source, tests, scripts, docs, balance report)
```

## 差异统计

- 相对 `fb03ce48`：3690 个文件，+6118504 / -4667。这包含基线提交 `3b64a74e` 打包的 3152 个未提交工作文件（依据 `reports/sect-tower-sword-formations-2026-11-07/README.md`），数字偏大。
- 相对主线 merge-base `8db4cd47`：485 个文件，+632784 / -133。这是合并真正会引入的改动量。

## 测试与验证结果

- 全量测试（`tests/tests.md`，代码 HEAD `489b808e`）：2399 个子测试，2398 通过，1 失败。唯一失败是基线已有的 `encyclopedia shows fixed stats, unique quality and explicit art gaps`。报告称新增失败为 0。
- 构建（`build.log`）：`npm run cocos:build`（web-mobile），`EXIT=0`。
- 真实浏览器（`browser.md`，1280×720 与 844×390，炼气中期与炼气巅峰各一段）：可学习门槛、冷却、暂停与恢复、死亡结束、离开战斗清除均通过。周天与青莲都有实际判定记录。
- 平衡（`balance/comparison-3way.md`、`balance/comparison-2026-11-07.md`）：文件中没有 `before-after.md`，使用上述两份代替。纯剑阵第 3 层从 0/4 变为 4/4；纯剑阵第 5 层中位数从 1125 秒降到 829 秒；其他格与改动前一致。
- 存档（`tests.md` 第 5 节）：schema 88 的塔档重置为 schema 89，只改写 `xianxia.sect-tower.campaign.v1` 键，其他游戏与账户键不变。正常存读、原子失败、重复领奖的 9 个既有测试全部通过。证据脚本 `migration-evidence.mjs` 在任务目录中，未入库。

## 未解决事项

1. **分支与主线已分叉，不能 ff-only**（见下节）。
2. **测试数字前后不一致。** `reports/sect-tower-sword-formations-2026-11-07/README.md` 写的是旧运行（5cedb446）：2367 通过、32 失败、基线 103 失败。`tests.md` 写的是较新的运行（489b808e）：2398 通过、1 失败、基线 166 失败。两份报告都称新增失败为 0。以 `tests.md` 为较新结果，但两个基线数字不一致，未解释。
3. **青莲剑阵位置判定与效果记录不一致。** 浏览器脚本的位置判断在 15 个活跃采样中命中 0 次，而游戏效果记录显示 9 次判定、20 个目标命中。原因未查明，报告以效果记录为准。
4. **第 4 层纯剑阵仍为 0/4**，数值未调，等待你决定。
5. **蜘蛛死亡姿势保持 1.5 秒**是默认值，你没有指定。现有帧 `hit-000` 不是正式死亡帧。
6. **剑阵脉冲重绘的亮度峰值**尚未在录像中确认是否明显。
7. **不在本分支的文件：** `scripts/__pycache__/build-tower-content.cpython-314.pyc` 是被跟踪的构建缓存，显示为已修改，未提交；`reports/equipment-integer-v2-2026-11-03/two-slot-budget.json` 属于装备报告，未提交。因此 worktree 的 `git status --short` 不是空的。
8. **主检出有 7768 个未跟踪文件，没有已修改的被跟踪文件。** 本步骤未改动主检出。

## 是否可以 ff-only

不可以。主线 `8b07bacb` 不是分支的祖先。原因：

- 主线先通过 `7a2bb33f` 合并过一次该分支，之后又多了 11 个提交。
- 分支有 17 个主线没有的提交。按补丁内容比较，其中 13 个补丁不在主线上，其余 4 个已经在主线上。

因此只能做真正的三方合并（生成合并提交），或先把分支变基到主线再快进。两种方式都会改变其中一条分支的历史，需要你选择。

另外一个阻碍：`cocos-pilot/assets/resources/tower-status-icons.meta` 在主检出中是未跟踪文件，内容与分支中的文件相同。合并时 git 会因“未跟踪文件会被覆盖”而拒绝。除此之外，分支新增的 372 个资源文件中，371 个与主线已跟踪的文件字节相同，不会冲突。

## 建议

- 不要直接执行 `--ff-only`，它会失败。
- 如果要合并，建议在主检出删除（或先备份）未跟踪的 `tower-status-icons.meta`，再执行一次普通合并（`git merge --no-ff codex/sect-tower-sword-formations`），并确认结果。
- 上面第 2、3、4 项需要在合并前由你确认是否可以接受。
