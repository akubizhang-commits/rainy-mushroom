# T03 — TapTap 官方 Cocos 转换插件只读研究

初始只读研究阶段状态（最新离线执行结果见第 9 节）：**完成源码与官方文档研究；该阶段未安装/导入/运行插件，未执行 npm install，未创建账号，未上传包，未做容器或真机兼容性验收。** 第 1–8 节保留当时的研究结论；第 9 节记录后续单独授权的最小 fixture 转换。

研究工作区：`/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom`。生产源码与配置没有由本研究修改。

## 1. 官方来源及下载锁定

本次从项目 `docs/technical-review/evidence/platform-sources.json` 中的 canonical 地址重新读取了当前官方页面：

- Cocos 官方接入页：<https://developer.taptap.cn/minigameapidoc/dev/engine/Cocos-Laya-Egret/>
- 该页当前唯一 Cocos 插件下载（页面标注 1.2.2）：<https://app-res.tapimg.com/file/2026-04-14/67e7d94f5e586596dab061816d1c509d.zip>
- 分包规范：<https://developer.taptap.cn/minigameapidoc/dev/tutorial/basic/subpackage/>
- game.json 配置：<https://developer.taptap.cn/minigameapidoc/dev/dev-support/config/>
- 账号信息返回结构：<https://developer.taptap.cn/minigameapidoc/dev/api/open-api/account-info/tap.getAccountInfoSync/>
- 真机调试：<https://developer.taptap.cn/minigameapidoc/dev/dev-support/debugging/>
- 创建小游戏及包体上传：<https://developer.taptap.cn/minigameapidoc/quick-start/guide/creation-improvement/>
- 开发概览（与细项配置页有大小写差异）：<https://developer.taptap.cn/minigameapidoc/quick-start/guide/dev/>

下载文件：`/private/tmp/t03-tap-minigame-official-1.2.2.zip`

- ZIP SHA-256：`6b8a9a3cc62b6c54cefab397097babb771d9d99f90442cddff06310a4c9ed73f`
- ZIP 文件长度：13,755,538 bytes。
- ZIP 共 6,180 个条目，解压前累计文件长度 51,168,238 bytes。
- 只读检查位置：`/private/tmp/t03-tap-plugin-readonly/taptap-minigame-tools/`
- 当前页面 HTML：`/private/tmp/t03-cocos-official.html`。其他页面已保存在 `/private/tmp/t03-*.html`。

版本有三个不同来源，不能混为同一值：

| 字段 | 实际值 | 证据 |
|---|---|---|
| 官方下载页版本 | 1.2.2 | Cocos 官方页 |
| package.json.name / version | taptap-minigame-tools / 1.2.2 | 插件 package.json |
| dist/main.js 日志版本 | 1.2.0 | main.js:11，明显未与 package 版本同步 |
| 转换脚本版本 | 2.0.4-ts | dist/converter-ts.js:51，写到 game.json.convertScriptVersion |
| editor 范围 | >=3.8.0 | package.json；官方页写 3.8.x 及以上 |

README 声称 3.8.1、3.8.8 已由插件提供方测试；这只能支持选择本项目 3.8.8 进行验证，不能作为本项目已通过兼容性验收。

关键文件 SHA-256：

```text
3622ff27e296cd1ca5e74e8edf6fff96bb3a35fd648fb7efef0496498aa2e504 package.json
28b1a6fdd76a2b5d352ffcc0ee2419cbc39db176158d4fb6eebcd6df65f59fc5 package-lock.json
38194b107ba7d6d09f009af16627edc75d6c3b2a411f0ad52fec80366228082c dist/main.js
f9ddfefa01e954b81218503fb832d2f0a2b8d283d28476a8ac49b93e9fb89f9b dist/builder.js
7519cbd42f775f5357964208d1800509b700e9e9d8de31dbcdba4b56cb35e08c dist/hooks.js
5938af8b3f5da343a61473bd1de5fd4dd800f17d907981da244527cdfe2a3f85 dist/converter-ts.js
2f536eefa87768224aaf36d25c71cebfb368149f5c8a4446a8bde585a69ac5d8 converter/.babelrc
19d6a9e10f6af974872dc4208e08c37dae08028325b24b859ca14d3002708b30 converter/package-lock.json
453f725ca98f543e2b06984edd24941cd3489555e442fbf8ba2197cac11b8111 converter/wx_unity_converter/wx_unity.js
15e98d0e9456ce5bcfa8169b920a07809533f07c783166278673578926837ca8 converter/wx_unity_converter/check-version.js
```

