# T05 — 资源绑定状态与安全恢复

已完成本地实现与专项验证；未提交、未推送，未声称真机或 Tap 运行验证。改动只涉及以下 8 个文件，游戏数据、资源图片、成功路径的尺寸/滤镜/动作数值均不变。

## 改动

| 文件 | 行为 |
|---|---|
| `cocos-pilot/assets/scripts/TowerAssetQueue.ts` | 将资源传输状态与每个绑定状态拆开。抛错绑定保持失败；缓存命中同样受控；成功回调移除且不重播。队列只持有1个资源引用；安全绑定重试复用它。支持显式 `rollback` / `retryable` 契约，未声明或清理失败的回调禁止原地重试，状态标注 `restartRequired`。|
| `cocos-pilot/assets/scripts/TowerResources.ts` | 透传绑定选项，保持原有 AudioClip 可选直通与 metadata 查询。|
| `cocos-pilot/assets/scripts/TowerLoadingScreen.ts` | 加载主图提供清理契约；区分“重新加载”和完整“重新进入”。无可靠完整重启能力时提示关闭游戏后重开，隐藏无效按钮。完整重启按钮防重复调用；晚到状态不覆盖重启提示。|
| `cocos-pilot/assets/scripts/FlightStreamArt.ts` | 在可能抛错的属性设置前登记纹理/帧；失败释放全部部分成果后才允许重试。复用销毁清理。|
| `cocos-pilot/assets/scripts/PinePilot.ts` | 仅当实际浏览器存在 `window.location.reload` 时提供完整页面重启能力。未添加小游戏私有 API，也没有把宿主重建冒充完整释放。|
| `tests/tower-resource-loading.test.mjs` | 新增9项队列、清理合同、缓存、重入、销毁、非阻塞与可选音频回归，捕获并检查预期故障日志。|
| `tests/tower-runtime-loading.test.mjs` | 新增5项实际加载屏幕/宿主行为检查：失败遮罩、两帧准备、完整重启、防重复点击、无能力/失败降级。|
| `tests/tower-binding-transactions.test.mjs` | 新增3项真实Art回调故障注入：Flight第13帧、主图纹理和帧构造失败，检查资源释放和成功重试后的精确引用/帧数。|

## 验证与证据

1. `task-5-red.tap`：先加入9项队列行为回归再改实现。原5项通过、新9项失败，合计5/14；复现抛错仍完成、缓存命中异常逸出、重入订阅丢失、销毁中继续回调等问题。
2. `task-5-queue.tap`：基础队列与旧加载屏幕/交接专项20/20通过。
3. `task-5-restart-red.tap`：先覆盖恢复入口，再实现恢复；该阶段曾验证宿主重建，随后因调用点审计显示不能清理未知局部对象而替换为更严格的完整页面重启。它是过程证据，不作为最终实现验收。
4. `task-5-green.tap`：最终四文件专项 **28/28通过、0失败、0跳过**，命令：

   `node --test tests/tower-resource-loading.test.mjs tests/tower-runtime-loading.test.mjs tests/tower-loading-handoff.test.mjs tests/tower-binding-transactions.test.mjs`

5. `task-5-check.log`：最终 `npm run check` 通过，Source syntax and dependency checks passed。
6. 指定8文件的 `git diff --check` 通过。最终逻辑测试之后仅将注释的“fresh host”纠正成“full runtime restart”，没有再改执行逻辑；纠正后静态检查再次通过。
7. `task-5.diff` 是限定8文件的审查差异（含新增真实绑定测试），`task-5-files.sha256.json` 记录最终文件内容摘要。没有运行全量测试，避免混入其他活跃 T02/T03 改动。

Node `stripTypeScriptTypes` 的 ExperimentalWarning 是现有测试工具链提示，不是业务失败；故障注入产生的应用日志由测试收集检查。未运行真实GPU/真机试验，测试只在Cocos边界注入故障，绑定函数和队列使用真实源码。

## 恢复保证和边界

- 下载错误/404/超时保持原3次自动重试、手动重试行为；旧响应不能完成新尝试，dispose后的响应不能绑定。
- 成功绑定不随其他绑定失败重播；已下载图片不重复请求、不重复addRef。嵌套依赖仍计入阻塞；非阻塞运行中失败不会重新弹出整屏遮罩。
- Flight第13帧失败后13个已分配帧和纹理全部销毁，图片只剩队列1引用；重试后恰有32帧及队列+Art的2引用，销毁后归零。加载主图纹理/首帧两种异常也验证了同样的清理边界。
- **未知副作用不得猜测可回滚。** 未声明合同的绑定抛错后，需要完整运行环境重启。Web按钮只调用实际存在的页面reload；小游戏无已核实重启接口时清楚提示关闭重开，不展示无效原地重试。页面重启继续走现有存档读取；本次没有写入、删除或重置存档代码。smoke本来是内存存档，整页重启依旧会丢弃该内存体验，不改变其语义。
- 完整重启不等于任意GPU故障都能恢复。如果原因持续存在，会重新显示失败状态；不会绕过错误显示不完整页面。

## 调用点审计

见 `task-5-binding-audit.md` 与 `task-5-binding-audit.json`：当前45个顶层脚本、60个源码load调用点逐文件列出了策略（循环/动态路径可能展开更多请求）。两个本次交易化的回调提供rollback；其余未声明回调默认禁止原地重播。

一些Art本来在内部catch后释放并返回几何/文字/静态回退。这是已有错误处理合同，不属于“异常逸出但队列吞掉后ready”的修复点；本次不扩大或删除回退，也不把它当成完整视觉验收。若未来要求这些内部GPU失败也硬阻断，需要另行改变其返回合同并做真实视觉验收，不能通过队列自动判断。

审计发现 `TowerEnvironmentArt`、`TowerCharacterArt.loadHeld`、`CrossBurstArt`、`ConvergenceArt` 等在登记owner前有局部对象；因此取消了宿主内重建方案，最终只允许完整环境重启。没有把“调用方以后应当遵守”当成当前安全保证。


## 独立审查与证据归档

独立审查 t05_review：规格与质量均通过，无 Critical/Important。已核对8文件SHA与28/28专项/check通过记录；真实GPU及小游戏验收尚未进行。Node实验性测试API警告不影响结果。

本目录 `.gz` 为同名原始证据的无损压缩；evidence.json 中 SHA-256 对应解压后的内容。报告中的“未提交”描述实施代理交接时状态。
