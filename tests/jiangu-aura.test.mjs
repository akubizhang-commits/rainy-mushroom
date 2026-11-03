import test from 'node:test';
import assert from 'node:assert/strict';
import {JianguAuraState} from '../js/xianxia/TowerJiangu.js';
const state=()=>({time:1,phase:'playing',player:{x:10,y:20,hp:100},loadout:{passive:{sj_bone:1}}});
test('idle loop and read-only render freeze at simulation time',()=>{
 const m=new JianguAuraState(),s=state(),before=JSON.stringify(s),a=m.sample(s);
 assert.ok(a.visible);assert.equal(a.trail.length,0);assert.deepEqual(m.sample(s),a);assert.equal(JSON.stringify(s),before);
 s.time+=.25;assert.notEqual(m.sample(s).frame,a.frame);
});
test('actual movement creates a bounded trailing path; pause freezes and stop dissipates',()=>{
 const m=new JianguAuraState(),s=state();m.sample(s);
 for(let i=0;i<20;i++){s.time+=1/60;s.player.x+=4;m.sample(s)}
 const a=m.sample(s);assert.ok(a.trail.length>1);assert.ok(a.trail.length<=32);assert.ok(a.trail.every(p=>p.x<=s.player.x));assert.deepEqual(m.sample(s),a);
 for(let i=0;i<20;i++){s.time+=1/60;m.sample(s)}
 assert.equal(m.sample(s).trail.length,0);
});
test('teleports, death, unlearned skill, replacement and rewind never leave stale tails',()=>{
 const m=new JianguAuraState(),s=state();m.sample(s);s.time+=.016;s.player.x+=3;m.sample(s);
 s.time+=.016;s.player.x+=300;assert.equal(m.sample(s).trail.length,0);
 s.player.hp=0;assert.equal(m.sample(s).visible,false);s.player.hp=10;s.loadout.passive={};assert.equal(m.sample(s).visible,false);
 assert.equal(m.sample(state()).trail.length,0);s.loadout.passive.sj_bone=1;s.time=0;assert.equal(m.sample(s).trail.length,0);
 s.phase='lost';assert.equal(m.sample(s).visible,false);
});
