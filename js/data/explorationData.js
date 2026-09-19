import {COMMERCIAL_PHOTO_CREDITS} from './commercialPhotoCredits.js'
import { EXPANDED_SPECIES } from './speciesExpansion.js'
import { HABITAT_LAYOUTS, PHOTO_SPOTS, habitatAssets } from './habitatLayouts.js'

const PHOTO_ROOT = 'assets/exploration'

const photos = (id) => [
  `${PHOTO_ROOT}/commercial-photos/${id}-0.jpg`,
  `${PHOTO_ROOT}/commercial-photos/${id}-1.jpg`
]

export const RARITY_LABELS = Object.freeze({
  1: '常见',
  2: '少见',
  3: '罕见',
  4: '珍稀'
})

export const RESEARCH_VALUE_LABELS = Object.freeze({
  1: '★',
  2: '★★',
  3: '★★★',
  4: '★★★★'
})

export const LEGACY_SPECIES = Object.freeze([
  {
    id: 'thelephora-ganbajun', name: '干巴菌', scientificName: 'Thelephora ganbajun', rarity: 1,
    provinceIds: ['yunnan'], isHighRisk: false, observeOnly: false,
    ecology: '与云南松等树木形成外生菌根，子实体从松林地表长出。',
    description: '灰黑色分枝状子实体常混在针叶与土粒之间，轮廓近似珊瑚。',
    riskSummary: '近缘种与外观相似种需要专业鉴定，本图鉴不提供食用结论。',
    boundary: '地方利用经验不能代替现实物种鉴定。', photos: photos('thelephora-ganbajun'),
    source: '云南大型真菌多样性研究与种群遗传资料', sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/18957599/',
    style: { cap: '#4b463d', stem: '#746b5b', shape: 'coral' }
  },
  {
    id: 'tricholoma-matsutake', name: '松口蘑', scientificName: 'Tricholoma matsutake', rarity: 3,
    provinceIds: ['yunnan', 'heilongjiang', 'jilin'], isHighRisk: false, observeOnly: true,
    ecology: '依赖适合的针叶树或混交林宿主，子实体常半隐于针叶和腐殖层。',
    description: '浅褐色菌盖、粗壮菌柄与落叶遮挡让它不容易被发现。',
    riskSummary: '全国大型真菌受威胁名录列为易危；游戏中应仅观察记录。',
    boundary: '商品俗名和气味不能排除口蘑属近似种。', photos: photos('tricholoma-matsutake'),
    source: '中国大型真菌受威胁物种名录及菌根研究', sourceUrl: 'https://www.biodiversity-science.net/CN/10.17520/biods.2019174',
    style: { cap: '#a77b55', stem: '#e5d7bd', shape: 'round' }
  },
  {
    id: 'ophiocordyceps-sinensis', name: '冬虫夏草（狭义）', scientificName: 'Ophiocordyceps sinensis', rarity: 4,
    provinceIds: ['yunnan'], isHighRisk: false, observeOnly: true,
    ecology: '见于滇西北高寒草甸，寄生土中蝙蝠蛾科幼虫，地上伸出细长子座。',
    description: '地上部分细小且接近草土颜色，寻找时不能翻挖草甸。',
    riskSummary: '资源与栖息地承受压力；不提供点位、药效或采集指引。',
    boundary: '“虫草”泛称涉及多种虫生真菌，照片不能完成狭义种鉴定。', photos: photos('ophiocordyceps-sinensis'),
    source: '青藏高原及周缘分布和资源保护研究', sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6053348/',
    style: { cap: '#58412d', stem: '#7c5b3c', shape: 'club' }
  },
  {
    id: 'amanita-exitialis', name: '致命鹅膏', scientificName: 'Amanita exitialis', rarity: 3,
    provinceIds: ['yunnan'], isHighRisk: true, observeOnly: false,
    ecology: '云南热带、亚热带阔叶林地表的外生菌根型真菌。',
    description: '白色伞菌外形可能与多种鹅膏及其他菌类相似，基部结构很关键。',
    riskSummary: '致死级摄入风险，可造成延迟出现的严重肝损伤。',
    boundary: '仅凭白色菌盖、菌环或菌托不能可靠完成现实鉴定。', photos: photos('amanita-exitialis'),
    source: '中国疾控与中国致命鹅膏分类资料', sourceUrl: 'https://weekly.chinacdc.cn/fileCCDCW/journal/article/ccdcw/2020/2/PDF/2002S1-S3.pdf',
    style: { cap: '#eee9dc', stem: '#e8e3d6', shape: 'umbrella' }
  },
  {
    id: 'amanita-muscaria', name: '毒蝇鹅膏', scientificName: 'Amanita muscaria', rarity: 1,
    provinceIds: ['heilongjiang'], isHighRisk: true, observeOnly: false,
    ecology: '可与松科、桦木科树木形成外生菌根，适合北方针阔混交林。',
    description: '红色菌盖常有白色疣粒，但雨水可能让疣粒脱落。',
    riskSummary: '高风险有毒种，摄入可能引起意识和行为异常等神经症状。',
    boundary: '“红帽白点”不是可靠的现实鉴定规则。', photos: photos('amanita-muscaria'),
    source: '黑龙江省级材料记录与毒理资料', sourceUrl: 'https://www.gbif.org/occurrence/3990255141',
    style: { cap: '#ba4338', stem: '#eee2ca', shape: 'umbrella', spots: true }
  },
  {
    id: 'coprinus-comatus', name: '毛头鬼伞', scientificName: 'Coprinus comatus', rarity: 1,
    provinceIds: ['heilongjiang'], isHighRisk: false, observeOnly: false,
    ecology: '常见于富含有机质的扰动土、草地与道路边缘。',
    description: '幼时菌盖细长带鳞片，成熟后边缘逐渐自溶成墨汁状。',
    riskSummary: '道路边标本可能接触污染物；本图鉴不提供食用判断。',
    boundary: '不同成熟阶段外观差异很大，单张照片不足以确证。', photos: photos('coprinus-comatus'),
    source: '黑龙江公开观察与城市土壤研究', sourceUrl: 'https://www.gbif.org/occurrence/search?country=CN&state_province=Heilongjiang&taxon_key=7987658',
    style: { cap: '#d9d7cf', stem: '#eee9df', shape: 'cone' }
  },
  {
    id: 'pleurotus-citrinopileatus', name: '金顶侧耳', scientificName: 'Pleurotus citrinopileatus', rarity: 2,
    provinceIds: ['heilongjiang'], isHighRisk: false, observeOnly: false,
    ecology: '在阔叶树倒木、老树桩或腐木上成簇生长。',
    description: '黄色扇形菌盖层层簇生，菌柄偏侧生。',
    riskSummary: '黄色与簇生外观不能排除其他木生菌，本图鉴不提供食用结论。',
    boundary: '省内历史标本记录不能代表当前全省丰度。', photos: photos('pleurotus-citrinopileatus'),
    source: '黑龙江保存标本与侧耳属资料', sourceUrl: 'https://www.gbif.org/occurrence/1990317241',
    style: { cap: '#e0b83f', stem: '#e8d8a8', shape: 'fan' }
  },
  {
    id: 'trametes-versicolor', name: '云芝', scientificName: 'Trametes versicolor', rarity: 1,
    provinceIds: ['jilin', 'liaoning'], isHighRisk: false, observeOnly: false,
    ecology: '附着于阔叶树倒木、枯枝和树桩，参与木材分解。',
    description: '薄扇形菌盖呈多层环带，常在潮湿腐木上重叠生长。',
    riskSummary: '与其他栓菌相似，照片无法替代显微或分子鉴定。',
    boundary: '图鉴只说明生态角色，不提供摄入用途。', photos: photos('trametes-versicolor'),
    source: '吉林分子凭证与辽宁公开观察', sourceUrl: 'https://www.ncbi.nlm.nih.gov/nuccore/PX411574',
    style: { cap: '#776a5e', stem: '#b6aa98', shape: 'fan' }
  },
  {
    id: 'hericium-erinaceus', name: '猴头菌', scientificName: 'Hericium erinaceus', rarity: 3,
    provinceIds: ['jilin'], isHighRisk: false, observeOnly: true,
    ecology: '生于老龄、受伤或死亡阔叶树的树干、大枝与腐木。',
    description: '白色至乳黄色子实体悬垂许多柔软长刺，常藏在树洞附近。',
    riskSummary: '野生观察频率不能由栽培商品常见度推断，稀有记录应留在原地。',
    boundary: '可能与同属珊瑚状种类混淆。', photos: photos('hericium-erinaceus'),
    source: '吉林长白山保存标本记录', sourceUrl: 'https://www.gbif.org/occurrence/2640624539',
    style: { cap: '#eadfbd', stem: '#cdbf9d', shape: 'tooth' }
  },
  {
    id: 'amanita-pallidorosea', name: '淡红鹅膏', scientificName: 'Amanita pallidorosea', rarity: 3,
    provinceIds: ['jilin'], isHighRisk: true, observeOnly: false,
    ecology: '吉林阔叶林地表的外生菌根真菌。',
    description: '浅色至淡粉色菌盖会随环境和成熟阶段变化。',
    riskSummary: '含鹅膏肽类风险，可造成严重肝损伤并可能致命。',
    boundary: '幼体及浅色型与多种菌类相似，不可凭图排除风险。', photos: photos('amanita-pallidorosea'),
    source: '致死鹅膏系统学论文与吉林凭证序列', sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4094918/',
    style: { cap: '#d9aca4', stem: '#e9ddd0', shape: 'umbrella' }
  },
  {
    id: 'armillaria-gallica', name: '高卢蜜环菌', scientificName: 'Armillaria gallica', rarity: 1,
    provinceIds: ['liaoning'], isHighRisk: false, observeOnly: false,
    ecology: '在辽东阔叶林的衰弱木根部、树桩、埋藏木与腐木附近出现。',
    description: '黄褐色至蜜色菌盖常成簇，地下木质基质可能不易看见。',
    riskSummary: '蜜环菌属是复杂类群，宏观外观不能支持现实种级鉴定。',
    boundary: '“蜜环菌”泛称不构成食用或安全结论。', photos: photos('armillaria-gallica'),
    source: '辽宁分子记录与中国种群研究', sourceUrl: 'https://www.ncbi.nlm.nih.gov/nuccore/MT674211',
    style: { cap: '#a9824e', stem: '#d7c49e', shape: 'round' }
  },
  {
    id: 'amanita-caesareoides', name: '拟橙盖鹅膏', scientificName: 'Amanita caesareoides', rarity: 3,
    provinceIds: ['liaoning'], isHighRisk: false, observeOnly: true,
    ecology: '辽东山地落叶阔叶林土壤中的外生菌根真菌。',
    description: '橙红菌盖在落叶间显眼，但幼体和褪色个体不容易判断。',
    riskSummary: '鹅膏属包含致命近似种，游戏不展示食用属性。',
    boundary: '中文名仍需发布前按权威名录复核。', photos: photos('amanita-caesareoides'),
    source: '鹅膏科系统学论文与辽宁凭证', sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10539691/',
    style: { cap: '#d66b32', stem: '#ebd9a7', shape: 'umbrella' }
  },
  {
    id: 'lepiota-brunneoincarnata', name: '肉褐鳞环柄菇', scientificName: 'Lepiota brunneoincarnata', rarity: 3,
    provinceIds: ['liaoning'], isHighRisk: true, observeOnly: false,
    ecology: '可见于林缘草地、草坪或富含腐殖质的土壤。',
    description: '小型鳞伞状子实体容易被草叶遮挡，褐色鳞片与多种小型伞菌重叠。',
    riskSummary: '致死级摄入风险，可引起延迟性严重肝损伤。',
    boundary: '肉眼识别风险极高，不能因体型小而降低警惕。', photos: photos('lepiota-brunneoincarnata'),
    source: '中国疾控辽宁凭证与致死病例调查', sourceUrl: 'https://www.ncbi.nlm.nih.gov/nuccore/MK279376',
    style: { cap: '#8c5d48', stem: '#d8c3aa', shape: 'umbrella', spots: true }
  }
])

