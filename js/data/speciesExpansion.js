import { CATALOGUE_PHOTO_CREDITS } from './cataloguePhotoCredits.js'
// Habitat teaching catalogue: sources establish ecology, not occurrence in the game's named provinces.
const WT='https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/fungi-and-lichens/'
const BRACKET='https://www.woodlandtrust.org.uk/blog/2021/10/bracket-fungi-identification/'
const row=(id,name,scientificName,rarity,habitats,substrate,host,ecology,description,keyClue,shape,cap,stem,sourceUrl,source='Woodland Trust · 菌物图鉴')=>({
  id,name,scientificName,rarity,habitats,substrate,host,ecology,description,keyClue,
  provinceIds:[],isHighRisk:false,observeOnly:false,expanded:true,
  riskSummary:'参考照片用于游戏学习，不提供现实食用结论。',
  boundary:'近似种可能需要显微或分子鉴定；生境匹配不等于当地分布记录。',
  photos:[0,1].map(i=>`assets/exploration/catalogue-photos/${id}-${i}.jpg`),
  photoCredits:CATALOGUE_PHOTO_CREDITS[id],
  imageKind:'实拍照片',source,sourceUrl,style:{shape,cap,stem}
})
export const EXPANDED_SPECIES=Object.freeze([
 row('boletus-edulis','美味牛肝菌','Boletus edulis',2,['pine','birch','mixed','oak'],'soil','mixed','在针叶或阔叶树附近形成外生菌根，出现在林地土壤中。','褐色厚实菌盖下有菌孔，菌柄粗壮。','菌盖背面是海绵状菌孔，菌柄上部可见浅色网纹。','bolete','#977044','#e0cba0',WT+'penny-bun/'),
 row('cantharellus-cibarius','鸡油菌（狭义）','Cantharellus cibarius',2,['birch','mixed','oak'],'soil','mixed','与林地树木形成菌根，常见于有苔藓的林地。','黄色子实体呈浅漏斗形，边缘常有波浪。','盖下为钝而分叉的脊状褶，沿菌柄向下延伸。','funnel','#d6a72a','#d9b63f',WT+'chanterelle/'),
 row('pleurotus-ostreatus','糙皮侧耳','Pleurotus ostreatus',1,['pine','birch','mixed','river','oak','edge'],'wood','broadleaf','在阔叶树死木、枯干或树桩上重叠生长。','灰褐色至浅灰色扇形菌盖，菌柄偏侧或很短。','菌褶向短柄延伸，多层菌盖从木材侧面长出。','fan','#969080','#dfd8c5',WT+'oyster-mushroom/'),
 row('scleroderma-citrinum','柠檬黄硬皮马勃','Scleroderma citrinum',1,['pine','birch','mixed','oak','edge'],'soil','mixed','出现在林地、荒地与林缘土壤中，可与树木形成菌根。','近球形黄色至黄褐色子实体，外皮粗糙而厚。','没有伞盖和菌褶，厚皮表面有不规则鳞裂。','puffball','#b99c4c','#a58d54',WT+'common-earthball/'),
 row('geastrum-triplex','三重地星','Geastrum triplex',4,['pine','birch','mixed','oak'],'litter','none','在林地富含腐殖质的落叶层中生长。','外层裂成星状托片，中间托着球形孢子囊。','星状外被与球囊之间常出现领圈状结构。','earthstar','#b7a487','#d4c6aa',WT+'collared-earthstar/'),
 row('xylaria-polymorpha','多形炭角菌','Xylaria polymorpha',2,['pine','birch','mixed','river','oak','edge'],'wood','broadleaf','从阔叶树腐木、树桩或埋藏木中长出。','黑色至深灰色棒状子实体常成簇，似短粗手指。','表面粗糙，既无伞盖也无菌褶；幼体颜色可较浅。','club','#393d39','#514e42',WT+'dead-mans-fingers/'),
 row('tremella-mesenterica','黄金银耳','Tremella mesenterica',2,['pine','birch','mixed','river','oak','edge'],'wood','broadleaf','在阔叶枯枝上出现，寄生于其中的伏革菌类。','黄色至橙黄色胶质团，湿润时柔软而褶皱。','子实体由胶质脑状褶片构成，干燥后会收缩。','jelly','#e2b32c','#cba636',WT+'yellow-brain/'),
 row('crucibulum-laeve','白黄小杯菌','Crucibulum laeve',3,['pine','birch','mixed','river','oak','edge'],'wood','mixed','在腐烂枝条、木屑和植物残体上形成小型子实体。','小杯状结构内装着数枚浅色小颗粒。','杯内的“小蛋”是包裹孢子的菌包，不是卵。','nest','#a78455','#c5b083',WT+'common-birds-nest-fungus/'),
 row('sarcoscypha-austriaca','奥地利肉杯菌','Sarcoscypha austriaca',4,['birch','mixed','river','oak'],'wood','broadleaf','出现在潮湿林地的阔叶腐枝上，枝条常被苔藓遮住。','杯内鲜红，外侧较浅，边缘呈不规则圆形。','小杯直接连着腐枝；与近缘红杯菌外观非常接近。','cup','#bf392c','#d9c5a6',WT+'scarlet-elf-cup/'),
 row('fistulina-hepatica','肝色牛排菌','Fistulina hepatica',3,['oak'],'wood','oak','常附生在橡树或栗树的树干基部与木材上。','舌状厚实子实体呈红褐色，表面湿润。','菌盖近圆形至舌状，上表面柔软而黏，可有红色液滴。','fan','#974d36','#d7b99a',BRACKET),
 row('laetiporus-sulphureus','硫磺菌','Laetiporus sulphureus',2,['oak','river','edge'],'wood','oak','在橡树等阔叶树的树干、树桩上形成重叠子实体。','宽厚扇形菌盖有鲜黄至橙黄色边缘。','层叠菌盖的下表面布满细孔，不具有放射状菌褶。','fan','#dca23d','#e4c44a',BRACKET),
 row('grifola-frondosa','灰树花','Grifola frondosa',3,['oak'],'wood','oak','多在橡树基部形成大簇子实体。','许多灰褐色小扇形菌盖，从共同基部层层分枝。','多个小扇盖连成球状花簇，通常从橡树基部长出。','fan','#8c8270','#d3c9b2',BRACKET),
 row('fomes-fomentarius','木蹄层孔菌','Fomes fomentarius',2,['birch','mixed','river'],'wood','birch','常在桦木等阔叶树干上形成多年生木质子实体。','灰色至灰褐色，外形像马蹄，表面有生长带。','质地坚硬，下面为孔面，多年生长形成分层。','hoof','#8a887a','#c5bca1',BRACKET),
 row('fomitopsis-betulina','桦剥管菌','Fomitopsis betulina',2,['birch','mixed'],'wood','birch','依赖桦木基质，出现在衰弱或死亡桦树上。','圆厚的浅褐色至灰白色菌盖，边缘圆钝。','菌盖下表面有白色细孔；桦木宿主是重要线索。','hoof','#b6a68b','#e1dac7',BRACKET),
 row('daedaleopsis-confragosa','粗糙拟迷孔菌','Daedaleopsis confragosa',2,['river','birch','mixed'],'wood','broadleaf','生长在柳树等阔叶树的枯干和腐木上。','薄而硬的褐色扇形菌盖，盖面常有环带。','孔面常有拉长或迷宫状的孔，受损时可能变红。','fan','#9b7457','#d4bda5',BRACKET),
 row('laccaria-amethystina','紫蜡蘑','Laccaria amethystina',2,['pine','birch','mixed','oak'],'soil','broadleaf','与橡树、山毛榉等阔叶树形成菌根，在林地土壤中出现。','小型紫色伞菌，干燥时颜色明显变淡。','菌褶较厚而稀疏；紫色会随水分和年龄变化。','round','#806387','#ac87aa','https://www.mushroomexpert.com/laccaria_amethystina.html','MushroomExpert · Michael Kuo 物种图鉴'),
 row('lycoperdon-perlatum','网纹马勃','Lycoperdon perlatum',1,['pine','birch','mixed','oak','edge','meadow'],'litter','none','可在林地、林缘及富含有机质的地面生长。','近梨形的浅色子实体，表面有细小刺状颗粒。','成熟时顶端形成小孔，外层颗粒脱落后留下网状痕迹。','puffball','#e0d8ba','#c8bea0','https://www.mushroomexpert.com/lycoperdon_perlatum.html','MushroomExpert · Michael Kuo 物种图鉴'),
 row('coprinopsis-atramentaria','墨汁鬼伞','Coprinopsis atramentaria',1,['meadow','edge'],'buriedWood','broadleaf','常在埋藏木、树桩附近或富含木质残体的地面成簇出现。','灰色钟形菌盖带放射状沟纹，成熟边缘黑化。','菌盖和菌褶成熟后自溶，形成墨汁状液体。','cone','#8d8980','#ded8c5',WT+'common-inkcap/'),
 row('suillus-luteus','褐环乳牛肝菌','Suillus luteus',2,['pine','birch','mixed'],'soil','pine','与松属树木形成外生菌根，生长在松树附近土壤中。','褐色菌盖潮湿时黏滑，菌柄上有膜质菌环。','盖下为黄色菌孔，结合松树宿主和菌环观察。','bolete','#855d35','#d5b971','https://www.mushroomexpert.com/suillus_luteus.html','MushroomExpert · Michael Kuo 物种图鉴'),
 row('daedalea-quercina','栎迷孔菌','Daedalea quercina',3,['oak'],'wood','oak','常在橡树木材、树桩和枯干上形成木质子实体。','厚实硬质菌盖呈灰褐色，外表有不规则隆起。','盖下孔壁粗宽，形成迷宫一样的沟槽，与细孔菌不同。','hoof','#a18e70','#d0bf98',BRACKET),
 row('agaricus-campestris','野蘑菇','Agaricus campestris',1,['meadow','edge'],'soil','none','腐生于草地、牧场和林缘开阔草坪，可单生或形成菌圈。','白色至浅色菌盖，菌柄上有较薄而易消失的菌环。','菌褶不连接菌柄，随成熟由粉红变为深褐色；不能凭颜色判断食用安全。','round','#dcd8c8','#d2cab4','https://www.mushroomexpert.com/agaricus_campestris.html','MushroomExpert · Michael Kuo'),
 row('lactarius-deliciosus','松乳菇','Lactarius deliciosus',2,['pine','mixed','birch'],'soil','pine','与松树形成菌根，常在针叶林的松针和土壤间出现。','橙色菌盖常见深浅相间的环带，成熟后中央下凹。','菌褶偏橙色，受损可出现橙色乳汁，部分组织会转绿；近似种仍需专业鉴定。','funnel','#cf8541','#c39a58','https://www.first-nature.com/fungi/lactarius-deliciosus.php','First Nature · Pat O’Reilly'),
 row('macrolepiota-procera','高大环柄菇','Macrolepiota procera',2,['oak','edge','meadow'],'litter','none','腐生于林间空地、林缘草地与牧场，单生或散生成群。','展开的伞盖有褐色鳞片与较深中央，菌柄高而纤细。','菌柄有蛇皮样花纹和明显菌环；与外形相近的环柄菇类不能只凭照片区分。','parasol','#b4a084','#bfb096','https://www.first-nature.com/fungi/macrolepiota-procera.php','First Nature · Pat O’Reilly'),
 row('flammulina-velutipes','毛柄金钱菌','Flammulina velutipes',2,['birch','mixed','river','oak','edge'],'wood','broadleaf','常在凉冷季节的阔叶树桩、倒木及受损树木上簇生。','黄褐至橙褐色小菌盖，菌褶较浅，菌柄细长。','菌柄下部可呈深褐至黑色绒毛状；野外外形不同于栽培的细白金针菇。','round','#bf7936','#65452d','https://www.mushroomexpert.com/flammulina_velutipes.html','MushroomExpert · Michael Kuo'),
 row('schizophyllum-commune','裂褶菌','Schizophyllum commune',1,['pine','birch','mixed','river','oak','edge'],'wood','broadleaf','在阔叶枯枝、倒木等木质基物上群生，干燥后可卷缩。','灰白至浅褐色小扇形菌盖，表面有细毛，通常无明显菌柄。','下表面的褶片具有纵向分裂的外观，和细密菌孔不同。','fan','#bdb8a7','#dcd4c1','https://www.mushroomexpert.com/schizophyllum_commune.html','MushroomExpert · Michael Kuo'),
 row('morchella-esculenta','羊肚菌（狭义）','Morchella esculenta',3,['oak','river','edge'],'soil','broadleaf','常见于春季阔叶树附近的土壤，可出现在含钙的林地土中。','黄褐色卵形菌盖有蜂窝状凹坑，下接浅色菌柄。','凹坑由隆起的脊分隔，内部中空；其他羊肚菌和脑状近似菌不能混同。','morel','#a18a52','#d4c4a2','https://www.first-nature.com/fungi/morchella-esculenta.php','First Nature · Pat O’Reilly'),
 row('calvatia-utriformis','网纹秃马勃','Lycoperdon utriforme',1,['alpine','meadow','edge'],'soil','none','腐生于较干燥的草地和山地牧场，常单生或少量成群。','浅色梨形至近球形子实体，基部较宽短，外皮有块状纹理。','表面可见多角形疣块，成熟后顶部较大范围破裂；没有伞盖和菌褶。','puffball','#d3cbb4','#a99d80','https://www.mycodb.fr/fiche.php?genre=Calvatia&espece=utriformis','MycoDB · 物种资料'),
 row('lactarius-torminosus','桦乳菇','Lactarius torminosus',2,['birch'],'soil','birch','与桦树形成菌根，出现在桦木根际及附近落叶层中。','粉红至橙粉色菌盖，盖缘内卷并有明显绒毛。','比较卷曲的毛绒盖缘与桦木宿主，不要与松树旁的橙色乳菇混同。','funnel','#c48c78','#d5b298','https://www.first-nature.com/fungi/lactarius-deliciosus.php','First Nature · 近似种对照')
])
