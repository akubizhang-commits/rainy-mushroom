# 技术审计总览 · 第一轮

本轮只读生产代码，新增本目录的审计文档、证据和可重复探针；未修改游戏数值、素材、存档或构建配置。技术方案尚待用户确认，Task Board 中的优化任务均未执行。

## 结论

保留 Cocos Creator 3.8.8、纯 JS 战斗逻辑和现有事务存档。项目有继续迭代的基础，当前不能认定已达到 TapTap 正式上线要求。优先封闭发布版开发者权限、修复失效测试门禁、建立 TapTap 转换构建，再按真实设备测量调整资源分包和驻留。

没有证据要求重写游戏或迁移引擎。也没有证据表明现有正式存档已经损坏。主要发布阻断是工程门禁、平台交付链和开发功能隔离，而不是“架构不够先进”。

## 基线与范围

- 起点 HEAD：`f01dfa5`；工作树在审计前已有约 1700 条状态记录，包含当前玩法新增文件、旧玩法删除和历史修改。HEAD 不是当前交付源码。
- `evidence/source-baseline.json` 记录 734 个 JS/TS/脚本/测试文件的 SHA256、行数和初始 Git 状态。包含生成副本，不代表734个独立业务模块。
- 活跃入口：`cocos-pilot/assets/scenes/PinePilot.scene` → `PinePilot.ts` → `TowerView.ts`。README 明确唯一玩法为横屏宗门与九层锁妖塔。
- 根 `js/` 是逻辑源；`cocos-pilot/assets/scripts/shared/` 是同步生成副本，禁止两边分别修改。
- 生产表现：`cocos-pilot/assets/scripts/`；运行资源：`cocos-pilot/assets/resources/`；历史源素材：`design/`；旧验收资料：`reports/`、`docs/release/`。历史报告不是当前版本通过证明。
- 根 package 未声明 npm dependencies/devDependencies；Creator版本3.8.8。package.version也是3.8.8，发布记录产品版本为1.1.0-alpha.1，应分开看。
- 采用 using-superpowers、prime-codebase、用户指定 game-developer 的审计视角；没有套用 Unity/ECS/LOD 重构模板。

## 实际验证结果

| 验证 | 本轮结果 | 边界 |
|---|---|---|
| `npm test` | 2088项：1525通过、563失败，退出1 | 当前基线不是全绿；不把563个失败全部当作563个生产Bug |
| `npm run check` | 通过 | 语法/路径检查，不是完整TypeScript类型检查 |
| 静态相对依赖扫描 | 未发现环或缺失目标 | 根JS+表现TS的静态声明；不是动态依赖证明 |
| Web产物摘要 | 与当前digestSource一致 | 本轮未重新执行Creator构建；摘要本身不覆盖构建脚本 |
| 微信产物摘要 | 与当前源码不一致 | 不能作为当前版本验收包 |
| 浏览器内存档 | 宗门→战斗→暂停→退出，5次循环完成 | 桌面，非TapTap，非手机；不写玩家档 |
| 暂停快照 | 500ms内保持一致 | 短时验证 |
| 引擎帧间隔 | 360帧：P50 16.70ms，P95 18.30ms，最大19ms | 6秒桌面轻负载；非CPU耗时/非GPU时间 |
| 纯逻辑基准 | 28800 tick；advance P95 0.362ms | Apple M4 / Node22，第一层驻足，最多16怪 |
| snapshot+checkpoint | 640次，P95 1.426ms | 内存存储，不含设备同步I/O |

## 最优先事项

1. 发布版目前可使用开发者发资源/无敌/加速/重置：应以构建能力和存档权限双重隔离。
2. 测试门禁失效：291项失败是缺类引用错误，剩余数值/规则失败要逐项裁决，不可批量改断言。
3. TapTap官方支持Cocos3.8.x转换；当前只有微信/Web命令和微信发布审查，缺少实际Tap包与真机证据。
4. 资源约123.06 MiB（不含meta），现存Web构建131.18 MiB。首次宗门资源传输观测14.03 MiB，进第一层后累计53.90 MiB；压缩磁盘大小与GPU内存必须分开。
5. 加载回调抛错仍标记完成已由探针复现，应让必需资源的绑定失败进入重试/错误态。

## 阅读路线

- [架构及完整问题登记](ARCHITECTURE_REVIEW.md)
- [引擎](ENGINE_REVIEW.md)、[性能/内存](PERFORMANCE_REVIEW.md)、[资源](ASSET_OPTIMIZATION.md)、[平台](PLATFORM_COMPATIBILITY.md)
- [实施方案](REFACTOR_PLAN.md)、[任务板](TASK_BOARD.md)
- [回归计划](REGRESSION_TEST_PLAN.md)、[发布清单](RELEASE_CHECKLIST.md)

本轮结束点是方案评审。建议先批准T01–T04的低风险治理与平台验证；T05–T10按取证结果分批推进，不把美术制作和剩余玩法开发全部阻塞。
