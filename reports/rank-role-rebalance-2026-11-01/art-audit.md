# 品阶与身份分离：视图与素材审计

2026-11-01。只修改视图资源选择、角色显示倍率与页眉取名，不制作静态图、不调用Scenario。品阶及投放由运行数据独立控制。

## 已接入的规则

- `TowerMonsterArt.artFamily` 从 `ARCHETYPES.art_family` 读取资源键，不再以四个特殊精英/Boss ID决定形象。普通、精英、Boss可共享同阶段资源；已配置阶段资源优先于来访者传入的物种fallback。
- 同族同资源普通倍率1、精英1.12、Boss2。蝠/隼保留已有1.25翼展补偿。普通蛛女不会因为使用spider-lady而获得Boss倍率。Boss基础画布上限220，翼展类275；狂暴仍由原有机制在常态基础额外1.2倍。
- 显示基准与碰撞半径解除耦合：普通按原族普通半径算画布（首层猪26→83.2px、狼22→70.4px；熊32、鳄30、猿/虎28、蝠18、隼20、其余24，乘3.2后限制64–110）。精英使用同族普通画布×1.12，不把精英碰撞34再乘一次。Boss固定原验收基准110×2=220；此“2倍”是65号文档的原Boss基础基准，不意味着当前普通猪83.2的两倍。保留普通族间已有大小差异，没有将所有普通统一缩成64。
- 楼层列表的图片和名字均由最终 `floor.boss_id` 查原型，名字用该原型 `name`。战斗当前目标继续使用敌人实例的独立 `name` 和 `rank`。
- 未改动作阶段、狂暴时间、暂停、死亡、碰撞或伤害逻辑。已有狼/猪动作保留；半人/人形资源不套用它们的兽形动作。

## 现存素材映射

`—`表示未找到已通过对应阶段验收且已接入的资源；不得当作阶段已完成。阶段1=1–3阶，阶段2=4–6阶，阶段3=7–9阶。

| family | 阶段1 | 阶段2 | 阶段3 |
|---|---|---|---|
| boar | boar | — | — |
| wolf | wolf | — | — |
| bear | bear | — | — |
| tiger | tiger | tiger-humanoid（本轮旧原稿复用，静态通过） | white-tiger |
| ape | ape | — | — |
| snake | snake | snake-lady | — |
| crocodile | crocodile | — | — |
| scorpion | scorpion | — | — |
| centipede | centipede | — | — |
| rhino | 旧四足参考保留，当前无独立运行键 | rhino | — |
| yak | 旧四足参考保留，当前无独立运行键 | yak | — |
| falcon | falcon | — | — |
| spider | spider | spider-lady | spider-queen |
| bat | bat | — | — |

现有普通池为11族，不因表列14族而新增投放。犀与牛同名运行PNG已被直立母图替换；未来若新增低阶普通，必须先恢复独立兽形资源键，不能直接使用rhino/yak假装阶段1。

蜘蛛4–6阶统一复用spider-lady，蛇4–6阶复用snake-lady；虎族阶段2复用旧虎首直立原稿，独立导出tiger-humanoid，见 `design/xianxia-tiger-humanoid-2026-11-01/README.md`。人形白虎和蛛后只适用于阶段3。其余阶段2暂无通过验收的对应形态时，允许表中兽形作为明确标记的临时过渡，但不能宣称“高阶半人形美术完成”。

## 证据与母图位置

- `design/xianxia-spider-lady-2026-11-01/README.md`：半人蛛女、化形蛛后通过静态母图验收；运行键spider-lady/spider-queen，256px；原始图、1024px透明参考和旧版本保留。
- `design/xianxia-snake-lady-2026-11-01/README.md`：五阶蛇女母图通过，蛇尾下身，运行snake-lady，256px。
- `design/xianxia-white-tiger-human-2026-11-01/README.md`：七阶人类头脸/四肢白虎通过静态验收，运行white-tiger。
- `design/xianxia-humanoid-bosses-2026-11-01/README.md`：犀首/牛首直立母图通过，运行rhino/yak，256px。各子目录previous-runtime.png保留旧四足图。
- `design/xianxia-approved-monsters-2026-11-01/README.md` 与manifest：蛛/鳄/蝠/隼兽形512px；该报告中的犀/牛旧状态已被上述直立验收覆盖。
- `docs/xianxia/sect-tower-v1/65-monster-art-production-standard.md` 为阶段与尺寸依据；`design/xianxia-high-rank-beasts-2026-11-01/README.md` 的历史分段只作历史参考，以顶部最新1–3/4–6/7–9规则及各个体验收为准。

## 动画与验证边界

猪、狼已有256px兽形动作。其他现存静态母图不能被计为完整移动/攻击/受击/死亡动画。阶段2缺图族系优先查已有原稿和参考，能够本地整理的先整理；仍有结构缺口再给用户制图prompt，不使用付费静态生成。

本轮增加 `tests/tower-rank-role-view.test.mjs`，验证metadata资源选择、无语义ID、新高阶普通、所有身份倍率和Boss页眉来源；同步既有动画测试中的旧蛛女精英Boss尺寸预期与表驱动资源入口。

独立视图测试及机制/影子反馈回归：`node --test tests/tower-rank-role-view.test.mjs tests/tower-monster-mechanics-view.test.mjs tests/tower-shadow-body-impact.test.mjs`，13项通过。完整动画测试需要主任务生成包含art_family的新数据后再执行。

这份审计不声称完成新版编排的真实横屏、标签密度、全动作或微信真机验收。主任务需在数据生成并同步后构建，分别在1280/844横屏验收高阶普通、具名精英、各层Boss及现有狂暴生命周期。

最终补充：主任务已完成构建和1280×720/844×390横屏检查，18次菜单与12次角色夹具检查通过（见game-review/report.json、actors-review/report.json），包含标签、暂停及死亡。此处早期“需验收”状态由上述最终证据覆盖；全动作制作与微信真机仍不在已完成范围。