ZIP 自带依赖。本次直接读取依赖 package.json 得到：archiver 5.3.2、fs-extra 11.3.4、@babel/core 7.24.6、@babel/preset-env 7.24.6。不要只锁根 package.json 内的 `^` 范围；使用 ZIP 哈希及解包后完整树哈希锁住实际运行的依赖。

## 2. 官方构建钩子与本项目顺序冲突

官方文档路线是 Cocos 微信小游戏构建平台 + 勾选 Tap 转换，产物为 `build/TapBuild/game/` 与 `build/TapBuild/game.zip`。

源码实际入口：

- `dist/builder.js:8–60` 对 `wechatgame` 注册 `./hooks`，暴露 `enableTapConvert`、`tapAppid`、`gameVersion`、`usePythonScript`、`deleteWechatBuild`。
- `dist/hooks.js:229–265` 的 onBeforeBuild 只检查 Creator 大版本等；没有 AppID 校验。
- `dist/hooks.js:269–310` 的 onAfterBuild 从 `result.dest` 获取微信输出，建立同级 `TapBuild` 并清空已有该目录，随即执行 TS 转换。
- 传入转换器的字段只有 `source`、`target`、`useSubpackage: false`、`gameVersion`。
- `dist/hooks.js:299–304` 校验版本为 `/^\d+\.\d+\.\d+$/`，不合法时静默回退到 `0.0.1`。
- `deleteWechatBuild` 为 true 时还会删除 `result.dest`（hooks.js:326–345）。本项目集成不应开启此选项。
- 虽然 UI 和 README 仍有 Python 选项、自动回退说明，当前 onAfterBuild 只调用 TS 转换器，没有执行 Python 回退。不能根据 README 宣称有回退保障。

本项目现有顺序（`scripts/cocos/build.mjs:13–21`）：

```text
Creator CLI（内部包含所有构建钩子）
→ Creator 退出 / 日志检查
→ stampBuild(wechatgame)
→ packageWechat(wechatgame)
```

因此若只在当前 Cocos 配置里打开官方 `enableTapConvert`，实际顺序会成为：

```text
Cocos 原始微信输出
→ 官方 onAfterBuild 转换并打 Tap ZIP
→ Creator 退出
→ 本项目盖章
→ 本项目重排微信分包
```

结论：Tap ZIP 不会包含后续 `stampBuild` 或 `packageWechat` 的结果；微信包最终结构与被转换的输入也不同。打开 `deleteWechatBuild` 还会令后续本项目盖章/分包失去源目录。这个顺序必须显式解决。

## 3. 直接离线入口、是否访问网络、写入范围

`dist/converter-ts.js` 是 CommonJS，导出异步函数 `convertWechatToTap(options)`（第 44、528 行）。从实际读取的参数得出签名：

```ts
convertWechatToTap({
  source: string,
  target: string,
  useSubpackage?: boolean,
  gameVersion?: string
}): Promise<void>
```

后续受控试验的调用形状如下（**本研究未执行**）：

```js
const { convertWechatToTap } = require(
  '/pinned-plugin/taptap-minigame-tools/dist/converter-ts.js'
);
await convertWechatToTap({
  source: '/scratch/prepared-wechat-input',
  target: '/scratch/isolated-tap-output',
  useSubpackage: false,
  gameVersion: '0.0.1'
});
```

这是官方 ZIP 内导出的函数，**官方文档未承诺稳定 CLI/API**；使用它属于项目对固定插件版本的包装，应加文件哈希与契约测试，升级时重新审核。该函数没有 Editor 全局依赖；直接调用不会执行 hooks.js 的 Creator 对话框逻辑，也不会调用其删除微信输出逻辑。

