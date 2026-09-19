// Exact Float32 attributes are shared; color/normal seams and triangle order survive.
export function indexedGeometry(data,kind='forest'){
 const count=data.length/9;if(!Number.isInteger(count))throw Error('Invalid vertex data')
 const bits=new Uint32Array(data.buffer,data.byteOffset,data.length)
 let size=1;while(size<count*2)size*=2
 const table=new Int32Array(size),positions=[],normals=[],colors=[],uvs=[],indices=[]
 for(let vertex=0;vertex<count;vertex++){
  const at=vertex*9;let hash=2166136261
  for(let j=0;j<9;j++)hash=Math.imul(hash^bits[at+j],16777619)
  let slot=hash&(size-1),previous=-1
  while(table[slot]){
   const other=table[slot]-1;let same=true
   for(let j=0;j<9;j++)if(bits[other*9+j]!==bits[at+j]){same=false;break}
   if(same){previous=other;break}slot=(slot+1)&(size-1)
  }
  if(previous>=0){indices.push(indices[previous]);continue}
  table[slot]=vertex+1;indices.push(positions.length/3)
  positions.push(data[at],data[at+1],data[at+2]);normals.push(data[at+3],data[at+4],data[at+5]);colors.push(data[at+6],data[at+7],data[at+8],1)
  uvs.push(kind==='bark'?(data[at]+data[at+2])*.9:data[at]*1.5,kind==='bark'?data[at+1]*.32:data[at+2]*1.5)
 }
 return {positions,normals,colors,uvs,indices}
}
