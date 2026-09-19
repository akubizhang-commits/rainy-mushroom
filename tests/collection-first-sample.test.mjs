import test from 'node:test'
import assert from 'node:assert/strict'
import {GameSession} from '../js/cocos/GameSession.js'
test('a freshly collected specimen starts with zero clues without restarting the game',()=>{
 const values=new Map(),s=new GameSession({getStorageSync:k=>values.get(k),setStorageSync:(k,v)=>values.set(k,v)})
 s.start();const hit=s.world.targets[0];s.collect(hit);s.collect(hit)
 const id=s.state.sceneData.spawns.find(p=>p.id===hit.id).speciesId;s.openSpecies(id)
 const entry=s.state.getCollectionEntry(id)
 assert.equal(entry.studiedClues,0)
 for(let i=1;i<=3;i++){s.study();assert.equal(entry.studiedClues,i)}
 assert.ok(s.state.collectionCandidates.some(c=>c.id===id));assert.equal(s.identify(id).correct,true)
 s.destroy()
})
