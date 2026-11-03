# TapTap 普通小游戏性能基础与无损审计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 若用户明确选择独立子代理执行，再用 superpowers:subagent-driven-development。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立保留完整表现的 Tap 普通小游戏基线，验证分包与测试广告，交付可信资源清单，为后续实测优化提供入口。

**Architecture:** 保留游戏核心，围绕现有 TowerPlatform、TowerResources 和构建脚本增加 Tap 能力适配、采样和隔离测试。普通小游戏是唯一发布目标；Web作为视觉/逻辑对照。先完成P0及P1引用审计准备，不提前实施未知热点重写。

**Tech Stack:** Cocos Creator 3.8.8、Tap官方Cocos转换插件、现有JS/TS、Node内置测试/TypeScript测试装载方式、Python图像工具。版本锁定，不擅自升级引擎。

**Spec:** `docs/superpowers/specs/2026-11-03-tower-performance-design.md` v2。本计划只细化其P0和P1审计基础；P2–P5已在设计中给出策略/指标，须用本计划实测输出细化，不能把本文完成写成全专项完成。

## Global Constraints

- 正式目标：TapTap普通小游戏；横屏；Web仅对照；不做微信发布、H5发布或APK。
- 不缩纹理、不删帧、不减特效、不降低动态画布频率、不改变战斗tick/伤害/随机/掉落。
- 全部原稿、视频、付费素材和失败版本保留；不撤销既有未提交修改。
- 所有新测试使用隔离测试存档；测试广告无正式经济奖励；应用/广告位ID从实施配置注入。
- 不使用原微信4/20MiB门禁判断Tap结果，不把内部主包12MiB探索目标当平台限制。
- 真机/平台权限未取得时标记未验收，先完成可本地验证任务；不伪造扫码测试与广告结果。

## Review Focus

- 无wx/window/document的Tap环境：必须从平台适配器取得画布，不能静默缺失两仪/四象（Task 3）。
- 分包A误引B，或上一轮成功报告残留：校验应失败且不能生成当前成功标志（Task 2）。
- ad/background/user暂停事件乱序：关闭广告不能误恢复战斗（Task 4）。
- 图像同名但不同像素、动态路径未记录：不可自动合并或判成未使用（Task 5）。
- 帧率平均掩盖长尾、不同构建混比：报告必须带摘要、分位、样本数与未测项（Task 1/6）。

---

## Task 1：基线采样与场景定义

**Files:** Create `cocos-pilot/assets/scripts/TowerPerf.ts`, `scripts/perf/summarize-taptap.mjs`, `scripts/perf/taptap-scenarios.json`, `tests/taptap-perf-summary.test.mjs`；Modify `PinePilot.ts`, `TowerView.ts`（均在 `cocos-pilot/assets/scripts/`）。

**Interfaces:**
- `TowerPerf.recordFrame(sample: {atMs:number; intervalMs:number; workMs:number; phase:string}): void`；只读记录，不影响dt或模拟。
- `TowerPerf.recordResource(sample: {id:string; bytes:number; width?:number; height?:number; event:'request'|'ready'|'release'}): void`。
- `TowerPerf.snapshot(): {frames:FrameSample[]; resources:ResourceSample[]}`；采样使用有上限缓冲，超过容量分批导出并记录丢样，关闭时不分配每帧对象。
- `summarizeTrace(trace, meta): Report` 导出于mjs。meta必须带sourceDigest/buildId/platform/device/resolution；Report保留样本数、P50/P95/P99、>50ms/>100ms计数；内存未知为null。

- [ ] 添加测试：100帧中1帧120ms，报告longFrames100=1；不同meta摘要不能合并；未知内存不变成0。
- [ ] 运行 `node --test tests/taptap-perf-summary.test.mjs`，先确认新行为缺失导致失败。
- [ ] 实现采样与汇总，使用单调时钟，分别包围模拟和表现工作；读取不到GPU时保持null。测试入口显式打开，发行默认关闭。
- [ ] 在JSON固定宗门、首次进塔、合法密集波、两仪/四象、Boss狂暴、突破与广告回归场景的种子/配置/时长；从当前合法配置选择，不凭空设置不可达技能组合。
- [ ] 重跑新增测试与 `node --test tests/current-entry.test.mjs`；Web跑固定场景保存原始trace和截图作为视觉基线，记录实际失败。
- [ ] 对本任务文件单独提交或保存可回退补丁，不包含其他工作区文件。

