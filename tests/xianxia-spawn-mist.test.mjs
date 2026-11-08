import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnMistPortals} from '../js/xianxia/TowerSpawnMist.js';
import {FLOOR01} from '../js/xianxia/TowerContent.js';
const north=FLOOR01.arena.portals[0],east=FLOOR01.arena.portals[2];
const state=(extra={})=>({phase:'playing',pending:[],reserved:[],...extra});
test('one cloud per exit despite many reservations and queued monsters',()=>{
 const s=state({pending:[{portal:'N'},{portal:'N'}],reserved:north.candidates.slice(0,3).map(p=>({...p,portal:'N'}))});
 assert.deepEqual(spawnMistPortals(s).map(p=>p.id),['N']);
});
test('cloud persists between monsters and ends when queue and reservations empty',()=>{
 assert.equal(spawnMistPortals(state({pending:[{portal:'N'}]})).length,1);
 assert.equal(spawnMistPortals(state({reserved:[{...north,portal:'N'}]})).length,1);
 assert.equal(spawnMistPortals(state({enemies:[{...north}]})).length,0);
});
test('relocated spawn uses actual exit, not planned exit',()=>{
 assert.deepEqual(spawnMistPortals(state({reserved:[{...east,portal:'N'}]})).map(p=>p.id),['E']);
});
test('unreleased reinforcements and finished battles do not emit mist; pause preserves it',()=>{
 const pending=[{portal:'N',trigger:'half'}];
 assert.equal(spawnMistPortals(state({pending})).length,0);
 assert.equal(spawnMistPortals(state({pending,supportReleased:true,phase:'paused'})).length,1);
 assert.equal(spawnMistPortals(state({pending,supportReleased:true,phase:'won'})).length,0);
});
