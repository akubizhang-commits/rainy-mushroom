# T01 实施报告 — 构建输入与工具链指纹

## 范围与所有权

- 在主代理指定的独立工作区 `/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom` 实施，源码基线为 `bf2c50f`。遵循 `AGENTS.md` 和 `task-1-brief.md` 的补充边界。
- 本任务仅修改 3 个构建/发行脚本并新增 1 个测试文件；未改玩法、数值、素材、包体预算，未 commit、push 或派生子代理。
- 主代理更新的 `docs/technical-review/TASK_BOARD.md`、未跟踪的 `docs/technical-review/IMPLEMENTATION_PLAN.md` 不属于本任务改动。初次旧门禁红灯测试产生的 `docs/release/preflight-report.json` 已恢复至测试前内容。
- 实际门禁脚本位于 `scripts/check-release.mjs`，不存在 `scripts/cocos/check-release.mjs`。

## 改动文件与行为

### `scripts/release-integrity.mjs`

- 保留旧四目录、路径拼接、文件排序和字节连接算法，保留 `sourceDigest`；仅为 `digestSource` 增加可选临时 root 参数。固定手工构造夹具的旧算法 SHA-256 断言通过。
- 增加 `schemaVersion: 2`、`platform`、`inputDigest`、`inputs` 和 `toolchain`。指纹使用排序且无歧义的 JSON 描述与 SHA-256；不依赖 Git 跟踪状态，未跟踪的当前构建输入同样纳入。
- 必选输入：原 `js`、`cocos-pilot/assets`、`cocos-pilot/settings`、`cocos-pilot/build-configs` 四目录，整个 `scripts` 目录，根及 Cocos 的 `package.json`，`project.config.json`，`cocos-pilot/tsconfig.json`，`release/settings.json`。
- 可选输入：根和 Cocos 的 `build-templates`、`extensions`、`packages`，根 `tsconfig.json`、两处 `.npmrc`，以及两处 `package-lock.json`、`npm-shrinkwrap.json`、`yarn.lock`、`pnpm-lock.yaml`、`bun.lock`、`bun.lockb`。每项在 manifest 的 `inputs` 中明确记录 missing/file/directory/symlink；空目录出现亦改变指纹。
- 递归内容摘要纳入路径、类型、文件内容；符号链接同时纳入目标文字及目标内容，循环链接失败关闭。`.DS_Store` 沿用忽略规则。构建输出、临时编译目录、package report 和发行检查报告不作为输入。
- 实际工具链记录运行当前脚本的 Node 版本与执行文件 SHA-256，所选 Creator 执行文件 SHA-256、安装包 `Info.plist` 的实际版本及文件 SHA-256、`Resources/info.json` SHA-256。
- `readToolchain` 当前支持项目既有 macOS `.app` 安装布局。记录的 `scope` 明确为 `executable-and-release-metadata-only`；不是整套引擎每文件的完整性校验。
- `captureBuildFingerprint` / `verifyBuildStamp` 支持临时 root/toolchain 注入，未加入游戏运行依赖。校验同时比对平台、版本、AppID、两类摘要、输入清单及工具链声明，拒绝仅旧 stamp、错误平台和声明被改写的记录。

### `scripts/cocos/build.mjs`

- 构建流程启动前清除目标目录的旧 stamp，防止本次失败后继续留下旧的有效记录。
- `prepare-release-config` 和 `sync-shared` 成功后、调用 Creator 前捕获指纹，避免把预期的生成文件写入误判为构建中途漂移。
- Creator 成功、web loading 图拷贝或微信 `packageWechat` 与 package report 写入都成功后，重新读取输入与实际工具链；任一变化均失败，不写 stamp。
- `stampBuild` 放到所有上述包装和附加文件操作之后。保留既有 Creator 成功码/完成标志检查、4 MiB / 20 MiB 包体预算和 `--release` 严格门禁。

### `scripts/check-release.mjs`

- 正式发行与提交预检查统一调用 schema 2 校验；仅旧源码 stamp 不再通过。
- 保留原有发布资格、配置一致性、预算检查；校验错误消息说明缺失/旧 schema/输入或工具链变化。
- 添加 root/creator/toolchain 可选注入，便于用真实临时目录进行门禁行为测试。

### `tests/release-integrity.test.mjs`

