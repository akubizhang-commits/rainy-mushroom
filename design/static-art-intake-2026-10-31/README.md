# 静态素材逐件补齐

2026-10-31用户授权：逐件提供prompt，用户提供图片，验收通过直接接入，保留原图。

本轮核对仙侠模式装备定义与tower-equipment运行时PNG：武器24件已有10件、缺14件；防具25件已有2件、缺23件；戒指25件已有7件、缺18件。共55件缺独立PNG。详情与名称见audit.json。TowerMenu背包和铸器展示使用已有资源白名单，未覆盖项保留通用Graphics形状。18技能图标和TowerStoneArt声明的14项资源均存在，不请求重复制作。本检查不是全游戏每一场景视觉质量审核。

优先补早期防具，第一件eq_armor_chentie衬铁短袍，游戏原描述：短袍内衬缀着薄铁片，外面仍是寻常灰布。下摆留短，方便穿行山道。已检查design文件名和相关说明，未找到对应现成源图。提示词见next-prompt.txt。

接入时遵守物品图标规则：保留原图，scripts/art/item_icon.py导出128px、主体125px；运行--check。核对背包、铸器和图鉴的资源映射与导出需求。当前仅审计和准备提示词，未生成图片或修改运行时。

## 衬铁短袍已完成

详见[chentie/README.md](chentie/README.md)。历史audit.json保留，当前装备缺图54件，其中防具22件。下一件为避尘纱衣。

## 避尘纱衣已完成

已验收并接入，详见[bichen/README.md](bichen/README.md)。下一件云纹道衣eq_armor_yunwen。

## 云纹道衣已完成

已验收接入，见[yunwen/README.md](yunwen/README.md)。下一件厚鳞战袍eq_armor_houlin。

## 厚鳞战袍已完成

验收并接入，见[houlin/README.md](houlin/README.md)。下一件流风法袍eq_armor_liufeng。

## 流风法袍已完成

验收并接入，见[liufeng/README.md](liufeng/README.md)。下一件凝露长衣eq_armor_ninglu。

## 凝露长衣已完成

验收接入记录见[ninglu/README.md](ninglu/README.md)。下一件伏山玄衣eq_armor_fushan。

## 伏山玄衣已完成

验收接入记录见[fushan/README.md](fushan/README.md)。下一件挡雨灵衣eq_armor_dangyu。

## 挡雨灵衣已完成

验收接入记录见[dangyu/README.md](dangyu/README.md)。下一件eq_armor_shouyi。

## 守一法衣已完成

验收接入记录见[shouyi/README.md](shouyi/README.md)。下一件为镇岳宝衣 eq_armor_zhenyue。

## 镇岳宝衣已完成

透明版验收接入记录见[zhenyue/v2/README.md](zhenyue/v2/README.md)，带棋盘背景首版仍保留。下一件为回澜宝衣 eq_armor_huilan。

## 回澜宝衣已完成

2026-11-02，用户提供原图并授权本地去背后接入，记录见[huilan/README.md](huilan/README.md)。原图、遮罩和导出流程均保留，未使用 Scenario 付费额度。

## 明澈法衣已完成

2026-11-02，验收及本地去背接入记录见[mingche/README.md](mingche/README.md)。原图和遮罩保留，无 Scenario 付费调用。

## 灵犀剑已完成

2026-11-02，优先补炼器／抽奖缺图，灵犀剑验收、本地去背和接入记录见[lingxi/README.md](lingxi/README.md)。原图保留，无 Scenario 付费调用。

## 照胆剑已完成

2026-11-02，验收与本地去背接入记录见[zhaodan/README.md](zhaodan/README.md)。下一件为法器极品定岳剑eq_sword_dingyue，继续优先补炼器／抽奖缺图。

## 定岳剑已完成

2026-11-02，验收与本地去背接入记录见[dingyue/README.md](dingyue/README.md)。下一件为切玉玄戒eq_ring_shoudan，法器上品。

## 切玉玄戒已完成

2026-11-02，验收与本地去背接入记录见[shoudan/README.md](shoudan/README.md)。下一件为贯虹碧戒eq_ring_huichun，法器上品。