源码级访问/写入结论：

1. **存在联网与插件目录写入分支。** `ensureConverterDependencies`（222–305）仅看 `converter/node_modules` 目录存在即返回（231–234）。目录缺失时执行 `execAsync('npm install', {cwd: converterDir, timeout:120000})`，最多三次。这会访问 npm、改写插件依赖目录及可能的锁文件/npm 缓存。本次 ZIP 自带完整目录，因此源码预期会跳过安装，但不能将其描述成“转换器绝不联网”。
2. **正常转换没有下载/上传请求或 ZIP CLI。** 当前文件唯一 `execAsync` 调用就是上述 npm install；未发现 fetch/http/request/spawn 调用。Babel 通过 `require(@babel/core)` + `transformFileSync` 运行（328–406）；ZIP 通过随包的 `archiver('zip',{zlib:{level:9}})` 创建（497–523）。无须系统 zip 命令、Python 或全局 npx。
3. **明确的正常写入在 `target` 内。** `ensureTargetPath`（71–84）先递归删除整个 `options.target`，创建 `target/game`。其后复制源、改 game.json、Babel 改 JS、注入入口、修改 wasm-split/UnityPlugin、复制 check-version；最后写 `target/game.zip`。`copyAssets` 读取源，不主动修改源。直接入口不会删除 `source`。
4. **函数自身没有路径范围保护。** 它先删 target；不校验 target 是否与 source/项目根重叠，也没有拒绝符号链接和 `plugins` 键中的路径分隔符。后续包装必须约束专属临时 target、源与目标互不包含、源树无 symlink、plugin 名称安全。否则不能笼统保证所有输入下只写预期目录。
5. **依赖运行时副作用与实际网络行为尚未观测。** 本次只读，没有执行完整依赖。Babel 配置未关闭自动 config 发现；应从无额外 babel.config 的独立 scratch cwd 运行并记录配置，防止无关项目 Babel 配置参与构建。推荐受控测试时保持网络禁用，并对插件目录设只读；不能让缺依赖自动变成 npm install。
6. 后续调用前应先验证整个 ZIP/提取目录哈希及必需依赖文件存在。依赖缺失就由包装器失败，**不要**通过创建空 node_modules 来骗过检查。

## 4. AppID：可确认与不可确认的界限

**无真实 AppID 可以进行纯离线转换试验；这是源码判断，尚未执行证明。** 理由：

- `tapAppid` 仅作为 UI 项出现在 builder.js:20–29，默认空串；hooks/converter 都不读取、不校验、不传递它。
- 转换入口参数没有 AppID；不会做账号登录或后端真实性校验。
- 正常配置转换只写 `productVersion`、`convertScriptVersion`，以及把已有 `orientation` 改为 `deviceOrientation`（converter-ts.js:114–143）。
- `copyAssets` 会把未排除的文件原样复制，包括源中的 `project.config.json`。因此其中微信 `appid` 若存在，会作为源数据留下，不会自动变成 Tap AppID。

官方 `tap.getAccountInfoSync()` 页面明确返回 `miniProgram.appId: string`、`miniProgram.envVersion`（develop/trial/release）及 `miniProgram.version`；线上版本号只保证正式版可得。公开页面没有给出 AppID 长度/字符集正则。本次也未找到可据以认定必须数字、固定长度或特定前缀的规范。**不要编造 Tap AppID 正则、不要复用微信 `wx...` AppID。**

官方调试页要求输入“小游戏Id”，从开发者平台 `商店 → 小游戏管理 → 开放能力 → 小游戏基本信息` 获取；扫码设备必须有对应测试权限。该“小游戏Id”与插件未使用的 `tapAppid` 字段之间的具体映射，公开文字未充分说明，应在账号创建后以后台记录和运行时 `miniProgram.appId` 验证。

