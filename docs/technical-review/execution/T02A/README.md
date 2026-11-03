# T02 阶段 A — fixture 恢复报告

本阶段完成测试夹具、Cocos 边界和已核实 selector 的修复；**T02 整体仍未通过**。未修改生产代码、数值 expected、容差或规则断言，没有 skip、删除测试或将失败转成成功。

## 结果

| 口径 | 总数 | 通过 | 失败 | skip |
| --- | --- | --- | --- | --- |
| 原始全仓基线 | 2088 | 1525 | 563 | 0 |
| T01 历史全量日志（57 个新增测试） | 2145 | 1582 | 563 | 0 |
| 本阶段六文件修改前 | 359 | 33 | 326 | 0 |
| 本阶段六文件最终 | 359 | 170 | 189 | 0 |
| 本次全量最终 | 2150 | 1723 | 427 | 0 |

全量包含主任务在 T01 提交 `1ae80fc` 中的 62 个新增发布测试，比历史 T01 日志多 5 个。按 `(文件, 完整测试名称)` 对照历史 563 个失败，**137 项恢复通过，原始全量新增 1 项 EPERM 环境失败**；这 5 个新增发布测试不计为 T02 修复。六文件余下 189 项，未改文件原始结果余下 238 项。两次最终主运行均以 exit 1 结束。

**环境复核**：全量新增的 `xianxia-sword-flow-specialization` 用例在写 `reports/equipment-integer-v2-2026-11-03/two-slot-budget.json` 时被 .codex 工作树权限拦截；预算计算及断言此前已完成。随后以已授权的提升权限仅复跑该文件，3/3 通过、exit 0。原始全量数值保持 1723/2150、427 失败，不将定向复核冒充第二次全量；待裁决业务/规则失败为 426（六文件 189，其他原有 237），新增业务失败为 0。

| 测试文件 | 修改前 通过/失败 | 最终 通过/失败 | 最终首个异常 |
| --- | --- | --- | --- |
| tower-skill-effects.test.mjs | 25/3 | 28/0 | 无 |
| xianxia-material-feedback.test.mjs | 2/1 | 3/0 | 无 |
| xianxia-tower-forge-ui.test.mjs | 2/24 | 5/21 | AssertionError: The input did not match the regular expression /凡器购置/. |
| xianxia-tower-host-tools.test.mjs | 0/182 | 44/138 | AssertionError: Expected values to be strictly equal: 5 !== 3 |
| xianxia-tower-inventory.test.mjs | 3/108 | 81/30 | AssertionError: 领取10张试玩券 0 !== 1 |
| xianxia-tower-skill-icons.test.mjs | 1/8 | 9/0 | 无 |

六文件剩余异常分类：179 个 AssertionError、7 个 TypeError、2 个 RangeError、1 个 Error；ReferenceError 为 0，缺新增类/业务函数的直接阻断已消除。余下 TypeError 不再是缺类，具体名称与堆栈在清单中保留。

## 改动范围与证据

- `host-tools`：补齐 26 个传递 TS 模块，新增 JS binding 均来自真实 `js/xianxia` 模块；每个 TS 模块仍在独立 VM closure 中执行，保留私有常量隔离及 `TOWER_HOST_BUNDLE` 回归入口。新增的是突破、飞行/心法、拾取、怪物特效等真实实现，没有空业务类。补上真实 `drawPlayerMana`。

- `inventory` 与 `forge-ui`：在菜单前加载真实 `WeaponQualityArt`、`TowerCharacterArt`，注入 `equipmentSkillBonus`、`characterCombatAttributes`；forge 还补齐真实混合抽奖函数及 `drawPlayerMana`。补充 Cocos `JsonAsset/Rect/Size` 结构边界。既有资源延迟加载、Library boundary 保持原样，未导入另一测试文件作 helper。

- `tower-skill-effects`：三个角色动作测试加载真实 `WeaponQualityArt`。`skill-icons`：selector 从 `技能素材裁剪-*` 改为当前 `功法素材裁剪-*`；缓存、引用计数、失败负缓存、destroy 晚回调、严格 isValid 断言均保留。`material-feedback`：补充 `debuffIcons.reset()` 和 `ritualAudio.stop()` 表现边界，通知清空断言保留。

- 宿主/菜单 selector 对齐已核实的 `功法*` 节点，包括连线采样、图标、详情、初始化弹窗与 `+999功法点`；未替换旧成长规则、旧体验档方法或已移除的交互。

- 角色图片 fixture 从固定 `2048×1920` 改为所供 atlas 的 `width/height`。当前真实 ground-actions PNG/atlas 为 `2048×2688`，原高度导致资源校验失败、三个 volley 测试无法创建角色 body。现在三项执行到实际动作数量断言（2/3/4 vs 原预期 1/2/3），没有改动作数 expected。

- forge 购买按真实场景入口 `炼器主殿`（文案“入殿购器”）/`炼器炉`（文案“开炉炼器”）、分类、商品/配方卡片、确认购买执行。批量买装备已触发真实 `buyGear`；单件购买、背包同一物品身份与旧回调保护通过。丹药测试在真实 `buyPill`、Store 重载、重复点击、保存失败原子性和退出流程之后，继续检查原来的价格/文案 expected 并保持红灯。旧批量炼制测试仍因当前 UI 无数量控制而失败，未伪造现行交互。

## 无生产变更与保护断言

`git diff --name-only -- js cocos-pilot/assets/scripts scripts` 输出为空；本阶段修改仅为下列六个测试；交接快照时生产目录和生成脚本没有差异。`git diff --check` 通过。本阶段没有运行生成脚本，没有修改 Cocos/业务生产文件，没有 commit/push。没有新增 helper 文件。

