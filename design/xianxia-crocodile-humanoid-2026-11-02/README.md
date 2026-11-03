# 四阶伏潭鳄王：半人形静态素材接入

2026-11-02。用户提交《鳄人战士全身概念设定像.png》，授权验收通过后接入。鳄首、双足直立、背甲、完整长尾通过静态验收。原始1254×1254文件保存为original.png，未翻转；已有左朝向。

使用prepare.py本地去除连通灰底和右臂内侧背景孔洞。保留小面积灰色鳞甲高光，避免肩甲、脸部与胸腹被误抠。extracted-alpha.png保留原分辨率，reference-alpha.png为1024参考，运行资源crocodile-humanoid.png为256 RGBA。size-review.png含三种底色检查。原图、旧四足资源全部保留；未调用Scenario，费用0。

按现行species=crocodile且form_stage=2映射到独立crocodile-humanoid资源；低阶stage=1仍用crocodile。同步源表、元数据生成逻辑、资源白名单、普通半径30、脚底锚点0.9和地面标记。未运行阵容重写脚本。修改前后源表除art_family/art_status外逐字段一致。

验证：内容生成器--check通过；58项相关素材/机制测试通过；Cocos web-mobile构建通过。scripts/verify-crocodile-humanoid.cjs使用smoke内存存档，在1280×720及844×390编译引擎中生成第四层第20波真实Boss，检查四阶名称、256贴图、220显示画布、暂停、狂暴前常态/发动后红色及1.2倍、15秒期限、到期恢复与死亡单次击杀移除。另检查普通96和精英107.52尺寸的静态展示。报告和截图在game-review/。

这是静态母图及运行接入，未制作专属动作动画。普通/精英截图为展示夹具，不代表完整战斗验收；未完成微信真机、专属动作和狂暴存读档专项验收。本次未更改机制、碰撞、数值或奖励。