建议本项目保留独立 `tapGameId` / `tapAppId` 字段（未核实前可以 null），将 `wechatAppId` 仅标记为中间构建输入。发行门禁要求真实值已从后台核验，离线阶段使用 `accountVerified:false`、`releaseEligible:false`，不要把空值或占位值记录成已验证身份。

额外差异：插件 `tap-minigame.d.ts:471` 声明 `getAccountInfoSync(): { miniGame: { appId:string } }`，与当前官方网页 `miniProgram` 不同。接入代码应以已核实的当前官方 API 与真机结果为准，不能无条件照搬随包类型。

## 5. 分包与产物契约

- 项目 `scripts/cocos/package-wechat.mjs:11–19` 把 internal/main/resources 从 assets 移到 `subpackages/<name>`，写每包 game.js，更新 `src/settings.json.assets.subpackages`，并写 **game.json.subpackages（小写 p）**。
- 官方具体分包页明确 **game.json.subPackages（大写 P）**；具体配置页也列该字段。开发概览页仍写小写 subpackages，官方页间存在差异。按具体规范准备 camelCase 更稳妥，但平台是否兼容两种形式仍未真机确认。
- 当前 TS 转换器没有 subpackages/subPackages 标准化代码。不要指望插件自动修复大小写。
- 引擎内部 `settings.assets.subpackages` 和平台 `game.json.subPackages` 是两种契约；不能把前者盲目也改成 camelCase。
- `packGame(targetFolder,config,useSubpackage)` 虽保留形参，实际完全未使用 config/useSubpackage，始终 `archive.directory(targetFolder,false)`；因此 TS 版本输出一个包含全部 game 目录内容的 game.zip，不生成独立分包 ZIP。不能使用 Python 脚本的 `-sp` 行为解释当前 TS 插件。
- ZIP 根应直接有 game.js/game.json/src/...，不是再套一层 game/；解包后应与 `target/game` 内容一致。
- 当前插件会给 game.js 前置 `wx_unity.js`；该文件只有保存 GameGlobal.fetch、缺失则抛错、然后清空 fetch 等几行（wx_unity.js:1–7），没有将 wx 全量替换为 tap。Babel 配置也只是 preset-env。因此不能把“转换成功”描述为已经证明直接 wx 调用、DOM、生命周期、存储在 Tap 容器里可用。
- `runBabelTransform` 可容忍“部分 JS 转换失败”：仅当 `errorCount>0 && successCount===0` 才抛错（403–405）。本项目严格构建应把任何 `[Babel] 转换失败`/非零失败汇总视为失败，不能只看 ZIP 存在或 Creator exit 36。

## 6. 建议执行顺序（小步、可验收）

### 第一步：只落地插件锁定/预检，不安装到 Cocos

保存来源 URL、ZIP 长度/hash、package 版本、converter 版本、关键文件hash与提取目录完整树hash。预检依赖文件/配置、Node/Creator版本，缺失即报错。状态为“离线准备完成”；这一步不需要 AppID。

### 第二步：用最小人工 fixture 做受控转换契约测试

在独立 scratch 目录准备普通 JS、game.json、src/settings.json 和两包 fixture；只允许写专属 target，保持网络禁用，插件只读。按上述导出函数测试：

- 输出 game/ 与 game.zip，解包内容对应；root 文件正确。
- `deviceOrientation=landscape`、正确 `productVersion`、`convertScriptVersion=2.0.4-ts`。
- 分包路径与入口、settings 子包列表全部相互对应；子包资源确实存在。
- 插件没有声称验证 AppID，manifest 明确 offline/unverified。
- 源树/插件树前后 hash 不变，无 npm install 分支，无 Babel 失败。
- 第二次同内容输入的逐文件内容摘要一致。ZIP 可能带文件时间戳，先比较规范化条目摘要，不直接宣称二进制 ZIP 可复现。

这一步能验证当前固定插件的文件转换契约；不能验证真实平台 API、上传接受、网络或设备性能。

### 第三步：显式排好真实构建顺序

推荐保留官方插件内容不改，对固定导出函数做小包装，**不要同时开启 Creator 的自动 Tap 转换**：