| 文件 | test 声明 前/后 | assert 调用 前/后 | skip 标记 |
| --- | --- | --- | --- |
| tower-skill-effects.test.mjs | 28/28 | 119/119 | 0 |
| xianxia-material-feedback.test.mjs | 3/3 | 14/14 | 0 |
| xianxia-tower-forge-ui.test.mjs | 19/19 | 128/130 | 0 |
| xianxia-tower-host-tools.test.mjs | 127/127 | 1297/1297 | 0 |
| xianxia-tower-inventory.test.mjs | 77/77 | 499/499 | 0 |
| xianxia-tower-skill-icons.test.mjs | 9/9 | 71/71 | 0 |

声明数量只用来检查没有删测，不代替行为验证；参数化展开后的总数仍是 359。数值 expected 不变；forge 两条新增断言核实真实 `buyPill` action 与重新读取的库存。少数旧展示/经济断言移到交易流程之后，使用动作前后保存的取样值，避免旧文案先中断而使持久化验证没有执行。

## 剩余失败的分组与下一步

以下分组用于下一阶段排程，不把所有失败自动认定为“测试过期”。完整名称、异常消息和堆栈见 `task-2a-failures.json`；本报告末尾逐项列出六文件剩余名称。

| 审查组 | 项数 |
| --- | --- |
| B1 旧体验档/开发工具/存档入口 | 24 |
| B2 成长/技能/schema/有效fixture | 56 |
| B3 交易/背包/装备与经济 | 54 |
| B4 UI/资源/动作/战斗呈现 | 55 |
| B5 未改文件：Campaign/丹药/Profile | 43 |
| B6 未改文件：装备目录/工厂/预算 | 52 |
| B7 未改文件：成长/境界/技能/schema | 91 |
| B8 未改文件：战斗/掉落/怪物机制 | 51 |
| E0 环境权限（定向复核已通过） | 1 |

- **优先保存合同**：先建立当前合法等级/物品/技能 fixture，再做保存失败、重复请求、陈旧写入、重载与模式隔离测试。应保留拒绝/原子性性质，不能因旧入口已移除就删除整项保护。

- **已有明确新依据**：`docs/xianxia/economy/2026-11-03-resource-roles.md` 明确新档 1000 点眷、免费试玩十连停用、普通商品/丹药改付灵石、分解只返灵石；`docs/xianxia/reports/settings-menu-v3-2026-10-30/README.md` 明确仅主存档，不再切旧体验档。旧 300 余额、贡献买丹、领取10张试玩券、双档切换可在阶段 B 据此迁移，仍需保留相应事务与防重领性质。

- **成长与 schema**：依据分析报告第 4.1–4.2 节及 71/75/91 号规范逐项裁决；当前保留 `magnet` 不合法、旧阶段/技能数、退点门槛等失败。不要将实际结果直接抄为 expected。

- **需继续调查**：资源请求数量 5 vs 3、菜单/战斗 HUD 与 XP 环、装备详情结构、旧炼器窗口/批量控制、ground-actions 动作节奏、floor 7 普通虎假设、装备预览 undefined quality。缺类错误已经清除，这些不能再归为缺 TS class；是否属于被替代需求或真实缺陷须继续对照当前实现和规范。

## 可复查证据

- 六文件原始复现：`task-2a-before.tap.gz`。最终六文件：`task-2a-focused-tests.tap.gz` 与 `task-2a-focused-tests.jsonl.gz`。

- 一次全量：`task-2a-full-tests.tap.gz` 与 `task-2a-full-tests.jsonl.gz`。等主任务第二次真实 Creator Web 构建结束后启动，运行期间主任务暂停其他测试文件写入。

- 权限定向复核：`task-2a-permission-recheck.tap.gz`、`task-2a-permission-recheck.jsonl.gz`；测试生成的预算诊断保存在 `task-2a-two-slot-budget.json`，原位置恢复到运行前不存在的状态。

- 精确失败清单、恢复名称、异常类型、每文件统计、保护断言计数及无生产差异记录：`task-2a-failures.json`。

- 命令：`node --test` 加 TAP/JSONL reporter，六文件显式路径；全量为 `tests/*.test.mjs`。没有重新执行 Creator 构建或资源生成。本阶段保留 `TOWER_HOST_BUNDLE` 入口，但未另外声称 bundle 回归通过。

## 全量各失败文件

