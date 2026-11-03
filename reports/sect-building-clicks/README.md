# 宗门建筑点击验证 · 2026-10-29

- 修改前：浏览器实际触摸主峰建筑，页面仍为 hall（预期 home），复现失败。
- 修改后：1280×720、844×390、1280×800 三个横屏尺寸，各 11 次建筑触摸和 11 次名称鼠标点击，共 66 次通过；无页面脚本异常。
- 覆盖全部九处入口；锁妖塔覆盖塔顶及塔身，山门覆盖屋顶及门柱。未开放建筑显示对应提示。
- Cocos web-mobile 构建通过。浏览器使用独立存储；尚未在微信真机上验证。
- 全量 npm test：1693 项，1671 通过，22 失败。失败涉及资源目录白名单、测试环境缺少 TowerSectScene 或 drawHudActionIcon，详见 full-test.log。

## 全量测试失败项

- removed gameplay cannot reenter the build
- sect entries share cultivation state and keep tower separate from inheritance peaks
- forge 1280x720: quiet furnace, explicit choices and bounded actions
- forge 844x390: quiet furnace, explicit choices and bounded actions
- all pools and tiers commit once, preserve independent pity and show actual item
- save failure keeps confirmation stable, consumes nothing, retry yields one result
- insufficient resources, readonly and capacity disable confirmation without action
- long result scroll stays between the item heading and fixed close action
- leaving or destroying the menu invalidates confirmation callbacks
- filters can clear empty results, sorting is stable and all navigation retains named peaks/presets
- inventory 1280x720: character slots, no avatar, contextual back
- inventory 844x390: character slots, no avatar, contextual back
- secondary inventory: shared background-free sect return
- secondary library: shared background-free sect return
- secondary forge: shared background-free sect return
- secondary pills: shared background-free sect return
- secondary loadouts: shared background-free sect return
- secondary training: shared background-free sect return
- secondary home: shared background-free sect return
- secondary gate: shared background-free sect return
- secondary tutorial: shared background-free sect return
- secondary tower: shared background-free sect return
