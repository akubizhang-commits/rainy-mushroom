# M03 汲灵回生 · 已有灵核复用验收

2026-11-03，接入完成。复用 `design/forging-materials/intake/core_ling/master.png` 已验收透明母版；原始来源保留为 source-original.png，SHA256 为 030b06d15326bceeb1c75323ca811b12ac1d7e1e9942dc7ab20952c83e3c5ec0。未调用 Scenario，0 CU。

## 素材与接入

prepare.py 从 2048px 母版等比生成 512×512 透明战斗图，主体480×448，居中完整保留。三底色 review.png 验收通过。运行图 tower-monsters-motion/core.png；TowerCoreArt 按原召唤实体绘制，主体高 max(56, radius×2)，脚底绑定实体坐标并参与角色遮挡排序。标签、血条及资源未加载时的几何后备保留。此图属于战斗机关，不套用物品图标98%规则。

正式第五层蛇Boss已有M03技能，无需改变技能表。召唤血量、六秒生命、回血预算、碰撞及击破收益均沿用原逻辑；仅替换表现。静态素材，没有新增逐帧动画。

## 验证

- 72项测试通过：core、mechanics-view、chain、pillar、monster-mechanics、unique-bosses、monster-animation。
- Cocos web-mobile 构建成功。
- scripts/verify-monster-core.cjs 在1280×720、844×390均通过；game-review/report.json记录结果，无pageerror。
- 使用原第五层蛇Boss技能触发真实召出；纹理512px、脚底误差小于0.01、角色层、暂停状态不变通过。截图 cores-1280.png / cores-844.png 已人工查看。
- 活跃期间累计回血36.67→86.67；真实伤害接口击破灵核后进入M23暴露、护甲归零，继续推进0.5秒累计回血仍86.67。测试存活观察阶段临时提高灵核血量防止角色基础攻击提前击破，不修改生产数值。
- 主人死亡/实体到期无残影；资源失败和销毁后的迟到回调有单测覆盖。
- 本次为浏览器横屏验收，未做微信真机验收。

## 下一步

优先审计已有矿晶用于M04护甲结晶；先找可复用母图，不要求用户重复出图。确定无法复用的缺口后再给新母图prompt。