| 文件 | 通过 | 失败 | 首异常类型 |
| --- | --- | --- | --- |
| sword-damage-types.test.mjs | 6 | 3 | AssertionError |
| tower-qi-progression.test.mjs | 0 | 8 | AssertionError |
| xianxia-armor-offense.test.mjs | 6 | 2 | AssertionError |
| xianxia-breakthrough-items.test.mjs | 11 | 1 | AssertionError |
| xianxia-developer-tools.test.mjs | 8 | 1 | RangeError |
| xianxia-equipment-bases.test.mjs | 7 | 1 | AssertionError |
| xianxia-equipment-eight-tier-budget.test.mjs | 1 | 4 | AssertionError |
| xianxia-equipment-eight-tiers.test.mjs | 2 | 1 | AssertionError |
| xianxia-equipment-identities.test.mjs | 11 | 1 | AssertionError |
| xianxia-equipment-output-scheduling.test.mjs | 0 | 1 | AssertionError |
| xianxia-fixed-equipment.test.mjs | 3 | 3 | AssertionError |
| xianxia-forging.test.mjs | 5 | 1 | AssertionError |
| xianxia-library.test.mjs | 7 | 3 | AssertionError |
| xianxia-monster-balance-harness.test.mjs | 13 | 1 | TypeError |
| xianxia-natural-growth-strategy.test.mjs | 2 | 7 | AssertionError |
| xianxia-opening-pill-gate.test.mjs | 0 | 2 | AssertionError |
| xianxia-ring-universal-budget.test.mjs | 2 | 1 | AssertionError |
| xianxia-stone-skill-costs.test.mjs | 5 | 1 | AssertionError |
| xianxia-sword-flow-specialization.test.mjs | 2 | 1 | Error |
| xianxia-tower-balance-optimization.test.mjs | 9 | 1 | AssertionError |
| xianxia-tower-campaign-growth.test.mjs | 47 | 21 | AssertionError |
| xianxia-tower-campaign.test.mjs | 20 | 19 | AssertionError |
| xianxia-tower-cultivation-rewards.test.mjs | 1 | 1 | AssertionError |
| xianxia-tower-doc52-tier-gate.test.mjs | 2 | 1 | AssertionError |
| xianxia-tower-equipment-budget.test.mjs | 1 | 2 | AssertionError |
| xianxia-tower-equipment-campaign.test.mjs | 34 | 7 | AssertionError |
| xianxia-tower-equipment-doc52.test.mjs | 4 | 5 | AssertionError |
| xianxia-tower-equipment-history.test.mjs | 0 | 8 | AssertionError |
| xianxia-tower-equipment.test.mjs | 4 | 3 | AssertionError |
| xianxia-tower-flight.test.mjs | 18 | 1 | AssertionError |
| xianxia-tower-forge-ui.test.mjs | 5 | 21 | AssertionError |
| xianxia-tower-growth-feedback.test.mjs | 3 | 2 | RangeError |
| xianxia-tower-growth.test.mjs | 10 | 12 | AssertionError |
| xianxia-tower-host-tools.test.mjs | 44 | 138 | AssertionError |
| xianxia-tower-inventory.test.mjs | 81 | 30 | AssertionError |
| xianxia-tower-manual-learning.test.mjs | 1 | 2 | AssertionError |
| xianxia-tower-playtest-resources.test.mjs | 10 | 3 | AssertionError |
| xianxia-tower-playtest.test.mjs | 18 | 4 | RangeError |
| xianxia-tower-profile.test.mjs | 9 | 9 | AssertionError |
| xianxia-tower-rank-bands.test.mjs | 15 | 2 | AssertionError |
| xianxia-tower-realm-only-skills.test.mjs | 2 | 3 | AssertionError |
| xianxia-tower-run-attacks.test.mjs | 29 | 2 | AssertionError |
| xianxia-tower-run-growth.test.mjs | 18 | 9 | AssertionError |
| xianxia-tower-run-loot.test.mjs | 4 | 7 | AssertionError |
| xianxia-tower-run.test.mjs | 18 | 7 | AssertionError |
| xianxia-tower-skill-decrease.test.mjs | 15 | 7 | AssertionError |
| xianxia-tower-stage-growth.test.mjs | 13 | 24 | AssertionError |
| xianxia-tower-v21-integration.test.mjs | 1 | 2 | AssertionError |
| xianxia-tower-weapon-campaign.test.mjs | 20 | 6 | AssertionError |
| xianxia-tower-weapon-combat.test.mjs | 4 | 19 | AssertionError |
| xianxia-tower-weapons.test.mjs | 4 | 2 | AssertionError |
| xianxia-weapon-actions.test.mjs | 9 | 2 | AssertionError |
| xianxia-yujian-growth.test.mjs | 1 | 1 | AssertionError |
| xianxia-zhuji-pill.test.mjs | 10 | 1 | AssertionError |

## 六文件剩余失败：完整名称

### xianxia-tower-forge-ui.test.mjs

- [B3] **forge hall only sells deterministic fan equipment 1280x720** — `AssertionError`；The input did not match the regular expression /凡器购置/.

- [B3] **crafting preview covers every formal quality pool without spending 1280x720** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(contents.includes(r.definitionIds.length===3?'1/3':'1/2'))

- [B3] **forge overlay controls and independent scroll panes stay in bounds 1280x720** — `AssertionError`；前往背包 0 !== 1

- [B3] **batch purchase debounces callback and reports only persisted awards 1280x720** — `AssertionError`；Expected values to be strictly equal: 99760 !== 99850

- [B3] **forge details have no wish controls 1280x720** — `AssertionError`；The input did not match the regular expression /定岳剑/.

- [B3] **forge hall only sells deterministic fan equipment 844x390** — `AssertionError`；The input did not match the regular expression /凡器购置/.

- [B3] **crafting preview covers every formal quality pool without spending 844x390** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(contents.includes(r.definitionIds.length===3?'1/3':'1/2'))

- [B3] **forge overlay controls and independent scroll panes stay in bounds 844x390** — `AssertionError`；前往背包 0 !== 1

- [B3] **batch purchase debounces callback and reports only persisted awards 844x390** — `AssertionError`；Expected values to be strictly equal: 99760 !== 99850

- [B3] **forge details have no wish controls 844x390** — `AssertionError`；The input did not match the regular expression /定岳剑/.

- [B3] **crafting lists only tiers the current realm can use** — `AssertionError`；Expected values to be strictly equal: false !== true

- [B3] **failed batch save retries with the same receipt and exactly one resource deduction** — `AssertionError`；增加数量 0 !== 1

- [B3] **batch quote rejects total cost, realm, count and capacity before mutating** — `AssertionError`；Expected values to be strictly equal: + actual - expected + undefined - 'insufficient'

- [B3] **quality-four preview includes both graduates and never charges on view or presentation ticks** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(text(menu.root).includes(name))

- [B3] **close and revisit preserve state without retaining a pending submission** — `AssertionError`；Expected values to be strictly equal: '\n‹ 返回庭院' !== ''

