# 新成长浏览器验证脚本准备记录

2026-10-28。此文保留构建前准备历史。**最终 build 已验证22个功能场景通过，机器报告为 `ui-browser-final.json`；最新结论见 `ui-report.md` 与 `ui-summary.json`，光环视觉仍有保留项。** 原自然组三尺寸历史证据保留。下文“待 build”等为当时状态，不是当前阻塞。

修改范围仅 `scripts/verify-tower-growth-ui.cjs` 与本目录 `ui-*` 产物。未修改 UI/runtime，未启动或终止用户 Chrome，未创建聊天，未运行同步或构建。

## 已检查

- 读取 `docs/xianxia/sect-tower-v1/24-growth-runtime-contract.md` 与 `scripts/verify-tower-functional.cjs`，核对当前 TowerMenu 节点名称及 TowerView 暂停、技能页、restore、死亡结算行为。
- `node --check scripts/verify-tower-growth-ui.cjs`：语法通过。
- `node scripts/verify-tower-growth-ui.cjs --check`：9组高进度场外 fixture 经 Campaign 校验及存档往返通过，包括进化、1/6心法与研习条件。记录见 `ui-script-check.json`。
- `--check` 不访问浏览器，不代表已验证 UI。

## 新 build 后执行

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node scripts/verify-tower-growth-ui.cjs --build-ready
```

沿用环境中的实际 Playwright 模块路径；上述路径只是命令占位。`PREVIEW_URL` 可指定本轮实际构建地址。默认使用 Playwright 自带的独立无头 Chromium，不连接 CDP、不使用用户 Chrome 配置或持久上下文；若依赖/浏览器不可用则明确失败，不回退启动用户 Chrome。

无 `--build-ready` 或 `--check` 时脚本拒绝执行。输出目录固定为本目录，文件统一 `ui-*`；不覆盖旧验证报告。

## 计划覆盖与证据边界

三个尺寸分别执行 390×844、360×640、1280×800：

- 新隔离存储起步，确认初始零点；真实购买/服用培元丹，保留扣费与修为证据。
- 16节点归属同一个连接技能树页面，逐节点名单核对；允许纵向滚动，不声称小屏能同时完整显示全部节点。锁定详情可打开、购买按钮禁用。
- 通过真实 `Run.advance` 与走位输入模拟第1/3波，教学技能及奖励只读记录，不直接写清波、击杀、经验或掉落。
- 暂停四按钮纵排：继续挑战、技能树、体验工具、返回宗门；低阶加点走真实指针 → Store → Run.restore；比较生命、位置、时间、冷却、敌人、在途技能、清波及奖励。刷新比较保存快照。
- 隔离场外 fixture 验证秘传经卷扣费、进化存在后的重修退款、书籍与教学保留、刷新保留；研习另列通3/6/9前后的禁用与真实三次扣费。
- 1/6心法 battle 与暂停截图，暂停前后快照完整相等；真实不走位死亡后截图。武器配装不得出现技能出战开关及旧槽位文案。
- 各场景收集 pageerror、console error、HTTP错误，要求为零；失败留截图、场景节点与具体错误，其余隔离场景仍继续。

高进度 fixture 人工给定的是修为、已通层、资源及教学来源，不是自然养成。使用源模块校验信封，技能、经卷、进化、研习通过 Store 动作购买；浏览器只在独立 context 的 localStorage 首次安装该档。战斗快照由 Store/Run 构造，禁止手填或篡改敌人、冷却、生命伤害与收益台账。fixture 来源和事务在报告中单列。

## 需据实际 build 复核

已按 UI 作者完成后的 `TowerMenu.ts` 再次核对：节点仍为 `技能节点-${id}`；场外 footer 为“宗门 / 锁妖塔 / 技能树 / 武器”；技能详情动作使用“修习至… / 解锁并修习…”；配装页采用“1号 · 出战 / 2号配装 / 3号配装”和“使用这套配装出战”。入塔选择按真实已通层状态匹配“继续挑战第N层 / 挑战第N层 / 重访第N层”，不保留猜测的“重试”别名。

塔内两个同名“返回战斗”按屏幕纵坐标分别定位 header/footer，各自真实点击验证；另检查宗门导航、购丹、抽取、研习和重修入口完全隐藏。三套武器配装核对三个武器条目，真实切换第二套再切回第一套，并比较全部已学技能与 combatLoadout 保持一致。这些断言尚待新 build 执行。

当前 TowerView 在真实死亡后立即调用 finish 并返回结算页。脚本死亡截图因此只能验证结算页无残留光环，不能证明独立死亡战斗帧的表现；不改运行时来制造该画面。如果新 build 提供实际死亡停留帧，再据真实行为补验证。

光环数量/可读性/静止必须看实际截图，不能用 `loadout.passive` 数量替代渲染结论。自动检查全通过时报告仍标记 `AUTOMATED_CHECKS_PASSED_VISUAL_REVIEW_PENDING`，不会自动声称视觉验收通过。

真实新档清波模拟设有时间预算；如死亡或未达到教学波数，记录失败，不注入进度补过。当前源码仍可能随并行角色工作变化，收到 build 通知后核对标签与入口；本准备记录不提前承诺浏览器通过。

## 独立体验工具追加场景（尚待新 build）

后续口径更新：用户明确允许切回普通档后按真实墙钟自然恢复 hp/restAt，其他字段严格不变；体验期间及刷新时普通 raw 仍严格不变。原整轮字节相等断言已修正，单独体验场景复跑通过，生产代码未改。下列段落保留当时准备记录，现行验收以最新报告为准。

已读取 `js/xianxia/TowerPlaytest.js`、`TowerRun.setPlaytestAssist` 和当前 TowerView/TowerMenu 工具菜单。追加一个390×844隔离 context 场景，不混入普通自然养成证据：

- 新普通档通过真实购丹/服丹落盘，从宗门首页“体验工具”进入“独立体验档”；核对 URL 的 `playtest=1`、宗门与战斗体验标识。
- 实际点击 ×2、×1、×3及无敌秒杀开关，核对“· 当前”和“开启”标签。×1/×3计时窗口只观察浏览器正常帧驱动的 `run.state.time` 与 `performance.now()`，不调用模拟 advance、不改时钟；分别记录速率及倍数，卡顿超出误差范围则失败。
- 暂停后刷新当前体验 URL，核对速度、辅助偏好、保存快照与模式保留。记录 `xianxia.sect-tower.playtest.v1`、`xianxia.sect-tower.playtest-tools.v1` 与普通档的独立性。
- 随后单列逐 tick 的真实辅助战斗抽样：只给移动输入和 advance；记录危险接触、生命变化、实际满血 Boss、命中效果、真实 killLedger、奖励及完整快照；要求无生命损失、有危险暴露、Boss 单 tick 满血到击杀，且快照通过源模块验证。此抽样不是实际三倍 clock 的证据，也不是普通档平衡/自然通关证据。
- 在体验操作与刷新后核对普通档原文不变；通过实际按钮切回普通档后再次严格比较原文及哈希，失败记录具体改变字段，不把“仅时间戳不同”忽略为通过。

静态风险：当前 `TowerView.switchPlaytest(false)` 对普通 Store 调用 `sync`，Campaign 的 `rest` 会更新 `restAt`，可能使普通档 raw 改变。脚本按用户要求保留完整原文不变断言；本脚本不修 UI/runtime，也不预判新 build 已修复。此次追加只做脚本语法核对，不访问旧构建；前述9组 fixture 校验记录是此前的准备结果，不能当作体验工具浏览器验证报告。
