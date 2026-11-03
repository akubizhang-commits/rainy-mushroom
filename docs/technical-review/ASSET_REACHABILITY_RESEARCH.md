# T06 资源可达性与发行分组只读分析

## 范围与结论

- 工作区：`/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom`。读取时 HEAD：`bf2c50ff0ccedcf531f45f6d0dfbbf69f253245d`；工作区有主线程进行中的未提交修改，结论针对本报告记录的实际文件内容，不是只针对 HEAD。
- 已先读取 `AGENTS.md`、`docs/technical-review/ASSET_OPTIMIZATION.md` 和 `TASK_BOARD.md` 的 T06。未修改生产代码，未删除、压缩或重绘素材，未启动子代理，未执行发行构建。
- 当前可证明：`tower-skill-fx/flight-stream-v2.png` 与 `tower-monsters-motion/boar.png` 没有当前 Cocos 游戏入口的资源加载路径，也没有扫描到来自其他项目资产的 UUID 引用。可进入**精确路径、带哈希保护的 staging 排除清单**；这不是 Tap 发行验收。
- 当前 resources 目录有 **380 个非 meta 文件，129,023,940 字节（123.04682 MiB）**。旧 `evidence/assets.json` 的 381 个/129,034,184 字节多计了一份本工作区已不存在的 `.DS_Store`（10,244 字节）；本轮没有删除它，不能把这 10,244 字节计为本轮优化收益。
- 展开所有已发现资源加载器的固定路径和受限动态路径，保守覆盖 **330 个现存文件**；另有 **50 个候选非活跃文件，共 18,628,815 字节（17.76582 MiB）**，其中包括一份 1,923 字节 README。这里只证明源码加载集合，不把 330 当成实际已运行覆盖，也不把 17.77 MiB 当成实测构建减少量。
- 仅排除指定两张 PNG，非 meta 原始输入减少 **9,044,621 字节（8.62562 MiB）**，剩 **119,979,319 字节（114.42120 MiB）**；对应 `.meta` 也只在 staging 不复制。实际包体、传输量、解码/GPU 内存须另测。
- **没有 Tap 账号/设备验证，Tap 当前主包、分包、总包硬限未核实。本报告不能证明 T06 已完成或满足平台限额。** T03 平台转换和 T05 绑定失败语义仍是前置。

## 入口、扫描方法与证明边界

发行构建只列 `PinePilot.scene` 为场景：[cocos-pilot/build-configs/web-mobile.json:1](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/build-configs/web-mobile.json:1)、[cocos-pilot/build-configs/wechatgame.json:4](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/build-configs/wechatgame.json:4)。场景中的游戏脚本入口在 [cocos-pilot/assets/scenes/PinePilot.scene:192](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scenes/PinePilot.scene:192)，`PinePilot.start` 创建 `TowerView`（[PinePilot:34](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/PinePilot.ts:34)）。静态 import 闭包共 **134 个 TS 模块**，没有无法解析的本地 import；所有 `assets/scripts` 直属 TS 文件均在闭包中。保留闭包里声明但暂未调用的资源是一种保守处理，不表示每个方法都会运行。

扫描范围包括 `cocos-pilot/assets` 下所有 TS/JS、JSON、scene、prefab、meta、material/effect 文本；检查直接 `resources.load`、桥接器、`getInfoWithPath`、其他加载 API、模板/拼接路径和数据目录。没有发现额外 `assetManager`、`loadBundle`、`loadRemote`、`loadDir`、`preloadDir` 入口。当前加载集中经 [TowerResources:13](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerResources.ts:13)，声音也经桥接器但跳过队列。另检查 `scripts/cocos`、构建配置和模板，没有发现两个指定旧路径的额外加载。

所有现存资源 JSON 共 7 份。角色和怪物图集的 PNG/JSON 均按**同一个逻辑路径、不同类型**显式读取，JSON 只提供帧/片段等数据。`source`/`sources` 字段指向 design 原稿/视频/production.json，现有消费者没有从这些字段递归加载。`TowerCharacterArt` 在 [TowerCharacterArt:322](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerCharacterArt.ts:322)、[TowerCharacterArt:356](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerCharacterArt.ts:356) 读取同路径 ImageAsset 和 JsonAsset；怪物在 [TowerMonsterArt:295](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:295)。不能把逻辑路径当作一个无类型文件键，否则会漏掉图集 JSON。

UUID 检查是逐文件读取 `.meta` 的基础 UUID，并检索其他项目资产文本；候选 50 个均无外部基础 UUID 引用。场景仅有内置天空盒的序列化图片 UUID，未引用候选图。它不等价于验证构建产物内全部压缩 UUID/导入映射；因此仍要求重建后的 config/依赖验证，不能编辑旧包的 native 文件猜测删除。

## 17 类资源与动态加载证据

