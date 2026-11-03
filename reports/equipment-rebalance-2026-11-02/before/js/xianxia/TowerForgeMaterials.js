const common = ['xuantie','lingmu','yaopi','lingsi','lingyu']
export const FORGE_COMMON_MATERIALS = Object.freeze(common.map(id=>'forge_'+id))
const rows = [
 ['xuantie','玄铁',1,[1,2,3,4,5,6,7,8,9]],['lingmu','灵木',1,[1,2,3,4,5,6,7,8,9]],
 ['yaopi','妖兽皮',1,[1,2,3,4,5,6,7,8,9]],['lingsi','灵蚕丝',1,[1,2,3,4,5,6,7,8,9]],['lingyu','灵玉',1,[1,2,3,4,5,6,7,8,9]],
 ['tiejing','铁精',2,[1]],['hanjingsha','寒晶砂',3,[2,3]],['chitongjing','赤铜精',4,[4,5,6]],['zijingsui','紫晶髓',5,[7,8,9]],['ninglingjing','凝灵晶',5,[1,2,3,4,5,6,7,8,9]],
 ['core_fa','寒魄器心',20,[2,3]],['core_bao','赤曜器心',40,[4,5,6]],['core_ling','紫宸器心',80,[7,8,9]],
]
export const FORGE_MATERIALS = Object.freeze(Object.fromEntries(rows.map(([suffix,name,sellPrice,sourceFloors])=>{
 const id='forge_'+suffix,source=suffix==='tiejing'?'第1层精英2份、Boss4份；用于出售换灵石':suffix.startsWith('core_')?`第${sourceFloors.join('、')}层Boss：25%掉1份，同阶连续4次未掉后第5次必掉`:common.includes(suffix)?'全塔普通怪：器材10%，五种等概率':suffix==='ninglingjing'?'全塔Boss固定1份':`第${sourceFloors.join('、')}层：精英2份，Boss4份`
 return [id,Object.freeze({id,name,sellPrice,sourceFloors:Object.freeze(sourceFloors),source,material:true,craftingType:'forge',description:suffix==='tiejing'?'凡器已改为仅购买；铁精作为首层战利品出售，每份换2下品灵石。':`${name}用于炼器，可出售换下品灵石。${source}。`})]
})))
export function forgeMainMaterial(floor) { return 'forge_'+(floor===1?'tiejing':floor<=3?'hanjingsha':floor<=6?'chitongjing':'zijingsui') }
