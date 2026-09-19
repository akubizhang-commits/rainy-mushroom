export const SPECIES = Object.freeze([
  {
    id: 'rainBell',
    name: '雨铃菇',
    shortName: '雨铃',
    rarity: 3,
    habitat: '腐竹背阴面',
    description: '雾气经过时，菌盖边缘会凝出一圈细小雨珠。',
    story: '护林员说，成片雨铃会替竹林记住每一场雨。',
    clues: ['生在断裂腐竹的背阴面', '菌盖边缘像微微收拢的铃口', '雾中浮现稀疏的蓝色光点'],
    style: { cap: '#668fa3', underside: '#d8e5df', stem: '#d7ddce', spots: '#b9dfe4', shape: 'bell' }
  },
  {
    id: 'amberEar',
    name: '琥珀耳',
    shortName: '琥珀',
    rarity: 2,
    habitat: '倒木湿润侧面',
    description: '半透明的褶皱会收集落下的竹叶碎屑。',
    story: '晒过晨光的琥珀耳，像一封没有写字的旧信。',
    clues: ['贴在倒木湿润的一侧生长', '没有明显菌柄，外形像折叠的耳朵', '逆光观察呈温暖的半透明琥珀色'],
    style: { cap: '#ca874c', underside: '#edbd7d', stem: '#9d653e', spots: '#f0d09b', shape: 'ear' }
  },
  {
    id: 'inkCap',
    name: '墨滴伞',
    shortName: '墨滴',
    rarity: 2,
    habitat: '竹灰与松土交界',
    description: '成熟后伞缘会化成墨色水滴，在土上留下短暂纹路。',
    story: '山里的孩子用它留下的纹路猜第二天会不会下雨。',
    clues: ['偏爱竹灰和松软泥土的交界', '菌柄细长，灰白菌盖呈尖伞形', '成熟菌盖边缘挂着墨色小滴'],
    style: { cap: '#545762', underside: '#a7a9ad', stem: '#d9d7cf', spots: '#292c35', shape: 'cone' }
  },
  {
    id: 'mossLantern',
    name: '苔灯菌',
    shortName: '苔灯',
    rarity: 1,
    habitat: '老竹根青苔间',
    description: '圆润菌盖藏在青苔里，只在阴影中透出柔和绿光。',
    story: '它从不照亮远路，只照亮脚边下一步。',
    clues: ['藏在老竹根周围的厚青苔里', '菌盖圆润，表面有细密鳞片', '遮住光线后会泛出柔和绿光'],
    style: { cap: '#75965f', underside: '#d4dfb7', stem: '#c9d0a5', spots: '#b8cc88', shape: 'round' }
  },
  {
    id: 'cloudFan',
    name: '云纹扇',
    shortName: '云扇',
    rarity: 2,
    habitat: '朽木断面',
    description: '一层层银白菌盖沿木纹铺开，像被风吹散的云。',
    story: '完整的云纹扇总朝着溪流方向展开。',
    clues: ['成层附着在朽木断面，没有独立菌柄', '菌盖展开成薄扇，边缘有银白环纹', '菌盖下方有细密的浅灰纹理'],
    style: { cap: '#a6b0ad', underside: '#e3e3db', stem: '#8b918a', spots: '#f0f1e9', shape: 'fan' }
  },
  {
    id: 'dewCup',
    name: '盛露杯',
    shortName: '露杯',
    rarity: 1,
    habitat: '低洼落叶层',
    description: '杯状菌体会稳稳托住雨水，水面常漂着一粒竹花。',
    story: '第一滴晨露落进去时，它才算真正醒来。',
    clues: ['出现在低洼而厚实的落叶层', '菌体呈浅杯状，几乎看不见菌柄', '凹面常盛着一汪不会立刻渗走的雨水'],
    style: { cap: '#b582a2', underside: '#e3c7da', stem: '#c6a4b8', spots: '#f0ddea', shape: 'cup' }
  }
])

export const SPECIES_BY_ID = Object.freeze(
  SPECIES.reduce((result, species) => {
    result[species.id] = species
    return result
  }, {})
)
