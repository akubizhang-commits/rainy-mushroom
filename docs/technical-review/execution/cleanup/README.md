# 结算弹窗延迟销毁修复证据

本次修复只改变 `TowerView.render()` 恢复子节点时的有效性检查：使用 `isValid(child, true)` 排除已经调用 `destroy()`、仍等待帧末清理的节点。没有修改 Cocos 引擎、存档、数值、美术或技能特效。

## 根因与已确认触发条件

主任务在真实 Cocos 浏览器构建中确认：大厅直接同帧入塔并暂停不报错；主动回宗后先切换 `tower` 页面再同帧入塔并暂停不报错；保留结算弹窗，在下一帧同一个 evaluate 内入塔并暂停，可以重现持续错误。因此角色属性滚动和两分钟自然死亡不是必需条件。

1. `afterFinish()` 创建 `对话面板`，其中的 `结算收获列表` 带有 ScrollView。
2. 入塔第一次 `render()` 对旧 overlay 调用 `destroy()`，随后将 `this.overlay` 置空。Cocos 3.8.8 立即停用该节点，但节点仍挂在父节点下等待帧末销毁。
3. 同帧暂停再次调用 `render()`。原来的 `root.children` 全量激活循环重新激活了待销毁 overlay；此时 overlay 引用已置空，后续清理不会再次将旧树停用。
4. 引擎递归清理先销毁 ScrollView 的内容子节点，再销毁 ScrollView 组件。仍启用的组件此时才执行 `onDisable()`，在 `content.off()` 访问已经清空的事件处理器并抛错。
5. 抛错中断 `_deferredDestroy()` 清空队列，导致后续每帧反复尝试销毁，出现重复销毁和 `Cannot read properties of null (reading 'off')`。

这是生产渲染路径中的生命周期缺陷；测试钩子的同帧调用使它稳定暴露。现有证据未量化普通用户交互触发该时序的频率。

核查依据是本机已安装的 Cocos 3.8.8 引擎：`cocos/core/data/object.ts` 的 `destroy`、`_deferredDestroy`、`_destroyImmediate` 和 `isValid`；`cocos/scene-graph/node.ts` 的 `active`、`destroy`、`_onPreDestroyBase`；`cocos/ui/scroll-view.ts` 的 `onDisable`。构建 `cc.c2df8.js:98965` 对应 `content.off("size-changed", ...)`。`TowerMenu.destroy()` 已先 `removeFromParent()`，并非此次被重新激活的根节点。

## 最小变更

- `cocos-pilot/assets/scripts/TowerView.ts`：一条注释及激活循环的 strict validity 判断。
- `tests/xianxia-tower-host-tools.test.mjs`：mock `isValid` 支持可选 strict/ToDestroy 语义，默认行为保持不变；末尾新增一条回归测试，已有用例与 T04 断言未改。
- `minimal-fix-and-regression.patch` 只包含本次变化，不包含工作树内其他任务的修改。

新增测试执行真实宿主的 `enterFloor → withdraw → enterFloor → pause` 路径。仅将旧结算 overlay 的 `destroy` 替换为帧末排队模型，保留普通有效状态和父子关系；检查它不会被重新激活、普通隐藏节点仍能恢复、帧末旧树可完整清理、新暂停弹窗仍有效。测试不宣称模拟完整 Cocos 渲染器；真实引擎验收需下述浏览器复测。

## 测试证据

首次开发时已先运行回归红灯，再修改源码取得绿灯；该首次输出记录在任务工具日志中。为生成可归档文件，本目录的红绿日志是在 `/private/tmp` 隔离源码快照上重新执行：红灯快照只还原旧激活循环，绿灯快照保留修复。共享工作树源码在归档过程中未回退或改动。

- `red-isolated-replay.log`：退出码 1，1 项失败；`reactivations` 实际为 1，期望为 0。
- `green-isolated-replay.log`：退出码 0，1 项通过。
- `host-tests.log.gz`：先前完整宿主测试日志原件的 gzip 归档，**186 项 / 183 通过 / 3 失败**。归档步骤没有重复执行完整宿主测试。
- 3 项失败均属于此前已经记录的残留：`one level 1 sword-line volley completes one character action without rewinding on its 1 hits`（12 != 13）；`paper experience ring resets on level-up and hides at cap in hall and combat`（未找到 HUD.XPRing）；`battle experience surrounds the portrait without a bottom bar`（旧父节点预期不符）。不能把该结果表述为全部通过。
- `git diff --check` 已通过。

过滤测试命令：

```sh
node --test --test-name-pattern='same-frame reentry and pause never reactivate' tests/xianxia-tower-host-tools.test.mjs
```

完整宿主测试命令：

```sh
node --test tests/xianxia-tower-host-tools.test.mjs
```

`run-metadata.json` 记录隔离复放目录、Node 版本、退出码、源码 SHA-256 和完整日志原始哈希；`SHA256SUMS` 覆盖本目录所有证据文件（清单自身除外）。

## 待主任务补充

**修复后的真实浏览器复测由 root 稍后补充，本归档不声明该复测已经通过。** 应重新构建后保留结算 overlay，再同帧入塔并暂停，确认帧末清理没有重复销毁或 `content.off` 错误，并检查新暂停菜单可继续操作。

## 最终真实引擎复测补充

重建后的QA Web包通过原失败路径，含三轮重复同帧结算重入暂停；旧节点帧末销毁正常、新暂停菜单可用。最终0错误、62警告；完整检查、trace、console和构建身份见[最终浏览器回归](../T07/browser-final/README.md)。修复前错误和原始trace保留在 `browser-before/`。新增回归计入最终2246项；7项既有失败原样保留。`t02f_review`独立复审确认红灯重激活1次、绿灯通过、T04三例逐字保留。
