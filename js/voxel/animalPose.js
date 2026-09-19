export function animalParts(actor,model){
  const feeding=actor.mode==='eat'||actor.grazing,deer=actor.kind==='deer'
  const parts=[{key:'body',geometry:model.bodyGeometry,offset:[0,0,0],pitch:model.head?0:feeding?.12+Math.sin(actor.phase)*.04:0}]
  if(model.head)parts.push({key:'head',geometry:model.headGeometry,offset:model.headPivot,
    pitch:feeding?(model.headDip??.63)+Math.sin(actor.phase*1.6)*.035:actor.mode==='flee'?-.10:Math.sin(actor.phase*.7)*.025})
  model.hips.forEach((hip,i)=>parts.push({key:'leg',offset:hip,pitch:actor.moving?Math.sin(actor.phase+(i===0||i===3?0:Math.PI))*(model.stride??(deer?(actor.mode==='flee'?.38:.25):.38)):0}))
  return parts
}
export function animalMatrix(actor,offset=[0,0,0],pitch=0){
  const c=Math.cos(actor.yaw),s=Math.sin(actor.yaw),a=Math.cos(pitch),b=Math.sin(pitch)
  const bob=actor.kind==='deer'?(actor.moving?Math.sin(actor.phase*2)*.006:Math.sin(actor.phase)*.003):actor.moving?Math.sin(actor.phase*2)*.018:actor.mode==='eat'?-Math.abs(Math.sin(actor.phase))*.045:0
  return new Float32Array([c,0,-s,0,s*b,a,c*b,0,s*a,-b,c*a,0,actor.x+c*offset[0]+s*offset[2],actor.y+offset[1]+bob,actor.z-s*offset[0]+c*offset[2],1])
}
