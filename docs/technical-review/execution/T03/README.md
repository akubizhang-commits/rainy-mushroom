# T03 — TapTap 普通小游戏离线转换实施报告

状态：本地实现、定向测试以及真实 Creator 3.8.8 完整游戏离线转换均通过。平台导入、账号及真机验收仍为 not-run，releaseEligible=false；这不是平台发布验收完成。

## 实现

- `scripts/cocos/build.mjs` 新增 `taptap-minigame` 分派，保留 Web/微信路径；`--release` 对 Tap 明确拒绝。
- `scripts/cocos/build-tap.mjs` 先 prepare/sync，再捕获 schema 2 指纹；Creator 输出仅写 `cocos-pilot/build/tap-wechat-intermediate`，显式关闭官方自动转换及删除微信源包的钩子。Creator 完成后以及转换/复制产物后分别重核源码、配置和工具链。有效 Creator 配置另做前后字节比较。
- `scripts/cocos/package-wechat.mjs` 导出无平台限额的 `prepareSubpackages`/`measurePackage`。`packageWechat` 继续严格保留主包/每分包 4 MiB、总包 20 MiB 的原项目预算。
- `scripts/cocos/tap-convert.mjs` 验证官方 ZIP 长度/hash、完整提取树 hash/文件数、随包依赖解析路径；依赖缺失直接失败，不调用 npm、不下载、不安装全局扩展。独立 scratch 中复制输入、重排分包、把平台字段改为 `subPackages`，保留 Cocos `settings.assets.subpackages` 及相同顺序；移除微信 project config/旧构建 stamp，横屏。
- `scripts/cocos/tap-worker.cjs` 在 Node permission 子进程中运行固定导出函数，写权限仅给专属 target 和 metrics 文件；源、插件只读，无子进程权限。阻断并记录常见 Node 网络/子进程入口，清理 Node/Babel/Browserslist 注入环境，禁止本地 Babel 配置及 `@babel` 跳过目录。
- 任何 Babel 逐文件失败、非零失败汇总、缺失/空汇总、npm 安装日志、worker 错误都拒绝签发成功 sidecar。失败日志和 scratch 不覆盖成功历史。
- `scripts/cocos/tap-verify-zip.py` 用 Python 标准库检查 ZIP 根、每个条目内容、CRC、重复/穿越/符号链接；ZIP 普通文件集合必须与 game 目录完全一致，规范化树摘要也必须一致。
- 新配置：`cocos-pilot/build-configs/taptap-minigame.json` 明确 `gameVersion=1.1.0`（独立于项目 `1.1.0-alpha.1`），账号字段全部空/未核实；`taptap-minigame.lock.json` 固定官方 1.2.2 ZIP 和提取树。
- `scripts/release-integrity.mjs` 接纳 Tap 平台。Tap 指纹的 `appid=null`，微信 ID 只在 `intermediateWechatAppId` 标注，不能冒充 Tap 身份。
- `package.json` 新增 `cocos:build:tap` 与 `cocos:test:tap`。

## 运行方法

依赖：Creator 3.8.8、Node 22+（本次测试 v22.22.2）、Python 3；已完整提取且未修改的官方 1.2.2 ZIP。包装不会下载任何缺失项。

```sh
TAP_PLUGIN_ARCHIVE=/private/tmp/t03-tap-minigame-official-1.2.2.zip \
TAP_PLUGIN_DIR=/private/tmp/t03-tap-plugin-readonly/taptap-minigame-tools \
npm run cocos:build:tap
```

`COCOS_CREATOR_PATH` 可指定本机 Creator 3.8.8 可执行文件。官方 ZIP/提取目录可换路径，但内容必须匹配锁定值。

输出为 `cocos-pilot/build/taptap-minigame/run-*/game/`、`game.zip`、`tap-build.json`、converter stdout/stderr/metrics、有效 Creator 配置与日志。`latest.json` 仅在成功时指向本轮 sidecar；新构建开始即清除旧 latest，历史 run 留存。失败会写 `tap-failure.json`，不写 `tap-build.json`。独立临时 input/output 保留供取证，其路径写入 sidecar。

