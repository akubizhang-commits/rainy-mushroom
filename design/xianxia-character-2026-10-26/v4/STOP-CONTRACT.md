# 单角色停止过渡资源（新增，不替换walk图集）

- PNG：`export/sword-stop-v4.png`，768×2688，8列×16行，共128格。
- JSON：`export/sword-stop-v4.json`，与walk同样的`frames`/`animations`/`meta`结构。
- 每格96×168，`anchorPx={x:48,y:160}`，`pivot={x:0.5,y:160/168}`，参考身高154纹理像素，80u按80/154缩放。
- 从当前实际显示的walk帧索引 `i`（0–31）选 `animations.stop_XX`。4格线性索引为 `i*4+j`（j=0–3）；名字为 `stop_XX_1` 至 `stop_XX_4`。
- 四格采样归一化时间t=.25/.5/.75/1；姿势权重用smoothstep(t)，即.15625/.5/.84375/1。
- 每格30ms，总120ms，不循环。elapsed在[0,120)时使用 `floor(elapsed/30)`，120ms后切到旧walk图集的`idle`，不再显示停止图集。
- 起停期间只使用一个可见角色sprite，保持opacity=1；逐帧替换贴图区域。不要交叉淡化，也不要同时显示walk/idle/stop的角色图像。
- 第4格必须与旧图集idle逐像素相同。所有姿势从当前walk局部坐标向idle收拢；腿重解104/94固定骨长IK，手臂角度插值并保持62/57骨长。
- 左向为原始图像，右向只绕同一锚点镜像。停止过程中保持选定镜像方向，不涉及新增方向图。
- 此为固定实体锚点下的短收拢动作，脚位会有意向idle移动；不声称世界锁脚或零滑步。不提供新的碰撞、根位移或运行时逻辑。

现有`export/sword-side-v4.png/json`内容与契约保持不变。