## 贯虹碧戒已完成

2026-11-02，验收与本地去背接入记录见[huichun-ring/README.md](huichun-ring/README.md)。下一件破妄宝戒eq_ring_changning，法器极品。

## 破妄宝戒已完成

2026-11-02，验收与本地去背接入记录见[changning/README.md](changning/README.md)。现行法器装备独立PNG已补齐；下一件为宝器下品听雨剑eq_sword_tingyu，继续优先炼器／抽奖缺图。

### 听雨剑（2026-11-02）
用户蓝柄长剑验收通过，本机去背后接入 eq_sword_tingyu 的128px装备图与512px图鉴图。原图保留，无付费调用。图标规范、图鉴10项测试与web-mobile构建通过；下一张补宝器下品逐风剑，见 tingyu/next-prompt.txt。

### 逐风剑（2026-11-02）
用户冰蓝流光长剑验收通过，本机去背后接入 eq_sword_zhufeng 的128px装备图与512px图鉴图。原图保留，无付费调用。图标规范、图鉴10项测试与web-mobile构建通过；下一张补宝器下品镇岳剑，见 zhufeng/next-prompt.txt。

### 镇岳剑（2026-11-02）
用户古朴巨剑验收通过，本机去背后接入 eq_sword_zhenyue 的128px装备图与512px图鉴图。原图保留，无付费调用。图标规范、图鉴10项测试与web-mobile构建通过；下一张补宝器下品护脉战衣，见 zhenyue-sword/next-prompt.txt。

### 护脉战衣（2026-11-02）
用户分层战袍验收通过，本机去背后接入 eq_armor_humai 的128px装备图与512px图鉴图。原图保留，无付费调用。图标规范、图鉴10项测试与web-mobile构建通过；下一张补宝器下品凌刃朱戒，见 humai/next-prompt.txt。

### 凌刃朱戒（2026-11-02）
用户朱红镶银戒指验收通过，本机去背后接入 eq_ring_xuxi 的128px装备图与512px图鉴图。原图保留，无付费调用。图标规范、图鉴10项测试与web-mobile构建通过；下一张补宝器下品逐刃玄戒，见 xuxi-ring/next-prompt.txt。

### 逐刃玄戒（2026-11-02）
用户暗钢羽翼纹饰戒指验收通过，本机去背后接入 eq_ring_huming 的128px装备图与512px图鉴图。原图保留，无付费调用。89张图标、73张图鉴规范检查、图鉴10项测试及web-mobile构建通过，打包RGBA一致。下一张补宝器中品青霄剑，见 huming-ring/next-prompt.txt。

### 青霄剑（2026-11-02）
用户冷峻蓝钢幻想长剑验收通过，本机去背后接入 eq_sword_qingxiao 的128px装备图与512px图鉴图。原图保留，无付费调用。90张图标、74张图鉴规范检查、图鉴10项测试及web-mobile构建通过，打包RGBA一致。下一张补宝器中品流霞剑，见 qingxiao/next-prompt.txt。

### 流霞剑（2026-11-02）
用户斜映霞光的古典长剑验收通过，本机去背后接入 eq_sword_liuxia 的128px装备图与512px图鉴图。原图保留，无付费调用。91张图标、75张图鉴规范检查、图鉴10项测试及web-mobile构建通过，打包RGBA一致。下一张补宝器中品玄钧剑，见 liuxia/next-prompt.txt。

### 玄钧剑（2026-11-02）
用户暗灰背景下的古典青铜长剑验收通过，本机去背并修复暗部误抠后接入 eq_sword_xuanjun 的128px装备图与512px图鉴图。原图及初次去背版本保留，无付费调用。92张图标、76张图鉴规范检查、图鉴10项测试及web-mobile构建通过，打包RGBA一致。下一张补宝器中品净波长袍，见 xuanjun/next-prompt.txt。

