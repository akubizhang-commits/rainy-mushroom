import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync,existsSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
import {WEAPONS} from '../js/xianxia/TowerWeapons.js'

const root=new URL('../',import.meta.url)
function fixture(){
 const requests=[]
 const source=readFileSync(new URL('cocos-pilot/assets/scripts/TowerCharacterArt.ts',root),'utf8')
 const code=stripTypeScriptTypes(source.replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
 class Color {}
 class WeaponQualityArt {}
 const Art=runInNewContext(`(()=>{${code};return TowerCharacterArt})()`,{
  Color,WeaponQualityArt,ImageAsset:class {},resources:{load:(path)=>requests.push(path)},
 })
 const art=new Art()
 art.heldHilt={node:{active:true}}
 art.heldBlade={node:{active:true}}
 return {art,requests}
}

test('each existing weapon illustration requests its own held image instead of the generic sword',()=>{
 const {art,requests}=fixture()
 const ids=readdirSync(new URL('cocos-pilot/assets/resources/tower-library-items/',root))
  .filter(name=>/^eq_sword_.*\.png$/.test(name)).map(name=>name.slice(0,-4))
 assert.ok(ids.length>0)
 for(const id of ids){
  art.drawHeld(id,[0,0],1,0,1)
  assert.ok(requests.includes('tower-held-weapons-v2/'+id),`No dedicated held image requested for ${id}`)
  assert.ok(existsSync(new URL(`cocos-pilot/assets/resources/tower-held-weapons-v2/${id}.png`,root)),`Missing runtime image for ${id}`)
 }
 assert.equal(new Set(requests).size,ids.length)
 for(const id of ids)art.drawHeld(id,[0,0],1,0,1)
 assert.equal(requests.length,ids.length,'do not request again every frame')
})

test('pending or unavailable art hides both old slices and uses fallback',()=>{
 const {art,requests}=fixture()
 assert.equal(art.drawHeld('eq_sword_guiyan',[0,0],1,0,1),false)
 assert.equal(art.heldHilt.node.active,false)
 assert.equal(art.heldBlade.node.active,false)
 art.heldHilt.node.active=art.heldBlade.node.active=true
 assert.equal(art.drawHeld('unknown-weapon',[0,0],1,0,1),false)
 assert.equal(art.heldHilt.node.active,false)
 assert.equal(art.heldBlade.node.active,false)
 assert.ok(!requests.some(path=>path.includes('unknown-weapon')))
})

test('all dedicated held resources correspond to valid equipment definitions',()=>{
 const ids=new Set(WEAPONS.map(w=>w.id))
 for(const name of readdirSync(new URL('cocos-pilot/assets/resources/tower-held-weapons-v2/',root))){
  if(name.endsWith('.png'))assert.ok(ids.has(name.slice(0,-4)),name)
 }
})
