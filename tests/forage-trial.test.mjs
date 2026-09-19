import test from 'node:test';
import assert from 'node:assert/strict';
import {ForageTrial,TRIAL_SPECIES} from '../js/trial/ForageTrial.js';
test('covered fungi reveal before pickup; duplicates do not consume capacity',()=>{
 const s=new ForageTrial();const t=s.targets.find(t=>t.covered);assert.equal(s.pick(t.id),'revealed');assert.equal(s.used,0);assert.equal(s.pick(t.id),'collected');const used=s.used;assert.equal(s.pick(t.id),'unavailable');assert.equal(s.used,used);
});
test('full basket preserves target and allows return and repick',()=>{
 const s=new ForageTrial();for(const t of s.targets){s.revealed.add(t.id);s.pick(t.id)}
 assert.ok(s.used<=6);const left=s.targets.find(t=>!s.basket.includes(t.id));const before=s.used;assert.equal(s.pick(left.id),'full');assert.equal(s.used,before);
 for(const id of [...s.basket])assert.equal(s.putBack(id),true);
 assert.equal(s.used,0);assert.equal(s.pick(left.id),'collected');
});
test('all six layouts have an achievable objective within capacity',()=>{
 for(let round=0;round<6;round++){const s=new ForageTrial(round);const wanted=round===0?TRIAL_SPECIES.slice(0,3).map(t=>t.id):s.wanted;
 for(const id of wanted){const t=s.targets.find(t=>t.speciesId===id);assert.ok(t);s.revealed.add(t.id);assert.equal(s.pick(t.id),'collected')}
 assert.equal(s.goalMet,true);assert.ok(s.used<=6);
 }
});
test('settlement is idempotent and does not mutate supplied collection',()=>{
 const shelf=['boletus-edulis'];const s=new ForageTrial(0,shelf);const t=s.targets[0];s.revealed.add(t.id);s.pick(t.id);const result=s.finish();assert.equal(s.finish(),result);assert.deepEqual(shelf,['boletus-edulis']);assert.equal(s.pick(s.targets[1].id),'finished');assert.equal(s.putBack(t.id),false);
});
