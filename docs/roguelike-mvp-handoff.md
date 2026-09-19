# Roguelike MVP · 上手指南

> Plan 1 (MVP) 代码完成于分支 `roguelike-mvp` (最新 `aa38f7e`)。
> 状态层 297 tests 全绿，`npm run cocos:build:wechat` 通过。
> **零 Editor 装配** —— 所有 UI 由代码在 `onLoad` 时程序化生成。

## 一、直接跑起来（一行命令）

```bash
npm run cocos:build:wechat
```

然后：
1. 打开微信开发者工具
2. 导入项目 `/Users/zhangnu/WeChatProjects/rainy-mushroom/`（项目类型选"小游戏"）
3. 点击"编译"→"预览"
4. 主菜单会看到底部一个新按钮：**🍄 Roguelike 试玩（新玩法预览）**
5. 点它，直接进 Roguelike 界面

## 二、界面预期

- **路线地图**：4 层节点竖排，起点(🏁 金色) → 层 1-4 每层 2-3 个节点
- **节点颜色**：🍄绿 / 🐗橙 / 🔥红 / ⚠️紫；可达节点亮色，不可达半透明
- **顶部**：❤️ 5 / 🎒 0
- **点击节点** → 全屏遮罩弹出对应事件面板

## 三、5 位玩家 × 3 局验证

问三个问题：
1. **每局多长时间**？（预期 2-4 分钟）
2. **想再玩一局吗**？（预期 ≥ 3/5 是）
3. **哪里卡壳**？（识别？路线选择？操作？）

汇总答案。**≥ 3/5 是** → 告诉我，进 Plan 2（元游戏：图鉴/装备/精通/4 生境）。**< 3/5 是** → 调识别难度、节点节奏，再迭代。

## 四、架构：谁做什么

### 状态层（纯 JS，`node --test` 可跑，297 tests）

| 文件 | 责任 |
|---|---|
| `js/roguelike/speciesAdapter.mjs` | 加载 10 菌物（从 SPECIES + EXPANDED_SPECIES 合并 + 钳制 rarity 到 1-3） |
| `js/roguelike/routeGenerator.mjs` | mulberry32 seed → 4 层节点图 |
| `js/roguelike/RoguelikeGame.mjs` | 局内状态机（体力、位置、事件、结算） |
| `js/roguelike/identification.mjs` | 3 选 1 挑战 + 3 秒计时判定 |
| `js/roguelike/harvest.mjs` | 长按 1500ms 进度机 |

### 视图层（Cocos 3.8.8 TS）

| 文件 | 责任 |
|---|---|
| `cocos-pilot/assets/scripts/roguelike/RouteMapView.ts` | 路线地图，节点按钮，HP/背包状态显示 |
| `cocos-pilot/assets/scripts/roguelike/EncounterView.ts` | 遮罩事件面板（4 种：识别战斗 / 动物 / 篝火 / 危险） |
| `cocos-pilot/assets/scripts/roguelike/SettlementView.ts` | 结算屏（"再玩一局" / "返回主菜单"） |
| `cocos-pilot/assets/scripts/roguelike/RoguelikeScene.ts` | 顶层协调：拿事件、driver 状态机、切面板 |
| `cocos-pilot/assets/scripts/GameScreens.ts` | +1 行入口按钮 + `launchRoguelike()` 方法 |

### 无 Editor 装配的秘诀

每个 View 组件的 `onLoad()` 检查 `@property` 引用是否为 null，如果是就**用代码程序化建**所有子节点（Node + UITransform + Graphics + Label + Button）。`GameScreens.launchRoguelike()` 在当前 Canvas 上挂一个新 overlay Node，加 `RoguelikeScene` 组件，`onExit` 回调 `overlay.destroy()`。全程不需要 `.scene` 文件、不需要 Prefab、不需要 Inspector 手工挂引用。

## 五、想改视觉？可以两种方式

### 方式 A：改代码（推荐 MVP 阶段）
所有布局/颜色/字号都在 `.ts` 里，改完 `npm run cocos:build:wechat` 就生效。搜关键字：
- 节点颜色：`#6c9560`（菌）/ `#d68a4c`（动物）/ `#c25a3c`（篝火）/ `#6a4670`（危险）在 `RouteMapView.ts`
- 面板背景 dim 度：`Color(15, 25, 20, 210)` 在 `EncounterView.ts` `buildMushroomPanel`
- 按钮尺寸：搜 `setContentSize(500, 100)` 等

### 方式 B：Cocos Editor 覆盖（后期打磨）
如果哪天想在 Editor 里用 Prefab 精细化调整某个 View，只要把对应 View 组件的 `@property` 全部拖满，`onLoad` 里的自动 build 会跳过。代码和 Editor 装配可以共存。

## 六、SDD 过程中我做的 Ruling（供你回顾）

1. **`git init`**：项目原本非 git，为 SDD 脚本能跑，从 `ef09ad9` 初始化
2. **数据 schema**：`speciesExpansion.js` 真名 `EXPANDED_SPECIES`（plan 错），schema 不同（无 clues[]，rarity 可到 4）→ adapter 合成 clues + 钳制 rarity
3. **Task 2 测试语义**：`byLayer.size === 4` 需要过滤起点 layer 0，实际有 5 层节点
4. **Task 10 入口位置**：改 `GameScreens.ts`（真实 home 屏）而非 plan 说的 `PilotUI.ts`
5. **Task 9 fix round 1**：mushroom 选项按钮 listener 泄漏 → optionHandlers[] 显式 off
6. **Final fix wave**：opus 抓到 3 Critical + 2 Important（时间基/EventTarget API/scheduleOnce/button 泄漏/模态可见性），一次修完
7. **Bootstrap refactor**：把 21 个 @property 装配改成代码自建，彻底移除 Editor 手工依赖

## 七、还没做的（Plan 2/3/4 会做）

- **图鉴系统**：目前采到的菌物只算数字，未持久化收藏
- **装备解锁**：`@property(b+c)` 决定的 —— 采齐一个生境全部菌物 → 解锁装备
- **精通条**：单菌采集 5 次 → +1% 全局采集速度
- **广告钩子**：结算双倍、复活广告等（Plan 3）
- **12 生境**：目前只有 `warmMixedForest`（暖湿针阔混交林，10 菌物）
- **分享排行**：Plan 4
- **音效/动效**：Plan 3 打磨阶段

## 八、故障排除

**编译失败**：检查 `COCOS_CREATOR_PATH` 环境变量（默认 `/Applications/CocosCreator.app/Contents/MacOS/CocosCreator`）

**按钮点不动**：程序化建的按钮走 `Node.EventType.TOUCH_END`。如果发现哪个按钮不响应，多半是子节点吃掉了触摸事件——检查 UITransform 的 contentSize 是否覆盖了整个按钮

**"pilot-menu" scene 不存在报错**：不会——`RoguelikeScene.onExit` 走 overlay.destroy() 路径，不再依赖 loadScene

**体力扣光但没结算**：state 层 `_end()` 会 emit `gameEnded` → `RoguelikeScene` 收到后 `settlement.show(payload)`。如果结算不出现，检查 `settlement.node.active` 是否被强制设为 false

**识别 3 秒就"超时了"**：Final review 已经修过时间基 bug（`Date.now()` vs `performance.now()`），如果你日后修改这块，注意保持时钟一致