下表中的“覆盖”是源码可能加载集合，包含保守保留的旧分支/暂未调用方法。目录均相对 `cocos-pilot/assets/resources/`。

| 目录 | 现存/覆盖非 meta 文件 | 动态来源、约束与消费者 |
|---|---:|---|
| `loading` | 1 / 1 | 固定 `loading/keyart`，[TowerLoadingScreen:55](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerLoadingScreen.ts:55)；Web 还复制同一 JPG 到 `loading-keyart.jpg`，[scripts/cocos/build.mjs:24](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/scripts/cocos/build.mjs:24)。 |
| `player-hud` | 5 / 2 | 固定 `paper-portrait`、`sword-cultivator`，[TowerPlayerHud:186](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerPlayerHud.ts:186)、[TowerPlayerHud:203](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerPlayerHud.ts:203)；3 张 jade-dragon-hd 无当前路径。 |
| `sect-scene` | 7 / 7 | `luoyun` 在 [TowerSectScene:87](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerSectScene.ts:87)；其余 6 张由菜单固定路径和宽屏分支选择（[TowerMenu:1012](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1012)、[TowerMenu:1771](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1771)、[TowerMenu:2696](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:2696)、[TowerMenu:2862](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:2862)、[TowerMenu:2878](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:2878)），藏经阁 fallback 用 main-peak，[TowerLibraryPanel:293](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerLibraryPanel.ts:293)。 |
| `tower-breakthrough` | 10 / 9 | `kind` 限定 zhuji/jindan，assets getter 展开 seated/dao/beam/jindan-dao/jindan-core（[TowerBreakthroughArt:17](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerBreakthroughArt.ts:17)）；声音枚举 minor/gather/success/failure（[TowerBreakthroughAudio:6](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerBreakthroughAudio.ts:6)）。README 不是运行加载资源。 |
| `tower-character` | 5 / 4 | ground-actions PNG+JSON 与 seal-actions PNG+JSON（[TowerCharacterArt:13](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerCharacterArt.ts:13)、[TowerCharacterArt:322](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerCharacterArt.ts:322)、[TowerCharacterArt:356](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerCharacterArt.ts:356)）；inventory-body 没有当前消费者。 |
| `tower-entry` | 1 / 0 | tower-closeup 未出现在当前路径集合；入口画面实际读 sect-scene/tower-courtyard 或 wide。 |
| `tower-environment` | 3 / 3 | 私有 `frame(name)` 拼接前缀（[TowerEnvironmentArt:11](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerEnvironmentArt.ts:11)），调用点只传 tower_floor_stone / tower_obstacle_pillar / tower_spawn_mist（[TowerEnvironmentArt:40](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerEnvironmentArt.ts:40)、[TowerEnvironmentArt:42](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerEnvironmentArt.ts:42)、[TowerEnvironmentArt:60](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerEnvironmentArt.ts:60)）。 |
| `tower-equipment` | 56 / 56 | 菜单 `definitionId` 先经过 56 项白名单（[TowerMenu:529](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:529)、[TowerMenu:2348](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:2348)）；`TowerLibrary` 同样由 illustrated+WEAPONS/EQUIPMENT 生成 icon（[shared/js/xianxia/TowerLibrary:28](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/shared/js/xianxia/TowerLibrary.ts:28)、[shared/js/xianxia/TowerLibrary:44](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/shared/js/xianxia/TowerLibrary.ts:44)）。也有首页固定示例 icon。 |
| `tower-held-weapons` | 2 / 0 | 没有旧目录的消费者。当前目录明确为 v2。 |
| `tower-held-weapons-v2` | 2 / 2 | `HELD_WEAPONS` 键仅 eq_sword_suwen / eq_sword_zhenyue（[TowerCharacterArt:16](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerCharacterArt.ts:16)），`drawHeld` 先查表再 loadHeld（[TowerCharacterArt:241](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerCharacterArt.ts:241)），加载前缀在 [TowerCharacterArt:223](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerCharacterArt.ts:223)。 |
| `tower-library-items` | 86 / 86 | `tower-library-items/${entry.id}`（[TowerLibraryPanel:541](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerLibraryPanel.ts:541)），entry 来自 `LIBRARY_ENTRIES`；125 条定义中 93 条有 icon、86 张已存在大图全部可被对应 entry 命中，先 `getInfoWithPath` 再 load。不存在大图的条目合法回退为小图，不能视为 404。 |
| `tower-monsters` | 28 / 28 | `families` 白名单 28 项，[TowerMonsterArt:8](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:8)；`ARCHETYPES.art_family` 优先于 species，[TowerMonsterArt:44](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:44)；楼层 waves+boss 预载（[TowerMonsterArt:53](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:53)）和每帧 draw（[TowerMonsterArt:143](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:143)）都可触发。28 项全部保守保留；其中 spider-queen 不在本次 ARCHETYPES 输出，仍在运行白名单，不能只靠楼层表删掉。 |
| `tower-monsters-motion` | 28 / 23 | 动画族仅 boar/wolf/spider（构造器 [TowerMonsterArt:52](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:52)），路径仅 boar-v3、boar-v3-enraged、wolf-v1、spider-v1（[TowerMonsterArt:295](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:295)）；其余 16 张机制/投射物图为固定或三选一路径，见下一节。旧 boar/boar-v2 的 5 个 PNG/JSON 无当前入口。 |
| `tower-skill-fx` | 52 / 33 | 固定路径与有限的 PROFILES/ART/数组，见下一节完整展开；保守保留 dormant class 内的固定路径。19 张早期试制图无当前路径。 |
| `tower-skill-icons` | 19 / 18 | ID Set 来源 `GROWTH_SKILLS + GROWTH_EVOLUTIONS`（[TowerSkillIcons:14](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerSkillIcons.ts:14)），先 `skillIds.has` 后加载模板（[TowerSkillIcons:26](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerSkillIcons.ts:26)、[TowerSkillIcons:73](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerSkillIcons.ts:73)）；展开 18 项，magnet 不在集合。 |
| `tower-stones` | 50 / 50 | 50 项 files 固定表（[TowerStoneArt:4](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerStoneArt.ts:4)），数值 grade/indexOf 受限后拼接（[TowerStoneArt:23](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerStoneArt.ts:23)、[TowerStoneArt:35](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerStoneArt.ts:35)）；全部现存文件均在表中。 |
| `tower-ui` | 25 / 8 | 仅 `jade-plaque-clear-${rank.id}`（[TowerMenu:2551](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:2551)），rank 来自 8 项 EQUIPMENT_TIERS（[js/xianxia/TowerEquipmentTiers.js:5](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/js/xianxia/TowerEquipmentTiers.js:5)）。未来未开放等阶也显示，所以 8 张 clear 都要保留；非 clear/engraved/disc 共 17 张无当前入口。 |

