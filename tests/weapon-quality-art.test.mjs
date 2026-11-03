import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'

class Color {constructor(r,g,b,a){Object.assign(this,{r,g,b,a})}}
class Graphics {
 commands=[]
 clear(){this.commands=[]}
 moveTo(x,y){this.commands.push(['move',x,y])}
 lineTo(x,y){this.commands.push(['line',x,y])}
 stroke(){this.commands.push(['stroke',this.lineWidth,{...this.strokeColor}])}
 circle(x,y,r){this.commands.push(['circle',x,y,r])}
 fill(){this.commands.push(['fill',{...this.fillColor}])}
}
function fixture(){
 const code=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/WeaponQualityArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
 const Art=runInNewContext(`(()=>{${code};return WeaponQualityArt})()`,{Color,Graphics})
 return {art:new Art(),light:new Graphics(),trail:new Graphics()}
}
const input=(patch={})=>({id:'suwen',quality:4,time:1,guard:[10,20],direction:[1,0],length:74,scale:.675,edge:1.5,warm:false,active:false,binding:'ground-right',...patch})
test('only valid middle/higher quality draws light, without mutating the input',()=>{
 const {art,light,trail}=fixture()
 for(const q of [undefined,null,0,1,-1,5,2.5,NaN]){
  art.draw(light,trail,input({quality:q}));assert.equal(light.commands.length,0);assert.equal(trail.commands.length,0)
 }
 for(const q of [2,3,4]){
  const p=input({quality:q,time:.6}),before=JSON.stringify(p)
  art.draw(light,trail,p);assert.ok(light.commands.length>0);assert.equal(JSON.stringify(p),before)
 }
})
test('simulation pause preserves exact light and trail geometry; rendering is deterministic',()=>{
 const {art,light,trail}=fixture()
 for(let n=0;n<12;n++)art.draw(light,trail,input({active:true,time:.4+n*.01}))
 art.draw(light,trail,input({active:true,time:.55,direction:[0,1]}))
 assert.ok(trail.commands.length>0)
 const old=JSON.stringify([light.commands,trail.commands])
 for(let i=0;i<5;i++)art.draw(light,trail,input({active:true,time:.55,direction:[0,1]}))
 assert.equal(JSON.stringify([light.commands,trail.commands]),old)
})
test('switching weapons, quality, binding or rewinding time removes stale trails',()=>{
 const {art,light,trail}=fixture()
 for(const patch of [{id:'other'},{quality:3},{binding:'seal-left'},{time:.1}]){
  art.reset();art.draw(light,trail,input({active:true,time:.5}));art.draw(light,trail,input({active:true,time:.55}))
  assert.ok(trail.commands.length)
  art.draw(light,trail,input({active:true,time:.6,...patch}));assert.equal(trail.commands.length,0)
 }
 art.draw(light,trail,input({active:false}));assert.equal(trail.commands.length,0)
 art.reset();art.draw(light,trail,input({active:true}));assert.equal(trail.commands.length,0)
})
test('middle grade leaves no trail and stale or invalid inputs cannot retain effects',()=>{
 const {art,light,trail}=fixture()
 art.draw(light,trail,input({quality:2,active:true,time:.5}))
 art.draw(light,trail,input({quality:2,active:true,time:.6}));assert.equal(trail.commands.length,0)
 art.draw(light,trail,input({quality:4,active:true,time:1}))
 art.draw(light,trail,input({quality:4,active:true,time:2}));assert.equal(trail.commands.length,0)
 art.draw(light,trail,input({time:NaN}));assert.equal(light.commands.length,0)
})
