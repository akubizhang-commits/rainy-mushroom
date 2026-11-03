import {WEAPONS,createFixedWeapon} from './TowerWeapons.js'
import {EQUIPMENT,createFixedEquipment} from './TowerEquipment.js'
import {canUseEquipmentTier,equipmentTier} from './TowerEquipmentTiers.js'
import {cultivationAt} from './TowerProfile.js'
import {EQUIPMENT_CAPACITY} from './TowerCrafting.js'
const tiers={fan:{scale:1,main:'tiejing',stones:5,contribution:3},fa:{scale:1,main:'hanjingsha',stones:40,contribution:20},bao:{scale:2,main:'chitongjing',stones:80,contribution:35},ling:{scale:3,main:'zijingsui',stones:150,contribution:60}}
const bases={weapon:{xuantie:2,lingmu:1,lingyu:1},armor:{yaopi:2,lingsi:1,xuantie:1},ring:{lingyu:2,xuantie:1,lingmu:1}}
const definitions=[...WEAPONS.map(d=>({...d,category:'weapon'})),...EQUIPMENT]
const qualityNames=['','下品','中品','上品','极品']
export const FORGING_RECIPES=Object.freeze(Object.keys(bases).flatMap(category=>Object.keys(tiers).flatMap(tier=>(tier==='fan'?[1]:[1,2,3,4]).map(quality=>{
 const t=tiers[tier],factor=[0,1,4,12,32][quality],definitionIds=definitions.filter(d=>d.category===category&&d.tier===tier&&d.qualities.includes(quality)).map(d=>d.id)
 // Only top-quality master variants are rarer; specialist sidegrades stay equiprobable.
 const weights=definitionIds.map(id=>quality===4?(definitions.find(d=>d.id===id).role==='master'?3:7):1)
 const ingredients=Object.entries(bases[category]).map(([id,count])=>Object.freeze({id:'forge_'+id,count:count*t.scale*factor}))
 ingredients.push(Object.freeze({id:'forge_'+t.main,count:tier==='fan'?1:2*factor}))
 if(quality===3)ingredients.push(Object.freeze({id:'forge_ninglingjing',count:2}))
 if(quality===4)ingredients.push(Object.freeze({id:'forge_core_'+tier,count:2}))
 return Object.freeze({id:`${category}:${tier}:q${quality}`,name:`${equipmentTier(tier).name}·${tier==='fan'?'':qualityNames[quality]}${{weapon:'兵器',armor:'法衣',ring:'灵戒'}[category]}`,
 category,tier,quality,source:tier==='fan'?'shopOnly':'qualityPool',definitionIds:Object.freeze(definitionIds),weights:Object.freeze(weights),ingredients:Object.freeze(tier==='fan'?[]:ingredients),spiritStones:t.stones*factor,contribution:t.contribution*factor})
}))))
const recipes=new Map(FORGING_RECIPES.map(r=>[r.id,r]))
export function forgingRecipe(id){return recipes.get(id)||null}
export function createForgedGear(recipeId,instanceId,definitionId){
 const r=forgingRecipe(recipeId);if(!r)throw new RangeError('Unknown forging recipe')
 const id=definitionId??r.definitionIds[0]
 if(!r.definitionIds.includes(id))throw new RangeError('Identity outside forging pool')
 return r.category==='weapon'?createFixedWeapon(id,instanceId):createFixedEquipment(id,instanceId)
}
export function rollForgedGear(recipeId,instanceId,roll){
 const r=forgingRecipe(recipeId)
 if(!r||!Number.isFinite(roll)||roll<0||roll>=1)throw new RangeError('Invalid forging roll')
 const total=r.weights.reduce((sum,weight)=>sum+weight,0)
 let cumulative=0,index=r.weights.length-1
 for(let i=0;i<r.weights.length;i++){
  cumulative+=r.weights[i]
  if(roll<cumulative/total){index=i;break}
 }
 return {item:createForgedGear(recipeId,instanceId,r.definitionIds[index])}
}
export function forgingQuote(state,id,count,mode='craft'){
 const r=forgingRecipe(id),fail=reason=>({ok:false,reason})
 if(!r)return fail('unknown-recipe')
 if(!['craft','buy'].includes(mode)||(mode==='buy')!==(r.source==='shopOnly'))return fail('invalid-source')
 if(!Number.isSafeInteger(count)||count<1||count>10)return fail('invalid-count')
 if(state.activeRun)return fail('in-tower')
 if(!canUseEquipmentTier(r.tier,cultivationAt(state.xp).level))return fail('realm-locked')
 if(Object.keys(state.weapons).length+Object.keys(state.equipment).length+count>EQUIPMENT_CAPACITY)return fail('capacity')
 const factor=count*(mode==='buy'?3:1),spiritStones=r.spiritStones*factor,contribution=r.contribution*factor
 const ingredients=mode==='buy'?[]:r.ingredients.map(a=>({...a,required:a.count*count,owned:state.pills[a.id]||0}))
 const result={id,count,mode,spiritStones,contribution,ingredients}
 if(ingredients.some(a=>a.owned<a.required))return {...result,...fail('insufficient-materials')}
 if(state.spiritStones<spiritStones||state.contribution<contribution)return {...result,...fail('insufficient')}
 return {ok:true,...result}
}
