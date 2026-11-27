import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {packageWechat,resolveRemoteBaseUrl} from '../scripts/cocos/package-wechat.mjs'
const FIXED=['internal','main']
function withBuild(bundles,run,extra={},{ver=''}={}){
 const root=mkdtempSync(join(tmpdir(),'rainy-pack-')),v=ver?'.'+ver:'';try{
  mkdirSync(join(root,'src'));writeFileSync(join(root,ver?'src/settings.9f9f9.json':'src/settings.json'),JSON.stringify({assets:{projectBundles:bundles,preloadBundles:[{bundle:'resources'},{bundle:'main'}],remoteBundles:[],server:''}}));writeFileSync(join(root,'game.json'),'{}')
  for(const name of bundles){const path=join(root,'assets',name);mkdirSync(path,{recursive:true});writeFileSync(join(path,`config${v}.json`),JSON.stringify({name}));writeFileSync(join(path,`index${v}.js`),'/* bundle module */');if(extra[name])writeFileSync(join(path,'payload.bin'),Buffer.alloc(extra[name]))}
  return run(root)
 }finally{rmSync(root,{recursive:true,force:true})}
}
function assertPackaged(root,expected){
 const report=packageWechat(root),settings=JSON.parse(readFileSync(join(root,'src/settings.json'))),game=JSON.parse(readFileSync(join(root,'game.json')))
 assert.deepEqual(settings.assets.subpackages,expected);assert.deepEqual(game.subpackages.map(entry=>entry.name),expected);assert.deepEqual(Object.keys(report.subpackageBytes),expected);assert.ok(report.mainBytes<report.mainLimitBytes)
 for(const entry of game.subpackages){assert.ok(existsSync(join(root,entry.root,'config.json')));assert.equal(readFileSync(join(root,entry.root,'game.js'),'utf8'),"require('./index.js');\n");assert.ok(!existsSync(join(root,'assets',entry.name)))}
}
test('WeChat packaging relocates the resources build: internal, main and the resources bundle',()=>{
 withBuild([...FIXED,'resources'],root=>assertPackaged(root,[...FIXED,'resources']))
})
test('optional bundles (resources) are appended only when built',()=>{
 withBuild([...FIXED,'resources'],root=>assertPackaged(root,[...FIXED,'resources']))
 withBuild(FIXED,root=>{assert.ok(!existsSync(join(root,'assets/resources')));assertPackaged(root,FIXED)})
})
test('WeChat packaging still requires every fixed bundle',()=>{
 withBuild(['internal'],root=>assert.throws(()=>packageWechat(root),/Missing built bundle main/))
})
test('WeChat packaging keeps the 4 MiB per-subpackage budget for resources',()=>{
 withBuild([...FIXED,'resources'],root=>assert.throws(()=>packageWechat(root),/exceeds project budget/),{resources:4*1024*1024+1})
})
test('WeChat packaging handles md5Cache names for settings, configs and bundle scripts',()=>{
 withBuild([...FIXED,'resources'],root=>{
  packageWechat(root);const settings=JSON.parse(readFileSync(join(root,'src/settings.9f9f9.json')))
  assert.deepEqual(settings.assets.subpackages,[...FIXED,'resources']);assert.ok(!existsSync(join(root,'src/settings.json')))
  for(const name of [...FIXED,'resources']){assert.ok(existsSync(join(root,'subpackages',name,'config.ab12c.json')));assert.equal(readFileSync(join(root,'subpackages',name,'game.js'),'utf8'),"require('./index.ab12c.js');\n")}
 },{},{ver:'ab12c'})
})
function withOut(run){const out=mkdtempSync(join(tmpdir(),'rainy-remote-'));try{return run(out)}finally{rmSync(out,{recursive:true,force:true})}}
test('remote bundles leave the package, keep their script locally and are served from the configured server',()=>{
 withOut(out=>withBuild([...FIXED,'resources'],root=>{
  const server='http://127.0.0.1:8091/',report=packageWechat(root,{remote:{bundles:['resources'],server,outDir:out}})
  const settings=JSON.parse(readFileSync(join(root,'src/settings.9f9f9.json'))),game=JSON.parse(readFileSync(join(root,'game.json')))
  assert.deepEqual(settings.assets.subpackages,FIXED);assert.deepEqual(game.subpackages.map(entry=>entry.name),FIXED);assert.deepEqual(Object.keys(report.subpackageBytes),FIXED)
  assert.deepEqual(settings.assets.remoteBundles,['resources']);assert.equal(settings.assets.server,server);assert.deepEqual(settings.assets.preloadBundles,[{bundle:'resources'},{bundle:'main'}])
  assert.ok(existsSync(join(out,'remote/resources/config.ab12c.json')));assert.ok(existsSync(join(out,'remote/resources/payload.bin')));assert.ok(!existsSync(join(out,'remote/resources/index.ab12c.js')))
  assert.ok(existsSync(join(root,'src/bundle-scripts/resources/index.ab12c.js')));assert.ok(!existsSync(join(root,'assets/resources')));assert.ok(!existsSync(join(root,'subpackages/resources')))
  assert.ok(report.remoteBytes.resources>=5*1024*1024);assert.equal(report.remoteServer,server);assert.ok(report.totalBytes<report.mainLimitBytes)
 },{resources:5*1024*1024},{ver:'ab12c'}))
})
test('repackaging into an existing remote folder replaces stale files',()=>{
 withOut(out=>{
  mkdirSync(join(out,'remote/resources'),{recursive:true});writeFileSync(join(out,'remote/resources/stale.bin'),'old')
  withBuild([...FIXED,'resources'],root=>{
   packageWechat(root,{remote:{bundles:['resources'],server:'https://cdn.example.com/game/',outDir:out}})
   assert.ok(!existsSync(join(out,'remote/resources/stale.bin')));assert.ok(existsSync(join(out,'remote/resources/config.json')));assert.ok(existsSync(join(root,'src/bundle-scripts/resources/index.js')))
  })
 })
})
test('remote base URL comes from release settings, env overrides it, and it must be http(s)',()=>{
 assert.equal(resolveRemoteBaseUrl({remoteAssetBaseUrl:'http://127.0.0.1:8091/'},{}),'http://127.0.0.1:8091/')
 assert.equal(resolveRemoteBaseUrl({remoteAssetBaseUrl:'http://127.0.0.1:8091/'},{WECHAT_REMOTE_BASE_URL:'https://cdn.example.com/game'}),'https://cdn.example.com/game/')
 assert.throws(()=>resolveRemoteBaseUrl({remoteAssetBaseUrl:'ftp://x'},{}),/must start with/)
 assert.throws(()=>resolveRemoteBaseUrl({},{}),/must start with/)
})
