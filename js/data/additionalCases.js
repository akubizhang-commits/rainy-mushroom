const AMANITA_ROOT = 'assets/cases/amanita-phalloides'
const RUSSULA_ROOT = 'assets/cases/russula-subnigricans'

export const ADDITIONAL_CASES = Object.freeze([
  {
    id: 'ap-001',
    status: 'prototype-reviewed-source',
    title: '草地边缘的死亡帽',
    subtitle: '致命肝损害风险调查',
    region: '城市草地与阔叶树附近案例',
    season: '夏末至秋季',
    briefing: '一簇淡黄绿色蘑菇出现在草地边缘。菌柄基部部分埋在土中，幼体看起来像白色圆球。请选择能排除危险混淆的证据。',
    actionPoints: 4,
    heroImage: `${AMANITA_ROOT}/habitat.jpg`,
    reportImage: `${AMANITA_ROOT}/specimen.jpg`,
    reportImageFit: 'contain',
    answerId: 'amanita-phalloides',
    supportedRank: 'species',
    decisiveEvidence: ['base', 'young'],
    keyEvidenceQuestion: {
      question: '哪条证据最能区分白色死亡帽幼体与外观相似的马勃？',
      options: [
        { id: 'habitat', label: '它出现在草地边缘' },
        { id: 'specimen', label: '外表是白色圆球' },
        { id: 'young', label: '纵向剖面已形成菌盖与菌褶' }
      ],
      answerId: 'young',
      explanation: '草地和白色圆球外观都可能造成混淆；本案例幼体剖面中的菌盖与菌褶结构是关键冲突。'
    },
    comparisonRows: [
      { label: '生境', evidenceId: 'habitat', rowKey: 'habitat' },
      { label: '菌盖菌褶', evidenceId: 'specimen', rowKey: 'cap' },
      { label: '菌柄基部', evidenceId: 'base', rowKey: 'base' },
      { label: '幼体剖面', evidenceId: 'young', rowKey: 'young' }
    ],
    evidence: [
      {
        id: 'habitat', label: '草地生境', shortLabel: '生境', cost: 1,
        image: `${AMANITA_ROOT}/habitat.jpg`, credit: 'Paul Kroeger, UBC Beaty Biodiversity Museum',
        observation: '蘑菇从地面和草中长出；相关资料强调应同时记录附近阔叶树及埋在土中的基部。',
        value: 10, tags: ['地生', '草地', '阔叶树线索']
      },
      {
        id: 'specimen', label: '菌盖、菌褶与菌环', shortLabel: '整体', cost: 1,
        image: `${AMANITA_ROOT}/specimen.jpg`, fit: 'contain', credit: 'Adolf Ceska / Paul Kroeger, UBC',
        observation: '菌盖颜色可从淡黄绿到橄榄褐变化；菌褶白色，菌柄上部有膜质菌环。颜色不能单独定种。',
        value: 10, tags: ['白色菌褶', '膜质菌环', '变异菌盖']
      },
      {
        id: 'base', label: '完整菌柄基部', shortLabel: '柄基', cost: 1,
        image: `${AMANITA_ROOT}/specimen.jpg`, fit: 'contain', credit: 'Adolf Ceska, UBC',
        observation: '完整标本显示膨大的菌柄基部及白色囊状菌托；只截断菌柄会丢失这一关键结构。',
        value: 15, tags: ['膨大基部', '囊状菌托']
      },
      {
        id: 'young', label: '幼体纵向剖面', shortLabel: '幼体', cost: 2,
        image: `${AMANITA_ROOT}/young-stage.jpg`, credit: 'Paul Kroeger, UBC',
        observation: '白色圆球内部已经形成菌盖与菌褶轮廓，不是内部均匀的球状结构。',
        value: 20, tags: ['幼体', '内部菌盖', '内部菌褶']
      }
    ],
    candidates: [
      {
        id: 'amanita-phalloides', name: '死亡帽鹅膏', scientificName: 'Amanita phalloides', category: '本案例候选',
        rows: {
          habitat: '常与阔叶树形成关系，也可出现在城市草地和树旁',
          cap: '菌盖颜色变化较大；菌褶白色，常见膜质菌环',
          base: '基部膨大并有白色囊状菌托，可能埋在土中',
          young: '幼体剖开可见正在形成的菌盖与菌褶'
        }
      },
      {
        id: 'volvariella-volvacea', name: '草菇类群', scientificName: 'Volvariella volvacea group', category: '危险混淆候选',
        rows: {
          habitat: '栽培或腐殖质环境记录较多，生境信息必须组合判断',
          cap: '也可能有囊状菌托，但成熟孢子颜色和整体结构不同',
          base: '有菌托并不能单独证明是哪一种，更不能证明可食',
          young: '幼体外观可能造成混淆，单凭“蛋形”不足以判断'
        }
      },
      {
        id: 'puffball-group', name: '马勃类群', scientificName: 'Puffball group', category: '幼体混淆候选',
        rows: {
          habitat: '多种马勃也可在地面或草地出现',
          cap: '典型马勃没有展开后的菌盖、菌褶和菌柄组合',
          base: '不存在死亡帽式的完整伞菌结构组合',
          young: '典型幼体内部较均匀，不应出现已形成的菌盖和菌褶轮廓'
        }
      }
    ],
    risk: {
      level: '致命高风险', syndrome: '急性肝损害风险',
      summary: '含耐热鹅膏毒肽，普通烹调不能可靠去除。胃肠症状可延迟出现并暂时缓解，随后可能发生严重肝损害。',
      emergency: '现实中如误食不明野生菌，应停止进食并立即联系120或前往急诊；不要等待症状，也不要因暂时好转而停止评估。',
      safetyBoundary: '本报告只解释固定的死亡帽预制案例，不能据此判断现实中的鹅膏、草菇或马勃。'
    },
    myths: [
      {
        id: 'amanita-cooking', question: '把这种蘑菇充分煮熟，能否认为毒素已经去除？',
        options: [{ id: 'no', label: '不能，普通烹调不能作为安全保证' }, { id: 'yes', label: '可以，高温会让野生菌都变安全' }],
        answerId: 'no', explanation: '死亡帽相关鹅膏毒肽具有耐热性，煮、晒、冻都不能成为现实采食保证。'
      },
      {
        id: 'amanita-false-recovery', question: '误食后腹泻暂时缓解，是否说明已经脱离危险？',
        options: [{ id: 'no', label: '不能，可能存在症状暂缓后的严重肝损害' }, { id: 'yes', label: '可以，只要胃肠症状消失就安全' }],
        answerId: 'no', explanation: '部分鹅膏毒肽中毒可能出现“假愈期”，暂时好转不能作为离院或停止评估的依据。'
      }
    ],
    sources: [
      { name: 'UBC Beaty Biodiversity Museum — Amanita phalloides', url: 'https://explore.beatymuseum.ubc.ca/mushroomsup/A_phalloides.html', use: '图片、形态、相似种与毒性资料' },
      { name: 'CDC MMWR — Amanita phalloides poisonings', url: 'https://www.cdc.gov/mmwr/volumes/66/wr/mm6621a1.htm', use: '中毒风险背景' }
    ],
    reviewNotice: '死亡帽案例来自UBC与CDC资料；面向中国发布前仍须由菌物分类和临床毒理专家终审。'
  },
  {
    id: 'rs-001',
    status: 'prototype-reviewed-source',
    title: '会变红变黑的红菇',
    subtitle: '横纹肌溶解风险调查',
    region: '东亚阔叶林案例',
    season: '暖湿季节',
    briefing: '两份资料照片都被标注为亚稀褶红菇，但菌盖颜色和菌褶外观差异明显。这个案例的重点不是背图，而是认识红菇类照片鉴定的局限。',
    actionPoints: 4,
    heroImage: `${RUSSULA_ROOT}/specimen-a.jpg`,
    reportImage: `${RUSSULA_ROOT}/specimen-b.jpg`,
    answerId: 'russula-subnigricans',
    supportedRank: 'species',
    decisiveEvidence: ['change', 'expert'],
    keyEvidenceQuestion: {
      question: '为什么仅凭照片和变红变黑现象仍不能可靠确认到亚稀褶红菇？',
      options: [
        { id: 'habitat', label: '因为林下环境光线较暗' },
        { id: 'change', label: '因为所有变黑红菇都属于同一种' },
        { id: 'expert', label: '因为近似类群也会变色，种级确认还需专家证据' }
      ],
      answerId: 'expert',
      explanation: '红菇近似类群可能共享外观和伤变过程；本案例的种级结论依赖来源明确的专家记录。'
    },
    comparisonRows: [
      { label: '生境外观', evidenceId: 'habitat', rowKey: 'habitat' },
      { label: '两份照片', evidenceId: 'specimen', rowKey: 'appearance' },
      { label: '伤变记录', evidenceId: 'change', rowKey: 'change' },
      { label: '专家记录', evidenceId: 'expert', rowKey: 'limits' }
    ],
    evidence: [
      {
        id: 'habitat', label: '林下生境照片', shortLabel: '生境', cost: 1,
        image: `${RUSSULA_ROOT}/specimen-a.jpg`, credit: 'Masana Izawa / Nakahiko Mizuno, via Cornell',
        observation: '标本生在林下落叶层，菌肉和菌柄呈红菇类常见的脆质外观；生境只能缩小候选。',
        value: 10, tags: ['林下', '落叶层', '脆质菌体']
      },
      {
        id: 'specimen', label: '第二份标本照片', shortLabel: '变异', cost: 1,
        image: `${RUSSULA_ROOT}/specimen-b.jpg`, credit: 'Chen et al., via Cornell Mushroom Blog',
        observation: '另一份资料标本的菌盖更深、菌褶观感不同，说明同种照片可能随年龄、环境和记录条件变化。',
        value: 10, tags: ['外观差异', '标本变异']
      },
      {
        id: 'change', label: '损伤后颜色记录', shortLabel: '伤变', cost: 1,
        image: `${RUSSULA_ROOT}/specimen-b.jpg`, credit: 'Chen et al., via Cornell Mushroom Blog',
        observation: '资料记录菌肉损伤后可缓慢变红并继续变暗；“会变红或变黑”不是足以判断可食性的单一开关。',
        value: 15, tags: ['缓慢变红', '继续变暗', '非单一判据']
      },
      {
        id: 'expert', label: '分类与事件记录', shortLabel: '专家记录', cost: 2,
        image: `${RUSSULA_ROOT}/specimen-a.jpg`, credit: 'Cornell Mushroom Blog / cited literature',
        observation: '红菇类种间差异细微且可变。本预制案例的种级结论依赖专家来源记录，而不是玩家仅凭照片独立确认。',
        value: 20, tags: ['专家来源', '种级困难', '事件证据']
      }
    ],
    candidates: [
      {
        id: 'russula-subnigricans', name: '亚稀褶红菇', scientificName: 'Russula subnigricans', category: '本案例审校候选',
        rows: {
          habitat: '已在东亚地区记录，林下生境不能单独确定到种',
          appearance: '不同资料照片可呈现明显外观差异',
          change: '资料记录损伤后缓慢变红并继续变暗',
          limits: '种级确认困难，本案例依赖来源明确的专家记录'
        }
      },
      {
        id: 'russula-nigricans', name: '黑红菇近似类群', scientificName: 'Russula nigricans group', category: '视觉近似候选',
        rows: {
          habitat: '相似红菇类也可出现在林下落叶层',
          appearance: '菌盖、菌褶和老熟阶段可能与本案例相似',
          change: '也可能出现红变、灰变或黑变过程',
          limits: '仅凭照片和伤变颜色通常不足以可靠排除近似类群'
        }
      },
      {
        id: 'russula-densifolia', name: '密褶红菇近似类群', scientificName: 'Russula densifolia group', category: '视觉近似候选',
        rows: {
          habitat: '林下生境与其他黑红菇类可能重叠',
          appearance: '浅色菌褶和深色菌盖组合可能造成混淆',
          change: '伤变过程只能作为组合证据之一',
          limits: '需要专家检查更多宏观、微观或分子证据'
        }
      }
    ],
    risk: {
      level: '致命高风险', syndrome: '横纹肌溶解风险',
      summary: '相关中毒可造成肌肉组织严重损伤，并进一步影响肾脏、呼吸或循环功能；不能把它当作普通胃肠不适。',
      emergency: '现实中如误食后出现肌肉疼痛、乏力、尿色异常或其他不适，应立即联系120或前往急诊，并说明野生菌暴露。',
      safetyBoundary: '本报告解释的是来源固定的预制案例。红菇类种级鉴定困难，不得据此判断现实标本可食。'
    },
    myths: [
      {
        id: 'russula-color-change', question: '只要记住“损伤后变红再变黑”，就能确认现实中的亚稀褶红菇吗？',
        options: [{ id: 'no', label: '不能，近似类群也可能有相似伤变过程' }, { id: 'yes', label: '可以，伤变颜色就是唯一决定性特征' }],
        answerId: 'no', explanation: '伤变是组合证据之一。红菇类种级差异细微，仅凭颜色变化和照片可能误判。'
      },
      {
        id: 'russula-history', question: '当地过去有人吃过相似红菇没事，能否证明这次也安全？',
        options: [{ id: 'no', label: '不能，俗名、混采和种间差异都可能造成误判' }, { id: 'yes', label: '可以，传统经验比完整鉴定更可靠' }],
        answerId: 'no', explanation: '同一俗名可能对应多个物种，同一篮中也可能混入不同种；过去没事不能证明本次安全。'
      }
    ],
    sources: [
      { name: 'Cornell Mushroom Blog — A deadly Russula', url: 'https://blog.mycology.cornell.edu/2013/12/30/a-deadly-russula/', use: '两张图片、鉴定局限、伤变与风险资料' },
      { name: 'China CDC Weekly — Mushroom Poisoning Outbreaks, China 2020', url: 'https://weekly.chinacdc.cn/en/article/doi/10.46234/ccdcw2021.014', use: '亚稀褶红菇与横纹肌溶解风险' }
    ],
    reviewNotice: '红菇类种级鉴定尤其困难；本案例只呈现来源固定的教学材料，正式发布前须再次双审。'
  }
])