```text
prepare-release-config / sync-shared
→ Creator 3.8.8 输出原始微信中间包（enableTapConvert=false）
→ 复制到独立 Tap 输入 staging
→ 分包重排（保留 Cocos settings.assets.subpackages）
→ 仅 staging 的 game.json 规范化为 subPackages + 横屏
→ 生成平台区分清楚的输入 manifest
→ 固定官方 convertWechatToTap(source=staging,target=exclusiveTarget)
→ 解析日志 / 检查产物契约 / 核验源未变
→ 在输出目录旁生成 Tap 产物 manifest 和 ZIP hash
```

若最终 manifest 需要写入 game.zip 内，必须在 ZIP 创建前把已知的输入/工具链元数据写进 staging；ZIP 自身hash写到包外 sidecar，避免修改ZIP后manifest再次失效。最终输出 manifest 不能沿用 `release-build.json.appid=微信ID` 冒充 Tap 身份。

另一个方案是 Cocos 自定义构建扩展在官方转换前重排分包，但这要求核实扩展之间钩子顺序、调整当前构建后再次重排逻辑；在没有实际顺序证据前不建议仅凭配置排序依赖它。

`packageWechat` 当前把分包重排与微信4/20MiB项目预算耦合（22–23行）。Tap 路线应将“路径准备/测量”和“微信预算门禁”分离，不可直接把现有微信限额视为 Tap 官方限额。

### 第四步：账号/真机具备后才做平台验收

核实后台小游戏Id/AppID及测试权限、实际上传规则；使用官方调试工具导入**转换后的 game 根目录**，在 Tap App 目标设备测试启动、分包、横屏/触控、存读档、失败原子性、暂停/恢复、前后台、资源网络失败/重试。记录 App/SDK版本和 `tap.getAccountInfoSync().miniProgram` 实际结构；特别验证 wx别名、GameGlobal.fetch、Cocos adapter、storage和生命周期。通过后才能把对应门禁从 unverified 改为 pass。

## 7. Manifest 建议字段

```json
{
  "target": "taptap-minigame",
  "distribution": "ordinary-minigame",
  "route": "official-cocos-converter",
  "creatorVersion": "3.8.8",
  "nodeVersion": "<实际执行版本>",
  "plugin": {
    "name": "taptap-minigame-tools",
    "version": "1.2.2",
    "converterVersion": "2.0.4-ts",
    "archiveSha256": "6b8a9a3cc62b6c54cefab397097babb771d9d99f90442cddff06310a4c9ed73f",
    "archiveBytes": 13755538,
    "sourceUrl": "https://app-res.tapimg.com/file/2026-04-14/67e7d94f5e586596dab061816d1c509d.zip",
    "extractedTreeSha256": "<完整相对路径+文件内容规范摘要>",
    "entry": "dist/converter-ts.js#convertWechatToTap"
  },
  "identity": { "tapGameId": null, "tapAppId": null, "accountVerified": false },
  "validation": { "offlineConversion": "not-run", "platformImport": "not-run", "device": "not-run", "releaseEligible": false },
  "inputs": { "sourceDigest": "...", "buildConfigDigest": "...", "packagingScriptDigest": "...", "stagingTreeDigest": "...", "gameVersion": "..." },
  "outputs": { "gameTreeDigest": "...", "zipSha256": "...", "zipBytes": 0, "uncompressedBytes": 0, "mainBytes": 0, "subpackageBytes": {} }
}
```

还需保存构建日志hash、完整有效配置、分包目录清单和正式环境能力验证证据。只锁 plugin.version 或 README 不够；当前包内日志版本和声明已有漂移。

## 8. 仍无法确认的事项

