import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { EXPANDED_SPECIES } from '../js/data/speciesExpansion.js'
import { getIdentificationClues } from '../js/data/explorationData.js'

test('all expanded species use two distinct packaged real photos with traceable attribution',()=>{
 const records=JSON.parse(fs.readFileSync('assets/exploration/catalogue-photos/ATTRIBUTION.json','utf8'))
 assert.equal(records.length,EXPANDED_SPECIES.length*2)
 for(const species of EXPANDED_SPECIES){
  assert.equal(species.imageKind,'实拍照片')
  const ids=[]
  for(const [i,path] of species.photos.entries()){
   const photo=records.find(r=>r.localPath===path)
   assert.ok(photo,path);assert.equal(photo.speciesId,species.id)
   assert.ok(['cc-by','cc0'].includes(photo.license));assert.ok(photo.attribution)
   assert.ok(photo.observationUrl.startsWith('https://www.inaturalist.org/observations/'))
   assert.ok(species.photoCredits[i]);ids.push(photo.photoId)
   const bytes=fs.readFileSync(path)
   assert.equal(bytes.readUInt16BE(0),0xffd8)
   assert.ok(bytes.length>5000)
  }
  assert.equal(new Set(ids).size,2)
  assert.equal(getIdentificationClues(species.id)[2].photoIndex,1)
 }
})