### monster-motion 的非角色动画路径

- `TowerProjectileArt` 仅在 hostile 且 element 为 feather/sonic/poison 时使用动态三选一路径：[TowerProjectileArt:36](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerProjectileArt.ts:36)、[TowerProjectileArt:64](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerProjectileArt.ts:64)。
- 其余为 `TowerBreathArt:16` breath、`TowerChainArt:16` chain、`TowerCoreArt:17` core、`TowerCrystalArt:17` crystal、`TowerEggArt:17` egg、`TowerFallingRockArt:16` falling-rock、`TowerLightningArt:16` lightning、`TowerMiasmaArt:16` miasma、`TowerPillarArt:17` pillar、`TowerSafeSealArt:16` safe-seal、`TowerShockwaveArt:14` shockwave、`TowerSpiderWebArt:16` spider-web、`TowerWindbladeArt:16` windblade；文件均为 `cocos-pilot/assets/scripts/<类名>.ts`。这些类由 [TowerMonsterMechanicsView:37](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterMechanicsView.ts:37) 创建，随机制对象/区域出现再请求，不能因第一层没用到而排除。

### skill-fx 的有限展开

| 消费者 | 路径（相对 tower-skill-fx） |
|---|---|
| [SwordArcArt:8](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/SwordArcArt.ts:8) | sword-arc、sword-arc-v2、sword-qi-crescent-ice-down-v1；当前 TowerView 显式选 tower-ice（[TowerView:85](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:85)），前两者仍保守保留。 |
| [SwordQiArt:10](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/SwordQiArt.ts:10) | sword-qi-crescent-ice-diagonal-v1、sword-qi-crescent-ice-sweep-v1、sword-qi-crescent-ice-down-v1、sword-qi-cross-v3。 |
| [OrbitSwordArt:9](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/OrbitSwordArt.ts:9)、[OrbitSwordArt:98](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/OrbitSwordArt.ts:98) | orbit-sword-v1、jianxin-aura-v1；后者另有 Orbit 流光消费者，不可因 JianxinAuraArt 暂未调用就排除。 |
| [TowerProjectileArt:89](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerProjectileArt.ts:89) | orbit-sword-v1、yujian；yujian 是非整数 yujianSlot 的显式 legacy 分支（[TowerProjectileArt:39](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerProjectileArt.ts:39)），本报告保留。 |
| [LiangyiFormationArt:12](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/LiangyiFormationArt.ts:12) | liangyi-monochrome-v1、liangyi-pure-white-v1、liangyi-pure-black-v1。 |
| [SixiangFormationArt:12](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/SixiangFormationArt.ts:12) | sixiang-spirit-seals-v1、sixiang-swords-warm-v1、sixiang-swords-cool-v1。 |
| [ConvergenceArt:15](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/ConvergenceArt.ts:15) | tiandi-solid-sword-v2、convergence-gold-sword-v2、convergence-ice-aura-sharp-v2。 |
| [CrossBurstArt:15](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/CrossBurstArt.ts:15) | cross-ice-arc-v1、cross-crimson-arc-v1。 |
| [SwordTiandiArt:35](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/SwordTiandiArt.ts:35) | sword-tiandi-v1、tiandi-solid-sword-v2、convergence-ice-aura-v1。 |
| [SwordLineArt:31](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/SwordLineArt.ts:31) | line-sunlight-sword-blue-v3、line-rift-reference-v1。 |
| [SwordShadowArt:23](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/SwordShadowArt.ts:23)、[FlightSwordArt:9](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/FlightSwordArt.ts:9) | sword-shadow-luminous-v1、flight-liuquan-v1。 |
| [SwordBurstArt:13](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/SwordBurstArt.ts:13)、[QingpingAudio:8](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/QingpingAudio.ts:8) | tiandi-solid-sword-v2；声音 sword-burst、qingping-swoosh、qingping-impact。 |
| [FlightStreamArt:12](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/FlightStreamArt.ts:12)、[NingshenAuraArt:11](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/NingshenAuraArt.ts:11)、[JianguAuraArt:12](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/JianguAuraArt.ts:12)、[BumieAuraArt:11](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/BumieAuraArt.ts:11)、[JianxinAuraArt:11](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/JianxinAuraArt.ts:11) | flight-stream-v3、ningshen-aura-v1、jiangu-aura-v1、bumie-aura-v1、jianxin-aura-v1；这些固定路径在代码中存在，即使宿主当前未调用对应 preload/sync，也先保留。 |

