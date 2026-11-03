# 飞行剑气胸口锚点审查

建议给已接入的角色素材使用 **地面胸口抬升 +64 设计单位**。这是显示高度，不能加到战斗中的 `player.y`、`shot.y`、目标位置或碰撞几何上。左右、上下、斜向释放一律沿画面竖直方向上移 64，剑气朝向仍由自身方向旋转。

测量部分记录修改前的角色、剑气绘制和旧实景状态，所有衍生图片与测量脚本保存在本目录。完成只读诊断后，按主任务授权另行修改了 `sj_cross` 的文案与后备图标，详见末节。没有改动旧封包、原图或原视频，也没有调用付费生成。

## 测量依据

`ground-actions.json` 的脚底锚点是 `(133.3333,285.3333)`，`bodyHeight=160`。`TowerCharacterArt` 显示身高是 108，所以源图到设计单位的缩放为 `108/160 = 0.675`。

技能释放使用 `slash.hitFrame=8`，对应 atlas 第 29 帧、原始 slash 第 16 帧。以源图中的颈部、腰部及躯干中段人工识别胸口，主释放帧胸口约为 `(149,190)`。袖袍遮挡带来约 ±4 源图像素的不确定性，不能将人工点位视为骨骼数据。

其高度换算为：

```text
脚底以上高度 = (285.3333 - 190) × 0.675 = 64.350 设计单位
右向 sweep 施法额外倾斜 -2° 后，高度约 63.942
```

因此固定取 64 比逐帧追踪袖袍/握剑手更稳定。主释放帧的握剑手约在脚底上方 54.9，属于略低于胸部的位置；不建议把握剑点直接当月牙中心。释放后一帧和两帧的胸口估计约 63.7；前一准备帧约 67.7，姿态变化不足以要求剑气离体后继续上下摆动。

图证：

- `slash-contact-sheet.png`：完整 slash 序列与脚底基线。
- `frame-27-grid.png` 至 `frame-31-grid.png`：源图像素网格，便于人工核对胸口和脚底。
- `release-chest-measurements.png`：准备、释放、恢复的四帧对比；青色线是统一 +64 高度，粉色点为人工胸口估计。
- `existing-scene-annotated.png` / `existing-scene-detail.png`：原实景截图的标线副本，没有重画或挪动原剑气。
- `measurements.json`：原始数值、四个方向/形态的旧实景记录和本轮读取的源码 SHA-256。

旧实景 `browser-attempt-05/arc-4-1280.json` 在 `time=0.233333` 记录：角色采用 frame 29；剑气世界位置 `(-154,-60)`，camera `(-250,-48)`，显示节点 `(96,-12)`。这正是 `shot-camera`，显示抬升为 **0**。向上、斜向和十字样本也都是 0。

旧截图宽 1280，与设计宽度一致，横向释放时脚底及剑气中心的基线在截图约 y=380；推荐胸口线约 y=316，和人物胸部相符。截图与 JSON 属于同一验收场景，异步截图可能落在相邻显示帧，因此不能用其中的剑气横向位置精确推导同一帧飞行距离。

## 修改前的坐标关系

- `TowerView` 是地面平面投影：`screenX = worldX-cameraX`、`screenY = worldY-cameraY`。横屏 camera 位于人物地面位置上方 12 单位；不需要为剑气单独再次补偿这个 12。
- `TowerCharacterArt` 通过 atlas anchor 把素材脚底置于 `groundY`。目前飞行角色另有 `18 + sin(3*time)*2` 的视觉悬浮；18 已包含代码注释提及的额外脚底间隙，不能重复再加 3。
- 修改前 `SwordQiArt` 直接将父节点置于 `(item.x-camera.x,item.y-camera.y)`，再设置角度。`TowerSkillEffects.drawSwordQi` 的程序后备绘制也直接使用地面坐标，二者都缺少胸口显示高度。
- 修改前的直十字以 origin 为前缘，几何交点在局部 `(-width/2,0)`；新弯月几何的实际深度另由主任务修改。两道交叉月牙应共享一个身体高度，并正确对齐其共同几何锚点。不能给每片月牙各加一个旋转后的局部 Y 抬升。

## 推荐实现契约

先完成剑气局部形态旋转，再给整个形态加全局竖直显示高度：

```text
displayPoint = (groundPosition - camera) + rotate(localBladePoint, direction)
               + (0, visualHeight)
```

Sprite 的父节点平移可直接使用 `y = item.y-camera.y+visualHeight`，角度设置保持原有方向。程序后备也必须使用完全相同的公式。若把 `(0,64)` 加在旋转子节点内，向右为抬高，向上会变成向左偏移，向左则会下沉，这是需要避免的方向错误。左右镜像只影响局部 X 和角色朝向，不改变视觉高度。

