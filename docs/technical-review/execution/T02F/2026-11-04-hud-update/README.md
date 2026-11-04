# T02F：按用户决定保留横向经验条

2026-11-04，用户确认“保留当前横向经验条，更新对应验收要求”。本次据此替换四项旧 HUD 产品验收，保留玉龙绘制器的独立组件覆盖。两份完整定向测试由 **297 项、292 通过、5 失败** 变为 **300 项、299 通过、1 失败**；两轮均 **0 跳过、0 todo、0 cancelled**。

唯一剩余失败仍是 `one level 1 sword-line volley completes one character action without rewinding on its 1 hits`：60 Hz 采样末帧为 12，原断言要求 13。该测试及另外两个剑线等级测试逐字未改，没有延长动作、放宽采样要求或修改生产代码。

## 范围与依据

基线提交：`ed97a572276ecab2d997b598d5e6b76d5bc79ce5`。工作树：`/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom`。

本子任务只编辑：

- `tests/xianxia-tower-host-tools.test.mjs`
- `tests/xianxia-tower-inventory.test.mjs`
- 本证据目录 `docs/technical-review/execution/T02F/2026-11-04-hud-update/`

没有编辑生产源码、玩法或数值、构建文件、TASK_BOARD、根决策记录、装备测试或旧报告；没有 commit/push、调用 Scenario 或制作/删除素材。共享工作树中其他任务的改动不属于本报告。

现行授权是 [2026-11-04 HUD 与装备决策](../../../decisions/2026-11-04-hud-and-equipment.md) 的 HUD 部分。核对了 `TowerPlayerHud.ts`、`TowerView.ts`、`TowerMenu.ts` 的创建、绘制、刷新和释放路径，以及 [前轮 T02F 报告](../README.md)。以下历史资料为保留当前布局提供具体基线：

- `design/player-hud-2026-10-29/README.md`：宗门省去次要经验条，保留原生加载回退和资源释放。
- `design/player-hud-refinement-2026-10-31/README.md`：战斗底部经验条位置保持；用户后续要求移除“修为”标签。
- [hud-bottom-xp-observation.json.gz](../hud-bottom-xp-observation.json.gz)：844×390、1280×720、960×360 的横条观测；逻辑宽 1248、高 4，水平居中，1280×720 时中心 y=-336，即左右各 16、距底中心 24 单位。
- [menu-hud-observation.json.gz](../menu-hud-observation.json.gz)：宗门 HUD 的经验条隐藏。
- `docs/xianxia/sect-tower-v1/11-economy-v2.md` 第 7 节的既有累计门槛 `30n+15n²` 支持初始 45、120 两个门槛；后来的 `71-ten-layer-realms.md`、`72-breakthrough-items.md` 覆盖旧等级上限，给出 1485/1800、1801、6600/6601、14400 等现行边界。

旧 JSON 仅提供布局观测，不独立构成取消经验环的授权；采用横条的依据是本次用户决定。前轮保留冲突的报告未改写。

## 独立验收约定