包内 `tap-input-manifest.json` 记录输入/工具链、固定插件及未验证身份，`offlineConversion=not-run` 表示归档前状态。包外 `tap-build.json` 才记录离线通过、ZIP hash 与解包 tree hash，避免自引用 hash。无论离线是否成功，账号核实、平台导入、真机、包体规则都不由这条路径自动提升。

## 定向测试与 TDD 证据

新增行为测试 `tests/tap-conversion.test.mjs`，覆盖平台配置/分包顺序、输入不变、微信预算不变、缺依赖、官方包篡改、路径与符号链接保护、Babel 配置/空跳过目录、真实成功/部分失败、ZIP 异常、最终指纹失败和 CLI 隔离。

```sh
TAP_PLUGIN_ARCHIVE=/private/tmp/t03-tap-minigame-official-1.2.2.zip \
TAP_PLUGIN_DIR=/private/tmp/t03-tap-plugin-readonly/taptap-minigame-tools \
node --test tests/tap-conversion.test.mjs tests/cocos-package.test.mjs tests/release-integrity.test.mjs
```

最新结果：85 tests，85 pass，0 fail，0 skipped。日志 `.superpowers/sdd/IMPLEMENTATION_PLAN/task-3-marker-green.log`；首次核心实现 82/82 的日志另保存在 `/private/tmp/t03-targeted-tests.log`。未跑全量测试，按任务授权使用定向测试。未配置官方路径时，官方插件集成测试显式 skip，其余测试运行；本次以上命令没有 skip。

TDD 阶段日志：
- `/private/tmp/t03-red-tests.log`：入口/分离包装未实现，9 个预期失败。
- `/private/tmp/t03-integration-red.log`：前 9 项通过，Tap schema2/CLI 平台接入 3 项预期失败。
- `/private/tmp/t03-safety-red.log`：14 项通过，空 `@babel` 与输出 symlink 2 项失败后修复。

未更改游戏运行逻辑、素材或 T02 的测试文件。未 commit/push、上传、创建账号或安装全局扩展。

## 真实 Creator / 完整游戏证据

完整真实构建已执行成功，包装进程退出码 0。Creator 3.8.8 的成功退出码为 36；本轮实际完成标记 `build Task (tap-wechat-intermediate) Finished` 通过，随后固定官方 1.2.2 插件完成转换。UTC 构建记录时间 `2026-11-03T17:13:58.511Z`。

复跑命令就是上节的 `npm run cocos:build:tap`。日志和产物：

- 完整命令输出：`.superpowers/sdd/IMPLEMENTATION_PLAN/task-3-real-build-retry-1.log`。
- 输出目录：`cocos-pilot/build/taptap-minigame/run-OZHSaP/`。
- 游戏目录：`cocos-pilot/build/taptap-minigame/run-OZHSaP/game/`。
- ZIP：`cocos-pilot/build/taptap-minigame/run-OZHSaP/game.zip`。
- 最终 sidecar：`cocos-pilot/build/taptap-minigame/run-OZHSaP/tap-build.json`。
- Creator 和转换 stdout/stderr/metrics、有效构建配置均在该 run 目录。
- 原始 Creator 中间包：`cocos-pilot/build/tap-wechat-intermediate/`。
- 专属不可变 staging：`/private/var/folders/l0/8by043sj5x18nxcrxhx4zwgm0000gn/T/rainy-tap-hbqBd5/`。
- 独立二次复核：`.superpowers/sdd/IMPLEMENTATION_PLAN/task-3-real-build-evidence.json`。

实测产物：

| 项目 | 数值 |
|---|---:|
| ZIP 字节 | 129,717,349（123.71 MiB） |
| 解包总字节 | 133,123,274（126.96 MiB） |
| 主包字节 | 1,819,812 |
| internal 字节 | 182,481 |
| main 字节 | 2,043,083 |
| resources 字节 | 129,077,898（123.10 MiB） |
| 普通文件 | 796 |
| Babel | 成功 16、跳过 0、失败 0 |
| 子进程 / 网络入口调用 | 0 / 0 |
| 插件之外的第三方模块加载 | 0 |

ZIP SHA-256：`e2aeb784be5cea791e34b9567f7186b29e45edd290c226a172f0a0aa9690634f`。

game 目录树和 ZIP 条目树 SHA-256 均为：`82936ac0ccf71ba05ef36413a1315fe591f5a2801f8455c7db4466dbcfef4eb3`。

