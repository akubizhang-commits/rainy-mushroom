# M04 护甲结晶 · 复用验收

2026-11-03接入完成。复用已验收凝灵晶 `design/forging-materials/intake/ninglingjing/master.png`，源文件逐字节保留为source-original.png。SHA256 fe82adb7118b37598bfd457eb88c267b65598a024614cf796aba5db5b387e7f1。未调用Scenario，0 CU。

prepare.py由1760×2368透明母版生成512×512战斗图，主体300×480，等比居中；review.png三底色检查通过。TowerCrystalArt使用tower-monsters-motion/crystal.png，主体高度max(56,radius×2)，脚底及角色层深度绑定原实体。结晶标签置于主体上方，避免原下方标签与召唤兽重叠；原标签截图保留在game-review-initial-labels。

正式第六层bear_boss的M04原本即召出2颗结晶及4个随从；未改变技能配置、数值、碰撞、八秒寿命或奖励规则。仅接入静态表现，无新逐帧动画，不套用物品图标98%规则。

## 验证

74项测试通过（crystal/core/mechanics-view/chain/pillar/monster-mechanics/unique-bosses/monster-animation），web-mobile构建成功。scripts/verify-monster-crystal.cjs在1280×720和844×390均PASS，无pageerror；最终截图已查看。

真实M04召出两颗结晶，512px纹理、脚底误差<0.01、角色层、暂停状态稳定通过。第一颗被真实伤害接口击破后仍保留0.8减伤及一颗结晶；第二颗击破后减伤归零、进入M23并暴露。主人死亡与到期清理通过；单测覆盖资源失败、销毁后的迟到回调。击破检查阶段仅测试夹具提升结晶血量，防止基础攻击提前击破，生产数值不变。

本次为浏览器横屏验收，未做微信真机验收。

下一步先检查M18锁柱能否复用已验收机关柱母图；M18仍未配置正式怪物，不改变技能表。暂时无需新增静态母图。