| 项目 | 当前验收要求 | 实际覆盖 |
|---|---|---|
| 宗门 | 顶部保留气血与灵力，经验条不显示，刷新不意外露出 | XP 0、20、45、60、1800、6600、14400 的 render 与 refreshVitals；显示测试不改主档 |
| 战斗零经验 | 稳定空轨道，节点保持可见 | XP 0；升级到 45、120、1485、1801、6601 后填充为零 |
| 战斗已获经验 | 从左向右填充本层已获比例 | 20/45、44/45；XP 60 为 15/75，119 为 74/75 |
| 瓶颈与封顶 | 1800、6600 的本境满修为及 14400 总上限均为满条 | 满宽 1248，封顶后节点仍可见；组件还验证 capped=true 优先于零/非有限输入 |
| 几何 | 宽 1248、高 4；左右各 16；中心距逻辑屏底 24，绘制下缘/上缘分别距底 22/26 | 1280×720、844×390、960×360；与头像/气血/灵力分离；不增加按钮或输入屏障；无旧环、旧贴图节点或“修为”标签 |
| 稳定性 | 移动/相机与暂停重绘不移动固定经验条，不重复请求资源 | 真实 host 更新和 draw 路径；验证移动确实发生；暂停前后 run/存档不变 |
| 异常输入 | 负数、NaN、±Infinity 归零；超过 1 截到满宽；极小正值不越界 | 15 组组件输入；有限几何、清除上一次填充、零态仅有轨道、微小填充圆角在自身宽内 |
| 当前资源 | 只使用纸底头像及职业图；无玉龙三层加载依赖 | 成功/失败分别结算，每张图独立控制自己的回退；异步完成不能重置最新境界/HP或显示宗门经验条 |
| 释放 | 重绘、离开页面、销毁释放 ImageAsset 引用、Texture2D 和 SpriteFrame；拒绝过期回调；重复销毁不双减引用 | 两种单图失败组合；部分成功后重绘；待加载时导航/销毁；0 引用、空 spriteFrame、资源失效；刷新无失败重试风暴 |

新横条几何与进度断言均为精确比较，没有从运行结果生成 expected，没有新增浮点容差或扩大既有容差。旧玉龙组件中的 `1e-8` 几何误差界逐字保留。`UITransform` 测试边界补齐标准 `width`/`height` getter，让生产绘制函数读取实际 contentSize；不替换经验比例或业务函数。

这些 XP 赋值是展示夹具，不表示真实击杀可越过瓶颈。测试只检查 draw 不改 run/主档；真实成长、突破、保存原子性仍由原测试覆盖。角色详情修为检查保留原用例，本轮没有改面板。

## 每项替换与保留

| 原测试完整名称 | 新测试完整名称 | 原因与保留意图 |
|---|---|---|
| `paper experience ring resets on level-up and hides at cap in hall and combat` | `horizontal battle experience resets at level-up and fills at cap while hall experience stays hidden` | 旧产品环已退役；保留精确进度、升级归零和上限边界，按决定将上限行为改为满条，并明确宗门隐藏 |
| `battle experience surrounds the portrait without a bottom bar` | `horizontal battle experience stays inside the bottom edge without covering the portrait (1280x720)`；同名 `(844x390)`、`(960x360)` | 用三个已记录横屏尺寸验收固定底条、完整包含、头像分离、移动/暂停稳定性；不再要求围绕头像 |
| `HD jade loads atomically, shows latest progress and releases all texture resources` | `horizontal HUD loads current images independently and releases them on redraw and navigation` | 当前 HUD 不加载玉龙三层，旧三层原子切换不适用；改验头像/职业图独立加载、最新数据不倒退、重绘释放和导航后的迟到请求 |
| `HD jade failed layer keeps fallback and releases partially loaded assets` | `horizontal HUD image failure preserves its fallback and destroys partial loads without reviving stale nodes` | 对两个当前图片来源逐一失败，保持各自原生回退，释放已加载图，销毁后迟到回调不可复活节点 |
| `paper experience ring draws only earned progress clockwise and hides zero or capped progress` | `retained jade renderer component draws earned progress clockwise and hides zero or capped progress` | 仅重命名并注明“保留组件覆盖”；测试体逐字相同，继续验证起点、顺时针、雕刻范围、头尾、零/上限和重复绘制缓存；不代表产品必须启用玉龙 |

新增 `horizontal experience clamps invalid input, keeps an empty track and fills capped progress`，补横条绘制器负数、非有限值、溢出、极小进度和封顶。原一项布局验收扩为三项，加这一组件测试，净增 3 项；没有删除失败换绿或添加 skip/todo。

## 完整运行结果

命令：

```sh
node --test tests/xianxia-tower-host-tools.test.mjs tests/xianxia-tower-inventory.test.mjs
git diff --check -- tests/xianxia-tower-host-tools.test.mjs tests/xianxia-tower-inventory.test.mjs
```

