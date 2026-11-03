# T07 — QA 性能采样工具实施报告

本地采样工具、专项测试和后续 Web QA 功能回归已完成；目标设备性能基线尚未完成。下文保留 T07 实施代理初次交付时的测试与复审记录，最终集成验证另列于文末；历史日志和源码哈希不冒充最终构建身份。未声称 Tap 平台、真机、长时或热降频验收。

## 结果与范围

- 15个新增行为测试，加T05的28个资源/启动交接测试：最终 **43/43，0 fail/skip/todo/cancelled**。
- `npm run check` 通过。`sync-shared` 同步69个实际依赖模块；新TowerResourceGroups由根代理T06拥有，已告知根代理为它补固定meta。
- 生产严格不创建采样器；只有QA编译能力下安装 `globalThis.__towerPerf`。URL没有授权作用。
- TypedArray固定容量记录Cocos update帧、引擎dt以及同步CPU区间。导出才创建对象，不逐帧JSON序列化。12个明确场景标签；容量满后保留前N并明确计数丢弃。
- 背景/恢复帧单列，正常活跃长帧不会因阈值被剔除。clockSource声明performance.now或Date.now回退；默认7500个每秒内存样本可覆盖约2小时，但完整覆盖仍必须检查dropped。
- Queue通过可选、try/catch隔离的只读观察器输出transport/binding/lifetime事件；没有改重试、成功回调移除、绑定回滚或引用计数逻辑。可选Audio记录单独可用性阶段，不混成binding成功。
- TowerView所有原有Store.act调用和9处非调试Run.snapshot通过同参数/同返回值薄包装采样。simulation边界包裹现有advance调用；draw边界包裹原绘制体。失败/异常原样返回或抛出，不移动交易顺序，不改副作用内容。
- 不导出错误正文、存档、账户、URL。源图宽高×4仅标为队列ImageAsset源像素RGBA8估算，GPU时间/进程内存/温度/电量为null。共享分组函数来自T06，没有另一份分类表。

## 文件清单与所有权

初次交付时 T07 拥有8个文件，精确清单及当时哈希见 `task-7-files.json.gz`、`task-7-files.sha256.json.gz`：

1. cocos-pilot/assets/scripts/TowerPerformance.ts（新增采样器）
2. cocos-pilot/assets/scripts/TowerPerformance.ts.meta（固定UUID）
3. cocos-pilot/assets/scripts/PinePilot.ts（仅QA初始化、引擎帧、可见性及清理）
4. cocos-pilot/assets/scripts/TowerView.ts（同步方法边界与引擎前后台采样接线）
5. cocos-pilot/assets/scripts/TowerAssetQueue.ts（非侵入观察器）
6. cocos-pilot/assets/scripts/TowerResources.ts（观察器传递及可选音频）
7. tests/tower-performance.test.mjs（15个新增测试）
8. docs/technical-review/QA_PERFORMANCE_CAPTURE.md（操作、口径、容量和未验收边界）

`cocos-pilot/shared-manifest.json`、新共享 `TowerResourceGroups.ts` 是调用sync产生的T06依赖结果，不纳入T07差异包；根代理负责T06提交。未改T02F三个UI测试文件、构建脚本、游戏JS规则、资产文件。

## 测试证据

最终命令：

```sh
node --test tests/tower-performance.test.mjs tests/tower-resource-loading.test.mjs tests/tower-runtime-loading.test.mjs tests/tower-binding-transactions.test.mjs tests/tower-loading-handoff.test.mjs
npm run check
```

原始日志以同名 `.gz` 文件无损归档于本目录，未压缩内容哈希见 `evidence.json`：

- task-7-red.tap：采样器不存在，7个新增测试先失败。
- task-7-sampler-green.tap：7/7。
- task-7-queue-red.tap：新增诊断事件先失败；观察器异常不影响旧队列的控制仍通过。
- task-7-queue-green.tap：36/36。
- task-7-audio-red.tap：可选音频诊断先失败。
- task-7-resources-green.tap：37/37。
- task-7-host-red.tap：真实Host尚无采样；其中第三个新测试还暴露测试自身ctx声明错误，不把该错误当游戏缺陷。
- task-7-host-green.tap：修正声明并接入后40/40。
- task-7-final.tap：首次交付时加入既有启动交接测试，41/41。
- task-7-lifecycle-red.tap：复审补充真实生命周期接线；小游戏缺口 1 fail，浏览器既有路径 1 pass。
- task-7-lifecycle-green.tap：修复后同一专项集 43/43。
- task-7-lifecycle-check.log：修复后 Source syntax and dependency checks passed。
- task-7-check.log：Source syntax and dependency checks passed。
- task-7-sync.log：Synced69 current gameplay modules。

测试覆盖：production/QA严格能力、冻结API及销毁所有权；帧分位数保留真实卡顿、背景恢复单列；容量/重启/丢弃；CPU返回值及原异常；资源传输与绑定失败、引用估算及释放；每秒Heap/不可用；数据字段白名单；真实Queue重试与晚回调；真实PinePilot入口/清理；真实TowerView薄包装参数、返回对象与失败保持。

