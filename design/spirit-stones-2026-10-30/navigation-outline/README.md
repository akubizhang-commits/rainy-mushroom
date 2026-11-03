# 导航图标轻描边

仅背包与技能书：保留原主体尺寸，用128px图上的2px灰青色轮廓与外侧1px浅纸色边缘区分场景。

`*-before.png`保留本次修改前运行时素材；`*-outlined.png`为处理结果。原图及512px透明母版不变。

处理函数：`scripts/art/navigation_outline.py`；`prepare.py`已接入同一函数，重新导出不会丢失描边。无新增生成费用或运行时绘制。
