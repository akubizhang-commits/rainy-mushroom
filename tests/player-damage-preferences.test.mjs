import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
const src=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerPreferences.ts',import.meta.url),'utf8'),{mode:'transform'}).replace(/^import .*;$/gm,'').replace(/^export /gm,'')
function load(storage){const ctx={sys:{localStorage:storage}};runInNewContext(src+'\nglobalThis.read=presentationPreferences;globalThis.write=setPresentationPreference;',ctx);return ctx}
test('self damage defaults on, persists independently, and remains unchanged on failed writes',()=>{
 let saved='{"soundVolume":0.5,"reducedMotion":true}',fail=false
 const storage={getItem:()=>saved,setItem:(key,value)=>{if(fail)throw Error('disk');saved=value}}
 const p=load(storage);assert.equal(p.read().playerDamageNumbers,true)
 assert.equal(p.write({playerDamageNumbers:false}),true)
 const reloaded=load(storage);assert.equal(reloaded.read().playerDamageNumbers,false)
 assert.equal(reloaded.read().soundVolume,.5);assert.equal(reloaded.read().reducedMotion,true)
 fail=true;assert.equal(reloaded.write({playerDamageNumbers:true}),false)
 assert.equal(reloaded.read().playerDamageNumbers,false)
})
