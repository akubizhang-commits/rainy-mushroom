import {GROWTH_SKILLS,GROWTH_EVOLUTIONS,skillStage} from './TowerGrowth.js'
const definitions=Object.fromEntries([...GROWTH_SKILLS,...GROWTH_EVOLUTIONS].map(d=>[d.id,d]))
export function equipmentSkillBonus(loadout,id){
 if(loadout?.growthVersion!==1||loadout.weaponEquipped===false)return 0
 const a=loadout.weapon?.affixes?.find(a=>a.type==='skillLevel')
 return a&&a.value===1&&(a.target==='all'||a.target===skillStage(id)?.realm)?1:0
}
export function applyEquipmentSkillLevels(loadout){
 if(!loadout||loadout.growthVersion!==1)return loadout
 const base=loadout.trainedSkills??loadout
 const boosted=Object.keys({...base.active,...base.passive,...base.evolutionLevels}).some(id=>equipmentSkillBonus(loadout,id)>0)
 if(!boosted&&!loadout.trainedSkills)return loadout
 const out={...loadout}
 for(const k of ['active','passive','evolutionLevels'])out[k]=Object.fromEntries(Object.entries(base[k]??{}).map(([id,level])=>[id,level+(level>0?equipmentSkillBonus(loadout,id):0)]))
 if(boosted)out.trainedSkills=Object.fromEntries(['active','passive','evolutionLevels'].map(k=>[k,{...base[k]}]))
 else delete out.trainedSkills
 return out
}
export function validEquipmentSkillLevels(loadout){
 try{
 const base=loadout.trainedSkills??loadout
 if(loadout.trainedSkills&&Object.keys(base).sort().join(',')!=='active,evolutionLevels,passive')return false
 for(const k of ['active','passive','evolutionLevels']){
  if(!base[k]||typeof base[k]!=='object'||Array.isArray(base[k]))return false
  for(const [id,lv] of Object.entries(base[k]))if(!definitions[id]||!Number.isInteger(lv)||lv<1||lv>definitions[id].maxLevel)return false
 }
 const expected=applyEquipmentSkillLevels(loadout)
 for(const k of ['active','passive','evolutionLevels']){
  const entries=Object.entries(expected[k]);if(entries.length!==Object.keys(loadout[k]).length||entries.some(([id,n])=>loadout[k][id]!==n))return false
 }
 return !!expected.trainedSkills===!!loadout.trainedSkills
 }catch{return false}
}