### 尚未能当作“全路径运行已证明”的动态边界

1. 本次只执行数据枚举和源码闭包分析，没有逐一运行 9 层、全部波次、全部技能、弱网/断网、保存恢复或真实转换包。`getInfoWithPath` 成功不能证明纹理绑定成功。
2. 楼层 monster 分组必须包含召唤闭包。[js/xianxia/TowerMonsterMechanics.js:65](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/js/xianxia/TowerMonsterMechanics.js:65) 使用 `${e.family}_normal`，不存在时回退 `boar_normal`；[js/xianxia/TowerMonsterMechanics.js:67](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/js/xianxia/TowerMonsterMechanics.js:67) 再走 `_enemy`。仅对 FLOORS.waves/boss 扫表会遗漏召唤、复制体、孵化体和机制对象。
3. `tower-library/` 的 6 个可选键（library_interior_bg、library_book_pills、library_book_weapons、library_book_equipment、library_jade_stand、library_open_book）当前没有资源文件。[TowerLibraryPanel:14](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerLibraryPanel.ts:14)、[TowerLibraryPanel:96](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerLibraryPanel.ts:96) 按完整性探测 fallback；它们应记录为**已知可选缺省**，不能静默从清单剔除相关逻辑，也不能把未来 bundle 尚未加载误判成文件不存在。
4. `TowerView` 明确写“Passive aura art is reserved for future domain skills; do not load or display it here”（[TowerView:504](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:504)）。flight/ningshen/jiangu/bumie/jianxin 对象当前只有创建、clear、destroy；这些声明不支持“正在下载”结论。为避免过度排除，本报告仍将其有固定 load 路径的图列入保留集合。
5. `SwordArcArt` 的 legacy/tower-v2 profile、`TowerProjectileArt` 的 legacy yujian 分支仍有实际代码；即便正常新档不触发，本次未证明所有合法快照都排除它们，因此不列为精确排除。

## 指定两个旧文件的证据与约束

| 资源 | 原始字节 | 基础 UUID | 当前路径证据 |
|---|---:|---|---|
| `tower-skill-fx/flight-stream-v2.png` | 5,985,641 | `70aced54-e3c0-478c-a7f9-84a706d57ee5` | [FlightStreamArt:12](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/FlightStreamArt.ts:12) 是固定 `flight-stream-v3`，不存在版本参数或 v2 fallback；其他 skill-fx 动态表也不包含 v2。 |
| `tower-monsters-motion/boar.png` | 3,058,980 | `76515ffa-af74-4aff-8e55-aaf9abc2ac60` | [TowerMonsterArt:295](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:295) 显式将 boar 映射为 boar-v3，狂暴为 boar-v3-enraged；只剩 wolf/spider 的 -v1 分支。boar.json 的 version=1 也不满足当前 validMotion 的 version=2（[TowerMonsterArt:316](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:316)）。 |

SHA-256：

- flight-stream-v2.png：`f0e63103f64c8d3f45f329e047e03c8375b53f6359cd1a25e57f3cf8de4d4797`
- tower-monsters-motion/boar.png：`22a8f5ca42a4001ea61498a1d41f2268111152ce828d5d027e859f5a599da307`