- [B3] **sect entries share cultivation state and keep tower separate from inheritance peaks** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '\n' + + '\n' + + '\n' + + '藏经阁\n' + + '功法\n' + + '\n' + + '\n' + + '0\n' + + '可用功法点\n' + + '\n' + + '\n' + + '重置加点\n' + + '\n' + …

- [B3] **danxia 1280x720: main hall opens shop, purchase persists, close and revisit reset** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '回春丹\n\n回春丹\n5下品灵石' - '回春丹\n5贡献' ^

- [B3] **danxia 844x390: main hall opens shop, purchase persists, close and revisit reset** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '回春丹\n\n回春丹\n5下品灵石' - '回春丹\n5贡献' ^

- [B3] **pill quantity and zero balance 1280** — `AssertionError`；Expected values to be strictly equal: 99 !== 5

- [B3] **pill quantity and zero balance 844** — `AssertionError`；Expected values to be strictly equal: 99 !== 5

- [B3] **pills: icon close and outside dismissal preserve state without closing on content taps** — `AssertionError`；丹药购买遮罩 0 !== 1

### xianxia-tower-host-tools.test.mjs

- [B4] **monster missing/malformed resources and unsupported beasts retain fallback with no retry storm** — `AssertionError`；Expected values to be strictly equal: 5 !== 3

- [B1] **requested playtest stays read-only and never writes the ordinary save when the initial copy fails** — `AssertionError`；Expected values to be strictly equal: + actual - expected + undefined - true

- [B1] **same-mode retry can recover a failed isolated copy without touching ordinary progress** — `AssertionError`；expected one button: 重试打开体验档; found 0 !== 1

- [B1] **ordinary progress becomes writable only after an explicit switch from the failed playtest** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B3] **successful sync re-enables current-page buttons and clamps obsolete scroll (ordinary)** — `AssertionError`；expected one button: 购买一颗 · 5贡献; found 0 !== 1

- [B1] **successful sync re-enables current-page buttons and clamps obsolete scroll (playtest)** — `AssertionError`；Expected values to be strictly equal: false !== true

- [B1] **playtest identity survives partial healing, full-HP redraw, and local skill-detail navigation** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(game.store.state.hp > 99.75 && game.store.state.hp < 100)

- [B2] **skill page hides battle vitals and keeps rank hints below icons** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '{"format":"xianxia-sect-tower-campaign","schema":68,"data":"{\\"xp\\":0,\\"hp\\":50,\\"mana\\":100,\\"spiritStones\\":500,\\"cont…

- [B2] **host resets obsolete schema3 exactly once (successful save)** — `AssertionError`；Expected values to be strictly equal: 1000 !== 300

- [B2] **host resets obsolete schema3 exactly once (save failure stays read-only)** — `AssertionError`；Expected values to be strictly equal: 1000 !== 300

- [B2] **economy v2 hides the wallet on hall and skills but shows it in relevant pages** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(wallet)

- [B3] **weapon draw rejects insufficient spiritStones without any state or save change** — `AssertionError`；expected one button: 凡器武器抽取一次; found 0 !== 1

- [B3] **weapon draw rejects insufficient contribution without any state or save change** — `AssertionError`；expected one button: 凡器武器抽取一次; found 0 !== 1

- [B3] **weapon draw atomically pays 100 stones and contribution and preserves the rolled instance** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(expected.ok)

- [B2] **skill pane uses shared weapon damage once after equipping an affix instance** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(labelText(game.menu.root).includes(`每剑伤害：${displayed}`))

- [B2] **first special skill book costs 200 stones atomically and subsequent ranks do not rebuy it** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected ... Skipped lines { activeRun: null, attemptSequence: 0, + books: [ + 'sj_line' + ], - books: [], breakthroughRng: 2255169977, …

- [B2] **three research purchases cost 800/1600/2400 stones and failed saves grant no points** — `AssertionError`；expected one button: 研习 · 8中品灵石换1点; found 0 !== 1

- [B3] **manual healing works after sync recovery and a failed pill save consumes neither HP nor inventory** — `AssertionError`；expected one button: 服用一颗; found 0 !== 1

- [B1] **actual tool buttons preserve paused snapshots and HP, and preferences do not publish on save failure** — `AssertionError`；expected one button: 游戏速度设置; found 0 !== 1

- [B1] **a failed pause checkpoint blocks switching until the real retry button commits it** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(game.pending)

- [B3] **paused and withdrawn loot displays only the 0 credited spirit stones near the wallet cap** — `AssertionError`；Expected values to be strictly equal: 10 !== 0

- [B3] **paused and withdrawn loot displays only the 1 credited spirit stones near the wallet cap** — `AssertionError`；Expected values to be strictly equal: + actual - expected + 19999999999 - 20000000000

- [B3] **paused and withdrawn loot displays only the 10 credited spirit stones near the wallet cap** — `AssertionError`；Expected values to be strictly equal: 30 !== 10

- [B2] **capped floor-three first-clear popup excludes skill points from stone overflow** — `AssertionError`；Expected values to be strictly equal: 840 !== 10

- [B2] **skill arrow follows purchase eligibility: realm cap with spare points** — `AssertionError`；Expected values to be strictly equal: false !== true

- [B2] **skill arrow follows purchase eligibility: no points below cap** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B2] **skill arrow follows purchase eligibility: stage locked** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B2] **skill arrow follows purchase eligibility: no tutorial gate** — `AssertionError`；fixture must exercise the intended gate + actual - expected + 'stage-locked' - undefined

- [B2] **skill arrow follows purchase eligibility: no prerequisite gate** — `AssertionError`；fixture must exercise the intended gate + actual - expected + 'parent-required' - undefined

