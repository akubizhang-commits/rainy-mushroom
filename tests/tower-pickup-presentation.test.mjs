import test from 'node:test'
import assert from 'node:assert/strict'

// Dynamic import lets the first run report the missing feature as an assertion.
const mod=await import('../js/xianxia/TowerPickupPresentation.js').catch(()=>({}))
const event=(id,amount=1)=>({id,kind:'resource_pickup',lootKind:'core',amount,startedAt:1,expiresAt:2})
test('arrival feedback ignores persisted effects on restore but shows subsequent arrivals',()=>{
 assert.equal(typeof mod.PickupFeedback,'function')
 const feedback=new mod.PickupFeedback(),s={phase:'paused',time:1.1,effects:[event('saved')]}
 assert.deepEqual(feedback.sample(s),[])
 s.effects.push(event('new',3));assert.equal(feedback.sample(s)[0].amount,3)
 const restored=structuredClone(s);assert.deepEqual(feedback.sample(restored),[])
 restored.effects.push(event('next',5));assert.equal(feedback.sample(restored)[0].amount,5)
 feedback.reset();assert.deepEqual(feedback.sample(restored),[])
})
test('arrival grouping expires with simulation time, and terminal screens do not replay it',()=>{
 assert.equal(typeof mod.PickupFeedback,'function')
 const feedback=new mod.PickupFeedback(),s={phase:'playing',time:1,effects:[]};feedback.sample(s)
 s.effects.push(event('a',2),event('b',3))
 assert.equal(feedback.sample(s)[0].amount,5)
 s.time=2;assert.deepEqual(feedback.sample(s),[])
 s.time=1.5;s.phase='abandoned';assert.deepEqual(feedback.sample(s),[])
})
test('label budget preserves seven arrival and critical slots even with 97 visible stacks',()=>{
 assert.equal(typeof mod.pickupLabelBudget,'function')
 const drops=Array.from({length:97},(_,i)=>({receipts:[String(i)],x:160+(i%12)*35,y:-200+Math.floor(i/12)*35}))
 assert.equal(mod.pickupLabelBudget(drops,{x:0,y:0},1280,720),104)
 assert.equal(mod.pickupLabelBudget([...drops,{receipts:['offscreen'],x:9000,y:0}],{x:0,y:0},1280,720),104)
})
