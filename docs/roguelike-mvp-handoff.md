# Roguelike MVP · Cocos Editor 装配交付清单

> Plan 1 (MVP) 代码全部完成于分支 `roguelike-mvp` (HEAD `a13b29e`)。所有状态层 297 tests 全绿。
> 剩余工作全部在 Cocos Creator 3.8.8 Editor 里手动装配 Scene 和 Prefab（subagent 无法操作 GUI）。
> 交付后走 5 位真实玩家 × 3 局的 MVP 验证。

## 一、总览

新玩法入口按钮已加在 `cocos-pilot/assets/scripts/GameScreens.ts` 的 home 屏，label "🍄 Roguelike 试玩（新玩法预览）"，点击后 `director.loadScene('roguelike-mvp')`。

**需要你创建的 Scene（一个）**：`roguelike-mvp.scene`
**需要挂到 Scene 里的组件（三个）**：`RouteMapView`, `EncounterView`, `SettlementView`（都在 `cocos-pilot/assets/scripts/roguelike/`）
**顶层协调组件**：`RoguelikeScene`（同目录）

---

## 二、Step-by-step Editor 装配

### Step 1 · 创建 Scene

1. Cocos Creator 打开 `/Users/zhangnu/WeChatProjects/rainy-mushroom/cocos-pilot`
2. Assets > `assets/scenes/` 右键 Create > Scene > `roguelike-mvp`
3. 双击打开新 scene

### Step 2 · 根节点：Canvas + RoguelikeScene 组件

1. Canvas 已默认存在
2. Canvas 上 Add Component > Custom Script > `RoguelikeScene`
3. 该组件有 3 个 @property 待挂：`routeMap` / `encounter` / `settlement`（下面步骤会创建）

### Step 3 · 创建 RouteMap 节点（挂 RouteMapView）

- 结构：
  ```
  Canvas
  └─ RouteMap  (Empty Node, 挂 RouteMapView.ts)
     ├─ LineLayer   (Empty Node + Graphics component)
     ├─ NodeLayer   (Empty Node, 空容器)
     └─ StatsHeader (Y ≈ 600, 顶部)
        ├─ HPLabel  (Label, system font, size 36)
        └─ BagLabel (Label, system font, size 36)
  ```
- `RouteMapView` 组件的 4 个 @property 挂载：
  - `lineLayer` ← LineLayer 上的 Graphics
  - `nodeLayer` ← NodeLayer 节点
  - `hpLabel`   ← HPLabel 上的 Label
  - `bagLabel`  ← BagLabel 上的 Label
- 完成后回到 Canvas，把 RouteMap 节点拖到 `RoguelikeScene.routeMap` 槽位

### Step 4 · 创建 Encounter 节点（挂 EncounterView）— 21 个 @property，最麻烦

- 结构（面板初始 active=false，脚本会按需激活）：
  ```
  Canvas
  └─ Encounter  (Empty Node, 挂 EncounterView.ts, 全屏遮罩层)
     ├─ MushroomPanel (Empty Node)
     │  ├─ CluesLabel      (Label, 3 行，fontSize 32)
     │  ├─ OptionA         (Button, Label 子节点 "A")
     │  ├─ OptionB         (Button, Label 子节点 "B")
     │  ├─ OptionC         (Button, Label 子节点 "C")
     │  ├─ TimerRing       (Empty Node + Graphics)
     │  ├─ MushroomArt     (Empty Node, 初始 active=false)
     │  │  └─ ArtGraphics  (Graphics 组件用于画菌盖/菌柄)
     │  ├─ HarvestRing     (Empty Node + Graphics, 与 MushroomArt 同层)
     │  └─ ResultLabel     (Label, 初始 active=false, "认错了"/"超时了" 用)
     ├─ ChoicePanel (Empty Node)
     │  ├─ TitleLabel      (Label, fontSize 40)
     │  ├─ ChoiceA         (Button + ChoiceALabel 子节点)
     │  └─ ChoiceB         (Button + ChoiceBLabel 子节点)
     └─ DangerPanel (Empty Node)
        ├─ DangerLabel     (Label, fontSize 40)
        └─ DangerButton    (Button + Label "继续")
  ```
- `EncounterView` 组件 @property（21 个）——按 Inspector 顺序全部拖入：
  - Panels: `mushroomPanel`, `choicePanel`, `dangerPanel`
  - Mushroom: `cluesLabel`, `optionAButton`, `optionBButton`, `optionCButton`, `timerRing` (Graphics), `mushroomArt` (Node), `mushroomArtGraphics` (Graphics), `harvestRing` (Graphics), `mushroomResultLabel` (Label)
  - Choice: `choiceTitleLabel`, `choiceALabel`, `choiceBLabel`, `choiceAButton`, `choiceBButton`
  - Danger: `dangerLabel`, `dangerButton`
- ⚠️ **不要** 把同一个 Button 节点同时拖到 `optionAButton` 和 `choiceAButton` —— 每个都是独立节点。否则触摸事件会跨面板串泄。
- 挂完后把 Encounter 节点拖到 `RoguelikeScene.encounter` 槽

### Step 5 · 创建 Settlement 节点（挂 SettlementView）

