# 四阶裂石蝎王静态母图验收与接入

2026-11-02。用户提交《蝎甲战士与毒刺尾巴.png》并授权通过后接入。甲壳兽首、双钳代替双手、双足直立及完整分节毒尾通过验收。原始图片保存original.png；本地去灰底，原分辨率透明图、1024参考、三底色检查图与256 RGBA运行图scorpion-humanoid.png均保留。未调用Scenario，费用0。

stage=2蝎族映射scorpion-humanoid，当前为scorpion_boss；低阶继续scorpion。脚底锚点0.9、地面标记与普通半径默认24同步，Boss画布220。源表除art_family/art_status外逐字段一致，未执行阵容重写脚本，未改数值、技能、碰撞、奖励与关卡投放。

内容生成检查、58项相关测试和Cocos web-mobile构建通过。verify-scorpion-humanoid.cjs使用真实_enemy工厂与smoke内存存档，在1280×720、844×390检查四阶名称、256贴图、220画布、暂停与死亡单次移除。截图及PASS报告在game-review/。裂石蝎王为已有原型，不是当前固定关底；文件名6是测试楼层参数。

仅交付静态接入，未制作专属动作，未完成全动作与微信真机验收。
