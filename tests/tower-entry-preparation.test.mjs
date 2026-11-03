import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { floorBreakthroughPreparation } from '../js/xianxia/TowerBreakthrough.js'
import { FLOORS } from '../js/xianxia/TowerContent.js'

test('entry warning follows actual floor XP budget and both realm gates', () => {
  for (const [xp, floor, gate] of [[1350,4,1800],[5500,7,6600],[1800,1,1800],[6600,1,6600]]) {
    const plan=floorBreakthroughPreparation({xp,pills:{}},floor)
    assert.equal(plan.gate,gate)
    assert.equal(plan.missing,true)
  }
  const budget=FLOORS[3].cultivation_xp_budget
  assert.equal(floorBreakthroughPreparation({xp:1800-budget-1,pills:{}},4),null)
  assert.ok(floorBreakthroughPreparation({xp:1800-budget,pills:{}},4))
  assert.equal(floorBreakthroughPreparation({xp:0,pills:{}},1),null)
  assert.equal(floorBreakthroughPreparation({xp:6601,pills:{}},9),null)
  assert.equal(floorBreakthroughPreparation({xp:1800,pills:{}},99),null)
})

test('only directly usable items at the current gate count; advice never spends', () => {
  const state={xp:1350,pills:{chilin:2,huangjing:8,xiaoyue:1,zhuji:2}}
  const before=structuredClone(state),p=floorBreakthroughPreparation(state,4)
  assert.equal(p.missing,false)
  assert.deepEqual(p.items.map(x=>[x.id,x.count]),[['zhuji',2],['ningyuan',0],['xiaoyue',1]])
  assert.deepEqual(state,before)
  assert.equal(floorBreakthroughPreparation({xp:1350,pills:{chilin:2,huangjing:8}},4).missing,true)
  assert.equal(floorBreakthroughPreparation({xp:5500,pills:{zhuji:8}},7).missing,true)
  assert.equal(floorBreakthroughPreparation({xp:5500,pills:{chilin:1}},7).missing,false)
})

const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerView.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
const context={floorBreakthroughPreparation};runInNewContext(source+'\nglobalThis.View=TowerView',context)
function view(pills={}){
  const v=Object.create(context.View.prototype)
  v.store={state:{xp:1350,pills,clearedFloor:3},act:()=>{v.starts++;return {ok:false,reason:'test-stop'}}}
  v.starts=0;v.render=()=>{};v.reason=x=>x
  v.showModal=(title,body,buttons)=>v.modal={title,body,buttons}
  v.goto=page=>v.page=page
  return v
}
test('missing supplies prompt before creating a run; player can prepare or explicitly enter',()=>{
  const v=view();v.enterFloor(4)
  assert.equal(v.starts,0);assert.match(v.modal.body,/即将突破筑基/);assert.match(v.modal.body,/可先准备突破材料/);assert.doesNotMatch(v.modal.body,/丹|%|成功率|修为/)
  v.modal.buttons.find(x=>x.text.includes('丹霞峰')).fn()
  assert.equal(v.page,'pills');assert.equal(v.starts,0)
  v.enterFloor(4);v.modal.buttons.find(x=>x.text.includes('入塔')).fn()
  assert.equal(v.starts,1)
})
test('held items keep the same concise preparation reminder',()=>{
  const v=view({xiaoyue:1});v.enterFloor(4)
  assert.match(v.modal.body,/可先准备突破材料/);assert.doesNotMatch(v.modal.body,/啸月|×|%|失败/);assert.equal(v.starts,0)
})
test('existing run resumes, while low XP and locked floors never show preparation modal',()=>{
  const v=view();let resumed=0;v.store.state.activeRun={};v.resume=()=>resumed++
  v.enterFloor(4);assert.equal(resumed,1);assert.equal(v.modal,undefined);assert.equal(v.starts,0)
  v.store.state.activeRun=null;v.store.state.xp=0;v.enterFloor(1)
  assert.equal(v.modal,undefined);assert.equal(v.starts,1)
  v.store.state.xp=1350;v.enterFloor(9)
  assert.equal(v.modal,undefined);assert.equal(v.starts,2)
})
