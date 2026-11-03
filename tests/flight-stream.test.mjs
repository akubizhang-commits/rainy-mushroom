import test from 'node:test';
import assert from 'node:assert/strict';
import {FlightStreamState,flightPoint} from '../js/xianxia/TowerFlight.js';
const state=()=>({time:1,phase:'playing',player:{x:0,y:0,hp:100},loadout:{passive:{sj_flight:1}}});
test('flight render is read-only and freezes at simulation time',()=>{
 const s=state(),m=new FlightStreamState(),before=JSON.stringify(s),a=m.sample(s);
 assert.ok(a.visible);assert.equal(a.length,70);assert.deepEqual(m.sample(s),a);assert.equal(JSON.stringify(s),before);
});
test('actual movement stretches tail, smooths turns and stopping retracts',()=>{
 const s=state(),m=new FlightStreamState();m.sample(s);
 for(let i=0;i<30;i++){s.time+=1/60;s.player.x+=3;m.sample(s)}
 const moving=m.sample(s);assert.ok(moving.length>220);assert.equal(moving.angle,0);
 s.time+=1/60;s.player.y+=3;const turn=m.sample(s);assert.ok(turn.angle>0&&turn.angle<90);
 for(let i=0;i<90;i++){s.time+=1/60;m.sample(s)}
 assert.ok(m.sample(s).length<71);assert.deepEqual(m.sample(s),m.sample(s));
});
test('teleport, replacement, rewind, death and removal clear movement',()=>{
 const s=state(),m=new FlightStreamState();m.sample(s);s.time+=.1;s.player.x+=10;assert.ok(m.sample(s).strength>0);
 s.time+=.1;s.player.x+=300;assert.equal(m.sample(s).strength,0);
 s.player.hp=0;assert.equal(m.sample(s).visible,false);s.player.hp=10;s.loadout.passive={};assert.equal(m.sample(s).visible,false);
 assert.equal(m.sample(state()).strength,0);s.loadout.passive.sj_flight=1;s.time=0;assert.equal(m.sample(s).strength,0);
 s.phase='lost';assert.equal(m.sample(s).visible,false);
});
test('tip leads and wake stays behind the pommel through all headings and turns',()=>{
 for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,-1]]){
  const s=state(),m=new FlightStreamState();m.sample(s);
  for(let i=0;i<60;i++){
   s.time+=1/60;s.player.x+=dx*3;s.player.y+=dy*3;
   const pose=m.sample(s),a=pose.angle*Math.PI/180,tip=flightPoint(pose.centerX,pose.centerY,a,52);
   const rear=flightPoint(pose.centerX,pose.centerY,a,-44);
   assert.ok(Math.hypot(pose.x-rear.x,pose.y-rear.y)<.001);
   if(i===59){
    assert.ok((tip.x-pose.centerX)*dx+(tip.y-pose.centerY)*dy>0);
    assert.ok((rear.x-pose.centerX)*dx+(rear.y-pose.centerY)*dy<0);
    if(dx===0)assert.ok(pose.length*pose.depth<100,'vertical wake is foreshortened');
   }
  }
  const before=m.sample(s);s.phase='paused';assert.deepEqual(m.sample(s),before);
 }
});
