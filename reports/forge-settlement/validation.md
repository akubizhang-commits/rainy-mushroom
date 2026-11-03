# 炼器结算与免费代码效果验收

## 已完成

- 炼器峰非全屏菜单、八个抽取选项、防具法衣与戒指2:1混池。
- 保存成功后进入逐件结算，支持下一件、跳过、十连总览、点选回看、关闭及继续炼器。
- 物品缩放入场，极品金光／普通白光，短暂光点，以及总览卡片按顺序入场；均由代码完成，无付费生成调用。
- 后续炉子演出总Prompt与可选分层静态素材Prompt存放于 docs/xianxia/。
- 未播放材料飞入、炉火变化或炉子摇晃；该部分留待分层素材和后续演出制作。
- 已有物品图直接复用；缺少独立图的物品暂用类别轮廓，未替换为其他装备的图。

## 验证

- 炼器UI与事务：16项通过；主机抽取回归：3项通过。
- 全部30张物品图通过98%主体占比、透明边缘和居中检查。
- Web构建通过。
- 1280×720及844×390浏览器流程通过，无页面错误。检查逐件、跳过、总览、回看和关闭；展示操作不改变已入账的装备、货币、随机数或品质。宗门正常定时回血的HP及restAt不计入展示状态比较。
- 全量 npm test：1819项，1778通过，41失败。失败名称与本次结算开发前的41项一致，没有新增失败名称。

## 全量套件剩余失败

- removed gameplay cannot reenter the build
- hover independent: equipment colors reach reused projectile sprites without changing rider
- hover independent: unknown presentation IDs reset gold tint to default
- hover independent: ImageAsset failure retains visible legacy player
- hover independent: JsonAsset failure retains visible legacy player
- hover independent: malformed failure retains visible legacy player
- hover independent: dimensions failure retains visible legacy player
- hover independent: available from start, movement overrides input, freeze and reset
- hover independent: damage tint, accessibility and terminal alpha remain intact
- hover independent: delayed load after destroy never revives view or retains assets
- hover independent: rendering real short runs leaves all logic and RNG unchanged
- independent host: ImageAsset failure falls back to visible legacy player
- independent host: JsonAsset failure falls back to visible legacy player
- independent host: malformed failure falls back to visible legacy player
- independent host: actual movement, frozen states, idle and new-run reset are wired to the controller
- independent host: destruction while character resources are pending never revives the view
- independent host: hover uses the existing invulnerability and terminal alpha without multiplication
- View routes all S3 events and ground renders below hostile zones and enemies
- same-mode retry can recover a failed isolated copy without touching ordinary progress
- ordinary progress becomes writable only after an explicit switch from the failed playtest
- successful sync re-enables current-page buttons and clamps obsolete scroll (ordinary)
- successful sync re-enables current-page buttons and clamps obsolete scroll (playtest)
- economy v2 hides the wallet on hall and skills but shows it in relevant pages
- manual healing works after sync recovery and a failed pill save consumes neither HP nor inventory
- tower entry artwork reuses requests and late loads cannot revive abandoned page
- stone battle art maps converted denominations rather than monster ranks and leaves rewards untouched
- wallet grade icons pair with quantities and release bindings on redraw
- approved resource icons render beside existing counters and XP feedback without altering values
- each pill shares its own art across apothecary, inventory cell and details without consuming pills
- backpack art preserves menu and battle hit targets, fallback and inventory navigation
- filters can clear empty results, sorting is stable and all navigation retains named peaks/presets
- pill shop 844x390: buy without healing, then consume from inventory
- pill shop 1280x720: buy without healing, then consume from inventory
- wallet 410: exact denomination quantities share one bounded row
- wallet 0: exact denomination quantities share one bounded row
- wallet 19999999999: exact denomination quantities share one bounded row
- boar uses three real one-shot phase clips, freezes by simulation time and never derives damage
- only boars with explicit simulation state request motion; all legacy/static families remain compatible
- missing or invalid motion falls back to static without leaking images or retry storms
- async completion after clear does not create nodes; completion after destroy retains no resources
- actor removal and recycled IDs do not retain phase clocks or sprite bindings