- [B2] **skill arrow follows purchase eligibility: unlocked first rank** — `TypeError`；Cannot read properties of undefined (reading 'getComponent')

- [B2] **skill arrow follows purchase eligibility: current rank can grow** — `TypeError`；Cannot read properties of undefined (reading 'getComponent')

- [B2] **skill arrow follows purchase eligibility: absolute maximum** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B2] **skill arrow disappears at the realm cap after purchase and returns after refund** — `AssertionError`；expected one button: learnSkill-sj_yujian; found 0 !== 1

- [B4] **dependency connections remain stable across learning and refund without mutating saved state** — `AssertionError`；Expected values to be strictly equal: 3 !== 0

- [B2] **async skill artwork preserves all 16 click targets, clipping, badges and camp transactions (844x390)** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected { + height: 34, + width: 34 - height: 28, - width: 28 }

- [B2] **async skill artwork preserves all 16 click targets, clipping, badges and camp transactions (1024x600)** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected { + height: 34, + width: 34 - height: 28, - width: 28 }

- [B2] **one failed skill image leaves its glyph and camp controls usable alongside loaded artwork** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected [ 'tower-skill-icons/evo_sixiang', 'tower-skill-icons/evo_tiandi', 'tower-skill-icons/evo_wanjian', 'tower-skill-icons/evo_wuwo…

- [B4] **destroying the real host releases loaded icon art and safely ignores pending completions** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected { + height: 34, + width: 34 - height: 28, - width: 28 }

- [B2] **compact skill labels show passive mastery over loaded art and right-aligned points (1280x720)** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected [ 'tower-skill-icons/evo_sixiang', 'tower-skill-icons/evo_tiandi', 'tower-skill-icons/evo_wanjian', 'tower-skill-icons/evo_wuwo…

- [B4] **physical type, flow and level are separate nonoverlapping tags (1280x720)** — `AssertionError`；Expected values to be strictly equal: '物理攻击' !== '物理＋法术攻击'

- [B2] **independent skills have no dependency arrows (1280x720)** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B2] **realm blocks group all 26 skills with five-slot rows and no label column (1280x720)** — `AssertionError`；all 18 current and 9 preview skills appear exactly once + actual - expected ... Skipped lines [ 'evo_sixiang', 'evo_tiandi', 'evo_wanjian', 'evo_wuwo', - 'future_duankong', - 'future_liexu',…

- [B4] **nine-stage UI keeps compact nodes and fixed footer targets (1280x720)** — `AssertionError`；each skill has only icon and name targets 39 !== 54

- [B2] **compact skill labels show passive mastery over loaded art and right-aligned points (844x390)** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected [ 'tower-skill-icons/evo_sixiang', 'tower-skill-icons/evo_tiandi', 'tower-skill-icons/evo_wanjian', 'tower-skill-icons/evo_wuwo…

- [B4] **physical type, flow and level are separate nonoverlapping tags (844x390)** — `AssertionError`；Expected values to be strictly equal: '物理攻击' !== '物理＋法术攻击'

- [B2] **independent skills have no dependency arrows (844x390)** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B2] **realm blocks group all 26 skills with five-slot rows and no label column (844x390)** — `AssertionError`；all 18 current and 9 preview skills appear exactly once + actual - expected ... Skipped lines [ 'evo_sixiang', 'evo_tiandi', 'evo_wanjian', 'evo_wuwo', - 'future_duankong', - 'future_liexu',…

- [B4] **nine-stage UI keeps compact nodes and fixed footer targets (844x390)** — `AssertionError`；each skill has only icon and name targets 39 !== 54

- [B2] **compact skill labels show passive mastery over loaded art and right-aligned points (1024x600)** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected [ 'tower-skill-icons/evo_sixiang', 'tower-skill-icons/evo_tiandi', 'tower-skill-icons/evo_wanjian', 'tower-skill-icons/evo_wuwo…

- [B4] **physical type, flow and level are separate nonoverlapping tags (1024x600)** — `AssertionError`；Expected values to be strictly equal: '物理攻击' !== '物理＋法术攻击'

- [B2] **independent skills have no dependency arrows (1024x600)** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B2] **realm blocks group all 26 skills with five-slot rows and no label column (1024x600)** — `AssertionError`；all 18 current and 9 preview skills appear exactly once + actual - expected ... Skipped lines [ 'evo_sixiang', 'evo_tiandi', 'evo_wanjian', 'evo_wuwo', - 'future_duankong', - 'future_liexu',…

- [B4] **nine-stage UI keeps compact nodes and fixed footer targets (1024x600)** — `AssertionError`；each skill has only icon and name targets 39 !== 54

- [B4] **nine-stage UI plus/minus retain selection and vertical scroll in the viewport-wide tree (1280x720)** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected { x: 0, + y: 1468 - y: 1500 }

- [B4] **nine-stage UI plus/minus retain selection and vertical scroll in the viewport-wide tree (844x390)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '升至3级 · 2点' - '升至 3 级' ^

- [B4] **nine-stage UI plus/minus retain selection and vertical scroll in the viewport-wide tree (1024x600)** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected { x: 0, + y: 1438 - y: 1500 }

- [B2] **skill footer is stationary through commits, failures, read-only and selection (844x390)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '升至2级 · 2点' - '升至 2 级' ^

- [B2] **skill footer displays actual unlearned and maximum ranks (844x390)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '升至10级 · 1点' - '升至 10 级' ^

- [B2] **skill footer is stationary through commits, failures, read-only and selection (1024x600)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '升至2级 · 2点' - '升至 2 级' ^

- [B2] **skill footer displays actual unlearned and maximum ranks (1024x600)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '升至10级 · 1点' - '升至 10 级' ^

- [B2] **skill form, next-rank and future motion details fit the independent scroll (1280x720)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '升至3级 · 1点' - '升至 3 级' ^

- [B2] **skill form, next-rank and future motion details fit the independent scroll (844x390)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '升至3级 · 1点' - '升至 3 级' ^

- [B4] **nine-stage UI shows locked learning without writes below the starting phase** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B4] **nine-stage UI failed learning keeps scroll and assets, shows a fixed error, and retries once** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected ... Skipped lines { activeRun: null, attemptSequence: 0, books: [ 'sj_line' ... sj_arc: 2, + sj_line: 2, - sj_line: 1, sj_wanji…

- [B4] **nine-stage UI evo_wanjian first-rank condition matches its stage without changing higher-rank gates** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B4] **nine-stage UI evo_tiandi first-rank condition matches its stage without changing higher-rank gates** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B4] **nine-stage UI evo_wuwo first-rank condition matches its stage without changing higher-rank gates** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B4] **nine-stage UI evo_sixiang first-rank condition matches its stage without changing higher-rank gates** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B2] **paused tower skills show only plus, keep its hit area, and commit a legal upgrade (844x390)** — `AssertionError`；expected one button: /^技能 · 可用\d+点$/; found 0 !== 1

- [B2] **paused tower skills show only plus, keep its hit area, and commit a legal upgrade (1024x600)** — `AssertionError`；expected one button: /^技能 · 可用\d+点$/; found 0 !== 1

- [B2] **host decreaseSkill is rejected outside the camp library (hall)** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B2] **host decreaseSkill is rejected outside the camp library (tower)** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B2] **host decreaseSkill is rejected outside the camp library (battle)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '{"format":"xianxia-sect-tower-campaign","schema":68,"data":"{\\"xp\\":10920,\\"hp\\":100,\\"mana\\":100,\\"spiritStones\\":500,\\…

