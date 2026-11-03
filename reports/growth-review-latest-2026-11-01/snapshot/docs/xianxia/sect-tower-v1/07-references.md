# 题材与开源参考

查询日期：2026-10-27。以下区分作品中可确认的内容、本项目原创提案与可借鉴技术。没有复制或安装这些项目，也没有下载小说/动画素材。

## 修仙题材

1. 《凡人修仙传》英译站 Wuxiaworld，第268章 White Spider、第269章 Blood Red：
   - https://www.wuxiaworld.com/novel/rmji/rmji-chapter-268
   - https://www.wuxiaworld.com/novel/rmji/rmji-chapter-269
   - 本次可读内容是章节预览，不声称读完全文。269章预览可确认白色蜘蛛、蛛网和扑击的描写。
   - 借鉴：动物/异虫保留本体特性，再把蛛网、扑击做成可躲技能。并不能据此断言“铁鬃妖猪/青风妖狼/盘丝蛛后”是原著名字。
2. 《一念永恒》Wuxiaworld 译者整理的术语表：
   - https://www.wuxiaworld.com/novel/a-will-eternal/awe-glossary
   - 可确认宗门人物、战兽、凤凰、擅长虫道及炼药的人物等条目。
   - 借鉴：宗门与丹、兽等修行分工能支撑功能建筑和同行伙伴；不照搬其门派、人物与战兽形象。
3. 本项目拟定的“栖云宗、丹鼎阁、天工坊、灵符堂”与08号妖兽表均属提案，没有所谓所有修仙小说统一的建筑名。没有检索到可验证的统一热门排行，因此不声称这些名称是当前最热门作品的标准设定。

小说文字不是现成模型规格。美术以真实猪、狼、蛛、虎的可识别解剖轮廓为基础，再原创妖化；不从影视截图抠图当商用怪物。

## 开源/公开技术参考

| 来源 | 可参考内容 | 本项目采用判断 |
|---|---|---|
| Godot官方demo，https://github.com/godotengine/godot-demo-projects | 2D、GUI、移动端等独立演示；仓库提供对应版本分支 | 借鉴演示组织、输入/动画验证场景的划分，不因此将Cocos项目换成Godot |
| Godot demo许可，https://github.com/godotengine/godot-demo-projects/blob/master/LICENSE.md | 仓库MIT许可 | 实际复用时保存许可与版权声明，并核对具体资源的单独声明；本轮未复用 |
| Cocos官方公开范例，https://github.com/cocos/cocos-example-projects | 原生交互、npm、遮挡查询、3D物理、protobuf等功能案例 | 仅作工程样例，不能说是现成宗门、塔防或抽装备系统；本次页面未确认仓库根许可，不直接复制代码 |

结论：当前已有确定性战斗、对象池、装备事务与Cocos宿主，复用本地实现的代价低于另起引擎。公开范例可辅助专项验证，但本次没有找到并验证一套可直接替代“宗门＋九层清怪＋双抽池”的完整开源方案，不以不相干模板冒充现成答案。