export const EXPLORATION_SPECIES=Object.freeze([...LEGACY_SPECIES.map(s=>({...s,photoCredits:COMMERCIAL_PHOTO_CREDITS[s.id]})),...EXPANDED_SPECIES])

export const SPECIES_BY_ID = Object.freeze(EXPLORATION_SPECIES.reduce((map, item) => {
  map[item.id] = item
  return map
}, {}))

const KEY_IDENTIFICATION_CLUES = Object.freeze({
  'thelephora-ganbajun': '子实体从基部反复分枝，灰黑色波状裂片边缘较浅，整体近似珊瑚簇。',
  'tricholoma-matsutake': '幼体常半埋于腐殖层，菌盖与粗壮菌柄间可见膜状结构，需结合菌根宿主判断。',
  'ophiocordyceps-sinensis': '地上为单根细长子座，地下与鳞翅目幼虫虫体相连，这是关键观察组合。',
  'amanita-exitialis': '幼体近球形；成熟后需同时记录白色菌褶、菌环和基部袋状菌托。',
  'amanita-muscaria': '幼体外被膜破裂后可在菌盖留下疣粒，但雨水会使疣粒减少或消失。',
  'coprinus-comatus': '幼体菌盖呈长卵形并带鳞片，成熟后菌褶和菌盖边缘逐渐黑化自溶。',
  'pleurotus-citrinopileatus': '多个黄色扇形菌盖从同一木质基部簇生，菌柄明显偏向一侧。',
  'trametes-versicolor': '薄革质扇形菌盖具有多色同心环带，背面为细小菌孔而不是菌褶。',
  'hericium-erinaceus': '子实体不形成伞盖，表面密生向下悬垂的柔软长刺。',
  'amanita-pallidorosea': '幼体和浅色个体需观察白色菌褶、菌环及基部菌托组合，颜色本身不可靠。',
  'armillaria-gallica': '常从埋藏木或树根附近簇生，菌柄可见菌环，地下基质可能被土壤遮住。',
  'amanita-caesareoides': '幼体被总苞包裹；成熟体有橙红菌盖、黄色菌褶菌柄和基部白色菌托组合。',
  'lepiota-brunneoincarnata': '体型较小，菌盖有同心分布的肉褐色鳞片，菌柄上部可见脆弱菌环。'
})