sourceDigest：`c8d018994ed9e5622d90eaaa432dfe5bfb40f6d6cb62854970d9213e208cf31a`；schema 2 inputDigest：`3eb7fefbd6acf133fe95f3c1135b5fb8992083f7577684146c2f6ce339ba1e06`。二次复核时当前 checkout 指纹匹配。后续若源码、配置或脚本再修改，此产物应按现有门禁视为过期。

二次独立复核 11 项全部为 true：当前指纹、原始中间包未变、staging 未变、插件未变、game 树摘要、ZIP 树摘要、ZIP 字节数/文件哈希、stdout/stderr/Creator 日志哈希。ZIP 验证再次逐条读取，CRC/条目内容/文件集合全部对应游戏目录。

输出 `game.json` 为横屏，使用 `subPackages`，顺序 `internal → main → resources`；`settings.assets.subpackages` 顺序保持一致；`productVersion=1.1.0`、`convertScriptVersion=2.0.4-ts`。微信 project config/旧 release stamp 不进入 Tap 游戏目录。Node 子进程实测插件和源不可写、target 可写、子进程权限关闭。

stderr 仅有两条 Babel 对超过 500 KB 的 `cocos-js/cc.js` 和 `subpackages/main/index.js` 代码生成格式降级提示，没有 Babel 转换失败。原素材未删除或压缩；ZIP 使用官方插件既有归档逻辑。当前资源量超过 123 MiB 是实测事实，Tap 限额与上传接受仍未验证，不能据此声称可发布。

### 真实构建暴露的完成标记误判及修复

首轮真实 Creator 已成功退出 36，但包装层错误地寻找 `build Task (wechatgame) Finished`。隔离配置使用 `outputName=tap-wechat-intermediate`，Creator 按这个 outputName 输出完成标记，导致原门禁误拒绝。完整首轮失败日志保存在 `.superpowers/sdd/IMPLEMENTATION_PLAN/task-3-creator-marker-failure.log`，首轮包装日志为 `task-3-real-build.log`。

修复仅将 `scripts/cocos/build-tap.mjs` 的标记匹配改为 `config.outputName`，退出码白名单和原错误日志正则保持。测试夹具改为与真实 Creator 相同的 outputName 规则；新增错误任务名、编译错误日志和失败退出码三项拒绝测试。

先运行 RED：正确 outputName 被拒绝、错误 wechatgame 标记被误接纳，两项失败（`task-3-marker-red.log`）；修复后定向 85/85 通过。随后本节真实完整离线构建和独立复核通过。此增量只有脚本标记匹配及契约测试变化，需由主代理完成定向复审。

## 尚未满足的原始验收项

- 无 Tap 后台账号/AppID/小游戏 ID：`tapGameId=null`、`tapAppId=null`、`accountVerified=false`。
- 未做 Tap 开发工具导入或账号上传：`platformImport=not-run`。
- 未做目标设备启动、存读档、进出战斗、分包下载、网络失败/重试、生命周期与性能：`device=not-run`。离线包装不证明 wx/tap 别名、GameGlobal.fetch、Cocos adapter/存储兼容。
- 官方文本的“60M+”尚无可执行精确口径；Tap 主包/单分包/总包以及压缩前后计算口径均保留 `unverified`/null，没有沿用微信限额，也没有降低微信预算。
- 固定导出函数不是官方承诺的稳定 CLI，升级需重新审核 ZIP/树及契约测试。
- Node permission 限制写入和子进程；网络入口阻断/计数为受控运行取证，不宣称对任意恶意插件建立完整 OS 网络沙箱。

因此 T03 只能完成当前具备条件的本地部分，不能宣称平台/设备原始验收完成。


## 独立审查与归档

首次完整实现由 t03_review 审查通过；真实构建后完成标记增量由 t03_marker_review 审查通过，未发现问题。后者独立重算 ZIP、Creator 与转换日志哈希，均与 manifest 一致。85/85专项，0跳过。

本目录 `.gz` 为同名原始证据的无损压缩，evidence.json 记录解压后哈希。完整生成包保留在工作区构建目录，不纳入源码。未提交描述为实施交接时状态。后续源码改变会使这份构建证据对应的指纹过期，应重建候选。
