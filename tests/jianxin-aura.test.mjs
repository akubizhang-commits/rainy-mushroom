import test from 'node:test';
import assert from 'node:assert/strict';
import {JianxinAuraState} from '../js/xianxia/TowerJianxin.js';
const state=()=>({time:1,phase:'playing',player:{x:10,y:20,hp:100},loadout:{passive:{sj_heart:1}},effects:[]});
test('aura is deterministic and read only, follows player and freezes with simulation time',()=>{
 const model=new JianxinAuraState(),s=state(),before=JSON.stringify(s);
 const a=model.sample(s);assert.ok(a.visible);assert.deepEqual(model.sample(s),a);assert.equal(JSON.stringify(s),before);
 s.player.x+=30;assert.equal(model.sample(s).x,a.x+30);
 s.time+=.25;assert.notEqual(model.sample(s).frame,a.frame);
});
test('only positive friendly critical hits pulse; pulse persists after event expiry then fades',()=>{
 const m=new JianxinAuraState(),s=state();const base=m.sample(s).alpha;
 s.effects=[{kind:'hit',critical:true,damage:0,startedAt:1}];assert.equal(m.sample(s).alpha,base);
 s.effects=[{kind:'hit',critical:true,damage:1,hostile:true,startedAt:1}];assert.equal(m.sample(s).alpha,base);
 s.effects=[{kind:'hit',critical:true,damage:1,startedAt:1}];assert.ok(m.sample(s).alpha>base);
 s.effects=[];s.time=1.3;assert.ok(m.sample(s).alpha>base);s.time=1.7;assert.equal(m.sample(s).alpha,base);
});
test('death, unlearned skill, terminal phase and state replacement clear pulse',()=>{
 const m=new JianxinAuraState(),s=state();s.effects=[{kind:'hit',critical:true,damage:1,startedAt:1}];m.sample(s);
 const fresh=state();assert.equal(m.sample(fresh).alpha,110);
 fresh.player.hp=0;assert.equal(m.sample(fresh).visible,false);
 fresh.player.hp=1;fresh.loadout.passive={};assert.equal(m.sample(fresh).visible,false);
 fresh.loadout.passive.sj_heart=1;fresh.phase='lost';assert.equal(m.sample(fresh).visible,false);
});