## 复审修复：小游戏前后台接线

复审发现浏览器 document 可见性已接入，但非浏览器的既有 Cocos Game.EVENT_HIDE/SHOW → TowerPlatform → TowerView.hide/shown 尚未通知采样器。只在 TowerView 这两个原有回调中增加 host.performance?.setHidden(true/false)，没有另建平台监听器，也没有改暂停、恢复跳帧或存档交易顺序。采样器原有 setHidden 幂等逻辑合并浏览器与引擎的重复通知。

先加入真实接线测试再改源码：执行真实 TowerPlatform 注册、TowerView 构造器与 hide/shown，保留真实 CampaignStore、TowerRun、PinePilot.update 和采样器；只有渲染/声音及底层引擎事件总线、内存存储用边界替身。非浏览器用例先在 hidden 标记断言失败，浏览器控制用例先通过。修复后均通过：984ms 后台帧、3000ms 首次恢复帧均在 raw 中保留并标记，活跃帧仅有两个 16ms，P95/P99 都为16；浏览器及引擎重复通知只记录一次 hidden/visible；checkpoint 写失败保持原 Campaign state 对象与持久化内容，战斗仍暂停并保留待重试 checkpoint。既有 production 不创建采样器用例继续通过。

本次复审修复仅修改 TowerView.ts、tests/tower-performance.test.mjs、QA_PERFORMANCE_CAPTURE.md 及本目录 T07 报告/证据。未改 T06/T02F，也未运行构建或同步。修复后运行时代码再次冻结。

## 验收边界

T07 实施代理初次交付时尚未执行最终 Creator 构建和浏览器短测；后续统一重建及 Web QA 功能回归见下节，未引用 T04 的较早构建替代。用户无 Tap 账号与设备，因此本报告仍没有目标设备 FPS、GPU、进程内存或热降频数据。

冷启动边界为PinePilot.start，早于宿主的脚本/引擎下载不在工具内部；该trace与实际release-build.json外部配对，工具不相信手填构建哈希。CPU区间有嵌套，不能相加；knownImages也不代表完整GPU资源。默认原始帧容量约16分钟@60Hz，2小时内存趋势与原始帧覆盖必须分开解释。不存在任何“长期稳定已通过”的结论。


## 独立复审

t07_review：8文件哈希匹配，43/43通过、0跳过。初审发现小游戏生命周期未通知采样器，已通过真实平台回调接线测试先红后绿修复；未增加平台监听、未改变暂停和交易顺序。原始后台及恢复间隔保留，活跃分位数排除它们；失败checkpoint保护仍有效。构建和浏览器证据由主代理另外归档，真机仍未验证。


## 后续集成构建与浏览器验证

主任务在 T07 生命周期修复以及角色当前气血、暂停命中区、延迟销毁修复合入工作树后，重新执行 QA Web 构建与生产 Tap 本地转换。最终 Tap 目录为 `run-PNJNNY`，其构建指纹已与当前源码再次核对；生产/QA 真实编译包的 T04 权限检查分别为 1/1、2/2 通过。Tap 平台导入和真机未运行，账号与大小限制尚未核验，候选继续保持 `releaseEligible=false`。构建与资源身份见 [T06 证据](../T06/README.md)。

[初步浏览器记录](browser-initial/evidence.json)来自较早中间包，只用于[初步测量与 T08/T09 决策](../../MEASUREMENT_DECISIONS.md)。[最终 Web QA 记录](browser-final/README.md)用于功能回归：1280×720、DPR=1、仅内存存档；保留结算弹窗后立即入塔并在同帧暂停，待销毁树保持关闭，真实引擎帧结束后完整移除，新暂停菜单继续有效，重复三轮通过。继续、回宗与角色当前气血显示也通过；控制台记录 0 错误、62 条警告（61 条弃用、1 条窗口尺寸设置不支持）。最终 trace 混合了操作和暂停，不作为新的性能基线，也不与历史短测直接做性能 A/B。

延迟销毁问题由实际浏览器暴露：连续 render 曾重新激活 Cocos 已排队销毁的结算树，引发 ScrollView 清理异常。修复只对严格有效的节点恢复 active；新增真实宿主回归先红后绿，并经独立复审。源码、日志与局部测试证据见 [cleanup](../cleanup/README.md)。

最终集成全量测试使用已锁定官方插件，结果为 **2246 项：2239 通过、7 失败、0 跳过、0 todo**（26.574 秒），`npm run check` 通过。首次未传插件路径的运行有12项跳过，已由这次完整运行替代。七项既有失败为两项装备预算／标准构筑、四项 HUD 需求冲突和一项单发剑破虚空末帧采样缺口；没有通过削弱断言或改变游戏数值将其隐藏。此统计是最终集成状态，不能回写成初次 T07 交付时的测试结果。

363 张保留图像的最终构建原生文件与源文件逐字节一致；没有缩小图像、减少技能特效或改变游戏数值。资源分组仍是逻辑标记，未实施 T08 缓存淘汰或 T09 快照／排序重构。三个浏览器重复操作不能替代 30 次循环、每场景三次目标设备测量或两小时稳定性验收。