- 新增 57 个行为测试：旧摘要兼容、目录重定位和对象键顺序稳定性、17 种核心输入修改、12 种锁文件出现、6 类可选目录缺失/空目录/内容/删除、未跟踪源码增删、输出排除、6 项工具链变化、平台/声明篡改、构建中途漂移、旧门禁拒绝与新门禁接受、实际安装信息读取。
- CLI 集成夹具只替代外部 Creator 进程，实际运行现有发布配置生成、共享源码同步、微信拆包和构建入口；覆盖 web/微信成功及缺少 bundle、Creator 失败、源码变化、工具链变化、package report 写失败、web 附加图片缺失六类失败，全部断言不遗留旧/新 stamp。

## 红绿测试证据

- 首轮核心红灯：49 失败，原因是没有完整输入捕获/校验与工具链 API，旧摘要不能对临时 root 求值，旧门禁没有隔离 root。见 `task-1-core-red.log.gz`。
- 核心实现后中间状态：48 通过，剩余 1 项门禁集成失败。见 `task-1-core-intermediate.log.gz`。
- 修正 Creator 测试替身的 ESM 语法后，集成红灯重新确认 8/8 失败：旧调用没有构建前指纹、旧 stamp 在失败时仍存在。此处记录的是消除夹具错误后的红灯，见 `task-1-integration-red.log.gz`。
- 最终定向命令：`node --test tests/release-integrity.test.mjs tests/release-readiness.test.mjs tests/cocos-package.test.mjs`，67/67 通过（新增 57 + 既有 10），0 失败。见 `task-1-targeted-green.log.gz`。
- `npm run check` 通过，输出 `Source syntax and dependency checks passed`。
- `git diff --check` 通过。

## 全量结果与基线差异

- `npm test` 完整运行：2145 项，1582 通过，563 失败，0 cancelled / skipped / todo。
- 比对基线 `docs/technical-review/evidence/checkpoint-tests.log`（2088 项，1525 通过，563 失败），以每个 `not ok` 的测试名称多重集合比较：新增失败 0，消失失败 0；全部 563 个失败与基线名称及次数完全一致。
- 结果不是“全量绿灯”：既有 563 项失败仍然存在，没有在 T01 范围内修复或隐藏。
- 全量原始日志：`task-1-full-tests.log.gz`；逐项失败名称列表：`task-1-failures.json`；机器可读比较：`task-1-failure-comparison.json`。所有失败均逐名记录在这两个证据文件中。全量测试由既有 `xianxia-sword-flow-specialization.test.mjs` 生成的未跟踪 `two-slot-budget.json` 已移到本目录 `task-1-two-slot-budget.json` 保留，避免混入实现改动。

## 实机只读核验

- 实际 Node：`v22.22.2`；执行文件 SHA-256：`463b47d6e984e4f84cd2421dabf5081414e40ab9d967e828b2db7858e707f6de`。
- 实际 Creator：`3.8.8`；执行文件 SHA-256：`3a8452496c03e85f2784e64679a1fd203701b0b245125efee02c7923f2bd3464`。
- Creator release info SHA-256：`81113c42d452325e222cb1e1a935524a2c428af1d5c17cc04091236939713ca2`；Info.plist SHA-256：`ce05c91cbc65f0407685762c28bd4eaa87bd60dff0f147e191787df04c41b6d6`。
- 对当前工作区连续两次捕获 web-mobile 指纹，31 个顶层输入条目，结果一致。采样 `sourceDigest`：`d111e21e2f5f6169852ef1f0c81290715dffcf48f62ba118ee698204dfac8e3c`；`inputDigest`：`93ffb797b0daf00ebda11fe681599120e17bfdfd0548a60e7d3bf90826b54958`。

## 明确限制与后续验证

- 遵照主代理要求未运行真实 Creator 构建；真实 web/微信输出验证由主代理统一安排，避免缓存与生成内容噪声。
- 证明的是构建输入及所声明工具链可重复采集、可复核，以及 build/preflight 的拒绝与写 stamp 顺序。**未证明或承诺二进制产物字节级可复现**，未新增输出内容摘要；`builtAt` 本身也随构建时间变化。
- Node 执行文件及 Creator 执行文件/版本元数据已纳入，但 Creator 引擎目录全部文件、操作系统等环境不是本任务完整性承诺范围。
- 微信现有素材体积超过项目既有预算的已知问题不在 T01 修复范围，预算未放宽，留给 T06；此事实来自主代理基线说明，不是本次真实打包结果。
- 旧 stamp 必须重新构建后升级；该行为是正式门禁的预期收紧。


