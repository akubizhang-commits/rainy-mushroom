export const ROUTES = Object.freeze([
  {
    id: 'mistPath',
    name: '雾竹小径',
    tag: '均衡 · 初次推荐',
    description: '薄雾沿旧石阶上行，常见背阴腐竹。',
    accent: '#789c91',
    speciesPool: ['rainBell', 'inkCap', 'dewCup', 'mossLantern'],
    eventId: 'lostRibbon'
  },
  {
    id: 'oldLog',
    name: '倒木坡',
    tag: '朽木 · 层生菌物',
    description: '风倒老竹堆成缓坡，木纹里藏着细小菌落。',
    accent: '#9a7d58',
    speciesPool: ['amberEar', 'cloudFan', 'mossLantern', 'rainBell'],
    eventId: 'blockedWater'
  },
  {
    id: 'mossCreek',
    name: '苔溪弯',
    tag: '湿润 · 稀有目击',
    description: '溪水转弯处终年湿润，青苔覆盖竹根。',
    accent: '#6d989b',
    speciesPool: ['mossLantern', 'dewCup', 'cloudFan', 'amberEar'],
    eventId: 'trampledMoss'
  },
  {
    id: 'sunnyEdge',
    name: '云隙林缘',
    tag: '明亮 · 形态清晰',
    description: '短暂阳光穿过竹梢，照亮松土与落叶。',
    accent: '#b49461',
    speciesPool: ['inkCap', 'dewCup', 'rainBell', 'amberEar'],
    eventId: 'fallenBranch'
  }
])

export const ROUTE_BY_ID = Object.freeze(
  ROUTES.reduce((result, route) => {
    result[route.id] = route
    return result
  }, {})
)

export const EVENTS = Object.freeze({
  lostRibbon: {
    id: 'lostRibbon',
    title: '遗落的塑料标带',
    description: '旧标带缠在新竹上，雨水让它越收越紧。',
    options: [
      { id: 'clean', label: '解下并带走', detail: '生态 +4，研究 +1', ecology: 4, research: 1, coins: 0 },
      { id: 'mark', label: '记录位置', detail: '护林券 +2', ecology: 0, research: 0, coins: 2 }
    ]
  },
  blockedWater: {
    id: 'blockedWater',
    title: '堵住的细水沟',
    description: '落枝堵住排水，坡脚已经积起一小片浑水。',
    options: [
      { id: 'clear', label: '移开落枝', detail: '生态 +3，研究 +1', ecology: 3, research: 1, coins: 0 },
      { id: 'observe', label: '观察水痕', detail: '研究 +2', ecology: 0, research: 2, coins: 0 }
    ]
  },
  trampledMoss: {
    id: 'trampledMoss',
    title: '被踩开的苔面',
    description: '一条近路穿过湿苔，边缘的小菌落正在干裂。',
    options: [
      { id: 'detour', label: '铺叶引导绕行', detail: '生态 +4', ecology: 4, research: 0, coins: 0 },
      { id: 'photo', label: '记录受损范围', detail: '研究 +2', ecology: 0, research: 2, coins: 0 }
    ]
  },
  fallenBranch: {
    id: 'fallenBranch',
    title: '新落的竹枝',
    description: '竹枝刚落在林缘，断口还带着清新的气味。',
    options: [
      { id: 'shelter', label: '移到背阴处', detail: '生态 +3，护林券 +1', ecology: 3, research: 0, coins: 1 },
      { id: 'measure', label: '测量并记录', detail: '研究 +2', ecology: 0, research: 2, coins: 0 }
    ]
  }
})
