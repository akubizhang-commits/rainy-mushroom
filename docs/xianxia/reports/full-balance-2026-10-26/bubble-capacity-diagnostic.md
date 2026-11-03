# B 单局敌弹池丢弃诊断

日期：2026-10-26。结论：**已复现 B 的一次敌弹丢弃，敌弹零丢弃验收失败。** 该局最终获胜，不使容量验收转为通过。未发现或指称本轮有人作出“全局无丢弃”的口头声明。

## 输入与范围

- 来源：`reports/full-balance-2026-10-26/diagnostic-runs.json`。
- 唯一 B 敌弹丢弃案例：`balance-40 / flee / prefer:dew_ring / xianxia`。
- `maxSec=1020`，沿用 bot 的 720×1560 视口、零局外、正常 Boss 流程，无定时胜利。
- 对照：`B-xianxia-1.json`、`B-xianxia-2.json` 中同一 seed/move/pick 的记录。
- A 累计敌弹 dropped=19、B=1 来自主矩阵；本次仅复现 B 这一配置，不复跑 A 或任何矩阵。

附带脚本 `bubble-capacity-diagnostic.mjs` 只读生产源码和历史报告，输出 JSON 到标准输出，不写项目文件。运行：

```sh
node docs/xianxia/reports/full-balance-2026-10-26/bubble-capacity-diagnostic.mjs
```

脚本在 bot `onSecond(1)`，即 `time=1.0000000000000013 / simulationTick=60` 时包装该实例的 `mistBubbles.acquire`。原函数只调用一次，保留 receiver、参数与返回值；仅返回 null 时复制状态和调用栈，不消费 RNG、不更改容量或生成逻辑。安装时 dropped=0，观察到的 null 次数与最终 dropped=1 相等。

Node 为 v22.22.2，与主矩阵相同。27 个生产 JS/bot 文件在运行前全部匹配主矩阵 provenance 中的 SHA-256，复跑结束后仍未变化。未修改生产源码、主脚本、参数或主报告。

## 唯一 null 的精确现场

| 字段 | 观察值 |
|---|---|
| `run.time` | **443.76666666659173 秒**，约 7:23.767 |
| `simulationTick` | **26627** |
| Run phase / `_phaseSteps` | `playing / 0` |
| 发射阶段 | `SurvivorRun.step → stepEnemyBehavior → spawnBubble → Pool.acquire` |
| 池 count / capacity / freeTop | **60 / 60 / 0** |
| 池 nextUid | 404 |
| 场上敌人数 | 66，含 Boss |
| 60 发在场泡弹来源 | `sporeling: 60` |
| 泡弹最短剩余 life | **5.655198531684391e-15 秒** |
| 泡弹最长剩余 life | 2.9833333333333334 秒 |
| 按下一次 hostile 更新将到期的泡弹数 | **1** |
| 调用者递增前 `diag.dropped.bubbles` | 0 |
| 玩家 HP / invuln | 94.79999999999976 / -0.016666666666666562 |
| 玩家位置 | x=4879.86027715635，y=-652.8755915060214 |

`simulationTick` 在本步开头递增，而 `run.time` 在本步后段递增。因此 26627 与上述 time 是同一发射现场的两个原始字段，不把 `tick/60` 改写成发射时的 `run.time`。

### Boss 状态

- 存活，`skill=chase`，`enraged=false`，`enrageStage=0`，`approaching=false`。
- 实体 HP=116690，maxHp=118250；view hpRatio=0.9868076109936575。
- 位置 x=4913.516301135346，y=-276.79678179154223。
- `spawnedAt=420.01666666661333`。
- `summonCd=0.25000000000006956`，`chargeCd=0.2500000000000642`，`ringCd=-13.75000000000034`。
- `ringIgnoresHp=false`；此时 Boss 血量尚未低于半血，不满足泡环血量条件。**失败调用来自普通远程敌人，不是 Boss 泡环。**

这些 Boss view 字段是在失败调用现场直接读取；本步 `stepBoss` 尚未运行，不能误当作本步 Boss 更新后的冷却值。