const CLUE_PHOTO_INDEXES = Object.freeze({
  'thelephora-ganbajun': [0, 1, 0],
  'tricholoma-matsutake': [1, 0, 1],
  'ophiocordyceps-sinensis': [1, 0, 1],
  'amanita-exitialis': [0, 1, 0],
  'amanita-muscaria': [0, 1, 0],
  'coprinus-comatus': [1, 0, 1],
  'pleurotus-citrinopileatus': [0, 1, 0],
  'trametes-versicolor': [0, 1, 0],
  'hericium-erinaceus': [0, 1, 0],
  'amanita-pallidorosea': [0, 1, 0],
  'armillaria-gallica': [1, 0, 1],
  'amanita-caesareoides': [1, 0, 1],
  'lepiota-brunneoincarnata': [0, 1, 0]
})
export const IDENTIFICATION_OPTIONS = Object.freeze({
  ...Object.fromEntries(EXPANDED_SPECIES.map((s,i)=>{const peers=EXPLORATION_SPECIES.filter(p=>p.id!==s.id).sort((a,b)=>(b.style.shape===s.style.shape)-(a.style.shape===s.style.shape));const ids=peers.slice(0,2).map(p=>p.id);ids.splice(i%3,0,s.id);return [s.id,ids]})),
  'thelephora-ganbajun': ['thelephora-ganbajun', 'trametes-versicolor', 'pleurotus-citrinopileatus'],
  'tricholoma-matsutake': ['armillaria-gallica', 'tricholoma-matsutake', 'amanita-caesareoides'],
  'ophiocordyceps-sinensis': ['hericium-erinaceus', 'ophiocordyceps-sinensis', 'thelephora-ganbajun'],
  'amanita-exitialis': ['amanita-pallidorosea', 'amanita-caesareoides', 'amanita-exitialis'],
  'amanita-muscaria': ['amanita-muscaria', 'amanita-pallidorosea', 'amanita-exitialis'],
  'coprinus-comatus': ['lepiota-brunneoincarnata', 'coprinus-comatus', 'armillaria-gallica'],
  'pleurotus-citrinopileatus': ['trametes-versicolor', 'hericium-erinaceus', 'pleurotus-citrinopileatus'],
  'trametes-versicolor': ['pleurotus-citrinopileatus', 'trametes-versicolor', 'thelephora-ganbajun'],
  'hericium-erinaceus': ['hericium-erinaceus', 'pleurotus-citrinopileatus', 'trametes-versicolor'],
  'amanita-pallidorosea': ['amanita-exitialis', 'amanita-pallidorosea', 'amanita-muscaria'],
  'armillaria-gallica': ['tricholoma-matsutake', 'lepiota-brunneoincarnata', 'armillaria-gallica'],
  'amanita-caesareoides': ['amanita-caesareoides', 'amanita-exitialis', 'amanita-pallidorosea'],
  'lepiota-brunneoincarnata': ['coprinus-comatus', 'armillaria-gallica', 'lepiota-brunneoincarnata']
})

