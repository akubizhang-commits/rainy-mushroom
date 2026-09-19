import { EXPLORATION_SPECIES, SPECIES_BY_ID } from './explorationData.js'
import { SeededRandom } from '../core/Random.js'

// These are game weights, never estimates of wild abundance or conservation status.
export const ENCOUNTER_WEIGHTS=Object.freeze({1:60,2:25,3:10,4:5})
export const IDENTIFICATION_GATES=Object.freeze({1:0,2:3,3:8,4:15})
const legacy={
 'thelephora-ganbajun':[['pine'],'soil','pine'],
 'tricholoma-matsutake':[['pine','birch','mixed'],'soil','pine'],
 'ophiocordyceps-sinensis':[['alpine'],'soil','none'],
 'amanita-exitialis':[['pine'],'soil','broadleaf'],
 'amanita-muscaria':[['birch','mixed'],'soil','mixed'],
 'coprinus-comatus':[['meadow','edge'],'litter','none'],
 'pleurotus-citrinopileatus':[['birch','mixed','river','meadow'],'wood','broadleaf'],
 'trametes-versicolor':[['pine','birch','mixed','river','oak','edge','meadow'],'wood','broadleaf'],
 'hericium-erinaceus':[['mixed','river','oak'],'wood','broadleaf'],
 'amanita-pallidorosea':[['mixed','river'],'soil','broadleaf'],
 'armillaria-gallica':[['oak','edge','river'],'buriedWood','broadleaf'],
 'amanita-caesareoides':[['oak'],'soil','oak'],
 'lepiota-brunneoincarnata':[['meadow','edge'],'litter','none']
}
export function speciesHabitat(species){
 const info=legacy[species.id]
 return info?{habitats:info[0],substrate:info[1],host:info[2]}:{habitats:species.habitats,substrate:species.substrate,host:species.host}
}
export function poolForScene(scene){
 return EXPLORATION_SPECIES.filter(s=>speciesHabitat(s).habitats.includes(scene.environment)).map(species=>({
   speciesId:species.id,weight:ENCOUNTER_WEIGHTS[species.rarity]*
    ((scene.poolFocus==='wood'&&speciesHabitat(species).substrate==='wood')||
     (scene.poolFocus==='soil'&&speciesHabitat(species).substrate==='soil')||
     (scene.poolFocus==='ground'&&speciesHabitat(species).substrate!=='wood')?1.6:1),
   // Every map has a starting species even when its documented pool is narrow.
   unlockAt:species.id===scene.spawns[0].speciesId?0:IDENTIFICATION_GATES[species.rarity],
   ...speciesHabitat(species)
 }))
}
export function identifiedCount(profile){return EXPLORATION_SPECIES.filter(s=>profile.collection?.[s.id]?.identified).length}
export function drawSceneSpecies(scene,profile,visit){
 const pool=poolForScene(scene),eligible=pool.filter(e=>e.unlockAt<=identifiedCount(profile))
 const rng=new SeededRandom(`ecology-v1:${scene.id}:${visit}`),draw=items=>{
   let value=rng.next()*items.reduce((n,e)=>n+e.weight,0)
   return items.find(e=>(value-=e.weight)<0)||items[items.length-1]
 }
 const found=profile.sceneDiscoveries?.[scene.id]||[],unseen=eligible.filter(e=>!found.includes(e.speciesId))
 const selected=[]
 if(visit===1)selected.push(eligible.find(e=>e.speciesId===scene.spawns[0].speciesId))
 // One weighted unseen slot avoids repeated visits with no new eligible species.
 const candidates=unseen.filter(e=>!selected.some(s=>s.speciesId===e.speciesId))
 if(candidates.length)selected.push(draw(candidates))
 while(selected.length<10){
   let choices=eligible.filter(e=>!selected.some(s=>s.speciesId===e.speciesId))
   if(!choices.length)choices=eligible
   selected.push(draw(choices))
 }
 // Preserve a ground specimen away from the easy entry pickup so the
 // brushing interaction does not disappear as wood-species pools expand.
 const ground=eligible.find(e=>e.substrate!=='wood')
 if(ground&&!selected.slice(1).some(e=>e.substrate!=='wood'))selected[selected.length-1]=ground
 return selected.map((entry,index)=>({...scene.spawns[index],speciesId:entry.speciesId,
   substrate:entry.substrate,host:entry.host,cover:entry.substrate==='wood'?'log':entry.host==='pine'?'needles':'leaves',
   visibility:SPECIES_BY_ID[entry.speciesId].rarity>=3?'hidden':'easy'}))
}
