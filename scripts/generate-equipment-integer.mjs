// Offline authoring only. Runtime consumes the emitted fixed catalog, never the spec.
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {EQUIPMENT_ROSTER} from '../js/xianxia/TowerEquipmentRoster.js'
import {WEAPON_BLEED_IDS} from '../js/xianxia/TowerWeaponBleed.js'
const spec=readFileSync(new URL('../docs/superpowers/specs/2026-11-03-equipment-integer-budgets-design.md',import.meta.url),'utf8')
const out=new URL('../js/xianxia/',import.meta.url)
const overridePath=new URL('../design/balance/equipment-integer-values.json',import.meta.url)
const overrides=existsSync(overridePath)?JSON.parse(readFileSync(overridePath,'utf8')):{}
const positions=new Set(['attack','primary','awareness','defense','vitality','budget','speed','crit','critBonus','cdr','skill','secondaryShare'])
for(const [id,values] of Object.entries(overrides)){
 if(!EQUIPMENT_ROSTER.some(d=>d.id===id))throw Error(`Unknown override identity: ${id}`)
 for(const [key,value] of Object.entries(values)){
  if(!positions.has(key)||!Number.isFinite(value)||value<0||value>(key==='secondaryShare'?.5:1))
   throw Error(`Invalid authoring position: ${id}.${key}`)
 }
}
const bounds=text=>{
  const numbers=text.match(/\d+(?:\.\d+)?/g)?.map(Number)
  return numbers?.length?[numbers[0],numbers[1]??numbers[0]]:null
}
const tiers={'凡器':'fan','法器':'fa','宝器':'bao','灵器':'ling'},qualities={'下品':1,'中品':2,'上品':3,'极品':4}
const section=(a,b)=>spec.split(a)[1].split(b)[0]
const table=text=>text.split('\n').filter(line=>/^\|(凡器|法器|宝器|灵器)·/.test(line)).map(line=>line.split('|').slice(1,-1).map(x=>x.trim()))
const key=name=>{const [t,q]=name.split('·');return `${tiers[t]}:${qualities[q]}`}
const ranges={}
for(const r of table(section('### 4.1','### 4.2')))ranges[key(r[0])]={weapon:{
  qi:r[1].split('/').map(bounds),formation:r[2].split('/').map(bounds),general:[bounds(r[3]),bounds(r[3])],
  primary:bounds(r[4]),awareness:bounds(r[5])}}
for(const [slot,a,b] of [['armor','### 4.2','### 4.3'],['ring','### 4.3','## 5.']])
 for(const r of table(section(a,b)))ranges[key(r[0])][slot]={defense:bounds(r[1]),primary:bounds(r[2]),awareness:bounds(r[3]),...(slot==='armor'?{vitality:bounds(r[4])}:{})}
for(const r of table(section('## 5.','分配约束：')))ranges[key(r[0])].ordinary={
 budget:bounds(r[1]),weaponSpeed:bounds(r[2]),skill:bounds(r[3]),
 crit:bounds(r[4].split('/')[0]),critBonus:bounds(r[4].split('/')[1]??''),
 cdr:bounds(r[5]),armorSpeed:bounds(r[6].split('/')[0]),castSpeed:bounds(r[6].split('/')[1]??'')}
const freezeCode=`const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}\n`
const affinity=d=>({eq_sword_dingyue:'formation',eq_sword_chengming:'qi',eq_sword_kunwu:'formation',eq_sword_zhaoyuan:'qi'})[d.id]
  ??(['qi','formation'].includes(d.role)?d.role:'general')
