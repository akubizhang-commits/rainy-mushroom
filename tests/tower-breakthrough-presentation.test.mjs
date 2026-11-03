import test from 'node:test'
import assert from 'node:assert/strict'
import {breakthroughOptions,ceremonyFrame,levelUpPresentation,CEREMONY_DURATION} from '../js/xianxia/TowerBreakthroughPresentation.js'
test('options combine owned material and legal shop alternative only, with explicit price and balance',()=>{
 const rows=breakthroughOptions({pills:{ningyuan:2},spiritStones:60},1800)
 assert.deepEqual(rows.map(x=>x.id),['ningyuan','zhuji']);assert.equal(rows[0].purchase,false);assert.equal(rows[1].price,60);assert.equal(rows[1].affordable,true)
 assert.deepEqual(breakthroughOptions({pills:{},spiritStones:0},6600).map(x=>[x.id,x.affordable]),[['ningdan',false]])
 assert.equal(breakthroughOptions({pills:{},spiritStones:1000},1801).length,0)
})
test('ceremony stays outcome-neutral until burst, finishes in 3.5 seconds and supports reduced motion',()=>{
 assert.equal(CEREMONY_DURATION,3.5)
 for(const t of [0,.5,1.8])assert.equal(ceremonyFrame(t,true).phase,ceremonyFrame(t,false).phase)
 assert.equal(ceremonyFrame(.5,true).phase,'gather');assert.equal(ceremonyFrame(2.2,true).phase,'burst');assert.equal(ceremonyFrame(3.5,true).done,true)
 const calm=ceremonyFrame(2.2,true,true);assert.equal(calm.flash,0);assert.equal(calm.shake,0)
})
test('small levels name the exact new level, stage crossing strengthens feedback, no popup needed',()=>{
 assert.equal(levelUpPresentation({level:4,realm:'炼气',stage:'中期'},{level:5,realm:'炼气',stage:'中期',label:'炼气五层·中期'}).strong,false)
 assert.equal(levelUpPresentation({level:3,realm:'炼气',stage:'初期'},{level:4,realm:'炼气',stage:'中期',label:'炼气四层·中期'}).strong,true)
 assert.equal(levelUpPresentation({level:4},{level:4}),null)
})
test('runtime cultivation layers produce exact names and stronger phase crossings',()=>{
 assert.deepEqual(levelUpPresentation({level:1,layer:1,realm:'炼气'},{level:2,layer:2,realm:'炼气'}),{name:'炼气二层',strong:false,major:false,levels:1,duration:1.2})
 assert.equal(levelUpPresentation({level:3,layer:3,realm:'炼气'},{level:4,layer:4,realm:'炼气'}).strong,true)
 assert.equal(levelUpPresentation({level:6,layer:6,realm:'筑基'},{level:7,layer:7,realm:'筑基'}).strong,true)
})
