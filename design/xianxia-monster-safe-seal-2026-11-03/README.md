# M19六门避劫安全地印 · 2026-11-03

用户《绯色背景上的冰晶魔法环.png》验收并接入。原图1254×1254，本地去品红和溢色，保留青白晶环、四向装饰和中心留空。装饰外晕以原图中心半径42.5%裁切、8px软边收束，运行512×512，边界半径217.6像素；按safe.radius缩放，全部装饰限制在原安全区内。prepare.py、原图source-original.png、透明母版extracted-alpha.png、review.png与源哈希preparation.json保留。0次Scenario生成/上传，费用0。

TowerSafeSealArt只处理M19，从预警开始显示两处地印，到原expiresAt立即清理，不提前淡出安全标识；暂停完全不变。本体死亡、区域撤销、资源迟到均正确清理。两处共享约1MiB纹理，按需加载。原安全盘、双边界、斜线和安全文字保留，总技能提示移至两处安全区下方以避让。保持原安全区中心、半径55、免伤判定、技能配置、伤害和时间，不增加传送或新技能。是静态地印，未制作内部流动动画。

69项相关测试通过，Cocos Web构建通过。scripts/verify-monster-safe-seal.cjs在真实第八层yak_boss与第九层tiger_boss_zhenyan原技能表触发M19，分别验证1280×720和844×390下预警/生效两处标记、512纹理、精确位置/半径（浮点容差1e-6）、安全文字、暂停、施法者死亡与到期。game-review/report.json为PASS，共8组记录，最终画面已目视复核。首轮文字重叠截图保留在game-review-before-caption-fix；game-review下不带楼层前缀的截图同属首轮，最终使用8-/9-前缀。微信真机尚未验收。

下一母图：技能库M14连环落石的独立岩石，../xianxia-monster-falling-rock-2026-11-03/static-prompt.md。M14当前未配置正式怪物，后续仅补美术/夹具验证，绝不擅自添加技能。既有灵核、矿晶、土石波带优先复用。M14母图尚未提交或接入。
