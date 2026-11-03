import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {EQUIPMENT,createBasicEquipment,rollEquipment,validateEquipment,equipmentName,
 equipmentDescription,equipmentSummary,ringDamageModifiers,armorModifiers,RING_AFFIX_RANGES,ARMOR_AFFIX_RANGES} from '../js/xianxia/TowerEquipment.js'
const clone=x=>JSON.parse(JSON.stringify(x))
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}

test('each category has 25 identities plus its detached basic item; armor retains doc42 names',()=>{
 const doc=readFileSync(new URL('../docs/xianxia/sect-tower-v1/42-defensive-equipment-and-draw-proposal.md',import.meta.url),'utf8')
 assert.equal(EQUIPMENT.length,52);assert.ok(Object.isFrozen(EQUIPMENT))
 for(const category of ['armor','ring']){
  const defs=EQUIPMENT.filter(d=>d.category===category);assert.equal(defs.length,26)
  for(const d of defs){if(category==='armor'&&d.id!=='eq_armor_xuansu')assert.ok(doc.includes(d.name),d.name);assert.ok(Object.isFrozen(d))}
  const a=createBasicEquipment(category),b=createBasicEquipment(category)
  assert.equal(a.id,`basic-${category}`);assert.equal(a.tier,'fan');assert.equal(a.quality,0)
  assert.ok(validateEquipment(a,category));assert.equal(validateEquipment(a,category==='armor'?'ring':'armor'),false)
  a.affixes.push({type:'physical',value:9});assert.deepEqual(b.affixes,[])
 }
 assert.deepEqual(ringDamageModifiers(createBasicEquipment('ring')),{critChance:0,critBonus:0,special:0})
 const basicArmor=armorModifiers(createBasicEquipment('armor'))
 assert.equal(basicArmor.physicalDefense,1);assert.equal(basicArmor.magicDefense,0)
 assert.equal(basicArmor.healthRegen,0);assert.equal(basicArmor.hpBonus,0)
 assert.equal(basicArmor.cooldownReduction,0);assert.equal(basicArmor.castSpeed,0)
})

test('offensive ring names retain all existing IDs without healing implications',()=>{
 const expected=[
  ['anxi','凝锋木戒'],['huyuan','锐意石戒'],['dingxin','明心铜戒'],
  ['qinglu','断芒玉戒'],['wenmai','追锋灵戒'],['wenpo','破隙银戒'],
  ['huichun','贯虹碧戒'],['shoudan','切玉玄戒'],['xuxi','凌刃朱戒'],
  ['changning','破妄宝戒'],['guyuan','决锋宝戒'],['weiming','照玄宝戒'],
  ['jingshui','剑鸣灵戒'],['hanyuan','洞锋玉戒'],['huming','逐刃玄戒'],
  ['guizhen','透隙玄戒'],['ningyuan','凝锐宝戒'],['bujing','惊锋灵戒'],
  ['taihe','断岳玉戒'],['shouzhen','析芒法戒'],['zhenxin','裂空宝戒'],
  ['chengshen','烛微宝戒'],['guiyuan','观隙法戒'],['dingwei','天锋灵戒'],
 ]
 const rings=EQUIPMENT.filter(d=>d.category==='ring'&&!d.qualities.includes(0))
 for(const [id,name] of expected) assert.equal(rings.find(d=>d.id===`eq_ring_${id}`).name,name)
 assert.equal(new Set(rings.map(d=>d.name)).size,25)
 for(const d of rings)assert.doesNotMatch(d.name,/回春|护命|续息|护元|温脉|守丹|固元|安息|回复|治疗/)
})

test('seeded rolls cover all 50 fixed identities with category-only slots and roundtrip validation',()=>{
 const seen=new Set()
 for(const category of ['armor','ring'])for(const tier of ['fan','fa','bao','ling'])for(let q=1;q<=4;q++)for(let seed=1;seed<=150;seed++){
  if(tier==='fan'&&q>1)continue
  const a=rollEquipment(category,tier,q,rng(seed*1741),`${category}-${seed}`)
  assert.deepEqual(a,rollEquipment(category,tier,q,rng(seed*1741),a.id));assert.ok(validateEquipment(a,category))
  seen.add(a.definitionId);assert.equal(a.locked,false);assert.equal(a.refine,0)
  assert.ok(a.affixes.every(f=>(category==='ring'?['critChance','critBonus','cooldownReduction','skillDamage','dotDamage','formationDamage']:['attackSpeed','castSpeed','healthRegen','lowHealthShield','safeRecovery']).includes(f.type)))
  assert.ok(validateEquipment(JSON.parse(JSON.stringify(a))))
 }
 assert.equal(seen.size,50)
})

