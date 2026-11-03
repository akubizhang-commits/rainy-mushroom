import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { stats as combatStats } from '../js/xianxia/TowerRun.js'
import { createIronWeapon } from '../js/xianxia/TowerWeapons.js'
import { CAMP_PILLS,cultivationAt } from '../js/xianxia/TowerProfile.js'
import {breakthroughOptions} from '../js/xianxia/TowerBreakthroughPresentation.js'
import { breakthroughReady } from '../js/xianxia/TowerBreakthrough.js'
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerView.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
const context={ECONOMY:{storage_cap:999999999},STONE_CAP:999999999,legacyRewardToStones:n=>n,pendingCoreValue:()=>0,splitSpiritStones:()=>[0,0,0,0],UITransform:class{},CAMP_PILLS,cultivationAt,breakthroughReady,breakthroughOptions,combatStats};runInNewContext(source+'\nglobalThis.View=TowerView',context)
function view(pills){const v=Object.create(context.View.prototype);v.run={state:{phase:'paused',wave:13,player:{xp:1800},breakthrough:{safe:true,lastResult:null}}};v.store={state:{pills,contribution:300,spiritStones:300}};v.renderBreakthrough=(model,handlers)=>{v.model=model;v.handlers=handlers};return v}
test('scene offers icon choices and only explicit confirmation attempts breakthrough',()=>{
 const v=view({zhuji:3,ningyuan:1});let attempts=0;v.tryBreakthrough=()=>attempts++
 v.showBreakthrough();assert.equal(attempts,0);assert.equal(v.model.status,'prepare')
 assert.ok(v.model.options.some(x=>x.id==='ningyuan'));v.handlers.select('zhuji');assert.equal(attempts,0)
 assert.equal(v.model.selected,'zhuji');v.handlers.attempt();assert.equal(attempts,1)
})
test('missing items offers priced inline purchase; insufficient funds cannot confirm',()=>{
 const v=view({});let continued=0;v.resume=()=>continued++;v.showBreakthrough()
 assert.match(v.model.actionText,/60灵石/);assert.equal(v.model.canAttempt,true)
 v.store.state.spiritStones=0;v.showBreakthrough();assert.equal(v.model.canAttempt,false)
 v.handlers.resume();assert.equal(continued,1)
})

test('continuing commits the skip decision before the next battle frame',()=>{
 const v=view({});const calls=[];v.pending=null;v.breakthroughLock=0;v.screen='battle';v.training=false
 v.run.resume=()=>{v.run.state.phase='playing';v.run.state.breakthrough.ignoredGate=1800}
 v.run.snapshot=()=>structuredClone(v.run.state)
 v.applyTools=()=>{};v.resetInput=()=>{};v.render=()=>calls.push('render')
 v.persist=action=>{calls.push(action);return true}
 v.resume()
 assert.equal(calls[0].type,'checkpoint');assert.equal(calls[0].snapshot.breakthrough.ignoredGate,1800)
 assert.equal(calls[0].snapshot.phase,'playing')
})

test('success panel shows actual attack and HP changes rather than applying realm percentage to weapon damage',()=>{
 const v=view({});v.run.state.player.xp=1801;v.run.state.loadout={passive:{},weapon:createIronWeapon()}
 v.run.state.breakthrough.lastResult={success:true};v.showBreakthrough()
 assert.match(v.model.detail,/攻击 \d+→\d+/);assert.match(v.model.detail,/气血上限 \d+→\d+/)
 assert.doesNotMatch(v.model.detail,/攻击与生命上限提升35%/)
})

test('failed save never starts a ceremony and an active ceremony prevents a second attempt',()=>{
 const v=view({});let calls=0,shows=0;v.pending=null;v.breakthroughLock=0;v.ceremony=null;v.breakthroughChoice='zhuji';v.run.state.attemptId=1;v.run.state.breakthrough.sequence=0
 v.store.act=()=>{calls++;return {ok:false,reason:'save-failed'}};v.reason=()=> '保存失败';v.showBreakthrough=()=>shows++
 v.tryBreakthrough();assert.equal(calls,1);assert.equal(shows,1);assert.equal(v.ceremony,null)
 v.ceremony={elapsed:.5,success:true};v.tryBreakthrough();assert.equal(calls,1)
})


test('HUD displays contribution after inline purchase and discarded overflow',()=>{
 const v=view({}),node=()=>({active:true,getComponent:()=>({setContentSize(){}}),setPosition(){}});
 v.currencyLabels=Array.from({length:5},()=>({node:node(),string:''}));v.currencyItems=Array.from({length:5},node);
 v.store.state.activeRun={base:{contribution:300,spiritStones:0},spentContribution:60,discardedContribution:20};
 v.run.state.earned={cores:0,contribution:30};v.refreshCurrencyHud();
 assert.equal(v.currencyLabels[4].string,'×250');
});
