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

### 剑鸣灵戒（2026-11-04）
用户青灰弦纹宽环验收通过，本机去背接入eq_ring_jingshui。103张图标、87张图鉴规范检查及web-mobile构建通过，打包RGBA一致；图鉴测试7/10，丹药来源、戒指冷却属性及护甲文案断言不匹配，素材引用通过。未真机验收。下一张照玄宝戒（宝器极品），详见jingshui-ring/README.md与next-prompt.txt。

### 照玄宝戒（2026-11-04）
用户墨玉流纹银戒验收通过，本机去背接入eq_ring_weiming。104张图标、88张图鉴规范检查通过；web-mobile首次因缺失polyfills失败，原样重跑成功，打包RGBA一致。图鉴测试7/10，丹药来源、戒指冷却属性及护甲文案断言不匹配，素材引用通过。未真机验收。下一张澄明剑（宝器极品），详见weiming-ring/README.md与next-prompt.txt。

### 澄明剑（2026-11-04）
用户浅银青玉直剑验收通过，本机去背接入eq_sword_chengming。105张图标、89张图鉴规范检查及web-mobile构建通过，打包RGBA一致；图鉴测试7/10，丹药来源、戒指冷却属性及护甲文案断言不匹配，素材引用通过。未真机验收。下一张昆吾剑（宝器极品），详见chengming/README.md与next-prompt.txt。

### 昆吾剑（2026-11-04）
用户钢灰古铜柄直剑验收通过，修复Vision误抠的深色剑脊并接入eq_sword_kunwu，首次处理保留。106张图标、90张图鉴规范检查及web-mobile构建通过，打包RGBA一致；图鉴测试7/10，既有丹药与装备文案断言不匹配，素材引用通过。未真机验收。宝器装备图已齐，下一张盘石宝袍（灵器下品），详见kunwu/README.md与next-prompt.txt。

### 盘石宝袍第一版（2026-11-04）
需修改，未接入。岩板式纹理、下摆大石块及额外腰坠不符合布袍与单枚小型磨圆石片的方向。原图及修订提示保留于panshi/review-01/。

