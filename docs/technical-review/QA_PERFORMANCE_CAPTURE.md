# QA 性能采样使用说明

该工具只在显式 QA 构建中创建。默认 production 构建没有采样实例、性能调试入口或帧记录；URL 参数不能开启它。

```sh
npm run cocos:build -- --profile=qa
```

实际构建和资源策略由当前技术治理流程统一执行。采样产物必须与本次构建的 `release-build.json`（Tap 为 `tap-build.json`）一起保存；本工具不会把手填哈希冒充已核实构建身份。记录机器型号、操作系统、运行环境、屏幕尺寸、网络/缓存条件、固定 seed 与合法技能装备配置。不要附带账户、完整存档或凭证。

## 开始、停止和导出

QA 游戏启动后，`globalThis.__towerPerf` 提供冻结的三个方法和场景列表。引擎宿主启动时自动记录 `startup`。

```js
__towerPerf.scenarios
__towerPerf.start('ordinary-battle')
// 执行该场景的正常操作。
const trace = __towerPerf.stop()
JSON.stringify(trace)
```

`start` 开始新的记录并清空前一段帧、CPU、资源事件及溢出计数。先导出旧记录，再开始下一场景。`snapshot()` 复制当前记录，但不停止采集；避免在测量期间频繁调用，以免导出本身干扰测量。销毁宿主时会清理它注册的全局入口和可见性监听器。

| 标签 | 操作 |
|---|---|
| `startup` | 记录宿主初始化到解除加载遮罩的过程 |
| `camp` | 宗门静置、打开详情后回到同一页面 |
| `ordinary-battle` | 固定 seed、相同合法配装的普通战斗 |
| `many-enemies` | 当前规则允许的多怪场景 |
| `multi-skill` | 记录相同合法技能组合及武器切换 |
| `dense-effects` | 特效密集战斗，普通/Boss/狂暴分别检查 |
| `long-session` | 长时运行；注意原始帧容量限制 |
| `battle-cycles` | 至少30次进入、暂停、撤退和再次进入 |
| `scene-switch` | 宗门、背包、藏经阁、突破、战斗切换 |
| `background-resume` | 隐藏及恢复，真机另测锁屏、系统中断 |
| `network-failure` | 受控断网、404、超时及恢复 |
| `storage-failure` | 受控存储故障，同时核验失败原子性 |

QA 可使用已有测试辅助，但比较前后必须记录且固定辅助设置，尤其速度必须一致。不能把无敌/加速下的结果当成普通玩家场景。采样器本身不推进模拟、不发资源、不改数值、不访问存档内容。

## 指标口径

- `frames` 来自 `PinePilot.update`，是 Cocos 引擎帧，不是浏览器 RAF。`intervalMs` 是相邻引擎入口的时钟差；`engineDtMs` 是引擎传入的 dt，二者保留。
- `summary.engineFrameMs` 使用捕获到的有效帧间隔计算 nearest-rank P50/P95/P99。第一帧无前值；浏览器 document 可见性和 Cocos Game.EVENT_HIDE/SHOW 经现有 TowerView 生命周期标记的后台及首次恢复帧不混入活跃帧分位数；重复通知幂等。其余长帧保留，不按阈值丢弃卡顿。
- `cpu` 包括 `update`、`simulation`、`snapshot`、`persist`、`draw` 的同步调用时间。区间可能嵌套，不能相加当成总帧耗时。`persist` 包括 Campaign 动作校验、编码和存储调用，未承诺仅为底层磁盘写入。
- `resources` 的 `transport` 记录每次请求、成功或失败，`attempt/token` 区分重试；`binding` 记录真实回调执行后的成功/失败及可否安全重试。下载成功不等于绑定成功。`lifetime/released` 记录队列释放引用。
- `optional-audio` 只表示声音资源可用性，未声明 GPU/播放绑定成功；仍不阻塞进入游戏。错误正文不进入 trace。
- 请求起止时间可以按 `(path,type,token)` 配对；若在本段采样前已经开始，则没有完整时延。缓存重用可能只有绑定记录，没有新的下载。
- `memory` 至多每秒读取一次浏览器提供的 `performance.memory.usedJSHeapSize`；不可用时为 null。它是可选的 JS Heap 估计，不是进程内存。
- `knownImages` 是队列已持有的 ImageAsset 路径/类型集合；`rgba8EstimateBytes` 仅为已知宽高乘4，不含解码副本、mipmap、压缩格式、其他缓存或原生对象，不是实际 GPU 驻留。
- GPU 时间、进程内存、温度和电量没有可靠来源，明确输出 null。没有自动读取 Draw Call 或网络传输字节，也不能从本 trace 推出这些值。
- `startup` 的采样边界是 `PinePilot.start`，引擎和脚本下载早于这个边界。`interactive-ready` 只表示宿主加载门禁解除，不能冒充包含导航、冷下载和引擎启动的完整冷启动 TTI。

## 容量和可信范围

默认最多记录60000个引擎帧、180000个CPU区间、4096个资源事件、4096个生命周期标记，以及7500次内存样本。使用固定 TypedArray 储存高频数据，`metadata.fixedSampleBufferBytes` 标明这些缓冲区的字节数；这不包括事件对象及导出副本。

容量满后保留前N个样本，并递增对应 `dropped` 字段。不得把有丢弃的原始帧记录描述成完整长时覆盖；长时内存趋势可继续每秒采样，但2小时以上也必须检查内存样本是否溢出。每场景10分钟、重复3次应分成三个单独 trace。停止期间不追加帧/CPU/事件；已知队列引用仍可在后续释放时更新。

时钟来源在 `metadata.clockSource` 中声明。浏览器优先 `performance.now`；没有该能力的平台回退到墙钟 `Date.now`，需要注意系统时钟调整。测试中的注入时钟不属于真实测量。

该工具的存在和单元测试通过，不等于目标设备性能验收。当前没有用户提供的真机，`deviceValidation` 固定为 `not-run`。低/中/高档设备、10分钟×3、2小时挂机、30次切换、真实后台恢复及热降频，仍按 `REGRESSION_TEST_PLAN.md` 另行验收。