export const RESEARCH_VALUE_BY_ID = Object.freeze({
  ...Object.fromEntries(EXPANDED_SPECIES.map(s=>[s.id,s.rarity])),
  'thelephora-ganbajun': 3,
  'tricholoma-matsutake': 4,
  'ophiocordyceps-sinensis': 4,
  'amanita-exitialis': 4,
  'amanita-muscaria': 4,
  'coprinus-comatus': 2,
  'pleurotus-citrinopileatus': 2,
  'trametes-versicolor': 3,
  'hericium-erinaceus': 4,
  'amanita-pallidorosea': 4,
  'armillaria-gallica': 3,
  'amanita-caesareoides': 4,
  'lepiota-brunneoincarnata': 4
})

export function getIdentificationClues(speciesId) {
  const species = SPECIES_BY_ID[speciesId]
  if (!species) return []
  const photoIndexes = CLUE_PHOTO_INDEXES[speciesId] || (species.expanded ? [0, 0, 1] : [0, 1, 0])
  return [
    { id: 'habitat', label: '生境', text: species.ecology, photoIndex: photoIndexes[0] },
    { id: 'form', label: '整体与幼体', text: species.description, photoIndex: photoIndexes[1] },
    { id: 'structure', label: '关键结构', text: KEY_IDENTIFICATION_CLUES[speciesId] || species.keyClue, photoIndex: photoIndexes[2] }
  ]
}

