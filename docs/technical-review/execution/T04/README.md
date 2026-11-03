# T04 实施报告：构建时封闭开发能力

已完成本地实现、独立生产/QA构建与编译产物行为验证，尚未提交或推送。未改玩法数值、美术/VFX、普通存档事务、T03转换隔离、T05恢复逻辑。原始源码与当前生成能力均为 production。

## 实现边界

- 新增 scripts/build-profile.mjs，只有 production / qa 两个合法值。未传参数默认 production；显式 `--profile=qa` 或 `--profile qa` 才开启。重复、缺值或拼错 profile 立即失败。`--release` 与 QA 同时出现会在准备/构建之前拒绝，保留此前独立候选。
- prepare-release-config 生成不可变 `TowerBuildCapabilities.ts` 和固定 UUID meta。运行时没有 URL、localStorage、外部 host 参数切换能力的接口。生成文件必须完整匹配标准 production 或 QA 内容，指纹捕获拒绝损坏/手改形状。
- schema2 指纹把实际生成源中的 profile 纳入 identity、inputDigest 与验证字段。它不是仅相信 CLI 自报 profile；两个构建入口还检查准备结果与请求一致。旧缺 profile 的 stamp 需重建。check-release 无论提交或发布模式都拒绝 QA。官方 Tap 转换会保留 profile，既有 `releaseEligible=false` 不变。
- towerStorage 默认 `allowPlaytestTools=false`，只有严格布尔 true 启用。底层存储自带的 permission 不会自动继承；现有隔离纯逻辑 playtestStorage 保留原能力。Campaign 已有不可写 permission 和全部开发动作检查继续生效。
- TowerView 仅在 QA 读取工具偏好、挂载菜单和暂停工具入口、开放 showTools/changeTools/editPlaytest/resetProgress。生产 applyTools 始终关闭辅助，帧推进固定1倍，即使测试直接改写 tools 对象也无效。普通同步、保存、战斗与菜单行为保留。
- `?smoke=1` 仍只选择 PinePilot 既有内存存档；`__towerTest` 要求 QA 构建和 smoke 双条件。生产加 `smoke/playtest/profile=qa` 查询仍无权限、无 hook。

## 测试与红灯

- task-4-storage-red.log：新增4项中的3项失败；默认 adapter 实际仍 true，profile模块尚不存在。纯逻辑授权正向控制通过。
- task-4-host-red.log：生产拒绝用例失败于 actual permission=true；QA两例先通过，证明新测未要求破坏开发行为。
- task-4-storage-green.log：默认拒绝、显式QA、现有开发事务/十层规则共20/20。
- task-4-targeted.log：`TAP_PLUGIN_ARCHIVE=/private/tmp/t03-tap-minigame-official-1.2.2.zip TAP_PLUGIN_DIR=/private/tmp/t03-tap-plugin-readonly/taptap-minigame-tools node --test tests/build-capabilities.test.mjs tests/release-integrity.test.mjs tests/tap-conversion.test.mjs tests/cocos-package.test.mjs tests/xianxia-developer-tools.test.mjs tests/xianxia-ten-layer-realms.test.mjs tests/xianxia-material-feedback.test.mjs`，116/116，0 skipped/todo/cancelled。
- task-4-host-final.log：`node --test --test-name-pattern=T04 tests/xianxia-tower-host-tools.test.mjs`，3/3。此结果只代表新增 T04 用例，不表示该文件旧规则全绿。
- task-4-check.log：npm run check 通过；限定19文件 diff --check 通过。未运行全量测试。

两组测试合计119个不同用例；下面3项编译产物检查是同一组Host用例的再次执行，不计为新用例。

## 真实构建与编译产物

已与主代理协调冻结全部构建输入，按 QA → 默认 production 顺序执行真实 Creator 3.8.8 Web 构建。两个命令均 exit0，Creator 内部成功 exit36，完成标记及原错误门禁通过。

|配置|命令|保留输出|
|---|---|---|
|QA|npm run cocos:build -- --profile=qa|cocos-pilot/build/t04-qa-8w1JHj|
|production|npm run cocos:build|cocos-pilot/build/t04-production-PqIcqp|

构建命令日志为 task-4-qa-build.log / task-4-production-build.log，完整 Creator 日志为 task-4-qa-creator.log / task-4-production-creator.log。task-4-*-build-evidence.json 保存各自完整 stamp、原始输入文件逐项 SHA、Creator日志哈希、bundle与输出路径。task-4-dual-build-check.json 是独立对照：**所有被指纹覆盖的输入中，只有 cocos-pilot/assets/scripts/TowerBuildCapabilities.ts 不同，工具链完全相同**。sourceDigest/inputDigest 正因此有意不同。

|配置|sourceDigest|inputDigest|
|---|---|---|
|QA|2168a7a68953b81bec463588b23c8cfa8c60d6fd2f994369c8270b90fbb6d1e5|d784ace964a52c8009299b0fee8ae210c3ef58bb448883ba15157c55aa3d5f2f|
|production|489704db1762b2c61d3ab2684865cecb6666ad7b0d94ee85963e9b4bddee055d|adffaa6bd7b251dd615bd903dac189347f66e2663667b699b9e97c9b5821fecc|

现有 Host 测试增加可选 `TOWER_CAPABILITY_BUNDLE=/absolute/path/assets/main/index.*.js`，执行真实 Creator emitted TowerView、TowerBuildCapabilities 和 Babel helpers，其他渲染/业务模块沿用明确的测试边界。QA两项、production一项全部通过，日志分别 task-4-qa-compiled-host.log / task-4-production-compiled-host.log。

编译测试首次运行暴露测试 VM 的全局 window 未注入：System.register declaration 在早期无浏览器 VM 中闭包创建，模块setter的context不等于该VM全局。采用 systematic-debugging 追踪后，仅给同一注册VM注入与原宿主测试一致的浏览器边界，真实编译产物无需改动。原红灯保留 task-4-qa-compiled-host-boundary-red.log。

这证明真实构建产物的能力与Host控制分支；Cocos渲染/存储边界仍是测试替身，**不声称实际浏览器 GPU、Tap导入或真机验收**。解除冻结后后续 T06 源码变更会使这两份历史产物的指纹自然过期；它们仍保留为本次双构建证据。

## 修改清单与交接

精确19文件见 task-4-files.json；交接内容 SHA 见 task-4-files.sha256.json；包含新文件的完整限定差异见 task-4-review.patch。

两个现有纯逻辑工具测试仅把 towerStorage(disk) 改成 towerStorage(disk,true)，不改数值断言。material-feedback 仅在 VM 补 production 能力依赖。host-tools 保持默认QA测试边界以免把旧UI规则工作混入T04；原 assisted / URL 相关旧断言仍由 T02F 按现行规则审查。

主代理后续新增资源模块会同步 shared-manifest.json，此处该文件只拥有 TowerPlaytest 的 sha256 变更，合并提交时保留其他任务的新增条目。独立评审完成前，不改变T04生产实现。


## 独立复审

t04_review：规格与质量 Approved，无 Critical/Important。19文件哈希匹配；119个不同用例通过；独立重算双构建 inputDigest 和 Creator 日志哈希，确认仅能力TS不同。后续T06源码变化已令历史构建指纹过期，需重新生成新候选。报告中的未提交描述为实施交接时状态。

本目录gz证据为无损压缩，evidence.json记录解压后哈希。