- 结构：
  ```
  Canvas
  └─ Settlement  (Empty Node, 挂 SettlementView.ts, 初始 active=false 关键)
     ├─ SummaryLabel   (Label, fontSize 44)
     ├─ MushroomList   (Empty Node，横向布局容器，用来放采集缩略)
     ├─ PlayAgainBtn   (Button + Label "再玩一局")
     └─ ExitBtn        (Button + Label "返回主菜单")
  ```
- `SettlementView` 组件 @property：
  - `summaryLabel` ← SummaryLabel
  - `mushroomList` ← MushroomList
  - `playAgainBtn` ← PlayAgainBtn
  - `exitBtn`      ← ExitBtn
- **Settlement 节点必须 active=false 默认**（脚本在 gameEnded 时会 setActive(true)）
- 挂完后拖到 `RoguelikeScene.settlement` 槽

### Step 6 · 验证 pilot-menu scene 名称

- `RoguelikeScene.ts` 里退出按钮走的是 `director.loadScene('pilot-menu')`
- 请确认你的主菜单 scene 文件名就叫 `pilot-menu.scene`（不是 `main-menu` 或其他）
- 如果不是，改 `RoguelikeScene.ts` 里那行 scene 名，或者把主菜单 scene 重命名

### Step 7 · 冒烟测试

1. Preview pilot-menu scene
2. 点击底部按钮 "🍄 Roguelike 试玩（新玩法预览）"
3. 应切到 roguelike-mvp scene，看到 4 层节点地图
4. 从起点开始逐节点走完一局：
   - 采菌节点 → 应弹出 3 线索 + 3 选项 + 倒计时环 → 答对 → 显示菌图 + 长按 1.5s 采集环 → 结算
   - 动物节点 → "绕行/抢先" 两选一
   - 篝火节点 → "休息/望气" 两选一
   - 危险节点 → 单键继续，扣 1 心
5. 走完 4 层（或体力扣到 0）→ 看到结算页 → "再玩一局" 应用新 seed 重新开始 → "返回主菜单" 应回到 pilot-menu

### Step 8 · 微信开发者工具冒烟

1. `npm run cocos:build:wechat`
2. 打开微信开发者工具，导入 `/Users/zhangnu/WeChatProjects/rainy-mushroom/`
3. 编译预览，重复 Step 7 流程
4. 关注：真机安卓/iOS 上的触摸响应、字体渲染（emoji）、performance

---

## 三、已修复的 5 个 Critical/Important（提醒你别再犯）

在 SDD 流程末尾，Opus 抓到了下面 5 个会 break 首次 playtest 的 bug。都已在 commit `a13b29e` 修好。如果你日后再改这些文件，注意保留这些修复：

1. **时间基一致性**：`Date.now()` 用一套（不要混 `performance.now()`），`makeChallenge` 和 `judge` 才能对得上
2. **EventTarget API**：Cocos 的 `EventTarget` 只有 `on/emit/off/once`，**没有** DOM 的 `dispatchEvent`/`new Event()` —— 别再引入 DOM API
3. **scheduleOnce 生命周期**：任何 `scheduleOnce` 都要在选项被点击时通过 flag 或 unschedule 提前取消，否则可能覆盖已成功的结果
4. **`node.once()` 不清对家**：`.once()` 只在触发时清自己，**不会清同组另一个按钮**。多按钮互斥场景必须显式 `.off()` 全部
5. **模态与结算分离**：进 gameEnded 前显式 `encounter.node.active = false`

---

## 四、可选后续改进（都是已识别的 Minor，不阻塞 playtest）

- `speciesAdapter.mjs:67` 加 `s.style?.cap` 防御性写法
- `EncounterView.ts:263` 类型窄化替换 `as any`
- `EncounterView` 上加 hex color 校验（当前颜色全是硬编码常量，无风险）
- `RouteMapView.ts:17` 删掉未使用的 `Sprite, SpriteFrame` import
- `RoguelikeScene.newRun()` 用 monotonic counter 代替 `Date.now()` 做 seed，避免同毫秒内重开时路线重复

---

## 五、SDD 过程中我做的关键 Ruling（供你回顾）

1. **Preflight**：项目非 git 仓库 → 建议 `git init`（已执行，`ef09ad9` 首次提交）
2. **Task 1 数据 schema**：plan 里写的 `SPECIES_EXPANSION` 实际不存在，真名是 `EXPANDED_SPECIES`；两个数据源 schema 不同（EXPANDED 没有 `clues[3]`），adapter 用 `[ecology, description, keyClue]` 合成 clues + 把 rarity 钳制到 1-3。**代价若错**：图鉴文案略生硬（长句代替短线索），playtest 时留意
3. **Task 2 测试语义**：plan 里的测试忽略了 layer-0 起点节点，会让 `byLayer.size` 等于 5 而非 4；改用 `n.layer > 0` 过滤，符合"4 game layers"原意。**代价若错**：无——测试仍在验真行为
4. **Task 10 入口菜单文件**：plan 说改 `PilotUI.ts`，实际主菜单在 `GameScreens.ts`；照实际来。**代价若错**：如果按钮出现在错误位置，用户可以自己拖到正确 scene
5. **Task 9 fix (round 1)**：mushroom 选项按钮 listener 不清 → 加 `optionHandlers[]` + `removeOptionHandlers()`
6. **Final fix wave**：3 Critical + 2 Important 一次修完，reviewer 复核全部 ADDRESSED
