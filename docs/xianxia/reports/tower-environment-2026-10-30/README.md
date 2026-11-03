# 锁妖塔环境素材接入验收

> 后续已修复柱体前后遮挡并将圆碰撞改为底座六边形；当前规范与验证见 `../tower-pillar-contact/README.md`。下文保留初次接入记录。

已接入：青石地面、三根矮镇妖石柱、刷怪妖雾。适用于 arenaVersion=1 的六边形锁妖塔战场。

## 素材

- 地面源：`无缝苔痕青灰石板路-1.png`。原图缩为630世界单位的重复块，预烘焙至1890×2160并按原六边形精确裁切，固定在世界坐标(33,-60)，随镜头平移，无每帧拼图开销。
- 石柱源：`青铜纹饰苔痕六角石坛.png`。清除alpha<16的背景残点，裁出主体，导出512×636。运行时146×181，绘制中心位于地面锚点上方62单位。
- 妖雾源：`透明紫灰烟雾漩涡.png`。保留半透明，导出512×512。随真实reserved预警聚拢，实体出现后0.45秒扩散淡出；安全检查取消的预警立即清理。
- 原图未修改。处理脚本：`scripts/art/prepare-tower-environment.py`；运行时PNG及Creator元数据位于`cocos-pilot/assets/resources/tower-environment/`。

## 玩法与渲染

- 三柱坐标：(33,310)、(-307,-300)、(373,-300)，碰撞半径64；中央、外圈保留宽通道。
- 玩家及妖兽按自身半径避开石柱。妖兽用确定性可见性图绕行，玩家贴柱时将大体型妖兽的目标投影到可达位置。
- 敌我弹道使用线段扫掠，撞柱终止；自动选敌、近战、范围伤害、蛛网减速均检查柱体遮挡；冲锋距离在柱前截断。
- 地面位于战斗图形下方，石柱及妖雾位于怪物、角色、攻击预警下方。资源加载失败时保留场地与障碍占位显示。
- 未重置或删除存档；新增状态为静态几何或纯显示状态，正常读档与确定性回放已有测试覆盖。

## 验证结果

- Cocos web-mobile 最终构建成功。
- 战斗、场地、障碍相关77项测试全部通过。另有环境加载、取消预警、淡出清理、引用释放测试通过。
- 真实Chrome隔离浏览器上下文：1280×720、844×390两种横屏；三素材加载、三柱显示、预警层级、妖雾消散与清理全部通过，无pageerror。`report.json`为机器记录。
- `battle-*.png`为场地中央实际浏览器渲染，`edge-*.png`为六边形边界实际浏览器渲染。
- 较广范围锁妖塔套件运行结果：846项中829通过、17失败。9项host药铺/货币栏/UI测试在去除本次环境接入钩子的内存对照中仍同样失败；另8项inventory测试因其现有Cocos模拟缺少方法/组件失败。此次未修改药铺与背包业务以掩盖这些失败。不能将本记录解释为整个项目测试全绿。
- 本次验证不包含微信真机性能或发布包验收。

复跑命令：

```sh
node --test tests/xianxia-tower-obstacles.test.mjs tests/xianxia-tower-run-arena.test.mjs tests/xianxia-tower-run-attacks.test.mjs tests/xianxia-tower-arena-view.test.mjs tests/xianxia-tower-run.test.mjs
node --test --test-name-pattern='tower environment' tests/xianxia-tower-host-tools.test.mjs
npm run cocos:build
node scripts/verify-tower-environment.cjs
```

独立代码审查发现的贴柱追击和蛛网减速穿柱问题均已修复，新增回归用例先复现失败再验证通过；复核无新增发现。