### 净波长袍（2026-11-02）
用户幽蓝涟漪长袍验收通过，本机去背后接入 eq_armor_jingbo 的128px装备图与512px图鉴图。原图保留，无付费调用。93张图标、77张图鉴规范检查及web-mobile构建通过，打包RGBA一致；图鉴测试9/10通过，既有戒指文案断言不匹配，详见 jingbo/README.md。下一张补宝器中品洞锋玉戒，见 jingbo/next-prompt.txt。

### 洞锋玉戒（2026-11-02）
用户白玉偏心孔戒指验收通过，本机去背并修复小孔透明后接入 eq_ring_hanyuan 的128px装备图与512px图鉴图。原图及初次处理版本保留，无付费调用。94张图标、78张图鉴规范检查及web-mobile构建通过，打包RGBA一致；图鉴测试9/10，护甲文案断言不匹配，详见 hanyuan-ring/README.md。下一张补宝器中品透隙玄戒，见 hanyuan-ring/next-prompt.txt。

### 透隙玄戒（2026-11-02）
第二版验收通过，第一版保留于guizhen-ring/review-01。第二版本机去背接入eq_ring_guizhen，95张图标、79张图鉴规范检查和web-mobile构建通过，打包RGBA一致；图鉴测试8/10，戒指及护甲效果文案断言不匹配。下一张含光剑，详见guizhen-ring/README.md及next-prompt.txt。

### 含光剑（2026-11-02）
用户浅银墨绿柄长剑验收通过，本机去背接入eq_sword_hanguang。96张图标、80张图鉴规范检查和web-mobile构建通过，打包RGBA一致；图鉴测试8/10，戒指及护甲效果文案断言不匹配。下一张断流剑，详见hanguang/README.md及next-prompt.txt。

### 断流剑（2026-11-02）
用户冷钢蓝柄宽刃长剑验收通过，本机去背接入eq_sword_duanliu。97张图标、81张图鉴规范检查、图鉴10项测试和web-mobile构建通过，打包RGBA一致。下一张合川剑，详见duanliu/README.md及next-prompt.txt。

### 合川剑（2026-11-02）
用户暖钢灰铜柄宽刃剑验收通过，本机去背接入eq_sword_hechuan。98张图标、82张图鉴规范检查及web-mobile构建通过，打包RGBA一致；图鉴测试7/10，三项现有装备属性/文案断言不匹配，素材引用通过。下一张金锁灵衣，详见hechuan/README.md及next-prompt.txt。

### 金锁灵衣（2026-11-03）
用户玄黑暗金锁纹灵衣验收通过，本机去背接入eq_armor_jinsuo。99张图标、83张图鉴规范检查及web-mobile构建通过，打包RGBA一致；图鉴测试7/10，丹药来源、戒指冷却属性及护甲文案断言不匹配，素材引用通过。未真机验收。下一张凝锐宝戒，详见jinsuo/README.md与next-prompt.txt。

### 凝锐宝戒（2026-11-03）
用户深青宝石素银戒指验收通过，本机去背接入eq_ring_ningyuan。100张图标、84张图鉴规范检查及web-mobile构建通过，打包RGBA一致；图鉴测试7/10，丹药来源、戒指冷却属性及护甲文案断言不匹配，素材引用通过。未真机验收。下一张惊锋灵戒，详见ningyuan-ring/README.md与next-prompt.txt。

### 惊锋灵戒（2026-11-03）
用户深色银棱戒指验收通过，本机去背接入eq_ring_bujing。101张图标、85张图鉴规范检查及web-mobile构建通过，打包RGBA一致；图鉴测试7/10，丹药来源、戒指冷却属性及护甲文案断言不匹配，素材引用通过。未真机验收。宝器上品装备图已齐，下一张玉衡道袍（宝器极品），详见bujing-ring/README.md与next-prompt.txt。

### 玉衡道袍（2026-11-03）
用户青蓝双玉扣星纹道袍验收通过，本机去背接入eq_armor_yuheng。102张图标、86张图鉴规范检查及web-mobile构建通过，打包RGBA一致；图鉴测试7/10，丹药来源、戒指冷却属性及护甲文案断言不匹配，素材引用通过。未真机验收。下一张剑鸣灵戒（宝器极品），详见yuheng/README.md与next-prompt.txt。
