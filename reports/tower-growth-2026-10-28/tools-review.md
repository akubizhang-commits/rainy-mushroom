# 成长体验工具独立代码审查

初审时间：2026-10-28 11:16；修复复测：2026-10-28 11:27（Asia/Shanghai）。

**当前结论：原 P1、P2 及体验档标识丢失均已复测关闭。新增9项宿主回归全部通过，本次复测没有发现新的阻塞问题。** 本轮只新增指定测试并更新本报告，没有修改 TowerView、TowerMenu、TowerPlaytest、共享副本或其他运行时文件。

## 修复复测与持久回归

测试文件：[xianxia-tower-host-tools.test.mjs](/Users/zhangnu/WeChatProjects/rainy-mushroom/tests/xianxia-tower-host-tools.test.mjs)。

采用仓库已有的 `node:module` TypeScript 转译及 VM 方式，执行真实 TowerView/TowerMenu 源码和真实 Campaign、Run、Growth、Playtest 模块；只替换 Cocos 渲染、平台生命周期、浏览器环境、时钟及存储边界。每个用例使用独立 VM、固定时钟和内存存储，无需本机 Creator 安装路径，也不改写进程全局浏览器对象。菜单和对话框不被桩替换，操作通过实际生成的按钮事件完成。

执行环境为 Node v22.22.2，运行：

```sh
node --test tests/xianxia-tower-host-tools.test.mjs
```

结果：**9 tests / 9 pass / 0 fail / 0 skipped**。Node 输出 `stripTypeScriptTypes` 实验性 API 提示，不影响测试通过。

| 用例 | 验证结果 |
| --- | --- |
| 隔离复制写入失败 | `playtest` 保持 true，Campaign 只读；操作、等待同步均不能写普通档，普通档原文保持不变 |
| 同模式只读重试 | 持续失败仍保持隔离；解除故障后，实际“重试打开体验档”按钮能恢复，后续购药只扣体验档 |
| 主动切回普通档 | 只有点击“切回普通档”后才打开普通档并移除 URL 的 `playtest`；随后正常消费可持久化 |
| 普通档同步失败后恢复 | 原丹药页重绘，按钮恢复可用、旧失败提示被恢复提示替换、滚动位置保留；旧禁用回调不能消费 |
| 体验档同步失败后恢复 | 同上，并保持普通档零写入、菜单 `playtest:true` |
| 体验档标识 | 部分回血、满血触发重绘及技能详情开关均保留“体验档” |
| 手动服药 | 同步恢复后回春丹可用；写入失败时 HP/库存不变，重试成功才恢复50%最大生命（本夹具50 HP）并扣1颗 |
| 工具设置与切档 | 真实速度/无敌按钮不改变暂停 snapshot 或17.5 HP；工具设置写入失败不发布；往返两档与恢复战斗正常 |
| 暂停保存失败 | `pending` 阻止切档；实际“重试保存”按钮成功后清除 pending，内存与保存快照均为 paused |

修复位置：

- [TowerView.ts:43](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:43)：初始化失败采用抛错隔离适配器，保持体验档身份。
- [TowerView.ts:225](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:225) 与 [TowerView.ts:250](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:250)：只读工具入口及同模式重试。
- [TowerView.ts:276](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:276)：同步成功后保留模式标识，失败恢复时重绘当前页。

复测版本 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `cocos-pilot/assets/scripts/TowerView.ts` | `a106c3b3be6895cbc4fc87c92f112318a403b190ad36b93edd2bb8daa8fdf0dc` |
| `cocos-pilot/assets/scripts/TowerMenu.ts` | `3f6f7e92d483fdaf9fc0b4dc76d284b2f8788903ba354cd547ed26fd204ec469` |
| `js/xianxia/TowerPlaytest.js` | `40c152dd123e9c3ec6497ed82be5b8644ed27d54c2b85bcb198b6b3355f316d7` |
| `tests/xianxia-tower-host-tools.test.mjs` | `117f5d1a77c6693b15f78348c39f0ecaefad5396a4c2623fcd669ec2f52448b7` |

没有重跑既有模块套件，没有构建或运行全仓测试。本次证明源码级事务与按钮绑定行为，不能替代主线程重建后的原生触控、裁切和 GPU 验收。

以下为初审历史证据，问题已由上述回归关闭；其中旧行号对应末尾初审指纹，不代表当前代码位置。

## 初审 P1：体验档初始化失败会自动进入可写普通档（已修复）

- 位置：[TowerView.ts:42](/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:42)，相关初始化继续执行于第44、46行。
- 触发：使用 `playtest=1` 打开游戏，普通档存在，首次复制到体验档时写入失败。例如存储配额允许覆盖已有普通档，却不足以再保存一份完整副本。
- 实际行为：`playtestStorage(...)` 抛异常后，赋值未完成，局部 `storage` 仍是普通存储；catch 将 `this.playtest` 改成 false。随后构造普通 Campaign 并自动 sync。玩家仍能操作普通档，界面只给出“体验档暂时无法打开”的提示，没有要求主动选择切回普通档。
- 影响：用户明确请求隔离体验，却会在错误路径消费、推进普通档；隔离边界在宿主初始化处失效。不是无敌开关污染，而是失败后换错了可写档案。
- 定向复现：执行真实 TowerView 构造器与 Campaign/Playtest 模块，仅用节点及平台桩替代 Cocos。内存存储对 `TOWER_PLAYTEST_KEY` 的写入抛出配额错误，对普通档读写正常。构造后通过宿主 `action` 购买一颗培元丹，得到：