test('strict validation rejects type mixing, missing/duplicate affixes, extras and bad identity/ranges',()=>{
 for(const category of ['armor','ring']){
  const a=rollEquipment(category,'ling',4,()=>0,'strict')
  for(const mutate of [b=>b.affixes.pop(),b=>b.affixes[1]={...b.affixes[0]},b=>b.affixes[0].value=999,
   b=>b.affixes[0].value=NaN,b=>b.affixes[0].value=.001,b=>b.affixes[0].target='qi',
   b=>b.affixes[0].type='attack',b=>b.category=category==='armor'?'ring':'armor',b=>b.quality=2,
   b=>b.id='basic-ring',b=>b.refine=5,b=>b.locked=1,b=>b.counter=0,b=>b.definitionId='unknown']){
   const b=clone(a);mutate(b);assert.equal(validateEquipment(b),false,JSON.stringify(b))
  }
  const ordered=clone(a);ordered.affixes.reverse();assert.ok(validateEquipment(ordered))
 }
 for(const bad of [null,{},[],{category:'armor',affixes:null}])assert.equal(validateEquipment(bad),false)
 for(const n of [-1,1,NaN,Infinity,'0'])assert.throws(()=>rollEquipment('ring','fan',1,()=>n,'bad'))
 assert.throws(()=>createBasicEquipment('weapon'))
 assert.throws(()=>rollEquipment('ring','di',1,()=>0,'bad'))
 assert.throws(()=>rollEquipment('armor','fan',0,()=>0,'bad'))
 assert.throws(()=>armorModifiers(createBasicEquipment('ring')))
 assert.throws(()=>ringDamageModifiers(createBasicEquipment('armor')))
})

test('armor provides physical defense and periodic recovery with no delayed hit-trigger allowance',()=>{
 for(const tier of ['fan','fa','bao','ling'])for(let q=1;q<=4;q++){
  if(tier==='fan'&&q>1)continue
  const a=rollEquipment('armor',tier,q,()=>1-Number.EPSILON,'armor'),m=armorModifiers(a)
  assert.ok(m.physicalDefense>0);assert.equal(m.magicDefense,0)
  assert.ok(m.healthRegen>=.2&&m.healthRegen<=.8)
  assert.equal(m.hpBonus,0)
  for(const removed of ['healFraction','healDelay','healCooldown','healFloorCap'])assert.equal(removed in m,false)
  const lines=equipmentDescription(a).join(' ')
  assert.match(lines,/气血回复 \+[\d.]+%\/3秒/)
  assert.doesNotMatch(lines,/吸血|反伤|会心|暴击|每层回复/)
  assert.equal(equipmentSummary(a).categoryName,'防具')
 }
})

test('ring base bonuses and descriptions use actual values without mutation',()=>{
 for(const category of ['armor','ring'])for(const tier of ['fan','fa','bao','ling'])for(let q=1;q<=4;q++){
  if(tier==='fan'&&q>1)continue
  const a=rollEquipment(category,tier,q,()=>0,'ui')
  if(category==='ring'){
   const after=ringDamageModifiers(a)
   assert.ok(after.critChance>0);assert.ok(after.critBonus>0)
   assert.equal(after.special,0)
  }
  const before=JSON.stringify(a),summary=equipmentSummary(a)
  assert.equal(summary.name,equipmentName(a));assert.deepEqual(summary.lines,equipmentDescription(a))
  summary.affixes[0].value=999;summary.lines.push('changed');assert.equal(JSON.stringify(a),before)
  if(category==='ring')assert.doesNotMatch(equipmentDescription(a).join(' '),/恢复|减伤|吸血|攻击力/)
 }
})


test('new equipment rejects all nonzero refinement and exports immutable base ranges',()=>{
 for(const category of ['armor','ring'])for(const tier of ['fan','fa','bao','ling'])for(let q=1;q<=4;q++){
  if(tier==='fan'&&q>1)continue
  const a=rollEquipment(category,tier,q,()=>0,'unrefined')
  assert.equal(a.refine,0);assert.doesNotMatch(equipmentDescription(a).join(' '),/强化/)
  const ranges=category==='armor'?ARMOR_AFFIX_RANGES:RING_AFFIX_RANGES
  assert.ok(Object.isFrozen(ranges));assert.ok(Object.isFrozen(ranges[tier][q]))
  assert.equal(Object.prototype.hasOwnProperty.call(ranges[tier][q],'refine'),false)
  for(const refine of [1,2,3,4,5,-1,.1,'0',null])assert.equal(validateEquipment({...a,refine}),false)
 }
})
