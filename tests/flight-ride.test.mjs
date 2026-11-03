import test from 'node:test';
import assert from 'node:assert/strict';
import {flightRidePose} from '../js/xianxia/TowerFlight.js';
const make=()=>({time:1,phase:'playing',player:{x:0,y:0,hp:100,faceX:1},loadout:{passive:{sj_flight:1}}});
test('vertical movement never changes sword heading; left/right match body facing',()=>{
 const s=make();assert.equal(flightRidePose(s).angle,0);s.player.y+=100;assert.equal(flightRidePose(s).angle,0);
 s.player.faceX=-1;assert.equal(flightRidePose(s).angle,180);s.player.y-=200;assert.equal(flightRidePose(s).angle,180);
});
test('ride pose is read-only, frozen during pause and uses shared bob',()=>{
 const s=make(),before=JSON.stringify(s),a=flightRidePose(s);assert.equal(JSON.stringify(s),before);s.phase='paused';assert.deepEqual(flightRidePose(s),a);assert.equal(a.centerY,13+Math.sin(s.time*3)*2);
});
test('death, removal and end of run hide the riding sword',()=>{
 const s=make();s.player.hp=0;assert.equal(flightRidePose(s).visible,false);s.player.hp=10;s.loadout.passive={};assert.equal(flightRidePose(s).visible,false);s.loadout.passive.sj_flight=1;s.phase='lost';assert.equal(flightRidePose(s).visible,false);
});
