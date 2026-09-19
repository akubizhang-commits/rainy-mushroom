import { ADDITIONAL_CASES } from './additionalCases.js'

const ASSET_ROOT = 'assets/cases/chlorophyllum-molybdites'

export const INVESTIGATION_CASES = Object.freeze([
  {
    id: 'cm-001',
    status: 'prototype-reviewed-source',
    title: '草坪上的白色大伞',
    subtitle: '首宗真实菌物风险调查',
    region: '暖湿地区的草坪案例',
    season: '雨后暖季',
    briefing: '一片草坪在雨后长出成簇的大型白色伞菌。只看远景，无法判断种类与风险。请选择最有价值的证据。',
    actionPoints: 4,
    heroImage: `${ASSET_ROOT}/habitat.jpg`,
    answerId: 'chlorophyllum-molybdites',
    supportedRank: 'species',
    decisiveEvidence: ['underside', 'sporeprint'],
    keyEvidenceQuestion: {
      question: '哪条证据最能区分大青褶伞与两个大型伞菌近似候选？',
      options: [
        { id: 'habitat', label: '它生长在草坪上' },
        { id: 'specimen', label: '菌盖较大且有褐色鳞片' },
        { id: 'sporeprint', label: '成熟菌褶与孢子印呈绿色' }
      ],
      answerId: 'sporeprint',
      explanation: '草坪和鳞片菌盖可见于多个候选；本案例中成熟绿色菌褶与绿色孢子印的组合更有区分力。'
    },
    comparisonRows: [
      { label: '生境', evidenceId: 'habitat', rowKey: 'habitat' },
      { label: '菌盖', evidenceId: 'specimen', rowKey: 'cap' },
      { label: '产孢面', evidenceId: 'underside', rowKey: 'underside' },
      { label: '孢子印', evidenceId: 'sporeprint', rowKey: 'sporeprint' }
    ],
    evidence: [
      {
        id: 'habitat',
        label: '生境远景',
        shortLabel: '生境',
        cost: 1,
        image: `${ASSET_ROOT}/habitat.jpg`,
        credit: 'Lisbeth Espinoza, UF/IFAS',
        observation: '大型伞菌成簇生在草坪，周围没有明显林木共生关系。',
        value: 10,
        tags: ['草坪', '成簇', '大型']
      },
      {
        id: 'specimen',
        label: '完整标本与菌盖',
        shortLabel: '菌盖',
        cost: 1,
        image: `${ASSET_ROOT}/specimen.jpg`,
        credit: 'Tyler L. Jones, UF/IFAS',
        observation: '菌盖宽大，白色底上有浅褐色鳞片；同一菌落中可见不同成熟阶段。',
        value: 10,
        tags: ['白色菌盖', '褐色鳞片', '大型']
      },
      {
        id: 'underside',
        label: '产孢面与菌柄',
        shortLabel: '菌褶',
        cost: 1,
        image: `${ASSET_ROOT}/underside.jpg`,
        fit: 'contain',
        credit: 'Lisbeth Espinoza, UF/IFAS',
        observation: '成熟菌褶呈灰绿色，菌褶与菌柄分离；菌柄上可见明显菌环。',
        value: 15,
        tags: ['灰绿色菌褶', '离生菌褶', '菌环']
      },
      {
        id: 'sporeprint',
        label: '孢子印检查',
        shortLabel: '孢子印',
        cost: 2,
        image: `${ASSET_ROOT}/sporeprint.jpg`,
        credit: 'Lisbeth Espinoza, UF/IFAS',
        observation: '孢子印明显呈绿色。这是本预制案例中区分近似候选的高价值证据。',
        value: 20,
        tags: ['绿色孢子印', '实验室证据']
      }
    ],
    candidates: [
      {
        id: 'chlorophyllum-molybdites',
        name: '大青褶伞',
        scientificName: 'Chlorophyllum molybdites',
        category: '本案例候选',
        rows: {
          habitat: '常见于草坪、草地，可成簇或形成菌圈',
          cap: '大型浅色菌盖，中央和表面常有褐色鳞片',
          underside: '幼时偏白，成熟后可呈灰绿至绿色',
          sporeprint: '绿色孢子印'
        }
      },
      {
        id: 'macrolepiota-procera',
        name: '大环柄菇',
        scientificName: 'Macrolepiota procera',
        category: '视觉近似候选',
        rows: {
          habitat: '草地或林缘也可能出现大型伞状子实体',
          cap: '浅色菌盖带褐色鳞片，外观可相似',
          underside: '成熟菌褶不以绿色为典型特征',
          sporeprint: '资料通常记录为白色孢子印'
        }
      },
      {
        id: 'chlorophyllum-rhacodes',
        name: '红褐环柄菇类群',
        scientificName: 'Chlorophyllum rhacodes group',
        category: '视觉近似候选',
        rows: {
          habitat: '林缘、花园等生境可见大型鳞片菌盖',
          cap: '粗糙褐色鳞片明显，与幼年大青褶伞可相似',
          underside: '菌褶通常不以成熟绿色为典型特征',
          sporeprint: '资料通常记录为白色孢子印'
        }
      }
    ],
    risk: {
      level: '已知有毒',
      syndrome: '胃肠炎型中毒风险',
      summary: '误食可引起明显恶心、呕吐、腹痛和腹泻，严重时可因大量失液需要医疗处置。',
      emergency: '现实中如误食不明野生菌，应停止进食并尽快联系120或前往急诊；同餐者说明共同暴露，保留剩余样本、剩菜和现场照片。',
      safetyBoundary: '本报告只解释预制案例，不能用于判断现实标本，更不能作为采食依据。'
    },
    myths: [
      {
        id: 'young-white-gills',
        question: '幼体菌褶还是白色，能否据此判断它无毒？',
        options: [
          { id: 'no', label: '不能，成熟阶段和组合证据很重要' },
          { id: 'yes', label: '可以，白色菌褶通常安全' }
        ],
        answerId: 'no',
        explanation: '大青褶伞幼体菌褶可以偏白，成熟后才逐渐呈灰绿色。白色本身不是安全证明。'
      },
      {
        id: 'game-score',
        question: '这宗案例拿到高分后，现实中遇到相似蘑菇可以采食吗？',
        options: [
          { id: 'no', label: '不可以，游戏不能替代现实鉴定' },
          { id: 'yes', label: '可以，按游戏特征检查即可' }
        ],
        answerId: 'no',
        explanation: '高分只表示完成这宗固定素材案例，不代表具备现实菌物鉴定或采食能力。'
      }
    ],
    sources: [
      {
        name: 'University of Florida IFAS Extension, PP324',
        url: 'https://edis.ifas.ufl.edu/pp324',
        use: '形态、生境、相似种、毒性说明与全部照片'
      },
      {
        name: 'China CDC Weekly mushroom poisoning reports',
        url: 'https://weekly.chinacdc.cn/en/article/doi/10.46234/ccdcw2023.009',
        use: '中国蘑菇中毒风险背景'
      }
    ],
    reviewNotice: '真实物种与来源已核对；中文表述和临床文案仍为内部原型，正式发布前须由菌物分类及临床毒理专家终审。'
  },
  ...ADDITIONAL_CASES
])

export const CASE_BY_ID = Object.freeze(
  INVESTIGATION_CASES.reduce((result, item) => {
    result[item.id] = item
    return result
  }, {})
)