- 本项目真实完整 Tap 包能否构建；本次连 fixture 转换都未执行。
- Tap 容器是否提供项目需要的 wx 别名、DOM/事件、GameGlobal.fetch、Cocos缓存/子包加载行为。
- 真实 Tap AppID格式、后台小游戏Id与runtime appId的映射及账号资格。
- 导入/扫码/上传接受、网络白名单及CDN、广告、存档/生命周期、目标设备性能。
- 当前创建页新增了首包大小“60M+”文字，但单位、加号含义、压缩/未压缩口径、总包与单分包限制未给可执行精确定义；不能据此直接写 `60*1024*1024` 的发布门禁，更不能沿用微信4/20MiB。需在真实后台核实。
- 官方文档有配置大小写差异，随包README/类型/日志也有漂移；已明确逐项取证，不能把提供方README的“已测试”或“可上传”当本项目验收结果。


## 9. 后续授权的最小 fixture 离线执行结果

结论：**两轮最小 fixture 转换及文件契约检查通过。Tap 容器、完整项目、账号、平台导入、上传、真机兼容性仍未验证。** 此节更新第 3/4/8 节中“尚未执行最小转换”的状态；它不扩大为完整 T03 验收。

执行环境：Node.js v22.22.2（本机独立 Node，**不是**本次启动 Creator 或其内置 Node）。调用固定 ZIP 的 `dist/converter-ts.js#convertWechatToTap`，没有导入或安装到 Cocos。

- UTC记录时间：`2026-11-03T16:48:46.930478+00:00`（北京时间为 2026-11-04 00:48 左右）。
- 独立 scratch：`/private/tmp/t03-fixture-gj7zty71`。
- 机器可读完整结果：`/private/tmp/t03-fixture-result.json`。
- 测试驱动：`/private/tmp/t03-fixture-gj7zty71/run-fixture.py`。
- 受控 Node 包装：`/private/tmp/t03-fixture-gj7zty71/harness.cjs`。
- fixture 输入：`/private/tmp/t03-fixture-gj7zty71/source`，9个文件；包含 game.js、game.json、src/settings.json，以及 stage1/stage2 两个子包的 game.js/config.json/content.json。
- fixture 没有 AppID；`game.json.subPackages` 为 camelCase；横屏；显式传入 `gameVersion: '1.1.0'`、`useSubpackage: false`。

### 执行前后保护与核验

1. 重新计算 ZIP SHA-256，与固定值 `6b8a9a3cc62b6c54cefab397097babb771d9d99f90442cddff06310a4c9ed73f` 一致。
2. 逐一对比 ZIP 中所有 5,465 个普通文件与已提取插件树内容，没有缺失、额外或改变文件；插件树无符号链接。
3. 插件规范化树 SHA-256 为 `024f2f4ba7e04da3579a2d937557ca071687f7d6dc8e8a3b066cd48d9b025ddf`。摘要算法：相对 POSIX 路径排序，对每项拼接 `path + NUL + file SHA256(hex) + LF` 后做 SHA-256，不包含文件日期。
4. 检查 archiver、fs-extra、@babel/core、@babel/preset-env 的随包入口文件存在，模块解析全部位于固定插件目录内；缺失即失败。没有执行 npm install。
5. 每轮 Node 使用 `--experimental-permission --allow-fs-read=* --allow-fs-write=<本轮run目录>`。实测权限查询：插件目录不可写、fixture源目录不可写、当轮run目录可写。没有授予子进程执行权限。
6. 在 require 官方转换器前，将 child_process.exec/execFile/spawn/fork 及同步形式替换为计数后立即抛错；同时拦截常用 Node HTTP(S)/HTTP2/net/tls/dgram/DNS/global fetch 入口。两轮记录的子进程调用数、网络入口调用数都为 0。未请求网络权限或使用提权执行。
7. 两轮每轮结束都重新核验源树、插件树：源树始终为 `6f07bb6e8867a2e6c8fa743f6a3eb56a2a21326447cb5593b98490c0f4825123`；插件树始终为上述固定值。

### 两轮实际输出

