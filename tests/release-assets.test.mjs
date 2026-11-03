import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
const assets=await import('../scripts/cocos/release-assets.mjs').catch(()=>({}))
const hash=v=>createHash('sha256').update(v).digest('hex')
function fixture(t){
 const root=fs.mkdtempSync(join(tmpdir(),'rainy-asset-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}))
 const put=(p,v)=>{fs.mkdirSync(dirname(join(root,p)),{recursive:true});fs.writeFileSync(join(root,p),v)}
 put('cocos-pilot/package.json','{}');put('cocos-pilot/tsconfig.json','{}');put('cocos-pilot/settings/profile.json','{}')
 put('cocos-pilot/assets/scripts/Art.ts',"load('fx/current')");put('cocos-pilot/assets/scenes/Main.scene','[]')
 for(const [name,body,id,importer] of [['old.png','old pixels','00000000-0000-0000-0000-000000000001','image'],['current.png','new pixels','00000000-0000-0000-0000-000000000002','image'],['current.json','{"frames":[]}','00000000-0000-0000-0000-000000000003','json']]){
  put('cocos-pilot/assets/resources/fx/'+name,body);put('cocos-pilot/assets/resources/fx/'+name+'.meta',JSON.stringify({uuid:id,importer}))
 }
 put('cocos-pilot/library/stale','cache');put('cocos-pilot/temp/stale','cache');put('cocos-pilot/build/stale','cache')
 assert.equal(typeof assets.runtimeSelectionDigest,'function','runtime selection audit must exist')
 const meta=fs.readFileSync(join(root,'cocos-pilot/assets/resources/fx/old.png.meta'))
 const policy={version:1,reviewedRuntimeDigest:assets.runtimeSelectionDigest(root),exclude:[{path:'fx/old.png',sha256:hash('old pixels'),metaSha256:hash(meta),uuid:'00000000-0000-0000-0000-000000000001',reason:'Superseded by the reviewed current atlas',replacements:['fx/current.png','fx/current.json']}]}
 const save=()=>put('release/asset-policy.json',JSON.stringify(policy));save()
 return {root,put,policy,save}
}
function stage(t,f){assert.equal(typeof assets.createReleaseStage,'function');const s=assets.createReleaseStage({root:f.root});t.after(()=>fs.rmSync(s.stageRoot,{recursive:true,force:true}));return s}
test('release staging excludes exactly approved assets and metadata while preserving source and retained bytes',t=>{
 const f=fixture(t),s=stage(t,f),res=join(s.project,'assets/resources/fx')
 assert.equal(fs.existsSync(join(res,'old.png')),false);assert.equal(fs.existsSync(join(res,'old.png.meta')),false)
 assert.equal(fs.readFileSync(join(res,'current.png'),'utf8'),'new pixels');assert.equal(fs.readFileSync(join(res,'current.json'),'utf8'),'{"frames":[]}')
 assert.equal(fs.readFileSync(join(f.root,'cocos-pilot/assets/resources/fx/old.png'),'utf8'),'old pixels')
 for(const dir of ['library','temp','build'])assert.equal(fs.existsSync(join(s.project,dir)),false)
 assert.equal(s.manifest.before.count,3);assert.equal(s.manifest.after.count,2);assert.equal(s.manifest.excludedBytes,10)
 assert.equal(s.manifest.resources.length,2);assert.deepEqual(s.manifest.resources.map(r=>r.type).sort(),['cc.ImageAsset','cc.JsonAsset'])
 assert.equal(assets.verifyStagedInputs(s),true)
})
for(const field of ['sha256','metaSha256'])test('changed excluded '+field+' is rejected without source writes',t=>{const f=fixture(t);f.policy.exclude[0][field]='f'.repeat(64);f.save();assert.throws(()=>stage(t,f),/hash|changed/i)})
test('runtime selection change requires a fresh exclusion audit',t=>{const f=fixture(t);f.put('cocos-pilot/assets/scripts/New.ts',"load('fx/old')");assert.throws(()=>stage(t,f),/audit|review/i)})
for(const path of ['../escape.png','/absolute.png','fx/*.png'])test('policy path rejects '+path,t=>{const f=fixture(t);f.policy.exclude[0].path=path;f.save();assert.throws(()=>stage(t,f),/path/i)})
test('policy rejects duplicate exclusions and missing replacement',t=>{
 const f=fixture(t);f.policy.exclude.push({...f.policy.exclude[0]});f.save();assert.throws(()=>stage(t,f),/duplicate/i)
 f.policy.exclude.pop();f.policy.exclude[0].replacements=['fx/absent.png'];f.save();assert.throws(()=>stage(t,f),/replacement/i)
})
test('symlinks in source are rejected before copying',t=>{const f=fixture(t);fs.symlinkSync('/private/tmp',join(f.root,'cocos-pilot/assets/escape'));assert.throws(()=>stage(t,f),/symlink/i)})
test('stage verification detects changed retained file and missing metadata',t=>{
 const f=fixture(t),s=stage(t,f),path=join(s.project,'assets/resources/fx/current.png');fs.writeFileSync(path,'bad');assert.throws(()=>assets.verifyStagedInputs(s),/changed/i)
 fs.writeFileSync(path,'new pixels');fs.unlinkSync(path+'.meta');assert.throws(()=>assets.verifyStagedInputs(s),/missing|changed/i)
})
test('built resources must retain typed path plus UUID and exclude old UUID',t=>{
 const f=fixture(t),s=stage(t,f),config={debug:false,types:['cc.ImageAsset','cc.JsonAsset'],paths:{0:['fx/current',0],1:['fx/current',1]},uuids:['00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003']}
 assert.equal(assets.verifyBuiltResources(config,s.manifest),true)
 const wrong=structuredClone(config);wrong.uuids[1]=wrong.uuids[0];assert.throws(()=>assets.verifyBuiltResources(wrong,s.manifest),/UUID/i)
 const leaked=structuredClone(config);leaked.uuids.push('00000000-0000-0000-0000-000000000001@6c48a');assert.throws(()=>assets.verifyBuiltResources(leaked,s.manifest),/excluded/i)
 delete config.paths[1];assert.throws(()=>assets.verifyBuiltResources(config,s.manifest),/missing/i)
})
test('actual Cocos audio-clip importer is retained as a typed optional sound',t=>{
 const f=fixture(t)
 f.put('cocos-pilot/assets/resources/fx/sound.wav','RIFF')
 f.put('cocos-pilot/assets/resources/fx/sound.wav.meta',JSON.stringify({importer:'audio-clip',uuid:'00000000-0000-0000-0000-000000000004'}))
 const s=stage(t,f)
 assert.equal(s.manifest.resources.find(r=>r.path==='fx/sound.wav').type,'cc.AudioClip')
})

test('logical groups cover current contexts without merging monster families or typed assets',()=>{
 for(const [path,group] of [['loading/keyart','boot'],['sect-scene/luoyun','sect-ui'],['tower-character/ground-actions','character'],['tower-monsters/boar','monster:boar'],['tower-monsters-motion/boar-v3-enraged.png','monster:boar'],['tower-monsters-motion/wolf-v1.json','monster:wolf'],['tower-monsters-motion/miasma.png','monster-mechanics'],['tower-skill-fx/flight-stream-v3','skill-effects'],['tower-stones/pill_huichun','battle-common'],['tower-library-items/example','library-detail'],['tower-breakthrough/beam','breakthrough']])assert.equal(assets.resourceGroup(path),group)
 assert.equal(assets.resourceGroup('unknown/new'),'unclassified')
})
test('reviewed resource policy changes the fingerprint and policy edits invalidate it',async t=>{
 const f=fixture(t),{captureBuildFingerprint,verifyBuildStamp}=await import('../scripts/release-integrity.mjs'),{writeBuildCapabilities}=await import('../scripts/build-profile.mjs')
 for(const path of ['js/source.js','scripts/build.mjs'])f.put(path,'// fixture')
 for(const path of ['package.json','project.config.json','cocos-pilot/build-configs/web-mobile.json'])f.put(path,'{}')
 f.put('release/settings.json',JSON.stringify({version:'1.0.0',appid:'touristappid'}));writeBuildCapabilities(f.root,'production')
 const options={root:f.root,platform:'web-mobile',toolchain:{fixture:true}},all=captureBuildFingerprint(options),reviewed=captureBuildFingerprint({...options,resourcePolicy:'reviewed'})
 assert.equal(all.resourcePolicy,'all');assert.equal(reviewed.resourcePolicy,'reviewed');assert.notEqual(all.inputDigest,reviewed.inputDigest)
 assert.throws(()=>verifyBuildStamp(reviewed,options),/resourcePolicy|过期/)
 assert.equal(verifyBuildStamp(reviewed,{...options,resourcePolicy:'reviewed'}),true)
 fs.appendFileSync(join(f.root,'release/asset-policy.json'),'\n')
 assert.throws(()=>verifyBuildStamp(reviewed,{...options,resourcePolicy:'reviewed'}),/changed|过期/)
 assert.throws(()=>captureBuildFingerprint({...options,resourcePolicy:'unknown'}),/resource policy/i)
})
async function buildFixture(t,mode='success',platform='web-mobile'){
 const f=fixture(t)
 fs.cpSync(new URL('../scripts',import.meta.url),join(f.root,'scripts'),{recursive:true})
 for(const name of ['taptap-minigame.json','taptap-minigame.lock.json'])f.put('cocos-pilot/build-configs/'+name,fs.readFileSync(new URL('../cocos-pilot/build-configs/'+name,import.meta.url)))
 f.put('js/xianxia/TowerResourceGroups.js',fs.readFileSync(new URL('../js/xianxia/TowerResourceGroups.js',import.meta.url)))
 f.put('package.json','{"type":"module"}');f.put('project.config.json','{"setting":{}}')
 f.put('release/settings.json',JSON.stringify({version:'1.0.0',appid:'touristappid',advertising:{enabled:false}}))
 f.put('cocos-pilot/build-configs/web-mobile.json','{"platform":"web-mobile"}')
 f.put('cocos-pilot/build-configs/wechatgame.json','{"packages":{"wechatgame":{}}}')
 f.put('cocos-pilot/assets/resources/loading/keyart.jpg','JPEG')
 f.put('cocos-pilot/assets/resources/loading/keyart.jpg.meta',JSON.stringify({importer:'image',uuid:'00000000-0000-0000-0000-000000000005'}))
 fs.mkdirSync(join(f.root,'js/config'),{recursive:true})
 const creator=join(f.root,'Creator.app/Contents/MacOS/CocosCreator')
 f.put('Creator.app/Contents/Info.plist','<key>CFBundleShortVersionString</key><string>3.8.8</string>')
 f.put('Creator.app/Contents/Resources/info.json','{}')
 f.put('Creator.app/Contents/MacOS/CocosCreator',`#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const project=process.argv[process.argv.indexOf('--project')+1],cfg=JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--build')+1].slice('configPath='.length)));
if(fs.existsSync(path.join(project,'assets/resources/fx/old.png')))throw Error('Unfiltered old asset');
if(fs.existsSync(path.join(project,'library/stale')))throw Error('Old Creator cache copied');
const output=path.join(cfg.buildPath,cfg.outputName),put=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,v)};
put(path.join(output,'test-stage-path.json'),JSON.stringify(project));
const config={debug:false,types:['cc.ImageAsset','cc.JsonAsset'],uuids:['00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000005'],paths:{0:['fx/current',0],1:['fx/current',1],2:['loading/keyart',0]}};
if(${JSON.stringify(mode)}==='leak')config.uuids.push('00000000-0000-0000-0000-000000000001');
if(${JSON.stringify(mode)}==='stage-change')fs.writeFileSync(path.join(project,'assets/resources/fx/current.png'),'corrupted');
if(${JSON.stringify(mode)}==='stage-added-source')put(path.join(project,'assets/scripts/Unfingerprinted.ts'),'globalThis.unfingerprinted=true;');
if(${JSON.stringify(mode)}==='config-change')fs.writeFileSync(process.argv[process.argv.indexOf('--build')+1].slice('configPath='.length),JSON.stringify({...cfg,debug:!cfg.debug}));
put(path.join(output,'assets/resources',cfg.platform==='wechatgame'?'config.json':'config.test.json'),JSON.stringify(config));
if(cfg.platform==='wechatgame'){
 put(path.join(output,'game.js'),'globalThis.testGame = true;');put(path.join(output,'game.json'),'{}');put(path.join(output,'src/settings.json'),'{"assets":{}}');
 for(const name of ['internal','main','resources']){put(path.join(output,'assets',name,'index.js'),'globalThis.testBundle = true;');if(name!=='resources')put(path.join(output,'assets',name,'config.json'),JSON.stringify({name}));}
 config.name='resources';put(path.join(output,'assets/resources',cfg.platform==='wechatgame'?'config.json':'config.test.json'),JSON.stringify(config));
}

console.log('build Task ('+cfg.outputName+') Finished');process.exit(36);
`)
 fs.chmodSync(creator,0o755)
 const output=join(f.root,'cocos-pilot/build',platform==='taptap-minigame'?'tap-wechat-intermediate':platform)
 t.after(()=>{const recorded=join(output,'test-stage-path.json');if(fs.existsSync(recorded)){const parent=dirname(JSON.parse(fs.readFileSync(recorded)));assert.ok(parent.split('/').at(-1).startsWith('rainy-release-'));fs.rmSync(parent,{recursive:true,force:true})}})
 if(mode==='output-symlink'){
  const outside=join(f.root,'outside');fs.mkdirSync(outside);fs.writeFileSync(join(outside,'release-build.json'),'external-record');
  fs.symlinkSync(outside,output);
 }
 const {spawnSync}=await import('node:child_process')
 const result=spawnSync(process.execPath,[join(f.root,'scripts/cocos/build.mjs'),platform,'--staged-assets'],{encoding:'utf8',env:{...process.env,COCOS_CREATOR_PATH:creator}})
 return {...f,creator,output,result,log:(result.stdout||'')+(result.stderr||'')}
}
test('reviewed build CLI uses a clean project, validates resources, and stamps the selected policy',async t=>{
 const f=await buildFixture(t);assert.equal(f.result.status,0,f.log)
 const stamp=JSON.parse(fs.readFileSync(join(f.output,'release-build.json')))
 assert.equal(stamp.resourcePolicy,'reviewed');assert.equal(stamp.profile,'production')
 const report=JSON.parse(fs.readFileSync(join(f.output,'asset-release.json')))
 assert.equal(report.validation.typedPathsAndUuids,'pass');assert.equal(report.after.count,3)
 assert.equal(fs.readFileSync(join(f.root,'cocos-pilot/assets/resources/fx/old.png'),'utf8'),'old pixels')
 const {verifyBuildStamp}=await import('../scripts/release-integrity.mjs')
 assert.equal(verifyBuildStamp(stamp,{root:f.root,creator:f.creator,platform:'web-mobile',resourcePolicy:'reviewed'}),true)
})
for(const mode of ['leak','stage-change','stage-added-source','config-change'])test('reviewed CLI rejects '+mode+' without a success stamp',async t=>{
 const f=await buildFixture(t,mode);assert.notEqual(f.result.status,0,f.log)
 assert.match(f.log,mode==='leak'?/Excluded UUID/:mode==='stage-change'?/Staged input changed/:mode==='stage-added-source'?/Unexpected staged input/:/Effective Creator config changed/)
 assert.equal(fs.existsSync(join(f.output,'release-build.json')),false)
 assert.equal(fs.readFileSync(join(f.root,'cocos-pilot/assets/resources/fx/current.png'),'utf8'),'new pixels')
})

test('reviewed Tap build converts only the validated staged resources with the pinned official plugin',{skip:!process.env.TAP_PLUGIN_DIR||!process.env.TAP_PLUGIN_ARCHIVE},async t=>{
 const f=await buildFixture(t,'success','taptap-minigame');assert.equal(f.result.status,0,f.log)
 const root=join(f.root,'cocos-pilot/build/taptap-minigame'),latest=JSON.parse(fs.readFileSync(join(root,'latest.json'))),manifestPath=join(root,latest.manifest)
 const manifest=JSON.parse(fs.readFileSync(manifestPath)),game=join(dirname(manifestPath),'game')
 assert.equal(manifest.fingerprint.resourcePolicy,'reviewed');assert.equal(manifest.validation.releaseEligible,false)
 assert.equal(JSON.parse(fs.readFileSync(join(game,'asset-release.json'))).validation.typedPathsAndUuids,'pass')
 assert.equal(fs.readFileSync(join(f.root,'cocos-pilot/assets/resources/fx/old.png'),'utf8'),'old pixels')
})


test('reviewed CLI rejects output symlinks before deleting an external build record',async t=>{
 const f=await buildFixture(t,'output-symlink');assert.notEqual(f.result.status,0,f.log);assert.match(f.log,/symlink/i)
 assert.equal(fs.readFileSync(join(f.root,'outside/release-build.json'),'utf8'),'external-record')
})
test('debug Creator resources preserve explicit UUID keys and type names',t=>{
 const f=fixture(t),s=stage(t,f),config={debug:true,uuids:s.manifest.resources.map(r=>r.uuid),paths:Object.fromEntries(s.manifest.resources.map(r=>[r.uuid,[r.logicalPath,r.type,1]]))}
 assert.equal(assets.verifyBuiltResources(config,s.manifest),true)
 const image=s.manifest.resources.find(r=>r.type==='cc.ImageAsset');const wrong=structuredClone(config);wrong.paths[image.uuid][1]='cc.JsonAsset';assert.throws(()=>assets.verifyBuiltResources(wrong,s.manifest),/Missing built typed resource/)
 const leaked=structuredClone(config);leaked.paths[f.policy.exclude[0].uuid]=['fx/old','cc.ImageAsset',1];assert.throws(()=>assets.verifyBuiltResources(leaked,s.manifest),/Excluded UUID/)
 const omitted=structuredClone(config);omitted.uuids=[];assert.throws(()=>assets.verifyBuiltResources(omitted,s.manifest),/UUID mismatch/)
 const mismatch=structuredClone(config);delete mismatch.paths[image.uuid];mismatch.paths['bad-uuid']=['fx/current','cc.ImageAsset',1];assert.throws(()=>assets.verifyBuiltResources(mismatch,s.manifest),/UUID mismatch/)
})