export function getIdentificationCandidates(speciesId) {
  return (IDENTIFICATION_OPTIONS[speciesId] || []).map((id) => SPECIES_BY_ID[id]).filter(Boolean)
}

const HABITAT_ROOT = `${PHOTO_ROOT}/habitats`
const SCENE_ILLUSTRATION_ROOT = `${PHOTO_ROOT}/illustrations/scenes`
const CARD_ILLUSTRATION_ROOT = `${PHOTO_ROOT}/illustrations/cards`
const TARGET_ILLUSTRATION_ROOT = `${PHOTO_ROOT}/illustrations/targets`
const spawn = (id, speciesId, x, y, visibility, anchor, count = 1) => ({
  id, speciesId, x, y, visibility, anchor, count,
  illustration: `${TARGET_ILLUSTRATION_ROOT}/${id}.png`
})

export const ECO_REGIONS = Object.freeze([
  { id: 'warm-mountain', name: '暖湿山地', subtitle: '季风暖湿 · 海拔梯度', climate: '暖湿针阔混交林与高海拔草甸', accent: '#9a7650', sceneIds: ['yn-pine', 'yn-alpine'] },
  { id: 'cold-forest', name: '寒温带森林', subtitle: '冬季漫长 · 腐木丰富', climate: '红松白桦林与冷湿针阔混交林', accent: '#52766a', sceneIds: ['hl-mixed', 'jl-mixed'] },
  { id: 'wet-transition', name: '冷湿过渡带', subtitle: '水分充足 · 林草交错', climate: '林缘湿草地与冷湿河谷', accent: '#657c57', sceneIds: ['hl-meadow', 'jl-river'] },
  { id: 'temperate-hills', name: '温带丘陵林地', subtitle: '落叶林地 · 林缘交错', climate: '落叶阔叶林与山脚林缘', accent: '#8a704e', sceneIds: ['ln-oak', 'ln-edge'] }
])

export const ECO_REGION_BY_ID = Object.freeze(ECO_REGIONS.reduce((map, item) => { map[item.id] = item; return map }, {}))