| 检查 | run1 | run2 |
|---|---|---|
| Node退出码 | 0 | 0 |
| Babel | 成功3、跳过0、失败0 | 成功3、跳过0、失败0 |
| 输出game目录普通文件数 | 10 | 10 |
| ZIP普通文件条目数 | 10 | 10 |
| ZIP大小 | 3,317 bytes | 3,317 bytes |
| ZIP条目未压缩大小合计 | 2,913 bytes | 2,913 bytes |
| ZIP每个普通条目的名称/内容与game目录一致 | 通过 | 通过 |
| 源树/插件树未变化 | 通过 | 通过 |
| 子进程/网络入口调用计数 | 0 / 0 | 0 / 0 |
| 转换器外部第三方模块加载 | 0 | 0 |

产物位置：

- `/private/tmp/t03-fixture-gj7zty71/run1/output/game/`
- `/private/tmp/t03-fixture-gj7zty71/run1/output/game.zip`
- `/private/tmp/t03-fixture-gj7zty71/run2/output/game/`
- `/private/tmp/t03-fixture-gj7zty71/run2/output/game.zip`

两轮的规范化逐文件内容完全相同：

- game目录树摘要：`892ff909dd6bb8cd622ea7903cdf61f52bd653885ec8c34d2e9ff322190c10de`。
- ZIP条目内容与各自game目录一一匹配，ZIP根直接包含 `game.js`/`game.json`，没有多套 `game/`。
- 这两轮的ZIP二进制也恰好相同，SHA-256均为 `2adaccc3ae91de23d33fdb79cdbfdfd766f989942eeef8d13653c02dea418dbb`。**仅作本次观测；跨时间可重复性以规范化条目内容比较为准，不承诺ZIP日期元数据保持相同。**

输出配置实测：

```json
{
  "deviceOrientation": "landscape",
  "companyName": "Offline fixture",
  "productName": "T03 fixture",
  "subPackages": [
    {
      "name": "stage1",
      "root": "subpackages/stage1/"
    },
    {
      "name": "stage2",
      "root": "subpackages/stage2/"
    }
  ],
  "productVersion": "1.1.0",
  "convertScriptVersion": "2.0.4-ts"
}
```

`src/settings.json.assets.subpackages` 保留 `["stage1", "stage2"]`；两个 `game.json.subPackages.root` 都指向存在的目录与game.js入口，config.json.name与包名一致。每个源JS经过Babel，入口添加官方 `Unity Converter Injection`，并新增 `check-version.js`。WASM/UnityPlugin文件在此fixture中不存在，转换器按其既有逻辑跳过这些处理。

没有AppID仍成功转换，且输出game.json没有自动插入AppID。这把此前“根据源码预计可以无AppID离线转换”提升为**最小fixture实测成立**，但不表示包可被任何具体账号的后台接受。

### 日志与失败记录

- run1完整stdout：`/private/tmp/t03-fixture-gj7zty71/run1/stdout.log`。
- run1完整stderr：`/private/tmp/t03-fixture-gj7zty71/run1/stderr.log`（空文件）。
- run1行为计数/权限/依赖解析：`/private/tmp/t03-fixture-gj7zty71/run1/metrics.json`。
- run2完整stdout：`/private/tmp/t03-fixture-gj7zty71/run2/stdout.log`。
- run2完整stderr：`/private/tmp/t03-fixture-gj7zty71/run2/stderr.log`（空文件）。
- run2行为计数/权限/依赖解析：`/private/tmp/t03-fixture-gj7zty71/run2/metrics.json`。

这两轮没有失败、重试或被拦截调用；所有正常日志与空stderr均已保留。没有执行输出game.js，也没有模拟其平台API。

### 仍须后续验证

- Creator 3.8.8 的真实构建、钩子时序以及项目完整中间包转换，尚未执行。
- 本次fixture验证的是**事先正确提供camelCase分包字段能够保留**，不是插件会修复小写字段。
- 未覆盖真实WASM、UnityPlugin、完整Cocos引擎文件、大纹理/音频等路径。
- 未验证 Tap 的 wx别名/DOM/存储/生命周期/网络/广告/触控或真实分包下载，也未验证AppID、上传限额、后台接受、真机性能。
- `releaseEligible` 在结果JSON中仍为 false，账号/平台/设备状态仍为 `not-run`。