## Task 2：独立Tap构建与分包能力实验

**Files:** Create `scripts/cocos/build-taptap.mjs`, `scripts/cocos/check-taptap.mjs`, `cocos-pilot/build-configs/taptap-minigame.json`, `tests/taptap-package.test.mjs`；Modify `package.json`；插件位置/版本/hash写入 `reports/taptap-foundation/plugin.json`。

**Interfaces:**
- `checkTapBuild(root:string, expected:{buildId:string;sourceDigest:string;platform:'taptap-minigame'}): {ok:boolean;errors:string[];mainBytes:number;packageBytes:Record<string,number>;totalBytes:number}`，导出于check-taptap.mjs。
- 新脚本入口 `npm run cocos:build:tap` 运行build-taptap.mjs；配置必须有显式TapAppID，缺失时报配置错误，不使用微信AppID代替。
- 最终候选输出目录 `cocos-pilot/build/taptap-minigame/`，保留插件原始输出与完整构建日志；`tap-build-report.json`绑定当前buildId与摘要。

- [ ] 测试临时构建夹具：横屏字段正确、subPackages名称唯一、入口存在；跨分包资源/脚本引用、大小写错误、旧摘要都返回ok=false。
- [ ] 运行 `node --test tests/taptap-package.test.mjs` 确认缺失校验失败。
- [ ] 在独立构建入口使用官方插件流程，不先调用package-wechat移动目录。检查Tap配置、产物依赖、调试代码和来源摘要，失败清除本次成功标志但保留诊断。
- [ ] 使用最小主包控制器+A/B两资源分包+一张共享小图试验；验证加载次序、主包对资源访问、重复加载、离场重进。不要只验证ZIP里有文件。
- [ ] 输出 `reports/taptap-foundation/package-probe.json`，每种引用组合记录支持/不支持及真机证据；据此明确闭包合并/主包少量共享策略。未跑真机不能标支持。
- [ ] 运行新增测试、`node --test tests/cocos-package.test.mjs tests/current-entry.test.mjs` 与Tap构建；平台测试权限未准备好时保持该验收项未勾选。
- [ ] 保存本任务独立补丁/提交。

## Task 3：平台画布、生命周期与完整表现

**Files:** Create `cocos-pilot/assets/scripts/TowerRuntimeSurface.ts`, `tests/taptap-runtime-surface.test.mjs`；Modify `TowerPlatform.ts`, `PinePilot.ts`, `TowerView.ts`, `LiangyiFormationArt.ts`, `SixiangFormationArt.ts`, `TowerBreakthroughArt.ts`, `TowerLevelBeamArt.ts`（均在表现层目录）。

**Interfaces:**
- `createRuntimeCanvas(runtime:any,width:number,height:number): any`；runtime由适配层传入，选择Tap可验证的canvas能力，其次Web对照能力，不依赖伪造全局document。
- `probeRuntimeSurface(runtime:any): {canvas2d:boolean;image:boolean;events:boolean;failures:string[]}`；失败必须包含能力项，不宣称整个平台已适配。
- TowerPlatform保留现有`onHidden(fn)`/`onShown(fn)`调用形态，将Tap与Web事件归一化，只订阅一套有效来源；重复通知幂等。

