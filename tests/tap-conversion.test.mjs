import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {tmpdir} from 'node:os'
import {join,dirname,resolve} from 'node:path'
import * as packaging from '../scripts/cocos/package-wechat.mjs'
import {captureBuildFingerprint,verifyBuildStamp} from '../scripts/release-integrity.mjs'
import {spawnSync} from 'node:child_process'

function write(root,name,value){const path=join(root,name);fs.mkdirSync(dirname(path),{recursive:true});fs.writeFileSync(path,typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value))}
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'rainy-tap-test-')))
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}))
 const raw=join(root,'raw');write(raw,'game.js','globalThis.example = () => 42;\n')
 write(raw,'game.json',{deviceOrientation:'portrait',subpackages:[],plugins:{}})
 write(raw,'src/settings.json',{assets:{projectBundles:['internal','main','resources']}})
 for(const name of ['internal','main','resources']){write(raw,`assets/${name}/config.json`,{name});write(raw,`assets/${name}/index.js`,'globalThis.bundleLoaded = true;\n')}
 write(raw,'project.config.json',{appid:'wx1111111111111111'})
 write(raw,'release-build.json',{platform:'wechatgame',appid:'wx1111111111111111'})
 return {root,raw,input:join(root,'input')}
}
async function tap(){
 const path=new URL('../scripts/cocos/tap-convert.mjs',import.meta.url)
 assert.ok(fs.existsSync(path),'Tap offline conversion wrapper must exist')
 return import(path.href)
}

test('Tap can prepare a 5 MiB bundle while WeChat still rejects its 4 MiB budget',t=>{
 const {raw,root}=fixture(t),wechat=join(root,'wechat')
 write(raw,'assets/resources/large.bin',Buffer.alloc(5*1024*1024));fs.cpSync(raw,wechat,{recursive:true})
 assert.equal(typeof packaging.prepareSubpackages,'function','path preparation must be independent of WeChat budgets')
 const report=packaging.prepareSubpackages(raw)
 assert.ok(report.subpackageBytes.resources>5*1024*1024)
 assert.equal(report.totalLimitBytes,undefined)
 assert.throws(()=>packaging.packageWechat(wechat),/exceeds project budget/)
})

test('Tap staging preserves the raw input and uses camelCase only in the platform config',async t=>{
 const {raw,input}=fixture(t),m=await tap(),before=m.snapshotTree(raw)
 const report=m.prepareTapInput(raw,input)
 const game=JSON.parse(fs.readFileSync(join(input,'game.json'))),settings=JSON.parse(fs.readFileSync(join(input,'src/settings.json')))
 assert.equal(game.deviceOrientation,'landscape')
 assert.equal(game.subpackages,undefined)
 assert.deepEqual(game.subPackages,[{name:'internal',root:'subpackages/internal/'},{name:'main',root:'subpackages/main/'},{name:'resources',root:'subpackages/resources/'}])
 assert.deepEqual(settings.assets.subpackages,['internal','main','resources'])
 assert.equal(fs.existsSync(join(input,'project.config.json')),false)
 assert.equal(fs.existsSync(join(input,'release-build.json')),false)
 assert.deepEqual(m.snapshotTree(raw),before)
 assert.ok(report.mainBytes>0)
})

test('Tap staging rejects overlapping paths, symlinks and plugin path traversal before writing',async t=>{
 const {root,raw,input}=fixture(t),m=await tap()
 assert.throws(()=>m.prepareTapInput(raw,join(raw,'nested')),/overlap|contain/i)
 assert.throws(()=>m.prepareTapInput(raw,root),/overlap|contain/i)
 fs.symlinkSync(join(raw,'game.js'),join(raw,'linked.js'))
 assert.throws(()=>m.prepareTapInput(raw,input),/symbolic|symlink/i)
 assert.equal(fs.existsSync(input),false)
 fs.rmSync(join(raw,'linked.js'))
 for(const plugins of [{'../escape':{version:'1.0'}},{safe:{version:'../../escape'}}]){
  write(raw,'game.json',{plugins})
  assert.throws(()=>m.prepareTapInput(raw,input),/plugin|path/i)
  assert.equal(fs.existsSync(input),false)
 }
})

test('Tap rejects Babel discovery config and the converter skip marker in source inputs',async t=>{
 const {raw,input}=fixture(t),m=await tap()
 for(const name of ['babel.config.js','.babelrc','assets/main/.babelrc.json','@babel/skip.txt']){
  write(raw,name,'{}')
  assert.throws(()=>m.prepareTapInput(raw,input),/Babel|babel/)
  assert.equal(fs.existsSync(input),false)
  fs.rmSync(join(raw,name));if(name.startsWith('@babel/'))fs.rmSync(join(raw,'@babel'),{recursive:true})
 }
})

