# 妖猪接口交付：仅导入审阅，不启用正式循环

现有job `job_k3nbPaTgmeGqDu1VM9vGGHvu` 已成功，视频源 `asset_Jk6jAHSPBz7KGuUdkdgtNsrh`，实际10 CU。本次没有怪物付费调用。

## 主线程接口

`boar-review-atlas.png` 为2048×2048 RGBA，8列×8行，62帧；最后两格透明。每格256，四周2px gutter，有效rect252×252。`boar-review-atlas.json` 提供TexturePacker式frames字典（左上坐标）、sourceSize、源帧号/时间及clip范围；不是Cocos原生导入器声明，主线程须据rect创建SpriteFrame或转换格式。

所有帧由480×480原画布统一缩放至252×252，不逐帧居中、不调整脚底。中心锚点[0.5,0.5]只是固定画布参考，**没有标定足底锚点**。原生朝向左下三分之四；如果镜像必须同步锚点解释，不能改碰撞。12fps，图像仅供表现；已有伤害、半径、判定与预警时序仍由战斗系统决定。

## 为什么没有批准直接启用

对源审阅帧2–31内12–20帧窗口进行首尾缝检测，最佳为9–22帧：首尾MAD0.036922，内部相邻均值0.017346，比值2.128536，大于门槛1，**无缝步行循环不通过**。详见seam-search.json。不得用ping-pong伪造正向步态。

31–62帧包含蓄势、上拱与恢复，但未确定实际接触帧，没有可靠攻击目标作参照；`hitFrame:null`、`damageEvents:[]`，攻击段也是审阅候选，不能硬编码为新伤害时点。全片与attackReview都设loop:false。

色键alpha在小尺寸下可看，但不是最终边缘验收，蹄部、獠牙轮廓与局部形变仍需复核。因此`productionApproved:false`，**建议正式游戏保留已批准静态妖猪**，本包仅进入独立美术预览。没有修改runtime。

## 验证

62个JSON rect从atlas反切，逐像素等于对应源帧统一缩放结果，全部通过。atlas实际RGBA及透明空格已验证。使用`scripts/prepare-monster-motion-atlas.py`可免费重建，脚本无网络、无生成操作。