- [ ] 测试仅有tap、无wx/window/document时能创建指定尺寸画布；getContext失败明确报能力不足；重复hide/show通知不重复持久化。
- [ ] 运行 `node --test tests/taptap-runtime-surface.test.mjs` 观察失败。
- [ ] 将上述四个动态画布创建集中到helper；保持尺寸、滤波、packable=false、时间键与30Hz。安全区/页面事件由平台层提供。
- [ ] 在Tap中完成宗门、进塔、妖猪普通/Boss/狂暴、两仪/四象和大小突破流程；原显示尺寸截图、全段视频与Web基线对照。
- [ ] 运行 `node --test tests/taptap-runtime-surface.test.mjs tests/liangyi-formation-art.test.mjs tests/sixiang-formation-art.test.mjs tests/tower-breakthrough-art.test.mjs tests/tower-runtime-loading.test.mjs`；执行Tap与Web构建。
- [ ] 如平台Canvas不满足，记录具体不支持操作与影响效果；只为该效果补独立适配设计，不静态替代、不擅自改发布平台。
- [ ] 保存本任务独立补丁/提交。

## Task 4：测试广告和多原因暂停

**Files:** Create `cocos-pilot/assets/scripts/TowerSuspension.ts`, `cocos-pilot/assets/scripts/TowerAdProbe.ts`, `tests/taptap-ad-lifecycle.test.mjs`；Modify `TowerPlatform.ts`, `TowerView.ts`, `PinePilot.ts`。

**Interfaces:**
- `TowerSuspension.acquire(reason:'user'|'background'|'ad'|'resource-recovery'): ()=>void` 返回绑定场景generation的幂等释放函数；同原因多个租约计数，旧场景回调不得释放新场景令牌；`blocked:boolean` 只在全部释放后变false。
- `TowerAdProbe.show(requestId:string): Promise<{status:'completed'|'cancelled'|'failed'|'busy';requestId:string}>`；注入一个平台广告实例；并发请求busy，undefined/isEnded=false不算完成。
- `TowerAdProbe.dispose():void` 解除应用监听（按SDK实际off接口），不得伪装主动关闭正在展示的广告；单次show回调归属以requestId和generation校验。
- 仅测试账本`recordTestReceipt(id:string): {ok:boolean;duplicate:boolean}`，使用注入的独立存储，无材料/货币数值，不调用正式奖励action。

- [ ] 测试先user暂停再ad显示，ad结束后仍暂停；background+ad事件两种先后顺序均不误恢复；重复close只产生一张测试收据；无填充/取消不产生收据。
- [ ] 测试恢复写失败不能显示到账，重试只记一条；新场景请求不接收旧回调；未知完成的重启不发奖。两个resource-recovery令牌释放一个后仍blocked，旧场景令牌不释放新场景令牌。
- [ ] 测试创建/加载失败、show展示前拒绝会释放自身ad令牌；展示后关闭回调丢失保持暂停、不给收据，仅平台已验证结束或退出并从检查点重入才能恢复。
- [ ] 运行 `node --test tests/taptap-ad-lifecycle.test.mjs` 观察失败。
- [ ] 在现有测试菜单接唯一测试入口；只有首屏完成和平台允许初始化后创建，记录平台自动加载；显示期间冻结模拟、仪式与动态上传，保持已加载关键纹理。
- [ ] 关闭后解除ad原因，清输入、不补隐藏dt；保持原有后台返回暂停语义。若画面资源失效，获取resource-recovery，原暂停UI展示恢复，完成后才允许用户继续。
- [ ] 运行新增测试与 `node --test tests/tower-runtime-loading.test.mjs tests/tower-loading-handoff.test.mjs`；真实测试位覆盖成功/取消/失败、后台乱序及连续恢复，输出trace和视频。
- [ ] 未获得测试位时仅标本地状态机通过，Tap真实广告验收保持未完成；保存独立补丁/提交。

## Task 5：发行引用清单与小批无损实验

**Files:** Create `scripts/art/audit-runtime-assets.mjs`, `scripts/art/verify-lossless.py`, `tests/runtime-asset-audit.test.mjs`, `cocos-pilot/runtime-assets.json`；Read现有Art路径、资源.meta、Cocos构建依赖和 `design/xianxia-vfx-asset-library/README.md`。本任务不批量移动素材。

