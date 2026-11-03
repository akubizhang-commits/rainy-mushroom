# 技术治理执行计划

对应用户已批准的任务板T01–T09。用户确认采用TapTap普通小游戏官方转换；暂未创建AppID且无真机。真实平台/设备验收保持待完成。不得修改游戏数值，不降低清晰度/技能特效，不删除源素材。每个Task独立验证；T08/T09是有测量依据才执行的条件任务。

## Task 1 — T01

建立可回滚发行基线

- 优先级/里程碑：P1 / M0；前置：T00。
- 所属模块/涉及文件：`scripts/release-integrity.mjs；发行manifest`。
- 具体操作：确认工作树所有权；建立用户认可的源码快照；补工具链/配置哈希。
- 风险：漏收未跟踪现行源码。
- 验收标准：固定输入可重复构建且产物可映射至源码。
- 测试方案：改任一构建输入应使旧manifest失效。
- 工作量：S；状态：已授权，按前置顺序执行。


### T01补充实现边界

保留旧digestSource算法与sourceDigest字段供审计兼容，增加schemaVersion=2、platform、inputDigest、toolchain。正式门禁拒绝仅有旧stamp的候选。输入包含旧四目录、构建scripts、package配置、release/settings.json、build-templates、可选lockfiles和插件目录（记录存在性）。工具链至少包含实际Node版本/执行文件摘要和Creator实际版本/发行info摘要；明确不是整套引擎每文件完整性校验。构建前捕获指纹，包装完成后复核，变化则失败。stamp必须在packageWechat及附加文件操作成功后写入。参数可注入临时root/toolchain用于有意义的文件变更测试，不加入游戏运行依赖。不要更改画面或玩法。

## Task 2 — T02

恢复有判别力的测试门禁

- 优先级/里程碑：P1 / M1；前置：T01。
- 所属模块/涉及文件：`tests/helpers；host-tools/inventory等测试`。
- 具体操作：先补VM新增依赖，再分组裁决数值、schema和业务失败。
- 风险：错误放宽有效断言。
- 验收标准：有效现行规则套件全绿；每个废弃测试有依据；无未解释失败。
- 测试方案：复跑全量并比对失败名字；关键存档负向测试。
- 工作量：L；状态：已授权，按前置顺序执行。


## Task 3 — T03

验证Tap转换与平台构建

- 优先级/里程碑：P0 / M1/M4；前置：T01。
- 所属模块/涉及文件：`scripts/cocos/build.mjs；build-configs；Tap适配插件配置`。
- 具体操作：锁插件；独立输出Tap包；核对二次分包顺序、上下文和AppID。
- 风险：转换与packageWechat冲突。
- 验收标准：Tap开发工具及至少一台目标设备能启动、存读、进出战斗；取得包体上限。
- 测试方案：平台工具导入、日志、manifest、网络及生命周期冒烟。
- 工作量：M；状态：已授权；离线准备中，账号设备待具备。


### T03离线实施边界

使用官方1.2.2下载包（来源及哈希见TAPTAP_CONVERSION_RESEARCH.md），不修改插件代码、不安装到全局Creator目录，不启用与项目二次分包顺序冲突的自动hook。由项目包装固定版本的convertWechatToTap导出函数。缺依赖直接失败，禁止隐式npm install。转换源/目标限定专属staging且互不包含，校验符号链接/路径穿越；原源码和插件前后哈希不变。先最小fixture，后实际中间包。

Tap输出独立于Web/微信，平台game.json使用subPackages，保留Cocos settings.assets.subpackages。分离路径重排/测量与微信4/20MiB预算，微信原门禁不得放宽；Tap限额未知必须写unverified。官方导出函数非稳定公开CLI，用版本/hash及契约测试固定它。记录Tap身份未验证、platformImport/device为not-run、releaseEligible=false；禁止把微信AppID伪装成TapAppID。检查所有Babel失败日志，不能只看ZIP存在。包内manifest记录输入/工具链，包外sidecar记录ZIP及解包tree哈希。真实平台/真机验收继续待具备条件。

## Task 4 — T04

封闭发行版开发者权限

- 优先级/里程碑：P0 / M1；前置：T01,T02。
- 所属模块/涉及文件：`TowerPlaytest.js；TowerView.ts；TowerMenu.ts；发行配置`。
- 具体操作：编译环境标识；生产存储拒绝开发动作；隐藏入口且不读取辅助偏好。
- 风险：误破坏开发调试或普通行为。
- 验收标准：生产无法通过UI/直接action发资源、无敌、加速；QA仍可用。
- 测试方案：同源码生产/QA双构建；直接动作负测及已有存档测试。
- 工作量：M；状态：已授权，按前置顺序执行。


