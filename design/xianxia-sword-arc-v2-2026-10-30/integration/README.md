# 剑气斩修订版接入记录

2026-10-30 用户确认审核视频并要求接入。塔内剑气斩现在使用该版本的透明序列；此次只改表现层，不改变伤害、冷却、打击次数或判定范围。

## 素材与播放

- 来源：`asset_xoVQvWdHedrAdG8xcxZew9Rh` 对应的本地修订透明帧。没有使用带黑底的 MP4 充当透明贴图。
- 图集：`cocos-pilot/assets/resources/tower-skill-fx/sword-arc-v2.png`，1024×1024，4×4 布局，16 帧，108,632 字节；解码 RGBA 约 4 MiB。
- 原审核序列选帧为 3、4、6、7、9、10、11、13、14、16、17、18、20、21、23、24。统一围绕原发射点 `(384,352)` 裁切为 816×816，再缩放至256×256；不逐帧重新居中。
- 播放沿用实际单段斩击的 0.25 秒模拟时间。节点位于真实释放起点减相机偏移处，尺寸为 `effect.radius × 816 / 394`，朝向使用实际释放方向。
- 每段真实 `effect.id` 独立播放。升级后的二连斩、三连斩由游戏调度；贴图自身只包含一次斩击。暂停保持相位，移动相机不会移动世界中的释放点。
- 仅成功画出的事件 ID 关闭程序弧，资源未就绪、加载失败或达到并发上限时保留原程序表现。过期节点在接纳新施放前清理，避免容量边界漏播。
- `SwordArcArt` 的旧默认配置仍供原 Survivor 路径使用；旧素材和历次未采用的源视频都保留。

完整像素契约见 [runtime-contract.json](../runtime-contract.json)；导出脚本支持 `--check`，校验来源帧哈希、图集像素、透明边缘、朝向和半径。

## 验证

| 检查 | 结果 |
|---|---|
| `prepare_sword_arc_v2.py --check` | 通过；无裁边、后方能量或扇区越界 |
| `node --test tests/sword-arc-art.test.mjs tests/tower-skill-effects.test.mjs` | 15/15 通过 |
| Cocos shared sync + web-mobile build | 通过 |
| 真实 Cocos 浏览器验收 | 10 个真实战斗场景通过：1280×720、844×390 两视口，各含1级四方向和10级三段施放 |
| 资源核验 | 两视口实际 HTTP 响应均为108,632字节，与运行时图集 SHA256 相同 |
| 回退、暂停、相机和退出 | 通过；强制资源404仍有程序扇斩，退出无残留节点，绘制不改战斗数据，测试无存档写入 |
| 完整 `npm test` | 1819 项，1778 通过，41 失败；与本次接入前45个失败比较，无新增失败 |

完整测试中减少的4个失败来自并行进行的炼器界面修复，不归因于此次接入。失败名称与两轮基线的对照见 [test-baseline-comparison.json](test-baseline-comparison.json)。本次新增的5项特效回归测试均通过；其余新增测试来自并行工作。

实景逐项记录见 [browser.json](browser.json)。已目检青石背景下的单段斜向和三段斩击，以及深色、浅色、紫色背景的透明边缘：没有黑色矩形、明显黑边或裁切。浏览器验收不代表已测得真机帧率。

![10级三段剑气斩中的第二段](rank10-three-pulse2-1280.png)

![小横屏斜向剑气斩](rank1-diagonal-pulse1-844.png)

## 范围与原素材保留

接入前后 `js/xianxia/TowerRun.js`、`TowerSkillForms.js`、`TowerGrowth.js` 的 SHA256 完全一致；此次没有调整战斗机制或数值。旧源视频、审核视频、透明帧和图集均留在原位置；[特效素材库](../../xianxia-vfx-asset-library/README.md) 记录来源和可复用方向。本次接入及整理没有新增生成费用。

下一技能方案见 [一线天 · 基础单贯 prompt](../../xianxia-skill-review-2026-10-30/NEXT_VFX_PROMPT_YIXIANTIAN.md)。制作前先检查旧一线天及现有剑气素材，优先复用或重剪。