调用栈关键位置：

```text
spawnBubble             js/survivor/Projectiles.js:187
stepEnemyBehavior       js/survivor/Enemies.js:172
SurvivorRun.step         js/survivor/SurvivorRun.js:237
SurvivorRun.advance      js/survivor/SurvivorRun.js:207
playRun                 scripts/survivor/bot.mjs:261
```

## 原因与实际行为

确认的直接原因是**发射时池已满**。当前调度先执行敌人发射，后在 `_stepHostile` 中移动、扣减 life 和回收泡弹。本次恰有一发剩余 life 只为极小正值：发射时仍占槽，而在后面的同一步 hostile 更新中将满足 `life<=0` 回收。现场说明存在“本步稍后会释放，但当前发射阶段无槽”的时间窗口，不需要扩大池才能解释此次 null。

该极小正值与逐步浮点减时残留一致；本轮未改变时间比较或调度，也未用反事实实验量化这两个因素各自的贡献。

`spawnBubble` 在 acquire 返回 null 后累加 dropped 并直接返回。`stepEnemyBehavior` 随后无条件重置该敌人的 `timer=fireInterval`，所以这发敌弹是**实际省略**，并非排队、延后到下一步补发。记录 null 时调用者尚未累加计数，因此现场计数为 0，最终为 1。

不建议依据这一案例直接调高容量。本任务未实施回收顺序调整、时间容差修改或任何调参。

## 最终结果与观测扰动核对

| 项目 | 复跑结果 |
|---|---|
| outcome | `won` |
| survivalSec | **680.916666666376**，约 11:20.917 |
| 最终 HP | 243.99999999999991 |
| bot 记录 Boss 出生 | 420.03333333328 |
| bot 记录 Boss 击败 | 676.4166666663801 |
| dropped | enemies=0，shots=0，**bubbles=1**，zones=0，pickups=0 |
| droppedTime | 0 |
| 与 B 第一遍普通记录比较 | 一致 |
| 与 B 重复遍普通记录比较 | 一致 |
| 完整精度选卡记录与两遍 detailed.choices 比较 | 一致 |
| 最终 Run summary 与第一遍 detailed.finalSummary 比较 | 一致 |
| 四个最终生产 RNG 状态与第一遍 detailed.rngFinal 比较 | 一致 |

主脚本将普通记录的 `picks` 导出为 `时间保留1位:卡ID`；bot 内存中该字段是完整对象。诊断脚本最初直接比较不同形状，导致比较检查失败；并非对局结果漂移。最终版本按 `balance.mjs` 实际导出格式比较普通记录，并独立比较完整精度 `detailed.choices`，避免用时间舍入隐藏差异。为修正这个诊断比较问题，同一配置共执行三遍；没有扩展到其他案例。

最终脚本退出码为 0，所有观测一致性检查通过。**这里的退出码仅表示复现与比较成功，不表示敌弹容量验收通过。**

### “是否影响最终结果”的边界

1. **诊断包装的影响：**与已有两遍记录相比，记录到的结局、时长、构筑、完整选卡及其他普通统计均一致，最终 RNG 与摘要也一致；未见包装引入结果变化。
2. **丢掉这发弹本身的影响：**它确实省略了一次敌方攻击，但该次攻击在无限制条件下是否命中、是否改变玩家路径/生存/胜负，本次只读复现无法确定。历史和复跑都保留相同丢弃行为，不能用“两者都获胜”证明丢弃没有平衡影响。
3. **验收判定：**保留 B 敌弹 dropped=1 的失败项；不将该局获胜、其他池 dropped=0 或诊断脚本成功替代“敌弹无丢弃”要求。

## 文件交接

本次仅新增：

- 本报告 `bubble-capacity-diagnostic.md`。
- 只读复现脚本 `bubble-capacity-diagnostic.mjs`。

未写 CODEX_HANDOFF/DEBUG_HANDOFF，以遵守本轮指定诊断文件范围；未执行 build、sync 或平衡参数修改。