### T04补充边界

默认构建必须关闭开发工具，QA通过显式构建参数开启；不使用URL、localStorage或外部传参作为发行版开关。复用项目既有生成配置流程；如新增TS能力配置，提交确定的meta。towerStorage默认不给allowPlaytestTools，只有构建能力允许时由Host显式启用。生产Host不读取工具偏好，不提供菜单tools回调，showTools/changeTools/editPlaytest/resetProgress和applyTools需有相同守卫；速度固定为1、无敌固定为false。现有memory-only smoke模式不得赋予生产开发权限，QA调试钩子受构建能力控制。保持正常存档事务和既有纯逻辑playtestStorage测试能力。验证同源码QA/production的Host行为与直接Campaign动作拒绝。构建manifest记录profile，发行门禁拒绝QA。

## Task 5 — T05

修复资源绑定失败状态

- 优先级/里程碑：P1 / M2；前置：T02。
- 所属模块/涉及文件：`TowerAssetQueue.ts；TowerLoadingScreen.ts；加载测试`。
- 具体操作：区分传输/绑定，记录失败，幂等重试，明确可选项降级。
- 风险：重试重复绑定或永远遮罩。
- 验收标准：抛错不假完成；重试不重复节点/引用；成功恢复。
- 测试方案：故障注入throw、404、timeout、destroy晚回调。
- 工作量：M；状态：已授权，按前置顺序执行。


### T05补充边界

失败必须分清传输与单个绑定：资源成功addRef一次，已成功绑定不随另一个绑定重试；缓存命中回调抛错也必须计入当前阻塞批次。手动重试只重试失败绑定，保留成功资产，不重新请求/重复addRef。回调执行过程中新增依赖保持阻塞；dispose后晚回调不绑定；现有非阻塞运行时加载不可重新打开遮罩。不要承诺通用回调副作用可以自动回滚；检查实际受影响回调并确保其自身可重试，或明确提供清理契约。现有AudioClip可选降级保持有效并加入针对性验证。

## Task 6 — T06

资源发行清单与分组加载

- 优先级/里程碑：P1 / M3；前置：T03,T05。
- 所属模块/涉及文件：`resources组织；TowerResources；package-wechat；构建配置`。
- 具体操作：可达性清单；候选旧版排除发行；分组或远程加载；保留归档。
- 风险：动态路径漏掉资源。
- 验收标准：满足核实后的平台大小上限；首屏/全路径无缺资源。
- 测试方案：所有楼层/技能路径、弱网、哈希、四口径大小前后对比。
- 工作量：L；状态：已授权，按前置顺序执行。


## Task 7 — T07

目标设备性能基线

- 优先级/里程碑：P1 / M2/M3；前置：T03,T04,T05。
- 所属模块/涉及文件：`验收脚本；profile开关；性能报告`。
- 具体操作：测十种场景，收帧间隔、CPU分段、纹理、Heap、加载和热降频。
- 风险：模拟器结论外推真机。
- 验收标准：低/中/高设备基线明确，原始trace可追溯。
- 测试方案：按REGRESSION_TEST_PLAN；每场景重复3次。
- 工作量：M；状态：已授权；本地工具可做，设备待具备。


## Task 8 — T08

按测量治理纹理驻留

- 优先级/里程碑：P1 / M2；前置：T06,T07。
- 所属模块/涉及文件：`TowerAssetQueue；TowerResources；MonsterArt及高占用Art`。
- 具体操作：给加载组所有权；零使用资源淘汰；先妖猪/技能组试点。
- 风险：提前释放或频繁重下载。
- 验收标准：同场景30循环趋稳，目标设备无内存告警，画质不退。
- 测试方案：引用计数、切层、暂停、死亡、背景恢复，内存峰值对照。
- 工作量：M；状态：条件执行。


## Task 9 — T09

按测量优化快照与绘制热点

- 优先级/里程碑：P2 / M3；前置：T02,T07。
- 所属模块/涉及文件：`TowerCampaign；TowerRun；TowerView；TowerDepthOrder`。
- 具体操作：分项profile；先脏标记/跳过不变排序，再考虑重复拷贝。
- 风险：改变碰撞顺序或事务语义。
- 验收标准：热点成本下降且回放/数值/原子性一致。
- 测试方案：固定seed事件轨迹、失败写入、p95/p99前后同设备。
- 工作量：M/热点；状态：条件执行。


