# 猿族半人形母图验收与静态接入

2026-11-02。用户提交《石甲兽人战士.png》并授权通过后接入。猿首、直立承重、长臂不触地、棕褐毛发与灰岩肩甲通过静态验收。原始1254×1254文件保留original.png；prepare.py本地去灰底，原分辨率透明图extracted-alpha.png、1024参考reference-alpha.png和三底色检查size-review.png保留。运行资源ape-humanoid.png为256 RGBA。无Scenario调用或费用。

4–6阶猿族按form_stage=2映射独立ape-humanoid，低阶保持ape。新增普通半径28、脚底锚点0.9及地面标记；元数据脚本同步但未运行阵容重写流程。源表除art_family/art_status外逐字段相等。

内容生成检查、58项相关测试及Cocos web-mobile构建通过。scripts/verify-ape-humanoid.cjs以真实_enemy工厂创建已有原型，在1280×720、844×390的smoke内存存档下检查普通89.6、精英100.352、Boss220画布，256纹理、六阶名称、暂停及单次死亡移除。截图前等待加载界面退出。报告game-review/report.json。撼岩猿王不是当前固定关底，本次未改投放；截图文件名6是夹具楼层参数。

本次为静态素材接入，未制作移动、攻击、受击、死亡专属动作，未完成全动作或微信真机验收。没有改变技能、数值、碰撞、奖励或存档规则。
