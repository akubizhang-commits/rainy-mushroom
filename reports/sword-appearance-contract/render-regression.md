# 三装备渲染回归 · 2026-10-27

验证实际 SurvivorBattleArt.sync，使用真实 SurvivorRun 和模块、轻量 Cocos 节点/资源替身；没有 GPU 或浏览器图像验收。

- 素问：235,250,255；青霄：135,235,245；镇岳：255,207,130。
- 顺序为素问→青霄→镇岳→无装备→青霄，跨局复用同一个显示节点，颜色无残留。
- 未知ID、__proto__、constructor回退默认色；这些是直接注入的防御性表现夹具，正式装备入口仍拒绝未知ID。
- 角色与脚下御剑仍使用完整v7形象，frame、位置、镜像、倾斜、颜色保持相同；资源加载列表不变。
- sync不改变run快照，销毁后资源引用归零。

运行：`node --test tests/survivor-hover-independent.test.mjs tests/survivor-sword-appearance.test.mjs`
结果：16通过、0失败（其中本轮新增2项）。没有修改运行时代码，因此未重复构建。

未覆盖：真实浏览器宗门换装操作、独立手持武器节点、手指遮挡和挥剑动画；后两者尚未实现，不由此测试推断通过。