**Interfaces:**
- `auditAssets({sourceRoot,buildRoot,registeredPaths}): {assets:AssetRecord[];unresolved:string[];duplicates:string[][]}`。
- `AssetRecord={id,path,uuid,sha256,bytes,width?,height?,rgba8Bytes?,references:string[],status:'required'|'candidate'|'unknown'}`；没有运行访问记录不得自动变candidate，动态未解路径必须unknown。
- `verify-lossless.py --before 原图 --after 候选图` 比较尺寸和解码RGBA；差异时非零退出。候选输出独立实验目录，不覆盖原图。

- [ ] 测试同名异像素不去重、相同hash有不同采样策略不自动合并、动态未知引用不能判可删除、UUID引用可追溯。
- [ ] 运行 `node --test tests/runtime-asset-audit.test.mjs` 观察失败；实现审计，生成 `reports/taptap-foundation/assets.json`。
- [ ] 把旧妖猪/流光/持握武器列为待审计项，逐项查实际注册与UUID；只形成归档建议，不因名字旧而迁移。
- [ ] 对小样本运行已选本地无损编码工具，记录工具版本与命令；运行verify-lossless，透明边缘和尺寸一致才记录节约量。
- [ ] 构建样本对照，测Tap首次解码/显示耗时；像素相同但解码明显变慢的候选不默认采用。
- [ ] 运行新增测试并检查清单汇总=文件字节总和；保存独立补丁/提交，原始素材零覆盖。

## Task 6：P0决策记录与下一批边界

**Files:** Create `reports/taptap-foundation/README.md`, `reports/taptap-foundation/baseline.json`, `reports/taptap-foundation/physical-packages.json`。更新主设计中的实测段，不删除初始证据。

**Interfaces:**
- baseline.json必须含sourceDigest/buildId/assetDigest、实际设备/分辨率/网络条件、Web视觉基线、Tap性能基线、广告是否实测、所有未完成项与原始证据路径。
- physical-packages.json为`{buildId,packages:[{name,kind:'main'|'subpackage',assetIds:string[],dependencies:string[]}],unresolved:string[]}`；不得有未验证的跨平台分包依赖。
- `goForP2` 仅当Task2分包试验、Task3完整效果、基线采样均通过；广告真机未通过时可开展不依赖广告的P1/P2，但商业闭环明确未通过。

- [ ] 使用Task1汇总三档安卓设备数据；未具备设备时可记录已测设备，但不声称最低支持机型已定。
- [ ] 锁定可测量的绝对纹理预算、最低机型、主包/分包实际约束；明确平台硬限制与项目优化目标。
- [ ] 执行 `npm test`、`npm run check`、Tap与Web构建，记录既有/新增失败，不把与基线同名失败直接认定无风险。
- [ ] 逐项检查设计红线、资源恢复与测试广告证据。对不可观测GPU/内存填null并解释，禁止填0。
- [ ] 按清单对P1真正可移出发行项制定可恢复迁移；按物理包表写P2租约迁移计划；按热点结果确定P3候选。此处只编下一批计划，不在没有证据时重写特效或模拟。
- [ ] 报告结果并保存本任务文件。未完成的设备/权限项保持清晰，不在最终摘要中省略。

## 后续任务的进入条件

- P1正式瘦身：引用已解、源文件归档hash可恢复、候选同像素验证通过。
- P2加载/回收：物理包表已实测；先迁移一个完整页面scope证明共享引用安全，再覆盖战斗/技能，不能只给全局缓存换名字。
- P3渲染：每个候选有Tap采样热点，保留逐效果对照；收益不显著的改动撤回。
- P4模拟：模拟成为主要耗时，且逐tick对照工具已可用。
- P5验收：所有已采用改动在正式配置重测，广告关闭/缓存恢复与30分钟热稳定完整覆盖。

## 自检记录

已将平台限制、场景依赖、广告多原因暂停、视觉保真、引用归档和报告口径对应到任务；本计划是首批基础工作，不包含未实测热点的伪精确算法设计。所有勾选项当前均未执行。