test('strict Tap log check rejects partial Babel failure even when the converter creates a ZIP',async()=>{
 const m=await tap()
 assert.deepEqual(m.assertStrictConversionLog('[Tap小游戏] Babel转换完成: 成功 3, 跳过 2, 失败 0\n'),{success:3,skipped:2,failed:0})
 for(const log of ['[Babel] 转换失败: broken.js - syntax error\n[Tap小游戏] Babel转换完成: 成功 3, 跳过 0, 失败 1\ngame.zip创建完成', '[Tap小游戏] Babel转换完成: 成功 0, 跳过 0, 失败 0','game.zip创建完成','npm install\n[Tap小游戏] Babel转换完成: 成功 3, 跳过 0, 失败 0'])assert.throws(()=>m.assertStrictConversionLog(log),/Babel|npm|install/)
})

test('missing bundled dependencies fail preflight without running npm',async t=>{
 const {root}=fixture(t),m=await tap(),plugin=join(root,'incomplete-plugin')
 fs.mkdirSync(plugin)
 assert.throws(()=>m.verifyPinnedPlugin({pluginDir:plugin,archivePath:join(root,'missing.zip')}),/dependency|依赖/)
 assert.deepEqual(fs.readdirSync(plugin),[])
})

const officialReady=!!process.env.TAP_PLUGIN_DIR&&!!process.env.TAP_PLUGIN_ARCHIVE
const officialOptions=()=>({pluginDir:process.env.TAP_PLUGIN_DIR,archivePath:process.env.TAP_PLUGIN_ARCHIVE})
test('pinned official archive and extracted tree are both required', {skip:!officialReady},async t=>{
 const {root}=fixture(t),m=await tap(),options=officialOptions(),verified=m.verifyPinnedPlugin(options)
 assert.equal(verified.extractedTreeSha256,'024f2f4ba7e04da3579a2d937557ca071687f7d6dc8e8a3b066cd48d9b025ddf')
 const bad=join(root,'tampered.zip');fs.copyFileSync(options.archivePath,bad);fs.appendFileSync(bad,'tampered')
 assert.throws(()=>m.verifyPinnedPlugin({...options,archivePath:bad}),/archive|ZIP|hash/i)
})

test('official offline conversion validates ZIP contents, keeps inputs immutable and cannot claim platform acceptance',{skip:!officialReady},async t=>{
 const {root,raw}=fixture(t),m=await tap(),before=m.snapshotTree(raw)
 const result=await m.convertTapBuild({source:raw,outputRoot:join(root,'tap-output'),...officialOptions(),gameVersion:'1.1.0',fingerprint:{schemaVersion:2,platform:'taptap-minigame',appid:null,intermediateWechatAppId:'wx1111111111111111',inputDigest:'test-only'},effectiveConfig:{platform:'wechatgame'}})
 const manifest=JSON.parse(fs.readFileSync(result.manifestPath)),inside=JSON.parse(fs.readFileSync(join(result.gameDir,'tap-input-manifest.json')))
 assert.equal(manifest.validation.offlineConversion,'pass')
 assert.equal(manifest.validation.platformImport,'not-run')
 assert.equal(manifest.validation.device,'not-run')
 assert.equal(manifest.validation.releaseEligible,false)
 assert.deepEqual(manifest.identity,{tapGameId:null,tapAppId:null,accountVerified:false})
 assert.equal(manifest.sizeLimits.status,'unverified')
 assert.equal(inside.fingerprint.appid,null)
 assert.equal(inside.validation.offlineConversion,'not-run')
 assert.equal(manifest.outputs.gameTreeSha256,manifest.outputs.zipTreeSha256)
 assert.ok(manifest.outputs.zipBytes>0)
 assert.deepEqual(manifest.behavior.childProcessAttempts,[])
 assert.deepEqual(manifest.behavior.networkAttempts,[])
 assert.deepEqual(m.snapshotTree(raw),before)
 assert.equal(fs.existsSync(join(result.gameDir,'project.config.json')),false)
})

