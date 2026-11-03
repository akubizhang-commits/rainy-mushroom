# 炼制小游戏纯逻辑接口

实现：`js/xianxia/TowerHandcraft.js`。TDD先运行缺模块的失败测试，再实现；12项行为测试通过。未编辑其他生产模块、未生成付费素材、未提交Git。

## 调用

```js
const config={mode:'alchemy',recipeId:'huichun',seed:7,version:1}
const game=createHandcraft(config)
game.input('hold',true)
game.advance(1/60)
const view=game.snapshot()
// 完成之后原样提交；不要自己制造终止时刻。
const result=replayHandcraft(config,game.events)
```

`mode`为`alchemy|forge`，`recipeId`必须是现有丹方或完整装备配方ID，seed为0—2³²−1安全整数。`HANDCRAFT_VERSION=1`。

`input(type,value?)`返回是否接受；无效操作、重复长按不会记录事件。`advance(dt)`按固定60Hz推进；UI负责失焦／异常长帧时暂停调用。

| 操作 | 语义 |
|---|---|
| `hold`, boolean | 鼓火或蓄力／松手塑形；塑形自动执行后需松开再按 |
| `cancel` | 清除长按，不触发落锤；用于暂停／pointercancel |
| `merge` | 当前融合事件主动合药 |
| `collect` | 温养阶段收丹 |
| `repair` | 选择本次塑形修整上一动作 |
| `rotate`, tileIndex | 当前拼图块顺时针旋转90度 |
| `hint` | 高亮一块应旋转的拼图，禁止本局阵眼加分 |
| `seal` | 拼图阶段锁定有效通路；封灵阶段点击判定 |
| `basic` | 拼图阶段直接基础完成，只计塑形分 |

## 快照

- `phase`：alchemyHeat / alchemyFinish / forgeShape / forgePattern / forgeSeal / completed。
- `tick,time,temperature,fire,held,stableRange:[low,high],stable`。
- `fusion`：index/start/end/resonanceStart/resonanceEnd/delta/available/resonating/warning；所有时间为秒。`fusionPoints`保留两次结果；`warmPoints`为温养进度。
- `shape`：index(0—5)/target/force/points/canRepair/repair/feedback(秒)/remaining(秒)/releaseRequired。
- `puzzle`：tiles/source/target/eye/connected/challenge/path/challengePath/hintIndex/hinted。tile包含x/y/mask/rotation/ports；x从0到2、y从0到1。ports位掩码北1、东2、南4、西8。source/target为`{index,port}`，eye为tile index。
- `sealProgress`：0—1；`sealWindow:[low,high]`为2秒封灵中的判定秒数。
- 完成时`score/grade/rate/details/result`有效。result还有reason/templateId/resonanceCount/challenge/repairs。
- `eventLimit`：接近4096事件上限；拼图需显示基础完成，炼丹仍可收丹／自动完成。

## 重放与求解

`events` getter返回被接受的`{tick,type,value?}`事件；完成时末尾附`{tick,type:'end'}`。重放验证顺序、阶段、按键配对、次数、完成时刻与总量；无效返回`{ok:false,reason}`。有效返回`{ok:true,score,grade,rate,details,reason,templateId,resonanceCount,challenge,repairs,events}`。

`HANDCRAFT_PUZZLES`是3个冻结的有限布局变体。`solveHandcraftPuzzle(puzzle,challenge=false)`返回`{moves:[tileIndex...],rotations}`，moves为最少顺时针点击序列。`puzzleConnections(puzzle)`只把真实源终简单路径上的阵眼记为challenge。

性能：普通阶段最多1200逻辑tick；拼图等待直接跳过tick，不按离线小时数逐帧重放。求解最多1024独立朝向组合，日常快照只求连通，不求最优解。真实Cocos帧率仍由主任务验证。

## 测试覆盖

`node --test tests/xianxia-handcraft.test.mjs`

12项覆盖：全部模板双解距离、死支路阵眼、无输入炼丹保底完成、稳定共鸣与收丹、温养风险仅扣25%温养分、满分炼器、提示禁用阵眼分、有限修整、自动落锤释放门槛、30/120FPS一致、非法事件与配方、长时间拼图等待。