**不能误删 `tower-monsters/boar.png`。** 它是另一个目录中的现行静态回退/层主预览图，[TowerMonsterArt:72](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:72) 在同族动画准备前仍请求。排除策略必须是精确相对路径，禁止 `boar*` 或 `flight-stream*` 通配符。旧 boar.json 可作为下一批配套候选，但两个指定 PNG 的最小批次无需一起扩展。

## 其他候选非活跃资源

下表是保守“所有现有加载器可能路径”差集，且都无其他项目资产基础 UUID 引用。是后续可审查排除清单，不授权直接删源文件，也不建议一次排除所有条目。路径相对 `cocos-pilot/assets/resources/`；SHA、UUID 和可能加载证据详见 `/private/tmp/t06-resource-audit.json`。

| 候选路径 | 字节 | 排除依据类别 |
|---|---:|---|
| `player-hud/jade-dragon-hd/body.png` | 73,821 | HUD 固定两路径；无 jade-dragon 消费者 |
| `player-hud/jade-dragon-hd/head.png` | 9,579 | HUD 固定两路径；无 jade-dragon 消费者 |
| `player-hud/jade-dragon-hd/tail.png` | 4,689 | HUD 固定两路径；无 jade-dragon 消费者 |
| `tower-breakthrough/README.md` | 1,923 | 说明文档，无运行加载；构建是否导入需单独确认 |
| `tower-character/inventory-body.png` | 25,880 | 角色只读 ground-actions/seal-actions 双类型图集 |
| `tower-entry/tower-closeup.png` | 407,819 | 入口已使用 sect-scene/tower-courtyard 分支 |
| `tower-held-weapons/eq_sword_suwen.png` | 70,886 | 唯一手持加载前缀固定为 tower-held-weapons-v2 |
| `tower-held-weapons/eq_sword_zhenyue.png` | 65,531 | 唯一手持加载前缀固定为 tower-held-weapons-v2 |
| `tower-monsters-motion/boar-v2-enraged.png` | 2,571,022 | 动画族选择器已固定 boar-v3，旧 boar/v2 不可达 |
| `tower-monsters-motion/boar-v2.json` | 22,234 | 动画族选择器已固定 boar-v3，旧 boar/v2 不可达 |
| `tower-monsters-motion/boar-v2.png` | 2,672,351 | 动画族选择器已固定 boar-v3，旧 boar/v2 不可达 |
| `tower-monsters-motion/boar.json` | 8,983 | 动画族选择器已固定 boar-v3，旧 boar/v2 不可达 |
| `tower-monsters-motion/boar.png` | 3,058,980 | 动画族选择器已固定 boar-v3，旧 boar/v2 不可达 |
| `tower-skill-fx/cross-burst-red-arc-v1.png` | 41,056 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/cross-burst-red-arc-v2.png` | 40,757 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/flight-shoushan-v1.png` | 44,117 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/flight-stream-v1.png` | 1,404,430 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/flight-stream-v2.png` | 5,985,641 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/liangyi-v3/ring-flow.png` | 215,062 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/liangyi-v3/sword-cyan.png` | 39,053 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/liangyi-v3/sword-white.png` | 40,066 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/line-sunlight-sword-v1.png` | 36,505 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/line-sunlight-sword-v2.png` | 129,966 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/sword-line-v1.png` | 353,887 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/sword-qi-crescent-220-v1.png` | 111,803 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/sword-qi-crescent-220-v2.png` | 103,753 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/sword-qi-crescent-v1.png` | 64,181 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/sword-qi-cross-v1.png` | 62,412 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/sword-qi-cross-v2.png` | 131,235 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/sword-shadow-v1.png` | 70,536 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/wuwo-flow-v2.png` | 193,099 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-fx/wuwo-ice-blade-v1.png` | 107,914 | 不在上列固定 skill-fx 路径、profile、ART 和有限数组集合 |
| `tower-skill-icons/magnet.png` | 61,438 | 不在 GROWTH_SKILLS/GROWTH_EVOLUTIONS 18 项 ID Set |
| `tower-ui/jade-disc.png` | 26,733 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-bao.png` | 15,146 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-engraved-bao.png` | 29,414 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-engraved-fa.png` | 30,400 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-engraved-fabao.png` | 28,838 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-engraved-fan.png` | 26,843 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-engraved-ling.png` | 29,591 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-engraved-lingbao.png` | 26,566 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-engraved-shen.png` | 39,154 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-engraved-xian.png` | 28,554 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-fa.png` | 15,024 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-fabao.png` | 15,370 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-fan.png` | 14,585 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-ling.png` | 15,046 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-lingbao.png` | 14,718 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-shen.png` | 26,963 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |
| `tower-ui/jade-plaque-xian.png` | 15,261 | 唯一 UI 模板是 jade-plaque-clear-${rank.id} |

完全重复的 `orbit-sword-v1.png` 与 `liangyi-v3/sword-white.png` 不应通过“覆盖文件”去重：前者有现行消费者，后者目前在候选差集。若以后复用后者路径，须继续检查帧尺寸/材质契约。当前两个文件与各自 meta 都保留在源码。

## 当前缓存、引用和加载分组边界

1. **一个整局宿主队列。** [PinePilot:34](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/PinePilot.ts:34) 建立队列，到 [PinePilot:51](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/PinePilot.ts:51) 宿主销毁才结束。`TowerAssetQueue.entries` 以类型→路径 Map 缓存（[TowerAssetQueue:11](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerAssetQueue.ts:11)、[TowerAssetQueue:31](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerAssetQueue.ts:31)）；每个成功 Asset `addRef`（[TowerAssetQueue:78](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerAssetQueue.ts:78)），只有 queue.dispose 全量 `decRef`（[TowerAssetQueue:59](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerAssetQueue.ts:59)）。`beginBlocking/endBlocking` 只是遮罩批次，不是所有权或释放分组。
2. **Art 自己再持有 ImageAsset 并创建 Texture2D/SpriteFrame。** 例如 [TowerMonsterArt:301](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:301)、[TowerMonsterArt:348](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMonsterArt.ts:348)，[TowerMenu:973](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:973)。Art.destroy 的 decRef 不会移除仍在全局队列里的那一份引用；单改 Art.destroy 不能保证引擎资源释放。反过来，直接 release 全局资源而没先解绑 sprite 会破坏仍使用者。
3. **战斗持久 Art 与短命实例混合。** TowerView 成员中的角色、怪物、环境、技能类跨 render 保留；render 的 [TowerView:412](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:412) 主要 clearBindings，到宿主 destroy 才 destroy（[TowerView:1336](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:1336)）。MonsterArt 的 speciesRenderers、entry Map、motion PNG/JSON/狂暴纹理没有按楼层淘汰。`TowerMonsterMechanicsView` 则每次 buildBattle 重建（[TowerView:524](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:524)），旧的在 render 清理；这层销毁也没有移除队列缓存。
4. **菜单/藏经阁已有自然边界。** TowerMenu.towerImages 按路径持有，destroy 释放（[TowerMenu:344](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:344)）；TowerLibraryPanel.art 在 destroy 释放（[TowerLibraryPanel:133](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerLibraryPanel.ts:133)）；skillIcons 是每个菜单一套（[TowerSkillIcons:16](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerSkillIcons.ts:16)）。重绘只清 binding，不释放纹理。可作为未来 UI 组所有者，但底层队列必须配套。
5. **相同图片不等于相同 GPU 纹理。** `tiandi-solid-sword-v2` 被 Convergence/SwordBurst/SwordTiandi 分别 new Texture2D，orbit-sword-v1 被 Orbit/Projectile 分别 new Texture2D。队列去重的是 ImageAsset 加载，不能从它推导 GPU 纹理去重或峰值降低。本报告没有显存测量。
6. **音频显式非必需。** [TowerResources:18](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerResources.ts:18) 对 AudioClip 绕过队列，拥有者单独 addRef/decRef。不能在新分组中把缺失声音加入强制首屏 barrier。
7. **T05 前置仍重要。** 本次读取的 queue 在 binding callback throw 后仅 log，仍置 ready（[TowerAssetQueue:81](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerAssetQueue.ts:81)）；不应在分组改造里继续扩大这类“传输成功=绑定成功”的假完成。主线程正在处理前置，本报告不修改它。

## 最小风险的发行排除实现提案

建议第一批仅做“**源码原样保留，干净 staging 构建时精确过滤两张旧 PNG 和它们的 meta**”。不手改现有构建产物，不改资源分辨率，不把资源移出源码。

1. 新建版本化发行资源策略（例如 `release/asset-policy.json`），记录 schema/version、精确 sourcePath、assetType、基础 UUID、源 SHA-256、meta SHA-256、排除理由和替代路径。第一批仅两个指定路径；json/png 同名键必须保留类型。规则失配、新增未知资源、目标不存在或哈希变化时 fail closed，由人工/新审计更新清单。
2. `build.mjs` 完成 prepare config、sync-shared 后冻结原工作区输入，然后将必需项目文件复制到独立 staging 项目。对 `assets` 使用复制白名单/精确 exclude，跳过这两个 PNG 和两个 meta；其余文件/meta 字节不变。保留完整目录 meta，保留 design/素材库源文件在原工作区。不要把源码目录软链接进会写入的 staging。
3. staging 不复制旧 `library`、`temp`、`build` 导入缓存；Creator 对过滤后的项目重新导入/构建，避免旧 UUID 缓存把历史 native 图留在产物中。让 `--project`/configPath/output 全部落到 staging；完成检查后才把最终产物和证据提升为候选。当前 [scripts/cocos/build.mjs:18](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/scripts/cocos/build.mjs:18) 直接指向真实项目，须在该调用边界接入 staging。
4. 原工作区构建前/后哈希、策略哈希、staging 索引哈希、工具链/配置、最终产物都写入构建记录；最终输出必须能映射回原源码快照和策略。当前 [scripts/release-integrity.mjs:7](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/scripts/release-integrity.mjs:7)、[scripts/release-integrity.mjs:8](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/scripts/release-integrity.mjs:8) 只显式纳入 `release/settings.json`，**若策略放在 release 下，必须新增到 requiredInputs**，不能只依赖 scripts 哈希。
5. 验证 stage 的 378 个非 meta 文件及逐文件哈希；元数据与源文件匹配；原源码两个旧图、meta 的哈希完全不变。构建后按 UUID/路径解析输出资源 config，证明候选旧键/native 依赖确实没有进入产物，并证明所有保留 `(path,type)` 都可定位。不能仅 `find *.png | wc`。
6. 回滚只换回前一版本策略或关闭两个精确排除，再从干净 staging 构建；不“恢复被删原图”，因为原文件从未删除。清理 staging 应检查专属标记和绝对根路径，不允许把原 repo 当作清理目录。

不建议第一批改 `package-wechat` 删除 native 文件：当前 [scripts/cocos/package-wechat.mjs:7](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/scripts/cocos/package-wechat.mjs:7) 仅将已构建 internal/main/resources 整 bundle 迁到 subpackages，并重写 settings/game.json（[scripts/cocos/package-wechat.mjs:11](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/scripts/cocos/package-wechat.mjs:11)）。此时删个别纹理既需要改导入索引，也可能遗漏子资产引用。应在 Creator 的输入侧过滤。

## 可行分组设计与必须配套的改动

可先输出纯逻辑 group manifest 和加载记录，不立即迁移物理 bundle；这是风险最低、可测量的第一步。随后再基于真实 Tap 转换产物决定物理 bundle / CDN。

| 逻辑组 | 建议内容/触发 | 需要注意的跨组依赖 |
|---|---|---|
| boot | loading/keyart、必要脚本与启动 UI | Web loading-keyart.jpg 是额外复制路径，仍必须保留。 |
| sect + common-ui | luoyun、player-hud、四币/导航；其他院落可按面板 | tower-entry 菜单会一次画 9 层 boss 缩略图，[TowerMenu:1025](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerMenu.ts:1025)，因此会读取未来楼层**静态**图；不要把它误称“首屏只加载第一层”。 |
| character-base | ground-actions / seal-actions、当前武器必要图 | 手持双图与角色动作按同一个玩家所有者释放；暂不做降分辨率。 |
| battle-common | 环境 3 图、常用掉落图、基础攻击 | `preloadDrops` 目前预载所有 pill + 四币等，[TowerStoneArt:17](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerStoneArt.ts:17)；若目标是减少第一层输入，须重新定义必需掉落组，而非只换目录。 |
| monster family + mechanics | boar/wolf/spider 动画族各自配 PNG/JSON/狂暴；其余静态族；机制/投射物单独小组 | 按 FLOORS + ARCHETYPES + 召唤闭包计算。boar/wolf 被多层复用，适合族组或有共享依赖的楼层组，不能每层复制一份。 |
| equipped-skill + shared-fx | 根据实际 loadout 请求技能组；tiandi-solid/orbit-sword 等共享组 | `buildBattle` [TowerView:505](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:505) 到 [TowerView:523](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerView.ts:523) 仍无条件 preload 多个高阶技能。物理分组若不改这部分，首次进战斗仍会下载这些组。 |
| library-detail | 86 张大插画，按条目或小批量读取 | 当前 lazy image 已存在；先保留 125 条元数据和小图。getInfoWithPath 要从 manifest 判断可用，而不是要求目标 bundle 已装载。 |
| breakthrough | zhuji/jindan 图片组；声音可选 | 只在对应仪式入口准备，不让可选声音卡住屏幕。 |

运行时桥接器可保持 `load(logicalPath,type,callback)` API，但需由清单解析为 `group/bundle/relativePath/type`，所有重复加载仍按统一逻辑键去重。`getInfoWithPath` 也必须适配；当前它直接绑定原 resources（[TowerResources:15](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/scripts/TowerResources.ts:15)），仅替换 load 会让异步/远程 library 大图被误判为不存在。

需要显式 acquire/release group 所有权及多消费者引用，而不是仅加 group 字符串：先取消/解绑失效节点、销毁自建 frame/texture，再释放 Art 与队列持有的引用；晚回调需带 generation/token。退出某一楼层不能释放正在菜单缩略图/其他组使用的共享 Asset。资源释放/驻留应按 T08 的测量条件另做，第一批输入过滤不变更缓存生命周期。

当前 `resources.meta` 明确 `isBundle=true,bundleName=resources,priority=8`（[cocos-pilot/assets/resources.meta:9](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/assets/resources.meta:9)），`wechatgame.json` 的 `bundleConfigs` 为空（[cocos-pilot/build-configs/wechatgame.json:19](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/cocos-pilot/build-configs/wechatgame.json:19)）。物理多 bundle 之后还要调整 packageWechat 的硬编码列表、依赖/启动顺序、跨 bundle 查找与转换工具；不能只给 game.json 增加 subpackages 就声称 Tap 生效。

## 可完成的本地验证与未完成验收

本次已完成：目录/字节枚举、134 模块入口闭包、有限动态路径枚举、7 份图集 JSON 读取方式检查、候选外部 UUID 文本引用检查、125 条图鉴/18 个技能 ID/8 个等阶/9 层基础数据枚举。没有执行游戏和构建，因此不声称零 404、正确视觉、弱网恢复或实际包体收益。

实现后的最低本地验证：

- staging 精确两项过滤和哈希保护；原源码/meta 不变；无通配误排除；策略变更使旧 build stamp 失效。
- 各现行 ImageAsset/JsonAsset/AudioClip 键存在性与类型契约，缺省 tower-library 的 fallback 清单单列。
- 所有菜单院落、背包、18 技能图标、8 等阶、125 图鉴条目的开闭/切页；86 张现行大图均可绑定。
- 9 层全部波次及召唤闭包，怪物普通/Boss/狂暴/死亡/暂停；boar-v3 PNG+JSON+rage、wolf/spider 动画不能缺一项。
- 技能与突破全部路径的实际加载日志（包含 path/type/group/error/retry/consumer），注入 404/超时/绑定 throw/销毁后晚回调，T05 语义有效。
- 四口径分别报告：发行首次下载包体、首屏传输、动态加载增量、完整原始资源；真机帧/解码/纹理峰值另记，不能互换。

仍须外部条件：Tap 账号真实转换/上传限制、低中高目标设备、网络/缓存/重试真机验证。`package-wechat.mjs` 中 4 MiB 单包和 20 MiB 总量是**项目脚本预算**（[scripts/cocos/package-wechat.mjs:22](/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom/scripts/cocos/package-wechat.mjs:22)），不是本报告核实过的 Tap 限制。两张旧图排除后的 114.42 MiB 原始资源也不证明任何平台上限达标。

## 附属只读证据

- `/private/tmp/t06-resource-audit.json`：380 文件路径/字节/SHA-256/UUID/可能加载证据/外部 UUID 引用与 50 候选差集。
- `/private/tmp/t06-runtime-catalog.json`：运行数据导出的 125 条图鉴、18 技能、8 等阶、27 个 archetype art_family、9 层基础 ID 集。
- `/private/tmp/t06-load-sites.txt`：当前 TS 资源加载/预载/探测位置。
- `/private/tmp/t06-audit.py`：枚举与差集的本地只读分析脚本。它将 dormant loader 也保守纳入，不能单独作为未来自动删除器。

### 关键文件读取指纹

以下 SHA-256 用于识别本分析所读代码，后续改动需重新验证相关结论。

| 文件 | SHA-256 |
|---|---|
| `cocos-pilot/assets/scripts/TowerMonsterArt.ts` | `4f30c7fdb517957238e1aeacbaaf63027638cde3286c9be27d8166a9b66661ba` |
| `cocos-pilot/assets/scripts/FlightStreamArt.ts` | `4de0372847101fa8bd04ab389177af03fae73bd96871932623c2b47ead703f3f` |
| `cocos-pilot/assets/scripts/TowerResources.ts` | `c0153470f224d30f4f29a227071ad2ed5e3c3fed1de665428bf29af5a48f1b5c` |
| `cocos-pilot/assets/scripts/TowerAssetQueue.ts` | `f1fc7527fc86788d4b245ee026b564edd1a3ed6299d16ea8f235e48c48191c1a` |
| `cocos-pilot/assets/scripts/TowerView.ts` | `535275edc243cda03391d8109929fa0d1cc2648c74acd6b0b00dfa134910d7b7` |
| `cocos-pilot/assets/scripts/TowerMenu.ts` | `080545a78f3f8299a77cabb07b02c7a7ff60c148a6cca624e6adbe200f359c4b` |
| `cocos-pilot/assets/scripts/TowerLibraryPanel.ts` | `17f32e894fe32835f46e7b98a76b38e78c3f3218fd947a85e1c412b0297ee965` |
| `scripts/cocos/build.mjs` | `ce98c42b836c46086a4a639277bb9ce581782fdcf8abefb3c7ec1cb7cb55afa9` |
| `scripts/cocos/package-wechat.mjs` | `cf0b669dfefc0e6dee0e79df63dcf063811efc39a2751233caaaf47ffca6a568` |
| `scripts/release-integrity.mjs` | `fad570ff7dc73f023f0703fc282a6eadebca2065e868d33cc665048344cd7b8b` |