- [B2] **host decreaseSkill is rejected outside the camp library (skills)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '{"format":"xianxia-sect-tower-campaign","schema":68,"data":"{\\"xp\\":10920,\\"hp\\":100,\\"mana\\":100,\\"spiritStones\\":500,\\…

- [B2] **host decreaseSkill remains allowed in the camp library and preserves books** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected ... Skipped lines { activeRun: null, attemptSequence: 0, + books: [], - books: [ - 'sj_line' - ], breakthroughRng: 2255169977, …

- [B2] **host respecSkills is rejected outside the camp library (hall)** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B2] **host respecSkills is rejected outside the camp library (tower)** — `AssertionError`；Expected values to be strictly equal: 1 !== 0

- [B2] **host respecSkills is rejected outside the camp library (battle)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '{"format":"xianxia-sect-tower-campaign","schema":68,"data":"{\\"xp\\":10920,\\"hp\\":100,\\"mana\\":100,\\"spiritStones\\":500,\\…

- [B2] **host respecSkills is rejected outside the camp library (skills)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '{"format":"xianxia-sect-tower-campaign","schema":68,"data":"{\\"xp\\":10920,\\"hp\\":100,\\"mana\\":100,\\"spiritStones\\":500,\\…

- [B2] **host respecSkills remains allowed in the camp library and preserves books** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected ... Skipped lines { activeRun: null, attemptSequence: 0, + books: [], - books: [ - 'sj_line' - ], breakthroughRng: 2255169977, …

- [B1] **landscape 1280×720 pause and tool targets fit in two columns and keep real tool actions** — `AssertionError`；Expected values to be strictly equal: 4 !== 5

- [B1] **landscape 844×390 pause and tool targets fit in two columns and keep real tool actions** — `AssertionError`；Expected values to be strictly equal: 4 !== 5

- [B1] **extreme 1920×280 letterboxes combat and tools, then restores fixed-width without losing state** — `AssertionError`；Expected values to be strictly equal: 8 !== 6

- [B1] **extreme 3840×1080 letterboxes combat and tools, then restores fixed-width without losing state** — `AssertionError`；Expected values to be strictly equal: 8 !== 6

- [B4] **real host up sector arc matches the locked 140-degree Run warning and actual hit direction** — `AssertionError`；floor seven actually spawns a normal tiger

- [B4] **real host down sector arc matches the locked 140-degree Run warning and actual hit direction** — `AssertionError`；floor seven actually spawns a normal tiger

- [B4] **real host left sector arc matches the locked 140-degree Run warning and actual hit direction** — `AssertionError`；floor seven actually spawns a normal tiger

- [B4] **real host right sector arc matches the locked 140-degree Run warning and actual hit direction** — `AssertionError`；floor seven actually spawns a normal tiger

- [B4] **lightweight HUD stays fixed and keeps safe targets at 1280×720** — `AssertionError`；HUD.FloorWave: usable touch target

- [B4] **lightweight HUD stays fixed and keeps safe targets at 1024×600** — `AssertionError`；HUD.FloorWave: usable touch target

- [B4] **lightweight HUD stays fixed and keeps safe targets at 844×390** — `AssertionError`；HUD.FloorWave: usable touch target

- [B4] **lightweight HUD stays fixed and keeps safe targets at 1920×280** — `AssertionError`；HUD.FloorWave: usable touch target

- [B2] **paper battle HUD HP ratio stays readable and skill points remain actionable** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '金丹十层·大圆满' - '金丹 · 大圆满' ^

- [B2] **passive skills do not imply damaging aura rings and rendering remains read-only** — `RangeError`；Unknown growth skills magnet

- [B1] **playtest point grant is real, repeatable to 999, and reset requires confirmation** — `AssertionError`；expected one button: 成长与存档; found 0 !== 1

- [B1] **failed playtest reset retains paused run and earned skills** — `AssertionError`；expected one button: 成长与存档; found 0 !== 1

- [B1] **one-click top-grade grants are repeatable and preserve ordinary saves** — `AssertionError`；expected one button: +999 极品灵石; found 0 !== 1

- [B1] **camp level button reaches 27 with natural SP and no extra healing** — `AssertionError`；expected one button: 成长与存档; found 0 !== 1

- [B4] **in-tower level button gives a short exit hint; resource grants keep the run paused and intact** — `AssertionError`；expected one button: 成长与存档; found 0 !== 1

- [B1] **resource write failures show errors without publishing grants** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(hasLabel(game.overlay, '体验操作未完成'))

- [B1] **full stone balance rejects the grant without changing the save** — `TypeError`；Cannot read properties of null (reading 'data')

- [B1] **tools checkpoint a locally paused restored run before enabling resource actions** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '{"format":"xianxia-sect-tower-campaign","schema":68,"data":"{\\"xp\\":0,\\"hp\\":100,\\"mana\\":100,\\"spiritStones\\":999000500,…

- [B1] **normal mode cannot invoke resource or level actions through tool methods** — `TypeError`；game.showPlaytestResources is not a function

- [B1] **grouped tool menus fit 1280x720 without overlapping labels or buttons** — `AssertionError`；Expected values to be strictly equal: 8 !== 6

- [B1] **grouped tool menus fit 844x390 without overlapping labels or buttons** — `AssertionError`；Expected values to be strictly equal: 8 !== 6

- [B1] **grouped tool menus fit 1920x280 without overlapping labels or buttons** — `AssertionError`；Expected values to be strictly equal: 8 !== 6

- [B2] **actual kill starts a minor level animation only once** — `AssertionError`；Expected values to be strictly equal: 1.2 !== 1

- [B2] **actual kill starts a major level animation only once** — `AssertionError`；Expected values to be strictly equal: false !== true

- [B4] **avatar opens a bounded character overlay with actual attributes and read-only dismissal** — `AssertionError`；Expected values to be strictly equal: true !== false

- [B3] **character overlay follows camp healing and closes when leaving the hall** — `Error`；partial healing keeps the overlay stable + actual - expected ... Skipped lines + <ref *2> Node { - <ref *1> Node { active: true, + children: [ + <ref *1> Node { + active: true, + children: […

- [B4] **paper HUD resource failure preserves readable stats in hall and combat** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '炼气一层·初期' - '炼气 · 初期' ^

- [B4] **paper battle HP and realm label stay outside the avatar and realm text updates live** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '炼气一层·初期' - '炼气 · 初期' ^

- [B4] **character atlas preserves feet, independent sword, movement modes and paused redraws** — `AssertionError`；starter sword remains separately rendered + actual - expected + '#dce4e6' - '#E4E6E3'

- [B4] **character slash follows a real short windup across a 3x frame and cannot cause damage** — `AssertionError`；Expected values to be strictly equal: + actual - expected + 2.4 - 2.216666666666667

- [B4] **one level 1 sword-line volley completes one character action without rewinding on its 1 hits** — `AssertionError`；Expected values to be strictly equal: 2 !== 1

- [B4] **one level 6 sword-line volley completes one character action without rewinding on its 2 hits** — `AssertionError`；Expected values to be strictly equal: 3 !== 2

- [B4] **one level 10 sword-line volley completes one character action without rewinding on its 3 hits** — `AssertionError`；Expected values to be strictly equal: 4 !== 3

- [B2] **character flight keeps its flying sword through idle and real skill attacks** — `AssertionError`；Expected values to be strictly equal: 256 !== 0

- [B4] **real character PNG, manifest and import metadata satisfy the running atlas contract** — `AssertionError`；Expected values to be strictly equal: 49 !== 35

- [B4] **tower entry artwork reuses requests and late loads cannot revive abandoned page** — `AssertionError`；Expected values to be strictly equal: 9 !== 10

- [B4] **falcon and ape floor cards request matching artwork without obsolete boss portraits** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(labelText(row).includes(name))

- [B3] **stone battle art maps converted denominations rather than monster ranks and leaves rewards untouched** — `RangeError`；Invalid spirit stone amount

- [B3] **wallet grade icons pair with quantities and release bindings on redraw** — `AssertionError`；Expected values to be strictly equal: '' !== '×1\n×300'

- [B3] **approved resource icons render beside existing counters and XP feedback without altering values** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(icons.requests.some(r=>r.path==='tower-stones/resource_contribution'))

- [B3] **each pill shares its own art across apothecary, inventory cell and details without consuming pills** — `AssertionError`；Expected values to be strictly equal: true !== false

- [B4] **backpack art preserves menu and battle hit targets, fallback and inventory navigation** — `AssertionError`；Expected values to be strictly equal: 104 !== 80

- [B2] **skill button art preserves menu and battle hit targets, fallback and skill navigation** — `AssertionError`；Expected values to be strictly equal: 104 !== 80

- [B4] **settings art preserves menu settings and map-card pause actions** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected { + height: 104, - height: 80, width: 80 }

- [B4] **map card owns floor title and device status while battle center only shows waves** — `AssertionError`；HUD.Pause

- [B1] **single-save tools expose only direct actions and cycle speed without a submenu** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected [ '返回设置', '关闭开发者工具', '游戏速度 ×1', '无敌：关闭', + '+999灵石、点眷', - '+999灵石、贡献', '+999功法点', '提升一小境界', '重置游戏进度' ]

- [B1] **single-save tool writes are atomic and close returns to paused battle** — `AssertionError`；expected one button: +999灵石、贡献; found 0 !== 1

- [B4] **paper experience ring resets on level-up and hides at cap in hall and combat** — `AssertionError`；expected one scene node: HUD.XPRing 0 !== 1

- [B4] **target health stays transparent and immediately below top resources 720** — `AssertionError`；wave is beside the target, not above it

- [B4] **target health stays transparent and immediately below top resources 600** — `AssertionError`；wave is beside the target, not above it

- [B4] **battle experience surrounds the portrait without a bottom bar** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '锁妖塔战场' - 'HUD.Portrait'

- [B2] **ten-layer character panel shows full XP and pending breakthrough (1280)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '剑修 · 筑基十层·大圆满' - '筑基 · 大圆满'

- [B2] **ten-layer character panel shows full XP and pending breakthrough (844)** — `AssertionError`；Expected values to be strictly equal: + actual - expected + '剑修 · 筑基十层·大圆满' - '筑基 · 大圆满'

- [B2] **ten-layer golden core distinguishes tenth layer from full consummation** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(hasLabel(game.menu.root,'金丹 十层'))

### xianxia-tower-inventory.test.mjs

- [B3] **mixed draw 1280x720: reveal, skip, inspect and dismiss never award twice** — `AssertionError`；领取10张试玩券 0 !== 1

- [B3] **mixed draw 844x390: reveal, skip, inspect and dismiss never award twice** — `AssertionError`；领取10张试玩券 0 !== 1

- [B3] **mixed draw: failed save has no success overlay; single draw can be confirmed** — `AssertionError`；领取10张试玩券 0 !== 1

- [B3] **mixed draw cells match backpack rendering 1280x720** — `AssertionError`；领取10张试玩券 0 !== 1

- [B3] **mixed draw cells match backpack rendering 844x390** — `AssertionError`；领取10张试玩券 0 !== 1

- [B3] **viewing, equipping and dismantling never alter forge RNG, prices or pity counters** — `AssertionError`；Expected values to be strictly deep-equal: + actual - expected ... Skipped lines { equipmentDraws: { armor: 0, ring: 0 }, ... rng: 1970743797, + spiritStones: 4985, - spiritStones: 4976, wea…

- [B3] **pill shop 844x390: buy without healing, then consume from inventory** — `AssertionError`；Expected values to be strictly equal: 300 !== 295

- [B3] **pill shop 1280x720: buy without healing, then consume from inventory** — `AssertionError`；Expected values to be strictly equal: 300 !== 295

- [B4] **equipment detail hierarchy and lore 1280x720** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(labels.some(l=>l.string==='装备属性'))

- [B4] **equipment detail hierarchy and lore 844x390** — `AssertionError`；The expression evaluated to a falsy value: assert.ok(labels.some(l=>l.string==='装备属性'))

- [B4] **detail data unifies attributes, preserves actual realm gates and covers every equipment lore** — `AssertionError`；Expected values to be strictly equal: 88 !== 87

- [B4] **compact comparison cards and external actions 1280x720** — `AssertionError`；Expected values to be strictly equal: false !== true

- [B4] **compact comparison cards and external actions 844x390** — `AssertionError`；Expected values to be strictly equal: false !== true

- [B3] **cultivation pill shop 844x390 shares realm allowance and confirms excess inventory** — `AssertionError`；Expected values to be strictly equal: 1000 !== 300

- [B3] **cultivation pill shop 1280x720 shares realm allowance and confirms excess inventory** — `AssertionError`；Expected values to be strictly equal: 1000 !== 300

- [B3] **alchemy 844x390 consumes exact recipe and ignores rapid second submission** — `AssertionError`；Expected values to be strictly equal: 1000 !== 298

- [B3] **alchemy 1280x720 consumes exact recipe and ignores rapid second submission** — `AssertionError`；Expected values to be strictly equal: 1000 !== 298

- [B4] **HD jade loads atomically, shows latest progress and releases all texture resources** — `AssertionError`；all three HD layers are requested

- [B4] **HD jade failed layer keeps fallback and releases partially loaded assets** — `AssertionError`；HUD.XPRing 0 !== 1

- [B3] **alchemy save failure preserves ingredients and retries with the same receipt** — `AssertionError`；Expected values to be strictly equal: 1000 !== 298

- [B3] **purchase hall remains available when furnace craftable-only filter has no materials** — `AssertionError`；Expected values to be strictly equal: 1000 !== 295

- [B3] **reference commerce 844: purchase is a card then a modal** — `AssertionError`；Expected values to be strictly equal: 1000 !== 295

- [B3] **reference commerce 1280: purchase is a card then a modal** — `AssertionError`；Expected values to be strictly equal: 1000 !== 295

- [B3] **reference commerce crafting confirms before spending and shows actual reward** — `AssertionError`；Expected values to be strictly equal: 1000 !== 298

- [B3] **reference commerce gear shop separates browsing, purchase and actual equipment results** — `AssertionError`；Expected values to be strictly equal: 52 !== 70

- [B3] **reference commerce save failure keeps confirmation and retries the same receipt** — `AssertionError`；Expected values to be strictly equal: 1000 !== 298

- [B3] **settlement currencies join the grid, cultivation is hidden and notes remain accessible** — `AssertionError`；The input did not match the regular expression /贡献 · 本次获得 100/.

- [B4] **craft preview uses inventory card and exact information: weapon** — `TypeError`；Cannot read properties of undefined (reading 'quality')

- [B4] **craft preview uses inventory card and exact information: armor** — `TypeError`；Cannot read properties of undefined (reading 'quality')

- [B4] **craft preview uses inventory card and exact information: ring** — `TypeError`；Cannot read properties of undefined (reading 'quality')

## 独立审查

规格符合；质量 Approved。审查核验12个证据文件摘要；未发现新增问题。批准范围仅为六文件 fixture 修复，T02 整体仍在进行。
