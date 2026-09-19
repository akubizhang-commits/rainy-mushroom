import test from 'node:test'
import assert from 'node:assert/strict'
import {SPECIES_KNOWLEDGE,KNOWLEDGE_TABS} from '../js/data/speciesKnowledge.js'
import {EXPLORATION_SPECIES} from '../js/data/explorationData.js'
import {ForagingApplication} from '../js/voxel/ForagingApplication.js'
import {EXPLORATION_SCREEN as S} from '../js/core/ExplorationState.js'
import {ForagingState} from '../js/core/ForagingState.js'
import {drawSpeciesKnowledge} from '../js/voxel/SpeciesKnowledgeScreen.js'
const app=()=>Object.assign(Object.create(ForagingApplication.prototype),{state:new ForagingState(),screen:S.COLLECTION,collectionFilter:'all',collectionPage:3,feedback:'',platformApi:{}})
test('every collectible has species-specific knowledge and a traceable HTTPS source',()=>{
 assert.equal(Object.keys(SPECIES_KNOWLEDGE).length,EXPLORATION_SPECIES.length)
 for(const s of EXPLORATION_SPECIES){
  const k=SPECIES_KNOWLEDGE[s.id];assert.ok(k,s.id)
  for(const f of ['form','story','comparison'])assert.ok(k[f].length>=25,`${s.id} ${f}`)
  assert.equal(new URL(k.source.url).protocol,'https:')
 }
 assert.equal(new Set(Object.values(SPECIES_KNOWLEDGE).map(k=>k.story)).size,EXPLORATION_SPECIES.length)
})
test('knowledge tabs unlock after identification and retain collection position',()=>{
 const a=app(),id='tremella-mesenterica';Object.assign(a.state._entry(id),{seen:true,sampled:1})
 a.handleAction(`collection:${id}`);a.handleAction('knowledgeTab:2');assert.equal(a.knowledgeTab,0)
 a.state._entry(id).identified=true;a.handleAction('knowledgeTab:2');assert.equal(a.knowledgeTab,2)
 a.handleAction('knowledgeTab:99');assert.equal(a.knowledgeTab,2)
 a.handleAction('nav:collection');assert.equal(a.collectionPage,3)
 a.handleAction(`collection:${id}`);assert.equal(a.knowledgeTab,2)
 a.state._entry('boletus-edulis').seen=true;a.handleAction('collection:boletus-edulis');assert.equal(a.knowledgeTab,0)
})
test('copy uses selected species source, is gated, and reports success/failure',()=>{
 const a=app(),id='crucibulum-laeve';a.state._entry(id).seen=true;let calls=0
 a.platformApi.setClipboardData=options=>{calls++;assert.equal(options.data,SPECIES_KNOWLEDGE[id].source.url);options.success()}
 a.handleAction(`collection:${id}`);a.handleAction('knowledgeSource:copy');assert.equal(calls,0)
 a.state._entry(id).identified=true;a.handleAction('knowledgeSource:copy');assert.equal(calls,1);assert.match(a.feedback,/已复制/)
 a.platformApi.setClipboardData=options=>options.fail();a.handleAction('knowledgeSource:copy');assert.match(a.feedback,/失败/)
 a.platformApi={};a.handleAction('knowledgeSource:copy');assert.match(a.feedback,/不支持/)
})
test('all four reading tabs display the selected species content and preserve both photos',()=>{
 const a=app(),id='crucibulum-laeve';a.state._entry(id).seen=true;a.state.selectCollectionSpecies(id);a.state._entry(id).identified=true
 for(let tab=0;tab<4;tab++){
  const texts=[],photos=[],buttons=[]
  const r={top:40,logicalHeight:720,_topBar(){},_panel(){},_label:t=>texts.push(t),_wrappedText:t=>texts.push(t),_photo:p=>photos.push(p),_button:(x,y,w,h,label,action)=>buttons.push(action)}
  a.knowledgeTab=tab;drawSpeciesKnowledge(r,a.state,a)
  assert.equal(photos.length,2);assert.equal(buttons.filter(b=>b.startsWith('knowledgeTab:')).length,KNOWLEDGE_TABS.length)
  const k=SPECIES_KNOWLEDGE[id];assert.ok(texts.includes([k.form,k.story,k.comparison,k.source.publisher][tab]))
  assert.equal(buttons.includes('knowledgeSource:copy'),tab===3)
 }
})
