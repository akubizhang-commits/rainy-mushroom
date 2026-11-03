# 森林冒险设计文档索引与使用顺序

2026-09-22 · 当前运行版 **1.6 十关独立路线试玩**。优先读取[1.6运行合同与验证](../production/first-ten/adventure-v1.6.md)，再读GDD、LDD与素材规范。受伤扣一格并从整关起点重开，覆盖历史检查点/苔窝复活合同。旧1.4/1.5布局、时长目标和测试仅作历史资料。

## 谁负责哪一类规则

1. 用户明确要求优先：单旅人、昆虫尺度、微信横屏、自由一致物理、安全落地重爬、不用断枝与枯叶开风。
2. [游戏PRD](../prd/game-design-prd.md)：世界/角色/物理/HP/恢复/输入总合同；奖励细则委托[奖励册](exploration-rewards-direction.md)，不得各抄一份再独立改值。
3. [关卡PRD](../prd/level-design-prd.md)：十关唯一新区域、路线、汇合、恢复绑定和奖励点位来源。
4. [素材规范](visual-interaction-asset-design.md)：外观/动作/光线/声音/交互表现，不另设玩法数值。
5. [制作入口](../production/first-ten/readiness.md)、[拓扑](../production/first-ten/redesign-topology.json)、[教学](../production/first-ten/tutorials.md)：制作记录保留运行v1.4证据，拓扑已更新为设计v1.5；教学表仍为旧版参考，需随新灰盒更新。
6. [本轮联合评审](../prd/joint-design-review-v1.4-2026-09-21.md)：修订与待验证证据；历史评审不能覆盖现行设计，也不能抹掉实际未解决问题。

没有一个文件可以单凭“已实现”或旧PASS宣称新设计已验收。蓝灰兜帽C身份、真实支撑、镜头避挡、攀爬上下停和存档兼容继续保留；奖励值/槽数/新地图坐标是样板候选。

## 审查覆盖与边界

盘点docs/和design/的全部Markdown，逐条对照现行四类设计、制作输入和近期动作/攀爬证据；历史稿筛查角色、植物、输入、恢复和版本冲突，并加状态标识。历史发布/自然来源列入清单但没有重做法律、渠道、版权或生物学核验。二进制素材、旧照片凭证JSON和运行源码不是此轮设计全文审查范围。

根[README](../../README.md)已修正旧单关/枯枝描述；[工程README](../../cocos-pilot/README.md)是构建入口，[CODEX_HANDOFF](../../CODEX_HANDOFF.md)记录当前工作，[DEBUG_HANDOFF](../../DEBUG_HANDOFF.md)是运行故障史。它们不替代设计规则。

## 逐文件状态

