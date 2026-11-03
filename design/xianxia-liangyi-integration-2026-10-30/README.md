# 两仪剑阵 · 扩大版 v3 正式接入

2026-10-30，按用户“扩大后好多了，符合预期，可以接入了”的批准，将两仪剑阵 v3 接入正式 Cocos 游戏。使用批准版三张透明 PNG 原字节副本；本轮模型调用 0、生成费用 0 CU、云端上传 0。

## 游戏效果

- 圆形剑阵半径为旧版的 1.2 倍。1–10 级依次为 **132、132、144、144、156、168、168、180、180、192**；阵纹、剑雨和伤害判定使用同一半径。
- 起手时锁定施法距离内最近的可选敌人，落阵后位置固定。沿用现有障碍与目标判定，不新增“怪群密度”选点。
- 1–9 级共 6 次打击，双眼交替；10 级共 7 次，最后双眼合鸣。每次共用 8 个目标上限。
- 0.12 秒起手，剑阵生成后 0.5 秒首击、3 秒末击；正常结束后余光消散至 3.68 秒。余光不追加伤害。
- 技能说明同步展示当前次数、范围成长、固定落点及余光规则。四象剑阵保持原范围。
- 伤害预算和冷却没有调整。命中事件增加目标身份与碰撞半径，仅供渲染定位；目标死亡或移动后仍保留正确受击位置。

## 接入与生命周期

`LiangyiFormationArt.ts` 管理地面阵纹和空中落剑两个图层，`LiangyiPainter.ts` 保留批准版绘制算法。渲染读取战斗状态，不选择目标、不推进战斗。画布与纹理复用，以模拟时间 30 Hz 更新；脉冲到来时立即刷新。

暂停和画面重建保留当时像素与时间；死亡、退出、换波和换层清理旧效果。换波清理修复已用真实 `TowerRun` 首击清波场景回归。资源或画布失败时继续使用原几何剑阵。

正式源文件位于：

- `cocos-pilot/assets/scripts/LiangyiFormationArt.ts`
- `cocos-pilot/assets/scripts/LiangyiPainter.ts`
- `cocos-pilot/assets/scripts/TowerView.ts`
- `cocos-pilot/assets/scripts/TowerSkillEffects.ts`
- `js/xianxia/TowerGrowth.js`
- `js/xianxia/TowerSkillForms.js`
- `js/xianxia/TowerSkillPresentation.js`
- `js/xianxia/TowerRun.js`

本包 `source/production/` 保存本次源文件副本。运行时素材位于 `cocos-pilot/assets/resources/tower-skill-fx/liangyi-v3/`。

## 验证与实录

- [正式游戏原速实录](qa/liangyi-integrated-realtime.mp4)：12.6 秒、30 fps，依次展示 1 级、10 级、10 级群敌场景。画面由正式游戏构建绘制，仅另加底部说明条。
- [接触表](qa/liangyi-integrated-contact-sheet.png)、[消散时间轴](qa/liangyi-integrated-timeline.png)。
- [最终 Cocos 浏览器验证](qa/attempt-03/browser.json)：PASS。验证原生资源请求和哈希、真实伤害与范围、6/7 次打击、共享目标上限、离阵停止受伤、暂停重建、纹理复用、换波、死亡与退出清理，以及真实 PNG 404 回退。没有替换战斗方法或注入候选渲染器，没有写入游戏存档。
- [148 项定向测试](verification/skill-and-renderer-tests.json)：148 通过，0 失败。
- [正式构建记录](verification/build-receipt.json)与 [构建日志](verification/web-mobile-build.log)：Cocos Creator web-mobile 构建成功；构建前后本次源文件保持一致。
- [源检查](verification/source-check.json)、[共享模块和源码副本](verification/source-snapshot.json)、[批准版绘制算法比对](verification/approved-painter-port.json)均通过。

验收环境为 1280×720 横屏 Cocos 浏览器构建；本记录不代表微信真机性能测试或线上发布。第一次检查因相同素材存在多个字节副本而修正了 QA 定位方式，第二次在换波修复前完成诊断；`qa/attempt-01/`、`qa/attempt-02/` 原始记录均保留，最终结果以 `attempt-03` 为准。

## 旧素材保留

v1、v2、v3 审核包、原图、原视频、旧候选与旧索引保持原路径和原哈希。本次只向素材库追加正式接入记录，不改写旧审核结论。封存前逐一核对此前 **2955 个文件、16 份索引**；历史环纹原片的 10 CU 不重复累计，剑体未知历史费用仍记为未知。

完整状态见 [verification-summary.json](verification-summary.json)，来源及运行时副本记录见 [assets/runtime-preparation.json](assets/runtime-preparation.json)。