## Fix1 — Creator 首次构建的嵌套空目录误报

### 原因证据

主代理随后执行真实首次 web-mobile 构建：Creator 已成功完成，但首次启动新增空目录 `cocos-pilot/settings/v2/default-profiles`。旧 `inputRecord` 把所有嵌套目录条目都作为输入内容，因此最终复核将该空目录识别为输入漂移。

在修改实现前，复制全部已记录的构建输入到临时副本，使用相同工具链信息重算：副本与主代理的构建后 fingerprint 完全一致（inputDigest `08adf0a6d8f25f32dea0aa815a28308ed9b99dcfa134854cf0aed705110b014e`）。确认该目录为空后，仅在临时副本移除它，inputDigest 恢复为原报告记录的 `93ffb797b0daf00ebda11fe681599120e17bfdfd0548a60e7d3bf90826b54958`；只有 `cocos-pilot/settings` 顶层摘要变化，sourceDigest 始终为 `d111e21e2f5f6169852ef1f0c81290715dffcf48f62ba118ee698204dfac8e3c`。由此确认实际差异仅此空目录。

证据：`task-1-fix1-proof.json`。工作区原目录和文件均未删除；临时副本已清理。原始失败日志由主代理提供：`/private/tmp/t01-real-web-build.log`。

### 修复与回归

- `scripts/release-integrity.mjs`：只为显式输入根保留 directory 条目，不再让嵌套空目录及空目录链参与内容摘要；文件的完整相对路径和内容、符号链接路径/目标/引用内容继续纳入。可选根目录 missing 与 empty-directory 仍有区别。
- `tests/release-integrity.test.mjs`：新增 5 项回归，覆盖嵌套空目录新增/删除、可选根与嵌套空目录的区别、非空目录改名及文件内容变化、指向空目录的符号链接及目标内容变化，以及 Creator 替身在编译期间新建该目录后成功落 stamp 的 CLI 路径。
- 精准红灯：5 项中 3 失败、2 通过；三项失败均为预期 inputDigest 漂移，路径/符号链接保护用例先行通过。见 `task-1-fix1-red.log.gz`。
- 修复后执行 `node --test tests/release-integrity.test.mjs tests/release-readiness.test.mjs tests/cocos-package.test.mjs`：72/72 通过，0 失败（新增测试累计 62 项）。见 `task-1-fix1-green.log.gz`。
- `node --check scripts/release-integrity.mjs`、`git diff --check` 通过。遵照 fix1 指示未重跑全量；上文 2145/1582/563 为初版 T01 的历史全量结果，不代表 fix1 后再次执行。
- 未再次启动真实 Creator；本次 CLI 回归使用可控 Creator 替身，真实 web 复验仍由主代理安排。不宣称二进制产物字节级可复现。

### 修复后只读指纹复核

保留工作区 Creator 新增的空目录，对当前输入连续捕获两次，结果一致。sourceDigest 未变化；修复脚本本身属于构建输入，因此 inputDigest 会与初版不同。

- sourceDigest：`d111e21e2f5f6169852ef1f0c81290715dffcf48f62ba118ee698204dfac8e3c`。
- inputDigest：`0f41cfa38303874f6eca0f0a2c27b5df16127c6165bb0e3570dd4a4383c0e387`。
- 证据：`task-1-fix1-fingerprint.json`。
- fix1 未改 `scripts/cocos/build.mjs` 或 `scripts/check-release.mjs`，未改其他代理的测试文件，未 commit。

## 主代理真实构建验收

修复后两次实际 Creator Web 构建成功，sourceDigest 与 inputDigest 均一致；第二次产物通过 verifyBuildStamp。见 actual-web-result.json。真实微信最终预算校验仍留在平台/资源任务，未宣称其通过。初次空目录误报及修复结果均保留；独立评审的初审与 fix1 复审没有未解决代码问题。基线源码快照 bf2c50f 已按用户要求推送并核对远端一致。

原始日志以无损 `.log.gz` 保存，解压后的字节与运行输出一致；没有整理或删改失败诊断。
