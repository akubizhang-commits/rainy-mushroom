# 全量验证失败摘要

依据本目录 `workspace.log` 与 `tests.json` 的同一次记录：1979 项测试中 1841 项通过、138 项失败。同期剑气美术、飞行、回退显示、技能形态和技能说明专项为 **95/95 通过**，`scripts/check-forest.mjs` 通过。本文只读分析日志和少量相关源码，没有重跑全量测试或修改其他模块。

| 失败测试文件 | 数量 | 日志中的主要原因 |
|---|---:|---|
| `survivor-host.test.mjs` | 1 | resources 顶层目录白名单过窄 |
| `survivor-hover-independent.test.mjs` | 10 | VM 上下文缺少 `SwordArcArt` |
| `survivor-side-walk-host-independent.test.mjs` | 6 | VM 上下文缺少 `SwordArcArt` |
| `survivor-sword-s3-visual.test.mjs` | 1 | `destroy()` 方法开头必须调用 `resetSwordGround()` 的源码正则未匹配 |
| `xianxia-tower-flight.test.mjs` | 1 | 第 83 行全洗点返回值预期 2，实际 3 |
| `xianxia-tower-host-tools.test.mjs` | 99 | 51 项首先失败于普通档内容/写入次数检查，13 项首先失败于按钮查找，35 项失败于测试内状态、布局、资源或操作结果断言 |
| `xianxia-tower-inventory.test.mjs` | 2 | 两种横屏尺寸均未找到“购买一颗 · 5贡献”按钮 |
| `xianxia-tower-monster-animation.test.mjs` | 5 | VM 上下文缺少 `setTowerDepth` |
| `xianxia-tower-run-arena.test.mjs` | 1 | 第 4 层第 20 波在测试预算内仍为 playing，预期 won |
| `xianxia-tower-run-attacks.test.mjs` | 5 | 构造测试场景时未生成目标妖兽：falcon_elite、centipede_elite、snake_boss |
| `xianxia-tower-run-loot.test.mjs` | 7 | 关卡未在预算内获胜、逐次击杀数不符、未达到第 9 层预期掉落/击杀状态 |

## 与本轮改动的关系

- **资源白名单不是 v3 文件漏登记。** `tests/survivor-host.test.mjs:23–24` 只枚举 `assets/resources/` 顶层，并仅允许 `tower-skill-icons`、`tower-monsters` 及各自 meta。日志同时列出 `player-hud`、`sect-scene`、`tower-character`、`tower-equipment`、`tower-skill-fx` 等目录。本轮 v3 在已有 `tower-skill-fx` 内新增，不会增加该断言枚举的顶层名字。该测试没有进入 v3 所在目录，也未检查其文件名或注册表。
- **16 项旧生存模式错误与 5 项妖兽动画错误在 VM 依赖注入处失败。** 两组旧生存模式测试去掉 import 后执行 `SurvivorBattleArt`，未给上下文提供该类当前引用的 `SwordArcArt`；妖兽动画测试同样去掉 import，未提供当前引用的 `setTowerDepth`。这些错误没有执行纵横剑气的新几何。
- **技能说明相关的两项 host 用例并非文本断言失败。** 日志中第 1408、1409 项最终在 `ordinaryUnchanged()` 的持久化检查失败。它们检查的是剑气斩与剑阵说明，没有出现纵横剑气新文本不匹配的错误。
- **关卡、妖兽与掉落用例使用 `sj_wanjian` 场景。** 查看其 fixture 后，未发现本轮 `sj_cross` 曲线、v3 图片或纵横说明参与所列失败断言的证据；不能仅凭用例名称推断具体根因。

目前没有发现 138 项失败直接指向本轮 C 版曲线、v3 资源路径或纵横剑气描述。专项测试覆盖了与批准美术的逐点对应、交点位置、空隙不命中、穿透次数、地图停止、回退显示和存读档。

**未在同一工作区状态上进行本轮代码回退对照，因此没有证明这 138 项全部属于既有失败。全量验证仍为失败，不能用专项通过替代全量通过。** 本文不改动原日志，也不把其他模式、存档、UI 或关卡问题纳入本轮修复范围。