const skillIds={eq_sword_zhaodan:'炼气',eq_sword_taiheng:'all'}
const catalog={}
for(const d of EQUIPMENT_ROSTER){
 if(!d.quality){catalog[d.id]={base:d.category==='weapon'?{physicalAttack:5,magicAttack:5}:{[d.category==='armor'?'physicalDefense':'magicDefense']:1},affixes:[]};continue}
 const r=ranges[`${d.tier}:${d.quality}`],slot=r[d.category],o=r.ordinary,v=overrides[d.id]??{}
 const pick=(range,t=.5)=>range?Math.round(range[0]+(range[1]-range[0])*t):0
 const choose=(name,range,t=.5)=>pick(range,v[name]??t)
 const caster=d.category==='weapon'?affinity(d)==='formation':['recovery','cadence','master'].includes(d.role)
 const balanced=d.category==='weapon'&&affinity(d)==='general'
 const aware=d.tier==='fan'?d.category!=='ring':caster||d.quality===3
 let primary=choose('primary',slot.primary,aware?0:1)
 if(aware)primary=Math.min(primary,Math.floor((slot.primary[0]+slot.primary[1])/2))
 const base={}
 if(d.category==='weapon'){
   const [physical,magic]=slot[affinity(d)]
   const t=v.attack??(d.id==='eq_sword_guiyan'?3/7:skillIds[d.id]?0:.5)
   Object.assign(base,{physicalAttack:pick(physical,t),magicAttack:pick(magic,t)})
 }else base[d.category==='armor'?'physicalDefense':'magicDefense']=choose('defense',slot.defense,caster?(d.category==='ring'?2/3:0):(d.category==='ring'?1/3:2/3))
 const main=caster?'intelligence':'strength'
 if(balanced){base.strength=Math.ceil(primary/2);base.intelligence=Math.floor(primary/2)}
 else if(d.quality===3){base[main]=primary-3;base[main==='strength'?'intelligence':'strength']=3}
 else base[main]=primary
 if(!balanced&&d.quality>=3&&v.secondaryShare){
  const secondary=Math.max(3,Math.round(primary*v.secondaryShare))
  base[main]=primary-secondary;base[main==='strength'?'intelligence':'strength']=secondary
 }
 if(aware)base.awareness=choose('awareness',slot.awareness,1)
 if(d.id==='eq_ring_wenmai'){base.strength=base.intelligence;delete base.intelligence}
 if(d.category==='armor')base.vitality=choose('vitality',slot.vitality,d.id==='eq_armor_wugou'?0:.5)
 const affixes=[],add=(type,value,target)=>{if(value)affixes.push({type,value,...(target?{target}:{})})}
 if(d.category==='weapon'){
  const flow=d.id==='eq_sword_zhaodan'?3:affinity(d)==='general'||d.id==='eq_sword_zhaoyuan'?0:({fa:6,bao:8,ling:12}[d.tier]??0)
  const element=({bao:2,ling:4}[d.tier]??0)
  const total=choose('budget',skillIds[d.id]?(d.tier==='fa'?[12,25]:[24,42]):o.budget)
  add('physical',total-flow-element);add('magic',total-flow-element)
  add('attackSpeed',choose('speed',o.weaponSpeed,0))
  const attached=({fan:2,fa:2,bao:3,ling:5})[d.tier]
  if(WEAPON_BLEED_IDS.includes(d.id)){add('bleedConversion',50);add('bleed',attached)}else add('onHit',attached)
  add('flow',flow,d.id==='eq_sword_zhaodan'?'qi':affinity(d));add('element',element,'all')
  if(skillIds[d.id])add('skillLevel',1,skillIds[d.id])
 }else if(d.category==='armor'){
  add(caster?'castSpeed':'attackSpeed',choose('speed',caster?o.castSpeed:o.armorSpeed,0))
  const low={fan:[.2],fa:[.2,.3,.4,.5],bao:[.3,.4,.5,.6],ling:[.4,.5,.6,.7]}[d.tier][d.quality-1]
  add('healthRegen',d.id==='eq_armor_wugou'?.4:d.id==='eq_armor_chengxiao'?.2:Number((low+(caster&&d.tier!=='fan'?.1:0)).toFixed(1)))
  if(d.id==='eq_armor_wugou')add('lowHealthShield',14)
  if(d.id==='eq_armor_chengxiao')add('safeRecovery',.6)
 }else{
  const burst=['burst','graduate','transition'].includes(d.role)
  if(burst){add('critChance',choose('crit',o.crit,0));add('critBonus',choose('critBonus',o.critBonus,.5))}
  else add('cooldownReduction',choose('cdr',o.cdr,0))
  const special={eq_ring_weiming:'dotDamage',eq_ring_dingwei:'formationDamage'}[d.id]
  add('skillDamage',special?o.skill[0]-5:choose('skill',o.skill,0))
  if(special)add(special,12)
 }
 catalog[d.id]={base,affixes}
}
function emit(name,text){
 const path=new URL(name,out)
 if(process.argv.includes('--check')){
  if(!existsSync(path)||readFileSync(path,'utf8')!==text)throw Error(`Stale generated catalog: ${name}`)
 }else writeFileSync(path,text)
}
emit('TowerEquipmentRanges.js','// Approved design ranges; generated by scripts/generate-equipment-integer.mjs.\n'+freezeCode+'export const EQUIPMENT_RANGES=freeze('+JSON.stringify(ranges,null,2)+')\n')
emit('TowerEquipmentFixed.js','// Fixed authored identities. No player level or random input. Regenerate offline only.\n'+freezeCode+'export const FIXED_EQUIPMENT=freeze('+JSON.stringify(catalog,null,2)+')\n')
console.log(`${process.argv.includes('--check')?'Checked':'Generated'} ${Object.keys(catalog).length} fixed identities / ${Object.keys(ranges).length} ranges`)