test('a real official partial Babel failure is rejected and retains only failure evidence',{skip:!officialReady},async t=>{
 const {root,raw}=fixture(t),m=await tap(),outputRoot=join(root,'tap-output')
 write(raw,'broken.js','function broken( {')
 await assert.rejects(m.convertTapBuild({source:raw,outputRoot,...officialOptions(),gameVersion:'1.1.0',fingerprint:{platform:'taptap-minigame',appid:null}}),/Babel/)
 const runs=fs.readdirSync(outputRoot);assert.equal(runs.length,1)
 assert.equal(fs.existsSync(join(outputRoot,runs[0],'tap-build.json')),false)
 const failure=JSON.parse(fs.readFileSync(join(outputRoot,runs[0],'tap-failure.json')))
 assert.match(failure.error,/Babel/)
 assert.equal(failure.validation.releaseEligible,false)
 assert.ok(fs.readFileSync(join(outputRoot,runs[0],'converter.stdout.log'),'utf8').includes('[Babel] 转换失败'))
})

function buildFixture(t,mode='success'){
 const {root}=fixture(t)
 fs.cpSync(new URL('../scripts',import.meta.url),join(root,'scripts'),{recursive:true})
 fs.cpSync(new URL('../cocos-pilot/build-configs',import.meta.url),join(root,'cocos-pilot/build-configs'),{recursive:true})
 for(const name of ['js/config','cocos-pilot/assets/scripts','cocos-pilot/settings'])fs.mkdirSync(join(root,name),{recursive:true})
 for(const name of ['package.json','cocos-pilot/package.json','cocos-pilot/tsconfig.json'])write(root,name,{type:'module'})
 write(root,'project.config.json',{appid:'wx1111111111111111',setting:{}})
 write(root,'release/settings.json',{version:'1.1.0-alpha.1',appid:'wx1111111111111111',advertising:{enabled:false},verification:{}})
 write(root,'js/source.js','// original source')
 const creator=join(root,'Creator.app/Contents/MacOS/CocosCreator')
 write(root,'Creator.app/Contents/Info.plist','<key>CFBundleShortVersionString</key><string>3.8.8</string>')
 write(root,'Creator.app/Contents/Resources/info.json','{}')
 write(root,'Creator.app/Contents/MacOS/CocosCreator',`#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const configPath=process.argv[process.argv.indexOf('--build')+1].slice('configPath='.length),config=JSON.parse(fs.readFileSync(configPath));
if(config.platform!=='wechatgame'||config.packages['taptap-minigame-tools'].enableTapConvert!==false||config.packages['taptap-minigame-tools'].deleteWechatBuild!==false)throw Error('Unsafe automatic converter configuration');
const output=path.join(config.buildPath,config.outputName),root=path.resolve(process.argv[process.argv.indexOf('--project')+1],'..');
const write=(name,value)=>{const file=path.join(output,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value)};
write('game.js','globalThis.gameStarted = true;');write('game.json','{}');write('src/settings.json','{"assets":{}}');
write('project.config.json',fs.readFileSync(path.join(root,'project.config.json')));
for(const name of ['internal','main','resources']){write('assets/'+name+'/config.json',JSON.stringify({name}));write('assets/'+name+'/index.js','globalThis.bundleLoaded = true;');}
write('assets/resources/large.bin',Buffer.alloc(5*1024*1024));
if(${JSON.stringify(mode)}==='source-change')fs.appendFileSync(path.join(root,'js/source.js'),'// changed during build');
if(${JSON.stringify(mode)}==='fatal-log')console.log('error TS1234: fixture compile failure');
const taskName=${JSON.stringify(mode)}==='wrong-marker'?'wechatgame':config.outputName;
console.log('build Task ('+taskName+') Finished');process.exit(${JSON.stringify(mode)}==='creator-failed'?1:36);
`)
 fs.chmodSync(creator,0o755)
 return {root,creator,run:()=>{const p=spawnSync(process.execPath,[join(root,'scripts/cocos/build.mjs'),'taptap-minigame'],{encoding:'utf8',env:{...process.env,COCOS_CREATOR_PATH:creator}});return {...p,log:(p.stdout||'')+(p.stderr||'')}}}

}

test('Tap schema 2 fingerprints keep WeChat identity explicitly intermediate',t=>{
 const {root,creator}=buildFixture(t),options={root,creator,platform:'taptap-minigame'},before=captureBuildFingerprint(options)
 assert.equal(before.appid,null)
 assert.equal(before.intermediateWechatAppId,'wx1111111111111111')
 assert.equal(verifyBuildStamp(before,options),true)
 const config=JSON.parse(fs.readFileSync(join(root,'release/settings.json')));config.appid='wx2222222222222222';write(root,'release/settings.json',config)
 assert.throws(()=>verifyBuildStamp(before,options),/changed|过期/)
})

