import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
import {GROWTH_SKILLS,GROWTH_EVOLUTIONS,GROWTH_STAGES} from '../js/xianxia/TowerGrowth.js'

const code = name => stripTypeScriptTypes(readFileSync(new URL(`../cocos-pilot/assets/scripts/${name}.ts`,import.meta.url),'utf8')
 .replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
const catalog=runInNewContext(`(()=>{${code('TowerSkillTreeCatalog')};return {DISPLAY_STAGES,FUTURE_SKILLS,TREE_COLUMNS:typeof TREE_COLUMNS==='undefined'?[]:TREE_COLUMNS}})()`,{GROWTH_STAGES})
const {layoutSkillTree}=runInNewContext(`(()=>{${code('TowerSkillTreeLayout')};return {layoutSkillTree}})()`,catalog)
const definitions=[...GROWTH_SKILLS,...GROWTH_EVOLUTIONS,...catalog.FUTURE_SKILLS]
const draw=(options={},width=720,defs=definitions)=>layoutSkillTree(defs,catalog.DISPLAY_STAGES,width,options)

test('heart appears in the early golden core passive column',()=>{
 const position=draw().positions.sj_heart
 assert.equal(position.stageId,'jindan-early')
 assert.equal(position.column,4)
})

test('every current skill stays at its approved phase and column, with genuine blank cells',()=>{
 const layout=draw()
 const expected=[
  ['sj_arc','lianqi-early',1],['sj_moon','lianqi-middle',1],['sj_moon_triple','zhuji-early',1],['sj_sancai','zhuji-early',3],['sj_wanjian','lianqi-middle',3],['sj_qinglian','lianqi-peak',3],['sj_spirit','zhuji-early',4],
  ['sj_yujian','lianqi-early',2],['vajra','lianqi-middle',4],
  ['sj_cross','zhuji-middle',1],['sj_heart','jindan-early',4],
  ['sj_line','jindan-early',1],['sj_formation','zhuji-peak',3],['sj_shadow','zhuji-early',2],['sj_flight','zhuji-early',0],
  ['sj_bone','lianqi-early',4],['sj_mark','lianqi-peak',0],['sj_gate','zhuji-peak',0],
  ['evo_wanjian','jindan-early',2],['evo_tiandi','jindan-middle',1],['evo_wuwo','jindan-early',3],['evo_sixiang','jindan-peak',3],
 ]
 assert.equal(layout.columns,5)
 assert.equal(Object.keys(layout.positions).length,22)
 for(const [id,stage,column] of expected){
  assert.equal(layout.positions[id].stageId,stage,id)
  assert.equal(layout.positions[id].column,column,id)
 }
 assert.equal(layout.groups.filter(g=>!g.future).flatMap(g=>g.lanes).length,9)
 assert.deepEqual(Array.from(layout.columnHeaders,c=>c.name),['通用','剑气','御剑','剑阵','心法'])
})

test('future realms collapse independently without moving any current skill',()=>{
 const before=draw(),after=draw({expandedRealms:['元婴']})
 assert.equal(before.positions.future_taixu,undefined)
 assert.ok(after.positions.future_taixu)
 assert.equal(after.positions.future_shenxiao,undefined)
 assert.equal(after.groups.find(g=>g.realm==='元婴').lanes.length,3)
 for(const d of [...GROWTH_SKILLS,...GROWTH_EVOLUTIONS])
  assert.deepEqual(after.positions[d.id],before.positions[d.id])
 assert.ok(after.height>before.height)
})

test('only the selected real evolution relation is highlighted, with no implied same-column prerequisites',()=>{
 assert.equal(draw().edges.length,0)
 assert.equal(draw({selectedId:'sj_arc'}).edges.length,0)
 for(const [base,evolution] of [['sj_yujian','evo_wanjian'],['sj_wanjian','evo_wuwo'],['sj_line','evo_tiandi'],['sj_formation','evo_sixiang']]){
  for(const id of [base,evolution]){
   const layout=draw({selectedId:id})
   assert.equal(layout.edges.length,1,id)
   assert.equal(layout.edges[0].from,base)
   assert.equal(layout.edges[0].to,evolution)
   assert.equal(layout.edges[0].kind,'parent')
   assert.ok(layout.edges[0].points.length>=2)
   // Axis-aligned route must not run through another skill's card.
   const points=layout.edges[0].points
   for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i]
    for(const p of Object.values(layout.positions).filter(p=>![base,evolution].includes(p.id))){
     const left=p.x-p.width/2,right=p.x+p.width/2,bottom=p.top+p.height
     if(a.x===b.x) assert.ok(!(a.x>left&&a.x<right&&Math.max(a.y,b.y)>p.top&&Math.min(a.y,b.y)<bottom),`${id} crosses ${p.id}`)
     if(a.y===b.y) assert.ok(!(a.y>p.top&&a.y<bottom&&Math.max(a.x,b.x)>left&&Math.min(a.x,b.x)<right),`${id} crosses ${p.id}`)
    }
   }
  }
 }
})

test('five columns fit the viewport; source order and learning state never rearrange positions',()=>{
 const before=JSON.stringify({definitions,stages:catalog.DISPLAY_STAGES})
 const narrow=draw({},400),wide=draw({},1500),reversed=draw({},400,[...definitions].reverse())
 assert.equal(narrow.width,400)
 for(const d of [...GROWTH_SKILLS,...GROWTH_EVOLUTIONS]){
  assert.deepEqual(narrow.positions[d.id],reversed.positions[d.id])
  assert.equal(wide.positions[d.id].stageId,narrow.positions[d.id].stageId)
  assert.equal(wide.positions[d.id].column,narrow.positions[d.id].column)
 }
 assert.equal(JSON.stringify({definitions,stages:catalog.DISPLAY_STAGES}),before)
})

 test('multiple skills in one category stack without overlaps and never exceed five per row',()=>{
 const layout=draw({},520,[...definitions,{id:'extra_passive',kind:'passive'}])
 const custom=layoutSkillTree([...definitions,{id:'extra_passive',kind:'passive'}],catalog.DISPLAY_STAGES.map(s=>s.id==='lianqi-early'?{...s,skillIds:[...s.skillIds,'extra_passive']}:s),520)
 const a=custom.positions.sj_bone,b=custom.positions.extra_passive
 assert.equal(b.column,4)
 assert.ok(b.top>=a.top+a.height)
 assert.equal(custom.labelWidth,0)
 for(const p of Object.values(custom.positions)){assert.ok(p.x-p.width/2>=0);assert.ok(p.x+p.width/2<=520)}
 })

// 85号：分光连斩归入御剑栏，御剑飞行仍在通用栏。
test('flight stays in the general lane while the shadow skill joins the yujian column',()=>{
 const layout=draw()
 const flight=layout.positions.sj_flight,shadow=layout.positions.sj_shadow
 assert.equal(flight.column,0)
 assert.equal(shadow.column,2)
 assert.equal(flight.stageId,'zhuji-early')
 assert.equal(shadow.stageId,'zhuji-early')
})