| 文件 | 当前角色 | 使用注意 |
|---|---|---|
| [docs/architecture/archive/cocos-readme-before-forest-v1.4.md](../architecture/archive/cocos-readme-before-forest-v1.4.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/clearing-scene-review.md](../clearing-scene-review.md) | 历史设计/记录 | 蘑菇靠枯枝方案为历史，不应恢复。 |
| [docs/cocos-migration.md](../cocos-migration.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/content-expansion.md](../content-expansion.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/design/archive/exploration-rewards-direction-v0.2.md](archive/exploration-rewards-direction-v0.2.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/design/archive/visual-interaction-asset-design-v1.0.md](archive/visual-interaction-asset-design-v1.0.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/design/archive/visual-interaction-asset-design-v1.1.md](archive/visual-interaction-asset-design-v1.1.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/design/climbing-review-2026-09-21.md](climbing-review-2026-09-21.md) | 专项参考/证据 | 保留日期；当前规则由母文档负责。 |
| [docs/design/exploration-rewards-direction.md](exploration-rewards-direction.md) | 奖励细则 v0.3 | 本轮配套；未实现部分按文中状态。 |
| [docs/design/exploration-rewards-review.md](exploration-rewards-review.md) | 历史设计/记录 | 评审对象固定为归档v0.2，新v0.3见本轮联合评审。 |
| [docs/design/hero-motion-review-2026-09-21.md](hero-motion-review-2026-09-21.md) | 专项参考/证据 | 保留日期；当前规则由母文档负责。 |
| [docs/design/visual-interaction-asset-design.md](visual-interaction-asset-design.md) | 现行素材 v1.2 | 本轮配套；未实现部分按文中状态。 |
| [docs/design/visual-interaction-asset-review-2026-09-21.md](visual-interaction-asset-review-2026-09-21.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/ecological-foraging.md](../ecological-foraging.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/engine-architecture.md](../engine-architecture.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/expedition-experience.md](../expedition-experience.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/field-journal.md](../field-journal.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/forest-art-direction.md](../forest-art-direction.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/forest-controls-ui-review.md](../forest-controls-ui-review.md) | 专项参考/证据 | 保留日期；当前规则由母文档负责。 |
| [docs/forest-physical-interaction-rules.md](../forest-physical-interaction-rules.md) | 专项参考/证据 | 大方向保留；首批可攀型号与恢复规则以GDD为准，不等于所有目标已实现。 |
| [docs/forest-physics-implementation.md](../forest-physics-implementation.md) | 专项参考/证据 | 保留日期；当前规则由母文档负责。 |
| [docs/forest-polish-review.md](../forest-polish-review.md) | 专项参考/证据 | 保留日期；当前规则由母文档负责。 |
| [docs/immersive-habitats.md](../immersive-habitats.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/jumping-and-assets.md](../jumping-and-assets.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/levels/first-ten-levels-implementation.md](../levels/first-ten-levels-implementation.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/levels/first-ten-levels-proposal.md](../levels/first-ten-levels-proposal.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/microforest-playable-assets.md](../microforest-playable-assets.md) | 专项参考/证据 | 保留日期；当前规则由母文档负责。 |
| [docs/playtest/first-ten-2026-09-21.md](../playtest/first-ten-2026-09-21.md) | 专项参考/证据 | 保留日期；当前规则由母文档负责。 |
| [docs/prd/archive/game-design-prd-v1.0.md](../prd/archive/game-design-prd-v1.0.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/prd/archive/game-design-prd-v1.1.md](../prd/archive/game-design-prd-v1.1.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/prd/archive/game-design-prd-v1.2.md](../prd/archive/game-design-prd-v1.2.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/prd/archive/game-design-prd-v1.3.md](../prd/archive/game-design-prd-v1.3.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/prd/archive/level-design-prd-v1.0.md](../prd/archive/level-design-prd-v1.0.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/prd/archive/level-design-prd-v1.1.md](../prd/archive/level-design-prd-v1.1.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/prd/archive/level-design-prd-v1.2.md](../prd/archive/level-design-prd-v1.2.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/prd/archive/level-design-prd-v1.3.md](../prd/archive/level-design-prd-v1.3.md) | 归档 | 保留历史，不参与现行冲突裁决。 |
| [docs/prd/design-revision-v1.3-2026-09-21.md](../prd/design-revision-v1.3-2026-09-21.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/prd/game-design-prd.md](../prd/game-design-prd.md) | 现行规则 v1.4 | 本轮配套；未实现部分按文中状态。 |
| [docs/prd/joint-design-review-2026-09-21.md](../prd/joint-design-review-2026-09-21.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/prd/joint-design-review-v1.4-2026-09-21.md](../prd/joint-design-review-v1.4-2026-09-21.md) | 本轮联合评审 | 本轮配套；未实现部分按文中状态。 |
| [docs/prd/level-design-prd.md](../prd/level-design-prd.md) | 十关设计 v1.5 | 已完成重设计，绝对坐标/灰盒/新关试玩待实现。 |
| [docs/prd/mechanics-review-v1.2-2026-09-21.md](../prd/mechanics-review-v1.2-2026-09-21.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/prd/mechanics-sources-v1.2.md](../prd/mechanics-sources-v1.2.md) | 历史研究/来源 | 外部事实未重核，不用于新增自然事实背书。 |
| [docs/prd/prd-review-2026-09-21.md](../prd/prd-review-2026-09-21.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/prd/prd-review-v1.1-2026-09-21.md](../prd/prd-review-v1.1-2026-09-21.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/production/first-ten/design-validation-v1.4.md](../production/first-ten/design-validation-v1.4.md) | 本轮文档检查 | 本轮配套；未实现部分按文中状态。 |
| [docs/production/first-ten/l01-layout.md](../production/first-ten/l01-layout.md) | 历史设计/记录 | 仅旧v1.3运行尺寸；不能与新A…F/X/Y混用。 |
| [docs/production/first-ten/readiness.md](../production/first-ten/readiness.md) | 现行制作入口 | 本轮配套；未实现部分按文中状态。 |
| [docs/production/first-ten/tuning.md](../production/first-ten/tuning.md) | 现行调参参考 | 本轮配套；未实现部分按文中状态。 |
| [docs/production/first-ten/tutorials.md](../production/first-ten/tutorials.md) | 现行教学候选 | 本轮配套；未实现部分按文中状态。 |
| [docs/production/first-ten/validation.md](../production/first-ten/validation.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/real-mushroom-redesign.md](../real-mushroom-redesign.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/release/account-handoff.md](../release/account-handoff.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/age-and-safety.md](../release/age-and-safety.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/brand-design.md](../release/brand-design.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/identification-fix.md](../release/identification-fix.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/performance-review.md](../release/performance-review.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/photo-rights.md](../release/photo-rights.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/release-candidate.md](../release/release-candidate.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/submission-actions.md](../release/submission-actions.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/submission-draft.md](../release/submission-draft.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/submission-review-2026-09-14.md](../release/submission-review-2026-09-14.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/ui-interaction-review.md](../release/ui-interaction-review.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/wechat-launch-readiness.md](../release/wechat-launch-readiness.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/release/wechat-listing-copy.md](../release/wechat-listing-copy.md) | 历史发布资料 | 非玩法规格；渠道/账号/版权不在本轮重核。 |
| [docs/research/2026-09-18-console-mechanics-shortlist.md](../research/2026-09-18-console-mechanics-shortlist.md) | 历史研究/来源 | 外部事实未重核，不用于新增自然事实背书。 |
| [docs/research/2026-09-18-gameplay-rebuild-research.md](../research/2026-09-18-gameplay-rebuild-research.md) | 历史研究/来源 | 外部事实未重核，不用于新增自然事实背书。 |
| [docs/research/2026-09-19-forest-adventure-playtest.md](../research/2026-09-19-forest-adventure-playtest.md) | 历史研究/来源 | 外部事实未重核，不用于新增自然事实背书。 |
| [docs/river-art-sample.md](../river-art-sample.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/species-knowledge-sources.md](../species-knowledge-sources.md) | 历史研究/来源 | 外部事实未重核，不用于新增自然事实背书。 |
| [docs/species-progression.md](../species-progression.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/spore-jump-design.md](../spore-jump-design.md) | 历史设计/记录 | 保留主动孢子思路，旧独立枯枝/浅沟和返回规则已替代。 |
| [docs/stealth-and-bonus.md](../stealth-and-bonus.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/superpowers/plans/2026-09-19-forest-adventure.md](../superpowers/plans/2026-09-19-forest-adventure.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/superpowers/plans/2026-09-19-microforest-level.md](../superpowers/plans/2026-09-19-microforest-level.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/ui-usability-review.md](../ui-usability-review.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [docs/voxel-exploration.md](../voxel-exploration.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [design/character-directions/README.md](../../design/character-directions/README.md) | 专项参考/证据 | 保留日期；当前规则由母文档负责。 |
| [design/microforest-v1/art-direction.md](../../design/microforest-v1/art-direction.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [design/microforest-v1/character-design.md](../../design/microforest-v1/character-design.md) | 历史设计/记录 | 旧男女选角已被单一C旅人替代。 |
| [design/microforest-v1/image-prompts.md](../../design/microforest-v1/image-prompts.md) | 历史设计/记录 | 旧内容勿重新接入，参考材料仅按新规范取用。 |
| [design/microforest-v1/interactive-props.md](../../design/microforest-v1/interactive-props.md) | 历史设计/记录 | 旧枯枝桥/枯叶开风/自动归位不用于当前设计。 |
| [design/microforest-v1/plant-constraints.md](../../design/microforest-v1/plant-constraints.md) | 历史设计/记录 | 材质经验可参考；旧H指视觉高度，当前统一V可见/H碰撞。 |

本文自身为索引，不另设玩法参数。新增文档先登记版本、状态和唯一规则负责人。
