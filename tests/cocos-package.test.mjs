import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {packageWechat} from '../scripts/cocos/package-wechat.mjs'
const FIXED=['internal','main']
function withBuild(bundles,run,extra={}){
 const root=mkdtempSync(join(tmpdir(),'rainy-pack-'));try{
  mkdirSync(join(root,'src'));writeFileSync(join(root,'src/settings.json'),JSON.stringify({assets:{projectBundles:bundles}}));writeFileSync(join(root,'game.json'),'{}')
  for(const name of bundles){const path=join(root,'assets',name);mkdirSync(path,{recursive:true});writeFileSync(join(path,'config.json'),JSON.stringify({name}));writeFileSync(join(path,'index.js'),'/* bundle module */');if(extra[name])writeFileSync(join(path,'payload.bin'),Buffer.alloc(extra[name]))}
  return run(root)
 }finally{rmSync(root,{recursive:true,force:true})}
}
function assertPackaged(root,expected){
 const report=packageWechat(root),settings=JSON.parse(readFileSync(join(root,'src/settings.json'))),game=JSON.parse(readFileSync(join(root,'game.json')))
 assert.deepEqual(settings.assets.subpackages,expected);assert.deepEqual(game.subpackages.map(entry=>entry.name),expected);assert.deepEqual(Object.keys(report.subpackageBytes),expected);assert.ok(report.mainBytes<report.mainLimitBytes)
 for(const entry of game.subpackages){assert.ok(existsSync(join(root,entry.root,'config.json')));assert.equal(readFileSync(join(root,entry.root,'game.js'),'utf8'),"require('./index.js');\n");assert.ok(!existsSync(join(root,'assets',entry.name)))}
}
test('WeChat packaging relocates the survivor build: internal, main and the survivor bundle',()=>{
 withBuild([...FIXED,'survivor'],root=>assertPackaged(root,[...FIXED,'survivor']))
})
test('optional bundles (resources, survivor) are appended only when built',()=>{
 withBuild([...FIXED,'resources','survivor'],root=>assertPackaged(root,[...FIXED,'resources','survivor']))
 withBuild(FIXED,root=>{assert.ok(!existsSync(join(root,'assets/survivor')));assertPackaged(root,FIXED)})
})
test('WeChat packaging still requires every fixed bundle',()=>{
 withBuild(['internal'],root=>assert.throws(()=>packageWechat(root),/Missing built bundle main/))
})
test('WeChat packaging keeps the 4 MiB per-subpackage budget for survivor',()=>{
 withBuild([...FIXED,'survivor'],root=>assert.throws(()=>packageWechat(root),/exceeds project budget/),{survivor:4*1024*1024+1})
})
