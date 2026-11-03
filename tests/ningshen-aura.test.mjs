import test from 'node:test';
import assert from 'node:assert/strict';
import {NingshenAuraState} from '../js/xianxia/TowerNingshen.js';
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js';
const state=()=>({time:1,phase:'playing',player:{x:10,y:20,hp:100},loadout:{passive:{sj_spirit:1}},effects:[]});
test('idle visual is read-only and freezes with simulation time',()=>{
 const m=new NingshenAuraState(),s=state(),before=JSON.stringify(s),a=m.sample(s);assert.ok(a.visible);assert.equal(a.scale,1);assert.deepEqual(m.sample(s),a);assert.equal(JSON.stringify(s),before);
 s.player.x+=20;assert.equal(m.sample(s).x,a.x+20);s.time+=.25;assert.notEqual(m.sample(s).frame,a.frame);
});
test('only collected ground heals pulse, contract and settle; other heals do not',()=>{
 const m=new NingshenAuraState(),s=state(),base=m.sample(s).alpha;
 for(const kind of ['armor_heal','player_hit','hit']){s.effects=[{kind,amount:10,startedAt:1}];assert.equal(m.sample(s).alpha,base)}
 s.effects=[{kind:'heal_pickup',collectedAmount:10,amount:0,startedAt:1}];assert.ok(m.sample(s).alpha>base);
 s.time=1.2;s.effects=[];assert.ok(m.sample(s).scale<1);assert.deepEqual(m.sample(s),m.sample(s));s.time=1.8;assert.equal(m.sample(s).scale,1);assert.equal(m.sample(s).alpha,base);
 s.player.hp=0;assert.equal(m.sample(s).visible,false);s.player.hp=100;s.loadout.passive={};assert.equal(m.sample(s).visible,false);
 assert.equal(m.sample(state()).alpha,base);
});
test('real drop consumption not expiration emits one event, no repeated healing, valid snapshot',()=>{
 const run=new TowerRun({attemptId:1,floor:1,seed:123,hp:37,xp:0,normalCoreCounter:0,loadout:{active:{sj_yujian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}});
 const s=run.state,p=s.player;s.loadout.passive.sj_spirit=1;p.hp=p.maxHp-20;
 s.drops=[{id:'heal-test',kind:'heal',x:p.x,y:p.y,radius:8,amount:10,expiresAt:s.time+10},{id:'expired-test',kind:'heal',x:p.x,y:p.y,radius:8,amount:10,expiresAt:s.time}];
 const hp=p.hp;run._drops();assert.equal(p.hp,hp+10);assert.equal(s.effects.filter(e=>e.kind==='heal_pickup').length,1);run._drops();assert.equal(p.hp,hp+10);assert.equal(s.effects.filter(e=>e.kind==='heal_pickup').length,1);
 delete s.loadout.passive.sj_spirit;assert.ok(validateTowerSnapshot(run.snapshot()));
});