```json
{
  "requested": "playtest=1",
  "actualPlaytest": false,
  "ordinaryWrites": 2,
  "purchase": {"ok": true, "id": "peiyuan", "count": 1, "cost": 20},
  "persistedOrdinaryContribution": 280,
  "trialExists": false
}
```

- 建议：隔离初始化失败时停在不可写的错误/重试状态，不继续创建可写普通 Campaign；普通档只能由用户明确选择“切回普通档”后打开。也不要在这个错误分支自动 sync 普通档。

## 初审 P2：短暂保存失败恢复后，原页操作按钮仍锁死（已修复）

- 初审位置：`TowerView.ts:264`，结合 `TowerMenu.ts:190`。
- 触发：场外五秒 sync 失败一次，宿主以 `readOnly:true` 重绘菜单；随后存储恢复，下一次 sync 成功，且生命没有在该次恢复中刚好达到上限。满血时同样可触发。
- 实际行为：成功分支只调用 `refreshVitals(...readOnly:false)`。该方法替换 `this.state` 并刷新生命显示，没有重新生成之前已禁用的按钮。Button 的 `interactable` 及 click 闭包捕获的 `enabled` 均仍是失败时的 false；旧保存失败提示也保留。
- 影响：存储已经可用，原页的购药、服药、修习等按钮却继续无响应。“刷新休养进度”自身也可能被禁用。切到其他页面再回来才能恢复，不能靠等待成功 sync 自愈。
- 定向复现：真实 TowerMenu 节点逻辑先以满血、`readOnly:true` 渲染丹药页，再执行真实宿主成功 sync 分支；点击“购买一颗 · 5贡献”：

```json
{
  "menuReadOnly": false,
  "buyInteractable": false,
  "clickDispatched": 0,
  "noticeStill": "保存失败"
}
```

- 建议：只读状态从 true 恢复为 false 时重绘当前页，保留滚动与详情位置，并清除对应的临时失败提示；不要仅更新生命标签。

## 初审同一刷新路径还会丢失体验档标识（已修复）

这不是额外的数据污染或自动切档，但应随上述刷新问题一并处理。

初审版本的 `TowerView.ts:264` 传给菜单的对象没有 `playtest`。`refreshVitals` 会整体替换菜单状态，因此恢复刚好满血触发本地重绘，或之后打开/关闭技能详情时，标题不再带“体验档”。真实存储仍是体验档。

已通过真实菜单的“99.99 → 100 HP”刷新分支复现：

```json
{"hostPlaytest": true, "titleStillMarksPlaytest": false, "menuPlaytest": null}
```

建议宿主在所有菜单状态更新入口一致传递 `playtest`；不要使模式标识依赖某一次完整 render。

## 初审中已定向核对、未发现阻塞的问题

- 实际宿主 `changeTools` 开/关无敌与改变速度，不改变测试中的 17.5 HP，也不重写战斗 snapshot。
- 从有暂停战斗的体验档切回普通档，再切回体验档，测试中 HP 均保持17.5、战斗保持 paused；工具开关恢复与隔离存储按预期工作。
- `screen === 'skills'` 提前结束 update；成功修习恢复 Campaign 已保存的 paused snapshot。没有在这个路径看到额外回血或恢复为 playing。
- 工具设置先保存成功再发布到 `this.tools`；失败分支保留旧设置。`pending` 阻止切档/继续战斗，避免未保存战斗被正常切换路径丢弃。
- 工具菜单实际生成六项回调：×1、×2、×3、无敌秒杀、返回战斗/宗门、切回普通档。默认720×1280设计高度下，六项的布局计算没有重叠或越出面板。这里是源码/节点层检查，**不等于浏览器真实指针与裁切已经验收**。
- 没有在体验工具实现中发现手动写满 `player.hp` 的路径；无敌不等于回血。

## 初审范围与证据边界

阅读 TowerView、TowerMenu、TowerPlaytest，并核对 Campaign/Run/SurvivorPlatform 相关调用。针对疑点使用临时内存存储和 Cocos 节点桩执行实际 TypeScript 转译代码；没有访问真实玩家存储，没有写入新的测试文件。

没有重跑已有的 Playtest/Run 测试套件，没有运行构建或全仓测试。正在进行的构建结果、最终资源同步、原生触控事件和最终屏幕裁切不在本报告的已验证范围内。此前模块测试通过不覆盖上述宿主初始化与菜单恢复分支。

初审版本 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| `cocos-pilot/assets/scripts/TowerView.ts` | `bdc3cdfd05e9ebc74b8814e3585bb2a200fd96ce74590577c404046814bb9670` |
| `cocos-pilot/assets/scripts/TowerMenu.ts` | `3f6f7e92d483fdaf9fc0b4dc76d284b2f8788903ba354cd547ed26fd204ec469` |
| `js/xianxia/TowerPlaytest.js` | `40c152dd123e9c3ec6497ed82be5b8644ed27d54c2b85bcb198b6b3355f316d7` |
| `js/xianxia/TowerRun.js` | `65f8d3525188f7a0a6e3eefa9f9b39a0cca0e8759d689039fd0a67ad43d0baf8` |
| `js/xianxia/TowerCampaign.js` | `3c8e1596fccdabdc00c8ea6e06548a603e662488db57d09ac0a0e0a4a3f4d2fc` |
