# 参考冒险者 · 连续动作评审初版

本轮根据用户认可的参考稿制作动作：保留原帽子、面部、鞋和雨披的矢量轮廓，拆分遮挡区域，补绘可动手臂、手掌、腿和短裤，再以关节位置生成连续姿势。属于参考剪纸骨骼动画与新绘肢体结合，不是原画师逐帧水彩重绘。

## 交付

- index.html：可暂停、逐帧、调速、镜像和切换底色的动作评审。
- svg/：24组、124张独立可编辑SVG。源文件有clipPath/mask/use，只有本文件内的矢量引用，无嵌入位图。
- preview/：透明PNG和逐帧对照板。
- build_motion.py：拆层、关节、承重周期和姿势源。
- export_preview.py / render.cjs：运行图集导出和预览渲染。
- motion-vectors.zip：SVG、清单与说明。

## 动作范围

跑步、爬行、攀爬、推步、持物跑步各8帧循环；另有伸手、抓取、持物、道具使用、撑住、抬手滑翔、滑翔、受伤、防护恢复、倒下、招手通关、平衡、进洞、坐下休息、跳跃、落地、俯身、起身、转身。单次动作不会被计作完整运动循环；持物、撑住、休息是保持姿势。

## 试玩方式

scripts/microforest-preview.html?audit=forest-01&motion=2 是独立动作评审试玩。普通入口继续使用用户已认可的角色。动作评审atlas包含原参考姿势以覆盖兼容动作，输入/物理/存档/关卡不变。

## 美术评审结论与限制

当前是可播放和实景测试的初版，不是美术最终验收。新绘肢体较原参考水彩细节简化；俯身末端切入参考爬姿、转身不同视角的体积衔接仍需打磨；倒下目前身体旋转较明显，需要进一步卷曲与表情设计。手握藤蔓、掌心推物、绒毛的抓握接触需逐场景校准。不能以124帧或自动测试通过宣称这些问题已解决。

连续帧的肢体有真实位置变化：跑步/推步的支撑脚按世界移动周期后移；爬行有落掌与抬手回程；攀爬交替换手、抬膝。相位来自游戏实际移动距离，松手停爬时不继续播循环。

## 复现

python3 design/traveler-motion-reference-2026-09-24/build_motion.py
node design/traveler-motion-reference-2026-09-24/render.cjs
python3 design/traveler-motion-reference-2026-09-24/export_preview.py
RAINY_MOTION_PREVIEW=1 RAINY_SHARP_PATH=<sharp目录> node scripts/microforest/pack-art.mjs
npm run cocos:build

依赖沿用本地Sharp与Python标准库，不需要图像API。验证及当前风险记录于项目CODEX_HANDOFF.md和DEBUG_HANDOFF.md。

## 手脚不协调反馈后的返工

用户指出此版手脚不协调，美术未通过。本轮修正跑步肩关节未跟随躯干、摆臂与落脚异相、爬行同侧手膝同相、攀爬肢段随帧伸缩。coordination.py统一接触相位和肩髋坐标；攀爬上臂/前臂现在固定17/18源单位；跑步足端与同侧手臂反向运动。前臂在雨披前补回连接，避免只有手掌露出。

独立试玩跑步一周期从36.26改为56世界单位，满速循环频率约4.36→2.82次/秒。模拟移动速度不变，接触期步幅重新匹配；该修改只用于motion=2。

coordination-review.html保留修改前后对照，before-coordination目录是修改前的真实SVG/PNG快照。check_coordination.py检查320个相位点的骨长、支撑、反向摆臂和周期连续性；这不是美术验收。

仍需审片：肢体造型与原稿的画风融合，俯身/转身/倒下的过渡，以及实际推掌/握藤/持物接触。不能把这次配合修正写成全部24组动作已获认可。
