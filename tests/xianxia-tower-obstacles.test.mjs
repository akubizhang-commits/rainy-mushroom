import test from 'node:test';
import assert from 'node:assert/strict';
import {TOWER_PILLARS,clearPillars,clipPillars,pushFromPillars,steerPillars} from '../js/xianxia/TowerObstacles.js';
test('three spaced obstacles leave center and portals open',()=>{
 assert.equal(TOWER_PILLARS.length,3);assert.ok(clearPillars({x:33,y:-60},42));
 for(const p of TOWER_PILLARS)assert.equal(clearPillars(p,18),false);
});
test('swept rays stop fast projectiles and enlarged bodies at first stone',()=>{
 const p=TOWER_PILLARS[0],a={x:p.x-200,y:p.y};
 assert.ok(Math.abs(clipPillars(a,1,0,400,7)-(200-71.8-7*Math.hypot(25,5)/25))<1e-7);
 const b={...p,radius:42};pushFromPillars(b);assert.ok(clearPillars(b,42));
});
test('steering routes a large monster around a pillar without overlap',()=>{
 const p=TOWER_PILLARS[0],a={x:p.x-220,y:p.y,radius:42},target={x:p.x+220,y:p.y};
 for(let i=0;i<600&&Math.hypot(a.x-target.x,a.y-target.y)>5;i++){
  const d=steerPillars(a,target,42);a.x+=d.x*3;a.y+=d.y*3;pushFromPillars(a);assert.ok(clearPillars(a,42));
 }
 assert.ok(Math.hypot(a.x-target.x,a.y-target.y)<8);
});
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js';
const make=()=>new TowerRun({attemptId:1,floor:1,seed:123,hp:100,xp:0,normalCoreCounter:0,arenaVersion:1,loadout:{active:{sj_yujian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}});
test('player movement stops at pillar, spawn reservations reject stone, save replays exactly',()=>{
 const run=make(),o=TOWER_PILLARS[0];run.setPlaytestAssist(true);
 Object.assign(run.state.player,{x:o.x-150,y:o.y});run.setInput(1,0);
 for(let i=0;i<40;i++)run.advance(1/60);
 assert.ok(clearPillars(run.state.player,run.state.player.radius));
 assert.ok(run.state.player.x<o.x-70);
 assert.equal(run._spawnSafe(o,24),false);assert.ok(validateTowerSnapshot(run.snapshot()));
 const restored=TowerRun.restore(run.snapshot());restored.setPlaytestAssist(true);
 run.advance(.1);restored.advance(.1);assert.deepEqual(run.snapshot(),restored.snapshot());
});
test('auto target and fast projectiles cannot hit through a pillar',()=>{
 const run=make(),o=TOWER_PILLARS[0];Object.assign(run.state.player,{x:o.x-150,y:o.y});
 run.state.enemies=[{id:'test',hp:100,x:o.x+150,y:o.y,radius:24}];
 assert.equal(run._targets(run.state.player,500).length,0);
 run.state.projectiles=[{id:'shot',x:o.x-150,y:o.y,vx:24000,vy:0,radius:7,damage:100,hostile:false,source:'sj_yujian',hitIds:[],expiresAt:10}];
 const hits=[];run._projectiles([],hits,run.state.player);assert.equal(hits.length,0);assert.equal(run.state.projectiles.length,0);
});
test('large monsters route to a reachable attack position when player hugs a pillar',()=>{
 const p=TOWER_PILLARS[0],a={x:p.x,y:p.y+190,radius:42},target={x:p.x,y:p.y-83};
 const initial={...target};
 for(let i=0;i<600&&Math.hypot(a.x-target.x,a.y-target.y)>50;i++){
  const d=steerPillars(a,target,42);assert.ok(Math.hypot(d.x,d.y)>.9,'route must not freeze');
  a.x+=d.x*3;a.y+=d.y*3;pushFromPillars(a);
 }
 assert.ok(Math.hypot(a.x-target.x,a.y-target.y)<=50);assert.deepEqual(target,initial);
});
test('web slow does not cross a solid pillar',()=>{
 const run=make(),p=run.state.player,o=TOWER_PILLARS[0];
 Object.assign(p,{x:o.x,y:o.y-90});run.setInput(1,0);const x=p.x;
 run.state.zones=[{id:'web',kind:'web',phase:'active',x:o.x,y:o.y+90,radius:240,hostile:true,damage:0,ticks:1,nextAt:100,interval:1,expiresAt:10}];
 run.advance(1/60);assert.ok(Math.abs(p.x-x-p.moveSpeed/60)<1e-7);
});
test('floor below visible pillar base is walkable, base interior still blocks',()=>{
 const o=TOWER_PILLARS[0];
 assert.ok(clearPillars({x:o.x,y:o.y-66},18),'no invisible circular wall below base');
 assert.equal(clearPillars({x:o.x,y:o.y-20},18),false);
 const a={x:o.x,y:o.y-66,radius:18};pushFromPillars(a);assert.equal(a.y,o.y-66);
});
