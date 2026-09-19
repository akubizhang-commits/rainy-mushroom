# 场景与菌物扩充（2026-09-14）

当前3D版本为4个生态分区、12处场景、41种菌物。旧2D原型的8处场景数据保留；3D菜单、预览、通关和新存档统一使用 foragingScenes 的12处目录。新增场景不复用旧场景ID，也不会继承旧场景的完成状态。

## 新场景

| 场景 | 设计与寻找区别 | 菌种名录 |
| --- | --- | --- |
| 山脊疏松林 | 林木减少、岩脊起伏、较干燥的地表色调；偏向土生菌 | 16 |
| 苔藓桦木林 | 厚苔色调、增加倒木、桦木基质；偏向木生菌 | 23 |
| 溪湾腐木地 | 较开阔的林岸、更多腐木；木生菌留在可达河岸 | 16 |
| 栎林草坡 | 稀疏栎树、缓坡和林草交界；偏向地面菌物 | 18 |

同类环境可共享物种，但新场景对目标基质使用1.6倍抽取权重，稀有度和鉴别解锁门槛仍生效。权重是游戏设计，不代表野外出现率。每局仍10朵、采满8朵通关；没有把增加图鉴种类混同为增加单局点击负担。场景列表每页两张大预览，翻页后返回保留原页。

## 新菌种与依据

| 菌种 | 主要游戏生境 | 核对资料 |
| --- | --- | --- |
| 野蘑菇 Agaricus campestris | 草地、林缘 | https://www.mushroomexpert.com/agaricus_campestris.html |
| 松乳菇 Lactarius deliciosus | 有松树的针叶和混交林 | https://www.first-nature.com/fungi/lactarius-deliciosus.php |
| 高大环柄菇 Macrolepiota procera | 林间空地、林缘、草地 | https://www.first-nature.com/fungi/macrolepiota-procera.php |
| 毛柄金钱菌 Flammulina velutipes | 凉冷林地、河谷的阔叶木 | https://www.mushroomexpert.com/flammulina_velutipes.html |
| 裂褶菌 Schizophyllum commune | 阔叶枯枝与倒木 | https://www.mushroomexpert.com/schizophyllum_commune.html |
| 羊肚菌（狭义）Morchella esculenta | 阔叶林土壤、河谷、林缘 | https://www.first-nature.com/fungi/morchella-esculenta.php |
| 网纹秃马勃 Lycoperdon utriforme | 草地、山地牧场 | https://www.mycodb.fr/fiche.php?genre=Calvatia&espece=utriformis |
| 桦乳菇 Lactarius torminosus | 桦木根际 | https://www.first-nature.com/fungi/lactarius-deliciosus.php （近似种对照） |

MycoDB 对网纹秃马勃的生境列出干草地与山地牧场，因此高寒草甸名录从1种增加到2种。另曾核对 Calvatia / Lycoperdon turneri（https://redlist.info/iucn/species_view/127553/），但未找到满足本轮条件的实拍照片，因此未加入游戏，也未将未确认的亚洲分布当成事实。

以上是全球生境参考，不是原有内部ID中省份缩写所指地区的分布调查。照片依据来源平台的鉴定记录，不将玩家答题作为现实物种鉴定。季节性只记录于知识说明，本轮未新增季节模拟。

## 素材与兼容性

8种新菌物各有2张实拍，总计新增16张，扩展照片共56张。逐图作者、许可、观察链接、来源学名与校验见 assets/exploration/catalogue-photos/ATTRIBUTION.json。筛除紫外灯照片，新增图使用CC BY或CC0；首批13种的原照片许可不因此改变。

新增羊肚菌蜂窝状盖、高大环柄菇长柄与菌环、毛柄金钱菌簇生模型。四个新场景均使用实际引擎渲染的预览图。

旧收藏、场景发现、通关记录保留；新增场景从未完成开始，新场景雨滴章也可持久化。物种池变大后增加地面候选保底和遮盖保底，避免木生菌占比增加导致拨开落叶玩法消失。树木与倒木承载位置避让路线，河谷木生菌不放到不可达的对岸。
