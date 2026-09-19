import test from 'node:test'
import assert from 'node:assert/strict'
import {indexedGeometry} from '../js/cocos/IndexedGeometry.js'
test('indexed mesh keeps exact triangle attributes, including color and normal seams',()=>{
 const a=[0,0,0,0,1,0,.5,.6,.7],b=[1,0,0,0,1,0,.5,.6,.7],c=[0,0,1,0,1,0,.5,.6,.7];
 const data=new Float32Array([...a,...b,...c,...a,...c,...b,...a.slice(0,6),1,0,0,...a.slice(0,3),0,-1,0,...a.slice(6),...c]);
 for(const kind of ['bark','ground']){const out=indexedGeometry(data,kind);assert.equal(out.indices.length,9);assert.equal(out.positions.length/3,5);
  for(let i=0;i<9;i++){const id=out.indices[i];assert.deepEqual([...out.positions.slice(id*3,id*3+3),...out.normals.slice(id*3,id*3+3),...out.colors.slice(id*4,id*4+3)],Array.from(data.slice(i*9,i*9+9)));assert.equal(out.colors[id*4+3],1)}
 }
})
test('mesh indexing supports nonzero buffer offsets, empty input, and unique vertices',()=>{
 const base=new Float32Array(90);for(let i=0;i<90;i++)base[i]=i;const sub=base.subarray(9,81),out=indexedGeometry(sub);assert.equal(out.positions[0],9);assert.equal(out.indices.length,8);assert.equal(out.positions.length,24);assert.equal(indexedGeometry(new Float32Array()).indices.length,0);assert.throws(()=>indexedGeometry(new Float32Array(8)))
})