| 范围 | 变更前总数/通过/失败/跳过 | 变更后总数/通过/失败/跳过 |
|---|---:|---:|
| host-tools | 186 / 183 / 3 / 0 | 188 / 187 / 1 / 0 |
| inventory | 111 / 109 / 2 / 0 | 112 / 112 / 0 / 0 |
| 合计 | 297 / 292 / 5 / 0 | 300 / 299 / 1 / 0 |

两份测试在同一完整命令中执行；分文件数字按 TAP 在首个 inventory 用例处分组，未声称另起进程单独运行每个文件。正常前/后运行退出码均为 1，原因见失败明细；`git diff --check` 退出码 0、输出为空。

`after.tap.gz` 是首轮新验收完整运行，与 `pass-1.tap.gz` 内容相同。之后的负向探针只改变子进程读到的源码字符串；未写入/还原任何生产文件，磁盘哈希始终一致。

T04 三项全部通过；deferred-cleanup 回归通过；两种可选编译包 loader 保留，但本轮未运行 Creator 编译包测试。相对基线逐字比较结果见 `evidence.json`：loader 注册及两函数、T04 三项、deferred-cleanup、三档剑线测试、保留玉龙组件体均相同。

## 负向探针

为确认新断言能拦住错误，`mutation-probes.mjs` 在独立 Node 子进程的 `readFileSync` 返回值中注入单处错误，再运行同样两份完整测试。**生产磁盘文件从未修改**。每项必须命中指定的新验收失败才算探针成功，不以任意红测代替检出。

| 进程内错误 | 总数/通过/失败/跳过 | 检出 |
|---|---:|---|
| capped=true 绘为空 | 300 / 297 / 3 / 0 | 横条进度及组件验收 |
| 去掉非有限值与范围截断 | 300 / 298 / 2 / 0 | 横条异常输入组件验收 |
| 纸底 dispose 不销毁/减引用 | 300 / 296 / 4 / 0 | 当前图片生命周期验收 |
| 去掉纸底 disposed/节点有效性回调保护 | 300 / 295 / 5 / 0 | 导航和销毁后迟到回调验收 |
| 经验条中心移到距底 4 单位 | 300 / 296 / 4 / 0 | 三种横屏底部几何验收 |

表中每轮失败数都包含原有剑线末帧失败；完整额外失败名称、原/替换字符串、文件哈希见 `mutation-results.json` 和各 `mutation-*.tap.gz`。这些故意变异结果不属于正常回归缺陷数。

## 证据清单与哈希

- `before.tap.gz` / `before-exit.txt`：未改测试前完整 TAP 与退出码。
- `after.tap.gz` / `after-exit.txt`：最终正常定向回归；`pass-1.*` 为同一结果的首轮记录。
- `before-snapshot.json`：基线 commit、两份测试与三份生产文件初始 SHA-256。
- `evidence.json`：前/后计数、完整失败名、测试/生产文件 SHA-256、保护块字节数和 SHA-256、精确补丁原文 SHA-256。
- `tests.patch.gz`：两份测试相对基线提交的完整 diff，含所有替换，无截断。
- `diff-check.txt`：空文件，配合 `evidence.json` 中退出码 0。
- `mutation-probes.mjs`、`mutation-results.json`、`mutation-*.tap.gz`：可重复负向验证和完整日志。
- `sha256-manifest.json`：本目录其他证据文件的大小与 SHA-256；清单不包含自身。

最终测试文件 SHA-256：

- host-tools：`3bdb94aeef32bbd8f4ab739280d7d970cf00afbfbc4f6906688ab20862e448ff`
- inventory：`871293f0f57194542fe0a5159970653b7365191e1d9aa4c4d356da99f4846133`

这是 Node 模拟 Cocos 边界下的宿主/组件验证，不是新一轮 GPU 画面、浏览器、TapTap、微信或设备验证。仍须由主任务合并审查和执行全套测试；已知剑线采样失败不在本次 HUD 授权范围内。
