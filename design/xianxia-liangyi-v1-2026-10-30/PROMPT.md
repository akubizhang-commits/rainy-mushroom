# 两仪剑阵制作说明

本次使用已有素材加工和本地动画编排，无新的模型生成任务。下面保留完整制作意图，便于修改及后续确有美术缺口时使用；不代表已经提交或支付生成费用。

## 中文

中国仙侠横屏俯视动作游戏，两仪剑阵技能特效。地面固定的圆形剑阵，青白与淡青两股剑意，阴阳双眼在圆心正上方和正下方，距离圆心为半径的0.66倍。两处阵眼各有可辨认的实体小剑，剑尖朝向圆心。清晰而轻薄的圆形边界、微弱旋流、稀疏剑纹和半透明阴阳曲线，始终能看见地面与敌人。

动画分为双眼落位、圆阵展开、阴阳交替脉冲、淡出。每个真实脉冲只有一次整体亮度峰值，激活阵眼与整个有效区域同步响应。1至9级六次阴阳交替；10级前六次交替，第七次双眼合鸣、剑意向心汇合。常驻层低亮，脉冲层清楚，尾段慢慢消散。固定圆域不追踪玩家或目标；不用四个阵眼、菱形阵或大范围白色爆炸。没有文字、八卦字样、额外角色、镜头移动、画面震动或反复挥剑。

纹理独立导出透明PNG，底纹、流气边界和两种剑眼分层，锚点与尺寸固定。攻击节拍由引擎驱动，不把六/七击烘进不可调整的整段视频；余光独立于伤害寿命。

## English art and animation brief

A fixed ground-plane Liangyi sword formation for a landscape Chinese xianxia action game. A precise circular field with two contrasting sword seals, pearl-white above the center and pale cyan below it. The two seals remain fixed at plus/minus 0.66 of the field radius. Each seal contains a recognizable slim physical sword, its tip pointing toward the center. Use a thin readable boundary, subdued flowing qi filaments, sparse sword tracery, and a translucent yin-yang curve. Keep the stone floor and enemies visible.

The sequence is: two seals settle, the circular formation opens, the seals alternate with synchronized whole-field pulses, then the light gently dissolves. Each gameplay pulse has one visual brightness peak. Ranks 1–9 have six alternating pulses. Rank 10 has six alternating pulses followed by one simultaneous two-seal convergence. The field never follows a moving caster or target. Do not add four seals, a diamond field, text, trigrams, a solid white disk, a character, camera motion, or repeated casting gestures.

Deliver reusable separate alpha PNG layers for the perimeter qi texture and the two sword seals. Keep centers, scale calibration, and clear padding consistent. Drive six or seven pulses from the actual gameplay event times. Dissolving residual light is purely visual and never causes an extra hit.

## 引擎时序

以实际落阵为零点：首击0.5秒、末击3秒。低阶间隔0.5秒；10级间隔5/12秒。双眼不乘二计算连击。半径按等级110至160变化，1／3／6／10级主审半径110／120／140／160。余光到3.68秒结束。