### 盘石宝袍第二版（2026-11-04）
第二版验收通过，本机去背接入eq_armor_panshi，第一版保留。107张图标、91张图鉴规范检查及web-mobile构建通过，打包RGBA一致；图鉴测试7/10，既有丹药与装备文案断言不匹配，素材引用通过。未真机验收。下一张雾隐法衣（灵器下品），详见panshi/README.md与next-prompt.txt。
### 青锋剑（2026-11-05）
用户铁灰方护手长剑验收通过，原图自带透明，仅清alpha噪点后接入eq_sword_qingfeng的128px装备图、512px图鉴图及手持图。109张图标、92张图鉴规范检查、图鉴与手持图测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。缺口复核见audit-2026-11-05.md；下一张雾隐法衣，详见qingfeng/README.md与next-prompt.txt。
### 雾隐法衣（2026-11-05）
用户灰白层叠宽袖长袍验收通过，本机Vision去背接入eq_armor_wuyin。110张图标、93张图鉴规范检查、图鉴与手持图测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张断岳玉戒，详见wuyin/README.md与next-prompt.txt。
### 断岳玉戒（2026-11-05）
用户苍青灰玉分岭山纹戒指验收通过，本机Vision去背接入eq_ring_taihe。111张图标、94张图鉴规范检查、图鉴与手持图测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张观隙法戒，详见taihe-ring/README.md与next-prompt.txt。
### 观隙法戒（2026-11-05）
用户深灰岩纹银缝金属戒验收通过，本机Vision去背接入eq_ring_guiyuan。112张图标、95张图鉴规范检查、图鉴与手持图测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张望舒剑，详见guiyuan/README.md与next-prompt.txt。
### 望舒剑（2026-11-05）
用户月白银刃弯月护手长剑验收通过，本机Vision去背接入eq_sword_wangshu的装备图、图鉴图和角色手持图；青锋剑手持护手点同步按既有约定校正。113张图标、96张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致；两把剑真实Cocos双横屏64姿态、4次模拟和角色信息页通过。未真机验收。下一张碧落剑，详见wangshu/README.md与next-prompt.txt。
### 碧落剑（2026-11-05）
用户碧玉剑格雪亮长剑验收通过，本机Vision去背并清除剑首圆环内残留底色，接入eq_sword_biluo装备图、图鉴图与角色手持图。114张图标、97张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏32姿态、2次模拟和角色信息页通过。未真机验收。下一张七曜剑，详见biluo/README.md与next-prompt.txt。
### 七曜剑（2026-11-05）
用户铜钉圆盘剑格红柄长剑验收通过，本机Vision去背接入eq_sword_qiyao装备图、图鉴图与角色手持图。115张图标、98张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏32姿态、2次模拟和角色信息页重跑通过（首跑超时，无错误）。未真机验收。下一张不动宝衣，详见qiyao/README.md与next-prompt.txt。
### 不动宝衣（2026-11-05）
用户秋香色玄黑回纹长衣验收通过，本机Vision去背接入eq_armor_budong。116张图标、99张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张太素玄衣，详见budong/README.md与next-prompt.txt。
### 太素玄衣（2026-11-05）
用户象牙生丝玄衬长衣验收通过，本机Vision去背接入eq_armor_taisu。117张图标、100张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张析芒法戒，详见taisu/README.md与next-prompt.txt。
### 析芒法戒（2026-11-05）
用户香槟金扇形薄晶戒指验收通过，本机Vision去背接入eq_ring_shouzhen。118张图标、101张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张烛微宝戒，详见shouzhen/README.md与next-prompt.txt。
### 烛微宝戒（2026-11-06）
用户乌银包镶琥珀明晶戒指验收通过，本机Vision去背接入eq_ring_chengshen。119张图标、102张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张惊鸿剑，详见chengshen/README.md与next-prompt.txt。
### 惊鸿剑（2026-11-06）
用户两版银羽展翼长剑中选用羽纹更清楚的第1版，第2版保留于jinghong/candidates。本机Vision去背接入eq_sword_jinghong装备图、图鉴图与角色手持图。120张图标、103张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏32姿态、2次模拟和角色信息页通过。未真机验收。下一张霄汉剑，详见jinghong/README.md与next-prompt.txt。
### 霄汉剑（2026-11-06）
用户深靛星河长剑验收通过，本机Vision去背接入eq_sword_xiaohan装备图、图鉴图与角色手持图。121张图标、104张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏32姿态、2次模拟和角色信息页通过。未真机验收。下一张天枢剑，详见xiaohan/README.md与next-prompt.txt。
### 天枢剑（2026-11-06）
用户两版北斗星位长剑中选用星位完整7颗的第2版，第1版（6颗）保留于tianshu/candidates。本机Vision去背后补洞并加纯色色键修正剑身空洞，接入eq_sword_tianshu装备图、图鉴图与角色手持图。122张图标、105张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏32姿态、2次模拟和角色信息页通过。未真机验收。下一张星幕灵袍，详见tianshu/README.md与next-prompt.txt。
### 星幕灵袍（2026-11-06）
用户深靛银点长袍验收通过，本机Vision去背接入eq_armor_xingmu。123张图标、106张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张玄素灵衣，详见xingmu/README.md与next-prompt.txt。
### 玄素灵衣（2026-11-06）
用户玄黑无袖褙子罩素白窄袖长衣验收通过，本机Vision去背接入eq_armor_xuansu。124张图标、107张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张裂空宝戒，详见xuansu/README.md与next-prompt.txt。
### 裂空宝戒（2026-11-06）
用户烤蓝钢银锋长裂口戒指验收通过，本机Vision去背接入eq_ring_zhenxin，孔洞与裂口中段透明。125张图标、108张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张追星灵戒，详见zhenxin/README.md与next-prompt.txt。
### 追星灵戒（2026-11-06）
用户玫瑰金环槽银珠戒指验收通过，本机Vision去背接入eq_ring_zhuixing，孔洞透明。126张图标、109张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张玄微剑，详见zhuixing/README.md与next-prompt.txt。
### 玄微剑（2026-11-06）
用户暗紫黑钢银脊圆盘护手长剑验收通过，本机Vision去背接入eq_sword_xuanwei装备图、图鉴图与角色手持图。127张图标、110张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏32姿态、2次模拟和角色信息页通过（首次超时，重跑通过）。未真机验收。下一张逐日剑，详见xuanwei/README.md与next-prompt.txt。
### 逐日剑（2026-11-06）
用户银身金橙剑尖朱柄长剑验收通过，本机Vision去背接入eq_sword_zhuiri装备图、图鉴图与角色手持图。128张图标、111张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏32姿态、2次模拟和角色信息页通过。未真机验收。下一张罗天剑，详见zhuiri/README.md与next-prompt.txt。
### 罗天剑（2026-11-06）
用户古青铜网纹长剑验收通过，本机Vision去背接入eq_sword_luotian装备图、图鉴图与角色手持图。129张图标、112张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏32姿态、2次模拟和角色信息页通过。未真机验收。下一张无垢法衣，详见luotian/README.md与next-prompt.txt。
### 无垢法衣（2026-11-06）
用户纯白立领斜襟盘扣暗花长袍验收通过，本机Vision去背接入eq_armor_wugou。130张图标、113张图鉴规范检查、测试13/13、web-mobile构建通过，打包RGBA一致。未真机验收。下一张澄霄法袍，详见wugou/README.md与next-prompt.txt。
### 澄霄法袍（2026-11-06）
用户白身天蓝渐变下摆、金线领缘长袍验收通过，本机Vision去背接入eq_armor_chengxiao。131张图标、114张图鉴规范检查、测试14/14（首次因另一会话正在改写TowerLore.js失败，写完后重跑通过）、web-mobile构建通过，打包RGBA一致。未真机验收。下一张决锋宝戒，详见chengxiao/README.md与next-prompt.txt。
### 防具设计约定（用户2026-11-06提出）
后续防具（衣服）做得更中性，因为之后可能出男性职业：袍型以直身或略收腰为主，避免紧收腰身配大圆裙摆、过分飘逸的喇叭袖等明显偏女性的轮廓。本批27件中澄霄法袍是最后一件防具。
### 决锋宝戒（2026-11-06）
用户半银半金尖脊戒指验收通过，本机Vision去背接入eq_ring_guyuan，孔洞透明。132张图标、115张图鉴规范检查、测试14/14、web-mobile构建通过，打包RGBA一致。未真机验收。下一张天锋灵戒，详见guyuan/README.md与next-prompt.txt。
### 天锋灵戒（2026-11-07）
用户D形平顶银棱双蓝宝石戒指验收通过，本机Vision去背接入eq_ring_dingwei，孔洞透明。tests/xianxia-library.test.mjs原把该戒写死为缺图示例，已改为检查任一仍缺图的条目。133张图标、116张图鉴规范检查、测试14/14、web-mobile构建通过，打包RGBA一致。未真机验收。下一张照渊剑，详见dingwei/README.md与next-prompt.txt。
### 照渊剑（2026-11-07）
用户墨钢流水纹长剑验收通过，本机Vision去背接入eq_sword_zhaoyuan装备图、图鉴图与角色手持图。134张图标、117张图鉴规范检查、测试14/14、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏32姿态、2次模拟和角色信息页通过，剑尖光点为游戏极品武器光效。未真机验收。下一张太衡剑（本批最后一件），详见zhaoyuan/README.md与next-prompt.txt。
### 太衡剑（2026-11-07）
用户两版长横格方牌篆纹长剑中选用双刃平行、剑首素面的第2版，第1版（楔形剑身、剑首有纹）保留于taiheng/candidates。本机Vision去背接入eq_sword_taiheng装备图、图鉴图与角色手持图（1024×256）。135张图标、118张图鉴规范检查、测试14/14、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏32姿态、2次模拟和角色信息页通过。未真机验收。
### 本批完成（2026-11-07）
audit-2026-11-05.md列出的27件缺图装备全部接入，其中12把剑含角色手持图。兵器与装备已无缺图条目。可选的后续：7种丹药图鉴图可从design/alchemy-2026-10-31/*-intake/master.png本地导出；回灵丹pill_huiling没有原图。全部改动未提交git，未真机验收。
### 7种丹药阅读图（2026-11-07）
用户确认后，从alchemy-2026-10-31各intake已验收透明母版本地导出止血、续命、凝气、合气、养元、真元、紫府的512px丹药录阅读图，无新出图与付费调用。125张阅读图规范检查、测试19/19、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏14个丹药录页面均加载512px图。未真机验收。详见pill-portraits/README.md。
### 回灵丹（2026-11-07发现）
tower-stones/pill_huiling.png与凝气丹pill_ningqi.png字节相同，是借用图，背包与丹药录中两种丹药看起来一样。需新出图后同时替换128px背包图并新增512px阅读图。prompt见huiling-pill/next-prompt.txt。
### 防具设计约定已写入AGENTS.md（2026-11-07）
### 回灵丹（2026-11-07接入）
用户霁蓝长颈银旋涡瓷瓶验收通过，本机Vision去背，替换借用凝气丹的128px背包图并新增512px丹药录图。126张阅读图规范检查、测试19/19、web-mobile构建通过，打包RGBA一致；真实Cocos双横屏丹药录页面通过。未真机验收。至此2026-11-05审计列出的静态素材缺口全部补齐。

## 四档灵石 v2（2026-11-07）
`spirit-stones-v2/`：替换旧版四档灵石运行图（下品青白晶块、中品青绿六棱柱、上品湛蓝双尖、极品紫金多尖），旧图备份于 `previous/`。检查和真实游戏截图通过，见该目录 `verification.json`。
