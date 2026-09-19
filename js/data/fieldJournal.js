import { EXPLORATION_SPECIES } from './explorationData.js'
import { speciesHabitat } from './speciesPools.js'

const routeNames={
  pine:['松针缓径','松根深径','林隙支径'],
  alpine:['草甸缓径','坡脚石径','高草支径'],
  birch:['桦林缓径','混交林径','落叶支径'],
  meadow:['草地缓径','林缘深径','湿草支径'],
  mixed:['林隙缓径','树根深径','腐木支径'],
  river:['河岸缓径','谷地林径','林下支径'],
  oak:['栎林缓径','落叶深径','树根支径'],
  edge:['山脚缓径','林缘深径','草丛支径']
}
export const ROUTE_COLORS=['#d4bc82','#99b7a1','#cf9b78']
export function routesForScene(scene){
  const start=scene.environment==='river'?[2,8]:[0,8]
  const points=[
    [start,[2.6,5],[3.1,2],[3,-2]],
    [start,[0,4],[0,-2],[0,-7.5]],
    [start,[-3,5],[-5,1],[-5,-5]]
  ]
  return routeNames[scene.environment].map((name,i)=>({
    id:`${scene.id}-route-${i}`,name,points:points[i],color:ROUTE_COLORS[i],
    landmark:['三块浅色石','双枝路标','红褐石堆'][i],
    hint:[
      scene.environment==='river'?'沿河岸内侧的浅色石前行，留意草丛边缘。':'顺着浅色石经过入口林隙，先观察开阔地面。',
      scene.environment==='alpine'?'沿中央坡脚前行，在双枝路标周围观察矮草。':'沿中央林径向深处走，比较树根、落叶与腐木。',
      '从入口向左绕行，沿红褐石寻找林下遮盖。'
    ][i]
  }))
}
export function distanceToRoute(x,z,route){
  let nearest=Infinity
  for(let i=1;i<route.points.length;i++){
    const [ax,az]=route.points[i-1],[bx,bz]=route.points[i]
    const t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(z-az)*(bz-az))/((bx-ax)**2+(bz-az)**2)))
    nearest=Math.min(nearest,Math.hypot(x-ax-t*(bx-ax),z-az-t*(bz-az)))
  }
  return nearest
}
export function findingNotes(profile,environment){
  return EXPLORATION_SPECIES.filter(s=>profile.collection[s.id]?.identified&&(!environment||speciesHabitat(s).habitats.includes(environment))).map(species=>{
    const habitat=speciesHabitat(species)
    const substrate={wood:'观察倒木的上表面、侧面与树干伤口。绕到背面看一看。',buriedWood:'留意土里露出的残枝，比较埋木附近的地面。',litter:'观察草地与落叶交界；看到覆盖隆起时，可以轻点拨开。',soil:'降低视角观察地面，留意苔藓、草丛和覆盖层之间的空隙。'}[habitat.substrate]
    const host={pine:'优先观察松树根际与针叶层。',birch:'留意桦树附近的根际和落叶。',oak:'留意栎树附近的落叶与根际。',mixed:'留意混交树林中的根际。',broadleaf:'留意阔叶树周围的生长基质。',none:'从开阔地面的微小形态开始找。'}[habitat.host]
    return {speciesId:species.id,name:species.name,text:`${host||''}${substrate||''}`,ecology:species.ecology}
  })
}
export const COMMISSIONS={
  routes:{title:'寻找两处路标',target:2,reward:'认路手记',description:'走近两条路线尽头的路标，无需采集菌物。'},
  substrates:{title:'寻找两种生长位置',target:2,reward:'基质观察手记',description:'分别采集长在地面和树木上的菌物，各至少一朵。'},
  brush:{title:'发现遮盖下的菌物',target:1,reward:'落叶观察手记',description:'拨开一处松针或落叶，再采集露出的菌物。'}
}
export const substrateGroup=spawn=>spawn.substrate==='wood'?'wood':'ground'
export function eligibleCommissions(scene){
  const list=['routes']
  if(new Set(scene.spawns.map(substrateGroup)).size>1)list.push('substrates')
  if(scene.spawns.some(s=>s.brushable))list.push('brush')
  return list
}