test('Tap build CLI runs isolated Creator output and attestations after preparation',{skip:!officialReady},t=>{
 const {root,run}=buildFixture(t),result=run()
 assert.equal(result.status,0,result.log)
 const latest=JSON.parse(fs.readFileSync(join(root,'cocos-pilot/build/taptap-minigame/latest.json')))
 const manifest=JSON.parse(fs.readFileSync(join(root,'cocos-pilot/build/taptap-minigame',latest.manifest)))
 assert.equal(manifest.fingerprint.schemaVersion,2)
 assert.equal(manifest.fingerprint.platform,'taptap-minigame')
 assert.equal(manifest.validation.offlineConversion,'pass')
 assert.ok(manifest.outputs.subpackageBytes.resources>5*1024*1024)
 assert.equal(fs.existsSync(join(root,'cocos-pilot/build/wechatgame')),false)
 assert.equal(fs.existsSync(join(root,'cocos-pilot/build/tap-wechat-intermediate/game.js')),true)
})

test('Tap build CLI invalidates the latest pointer when Creator changes a fingerprint input',{skip:!officialReady},t=>{
 const {root,run}=buildFixture(t,'source-change')
 write(root,'cocos-pilot/build/taptap-minigame/latest.json',{manifest:'stale/tap-build.json'})
 const result=run()
 assert.notEqual(result.status,0,result.log)
 assert.match(result.log,/changed|过期/)
 assert.equal(fs.existsSync(join(root,'cocos-pilot/build/taptap-minigame/latest.json')),false)
})

test('an empty @babel directory cannot bypass conversion',async t=>{
 const {raw,input}=fixture(t),m=await tap()
 fs.mkdirSync(join(raw,'@babel'))
 assert.throws(()=>m.prepareTapInput(raw,input),/Babel|babel/)
 assert.equal(fs.existsSync(input),false)
})

test('Tap build refuses a symlinked output before deleting a previous candidate pointer',{skip:!officialReady},t=>{
 const {root,run}=buildFixture(t),outside=join(root,'outside')
 write(outside,'latest.json','keep this file')
 fs.mkdirSync(join(root,'cocos-pilot/build'),{recursive:true})
 fs.symlinkSync(outside,join(root,'cocos-pilot/build/taptap-minigame'))
 const result=run()
 assert.notEqual(result.status,0,result.log)
 assert.match(result.log,/symbolic|symlink/i)
 assert.equal(fs.readFileSync(join(outside,'latest.json'),'utf8'),'keep this file')
})

test('a failing final input verification never receives a successful Tap manifest',{skip:!officialReady},async t=>{
 const {root,raw}=fixture(t),m=await tap(),outputRoot=join(root,'tap-output')
 await assert.rejects(m.convertTapBuild({source:raw,outputRoot,...officialOptions(),gameVersion:'1.1.0',fingerprint:{platform:'taptap-minigame',appid:null},verifyInputs:()=>{throw Error('Build inputs changed after conversion')}}),/changed after conversion/)
 const runs=fs.readdirSync(outputRoot);assert.equal(runs.length,1)
 assert.equal(fs.existsSync(join(outputRoot,runs[0],'tap-build.json')),false)
 assert.equal(fs.existsSync(join(outputRoot,runs[0],'tap-failure.json')),true)
})

test('ZIP verifier rejects traversal, duplicates and content mismatches',t=>{
 const {root}=fixture(t),game=join(root,'game'),zip=join(root,'game.zip')
 write(game,'game.js','game');write(game,'game.json','{}')
 for(const badEntry of ['../escape','game.js','mismatch']){
  const create=spawnSync('python3',['-c',"import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],'w'); z.writestr('game.js','game'); z.writestr('game.json','{}'); z.writestr(sys.argv[2],'bad'); z.close()",zip,badEntry],{encoding:'utf8'})
  assert.equal(create.status,0,create.stderr)
  const check=spawnSync('python3',[resolve(import.meta.dirname,'../scripts/cocos/tap-verify-zip.py'),zip,game],{encoding:'utf8'})
  assert.notEqual(check.status,0)
  assert.match(check.stderr,/Unsafe|duplicate|differs/)
 }
 assert.equal(fs.existsSync(join(root,'escape')),false)
})

for(const mode of ['wrong-marker','fatal-log','creator-failed'])test(`Tap Creator completion gate rejects ${mode}`,{skip:!officialReady},t=>{
 const {root,run}=buildFixture(t,mode),result=run()
 assert.notEqual(result.status,0,result.log)
 assert.match(result.log,/Creator Tap intermediate build failed/)
 assert.equal(fs.existsSync(join(root,'cocos-pilot/build/taptap-minigame/latest.json')),false)
})