export const SCENES = Object.freeze([
  {
    id: 'yn-pine', regionId: 'warm-mountain', name: '暖湿针阔混交林', subtitle: '松针、腐殖层与阔叶树根际', environment: 'pine', background: `${HABITAT_ROOT}/yn-pine.jpg`, animalName: '觅食野猪', animalIcon: '🐗', timeLimitMs: 90000, goalType: 'collect', capacity: 3, targetFindCount: 4, targetCollectCount: 4,
    spawns: [spawn('ynp-1', 'thelephora-ganbajun', .18, .72, 'hidden', 'needles', 3), spawn('ynp-2', 'tricholoma-matsutake', .68, .62, 'veryHidden', 'leaves', 1), spawn('ynp-3', 'amanita-exitialis', .84, .78, 'easy', 'soil', 1), spawn('ynp-4', 'thelephora-ganbajun', .43, .86, 'veryHidden', 'needles', 2)]
  },
  {
    id: 'yn-alpine', regionId: 'warm-mountain', name: '高寒草甸', subtitle: '低矮草丛、碎石与隆起土壤', environment: 'alpine', background: `${HABITAT_ROOT}/yn-alpine.jpg`, animalName: '草甸牦牛', animalIcon: '🐂', timeLimitMs: 90000, goalType: 'observe', capacity: 2, targetFindCount: 4, targetCollectCount: 0,
    spawns: [spawn('yna-1', 'ophiocordyceps-sinensis', .16, .78, 'veryHidden', 'grass'), spawn('yna-2', 'ophiocordyceps-sinensis', .72, .66, 'veryHidden', 'mound'), spawn('yna-3', 'ophiocordyceps-sinensis', .47, .86, 'hidden', 'grass'), spawn('yna-4', 'ophiocordyceps-sinensis', .88, .82, 'veryHidden', 'grass')]
  },
  {
    id: 'hl-mixed', regionId: 'cold-forest', name: '红松白桦混交林', subtitle: '针叶层、桦木根际与阔叶倒木', environment: 'birch', background: `${HABITAT_ROOT}/hl-mixed.jpg`, animalName: '林间梅花鹿', animalIcon: '🦌', timeLimitMs: 90000, goalType: 'collect', capacity: 3, targetFindCount: 4, targetCollectCount: 3,
    spawns: [spawn('hlm-1', 'amanita-muscaria', .20, .75, 'easy', 'birch'), spawn('hlm-2', 'tricholoma-matsutake', .56, .68, 'veryHidden', 'needles'), spawn('hlm-3', 'pleurotus-citrinopileatus', .82, .46, 'hidden', 'tree', 4), spawn('hlm-4', 'amanita-muscaria', .74, .86, 'hidden', 'grass')]
  },
  {
    id: 'hl-meadow', regionId: 'wet-transition', name: '林缘湿草地', subtitle: '扰动土、草丛和老树桩', environment: 'meadow', background: `${HABITAT_ROOT}/hl-meadow.jpg`, animalName: '林缘牛群', animalIcon: '🐄', timeLimitMs: 90000, goalType: 'collect', capacity: 3, targetFindCount: 4, targetCollectCount: 4,
    spawns: [spawn('hle-1', 'coprinus-comatus', .17, .78, 'easy', 'grass', 2), spawn('hle-2', 'coprinus-comatus', .51, .72, 'hidden', 'grass', 2), spawn('hle-3', 'pleurotus-citrinopileatus', .82, .55, 'hidden', 'log', 3), spawn('hle-4', 'amanita-muscaria', .68, .86, 'veryHidden', 'grass')]
  },
  {
    id: 'jl-mixed', regionId: 'cold-forest', name: '冷湿针阔混交林', subtitle: '松科根际、老龄阔叶木与厚落叶', environment: 'mixed', background: `${HABITAT_ROOT}/jl-mixed.jpg`, animalName: '林下松鼠', animalIcon: '🐿', timeLimitMs: 90000, goalType: 'collect', capacity: 3, targetFindCount: 4, targetCollectCount: 3,
    spawns: [spawn('jlm-1', 'tricholoma-matsutake', .18, .77, 'veryHidden', 'needles'), spawn('jlm-2', 'hericium-erinaceus', .72, .40, 'hidden', 'tree'), spawn('jlm-3', 'amanita-pallidorosea', .84, .82, 'hidden', 'leaves'), spawn('jlm-4', 'trametes-versicolor', .46, .64, 'easy', 'log', 4)]
  },
  {
    id: 'jl-river', regionId: 'wet-transition', name: '冷湿河谷', subtitle: '溪流、倒木、树洞和潮湿枯枝', environment: 'river', background: `${HABITAT_ROOT}/jl-river.jpg`, animalName: '河谷狍群', animalIcon: '🦌', timeLimitMs: 90000, goalType: 'collect', capacity: 3, targetFindCount: 4, targetCollectCount: 4,
    spawns: [spawn('jlr-1', 'trametes-versicolor', .20, .62, 'easy', 'log', 2), spawn('jlr-2', 'hericium-erinaceus', .80, .38, 'veryHidden', 'tree'), spawn('jlr-3', 'trametes-versicolor', .55, .72, 'hidden', 'log', 2), spawn('jlr-4', 'amanita-pallidorosea', .72, .84, 'veryHidden', 'leaves')]
  },
  {
    id: 'ln-oak', regionId: 'temperate-hills', name: '落叶阔叶林', subtitle: '栎类根际、树桩与山坡落叶', environment: 'oak', background: `${HABITAT_ROOT}/ln-oak.jpg`, animalName: '坡地羊群', animalIcon: '🐑', timeLimitMs: 90000, goalType: 'collect', capacity: 3, targetFindCount: 4, targetCollectCount: 4,
    spawns: [spawn('lno-1', 'armillaria-gallica', .20, .75, 'easy', 'stump', 3), spawn('lno-2', 'amanita-caesareoides', .62, .66, 'hidden', 'leaves'), spawn('lno-3', 'trametes-versicolor', .83, .47, 'hidden', 'tree', 2), spawn('lno-4', 'armillaria-gallica', .74, .86, 'veryHidden', 'roots', 2)]
  },
  {
    id: 'ln-edge', regionId: 'temperate-hills', name: '山脚林缘', subtitle: '草坪、腐殖土与河谷枯木', environment: 'edge', background: `${HABITAT_ROOT}/ln-edge.jpg`, animalName: '林缘牛群', animalIcon: '🐄', timeLimitMs: 90000, goalType: 'collect', capacity: 3, targetFindCount: 4, targetCollectCount: 4,
    spawns: [spawn('lne-1', 'lepiota-brunneoincarnata', .16, .82, 'veryHidden', 'grass'), spawn('lne-2', 'armillaria-gallica', .48, .70, 'hidden', 'roots', 3), spawn('lne-3', 'trametes-versicolor', .82, .54, 'easy', 'log', 2), spawn('lne-4', 'lepiota-brunneoincarnata', .69, .86, 'hidden', 'grass')]
  }
].map((item) => Object.freeze({
  ...item,
  habitat: { ...HABITAT_LAYOUTS[item.id], ...habitatAssets(item.id) },
  spawns: item.spawns.map((target, index) => {
    const [x, y, cover, hidingPlace, size] = HABITAT_LAYOUTS[item.id].spots[index]
    const [photoX, photoY] = PHOTO_SPOTS[item.id][index]
    return { ...target, x, y, photoX, photoY, cover, hidingPlace, size, naturalSprite: `${PHOTO_ROOT}/natural/targets/${target.speciesId}.png` }
  }),
  illustration: `${SCENE_ILLUSTRATION_ROOT}/${item.id}.jpg`,
  cardIllustration: `${CARD_ILLUSTRATION_ROOT}/${item.id}.jpg`
})))

export const SCENE_BY_ID = Object.freeze(SCENES.reduce((map, item) => { map[item.id] = item; return map }, {}))

export const ALL_SPECIES_IMAGES = Object.freeze(EXPLORATION_SPECIES.flatMap((item) => item.photos))
export const ALL_HABITAT_IMAGES = Object.freeze(SCENES.map((item) => item.background))
export const ALL_SCENE_ILLUSTRATIONS = Object.freeze(SCENES.map((item) => item.illustration))
export const ALL_CARD_ILLUSTRATIONS = Object.freeze(SCENES.map((item) => item.cardIllustration))
export const ALL_TARGET_ILLUSTRATIONS = Object.freeze(SCENES.flatMap((item) => item.spawns.map((spawnItem) => spawnItem.illustration)))
export const ALL_EXPLORATION_IMAGES = Object.freeze([
  ...ALL_SPECIES_IMAGES,
  ...ALL_HABITAT_IMAGES,
  ...ALL_SCENE_ILLUSTRATIONS,
  ...ALL_CARD_ILLUSTRATIONS,
  ...ALL_TARGET_ILLUSTRATIONS
])