悬浮时推荐：

```text
visualHeight = 64 + (castWasFlying ? 18 + 2*sin(3*releaseTime) : 0)
```

即飞行胸口高度约为地面以上 **80–84**，平均 82。在每一发真正生成时取其 `startedAt`，然后固定该发的高度；三连月牙各发最多相差几单位，能够从当时的胸口释放。离体后不读取人物当前 bob、位置、朝向或新学习状态，否则人物上下浮动或中途学习御剑飞行会使已经射出的剑气跳动。飞行体可从已有 `castContext.loadout.passive.sj_flight` 和 `startedAt` 推导；近身十字效果若缺少 castContext，应在释放时保留只用于显示的高度/飞行标记。

不建议为了抬高画面而改战斗坐标：本游戏的 Y 代表地面前后距离。给命中坐标加 64 会把攻击路径向地图北侧平移，向上、向下释放的距离、障碍碰撞和敌人筛选都会变，无法表示“离地高度”。保留地面碰撞位置、实际宽度、逐发去重、保存恢复和地形截止位置。高度只参与 Sprite、后备线条及需要贴合气刃的命中特效显示；地面阴影、落点标记、深度排序键仍使用未抬高的地面位置。

将直刃十字改为两条弯月刃属于**横向形状**变化，应另行让共享几何与新图一致，但不应把该形状变化同竖直显示高度混到一个坐标里。

资源失败时的程序人物比例与正式素材不同：其躯干中心约在脚底上方 35–40，悬浮只额外 +7±2。若后备人物也要求严格贴胸，应让人物绘制返回实际胸口高度，或同步其比例后复用 +64；不能把当前正式素材的胸口常量称为所有人物后备形态都适用。正常已加载 ground-actions 的路径应优先以本次 +64 测量值验收。

## 验收点

1. 左、右、上、下和斜向：整片月牙/两片交叉月牙均是全局竖直抬高，形状之间不分离。
2. 地面释放对齐胸口约 +64；飞行释放对齐当时的 80–84，高度不在离体后随人物摆动。
3. 开关人物移动、暂停恢复、资源延迟加载、程序后备切换时不出现中心位置跳动。
4. 改视觉高度前后的同一战斗输入，地面轨迹、命中目标、命中次数、伤害、墙/柱截止位置及 RNG 一致；新增弯月形状导致的覆盖变化单独验证。

复跑测量（需 Pillow，当前环境可使用 Codex bundled Python）：

```sh
/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 design/xianxia-sword-qi-curved-2026-10-30/anchor-audit/measure_anchors.py
```

## 后续授权的文案与图标修改

只修改了以下三处源文件中的 `sj_cross` 分支：

- `js/xianxia/TowerGrowth.js`：说明两道交叉月牙组成一发十字剑气，按弧形刃面判定，共用每敌每发一次命中记录。
- `js/xianxia/TowerSkillPresentation.js`：近身、飞行、大型飞行形态均说明两道交叉月牙；范围描述使用弧形刃面及整体横宽，刃面间空隙无伤害；飞行形态使用“整发对同一敌人最多命中1次”，避免把两刃误读成两次伤害。
- `cocos-pilot/assets/scripts/TowerMenu.ts`：原直 X 后备图标改为两条 `.7` 月牙分别旋转 ±45°，共 24 条线段。`TowerSkillIcons.ts` 无需修改，已有后备图标选择继续生效。

技能名称、数值、等级门槛未改；主任务负责战斗几何、显示抬升、构建与同步，本审查未执行构建或同步。

相关测试 **33/33 通过**，日志存为 `copy-ui-tests.tap`：

```sh
node --test tests/tower-qi-progression.test.mjs tests/xianxia-tower-skill-presentation.test.mjs tests/xianxia-tower-skill-icons.test.mjs
```

`verify_icon_geometry.mjs` 提取实际 `TowerMenu.ts` 的 `sj_cross` 分支，捕获其 Graphics 路径，与主任务新 `swordQiSegments('cross',60)` 对照。运行时几何按半个刃面深度平移居中后，两者最大点位差为 `7.105427357601002e-15`，证明后备图标沿用同一弧线形状；结果保存在 `icon-geometry.json`。复跑：

```sh
node design/xianxia-sword-qi-curved-2026-10-30/anchor-audit/verify_icon_geometry.mjs
```

主任务随后将直接面向玩家的“共用命中记录”改为“交会处只命中一次”，保留相同判定含义。本节记录文案/UI审查阶段结果，不代替主任务最终构建验收。

旧素材保留核验另存于上级目录 `preservation-before.json`：1632个媒体、231份其他文件及8份旧目录索引全部通过原哈希与字节数核对；本目录清单见 `evidence-index.json`。
