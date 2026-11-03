import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,cpSync,chmodSync,renameSync,symlinkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {spawnSync} from 'node:child_process'
import {dirname,join,resolve} from 'node:path'
import * as integrity from '../scripts/release-integrity.mjs'
import {checkRelease} from '../scripts/check-release.mjs'
import {writeBuildCapabilities,readBuildProfile} from '../scripts/build-profile.mjs'

const toolchain={
 node:{version:'v22.22.2',executableSha256:'a'.repeat(64)},
 creator:{version:'3.8.8',executableSha256:'b'.repeat(64),releaseInfoSha256:'c'.repeat(64),versionInfoSha256:'d'.repeat(64)},
 scope:'executable-and-release-metadata-only'
}
const sourceFiles={
 'js/source.js':'js\n',
 'cocos-pilot/assets/asset.txt':'assets\n',
 'cocos-pilot/settings/setting.json':'settings\n',
 'cocos-pilot/build-configs/wechatgame.json':'config\n'
}
function write(root,path,value){const file=join(root,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,value)}
function fixture(t,{capabilities=true}={}){
 const root=mkdtempSync(join(tmpdir(),'rainy-integrity-'))
 t.after(()=>rmSync(root,{recursive:true,force:true}))
 const config=JSON.parse(readFileSync(new URL('../release/settings.json',import.meta.url)))
 config.accountType='formal'
 Object.assign(config.verification,{privacyConfigured:true,ageRatingApproved:true,contentFilingApproved:true,miitFilingNumber:'test-only',androidDevicePassed:true,iosDevicePassed:true})
 for(const [path,value] of Object.entries(sourceFiles))write(root,path,value)
 if(capabilities)writeBuildCapabilities(root,'production')
 for(const path of ['package.json','cocos-pilot/package.json','cocos-pilot/tsconfig.json'])write(root,path,'{}\n')
 for(const path of ['scripts/cocos/build.mjs','scripts/cocos/package-wechat.mjs','scripts/cocos/sync-shared.mjs','scripts/prepare-release-config.mjs','scripts/release-integrity.mjs','scripts/check-release.mjs'])write(root,path,'// fixture\n')
 write(root,'project.config.json',JSON.stringify({appid:config.appid}))
 write(root,'release/settings.json',JSON.stringify(config))
 write(root,'cocos-pilot/build/wechatgame/project.config.json',JSON.stringify({appid:config.appid}))
 mkdirSync(join(root,'docs/release'),{recursive:true})
 return {root,config,folder:join(root,'cocos-pilot/build/wechatgame'),options:{root,platform:'wechatgame',toolchain}}
}
function capture(options){assert.equal(typeof integrity.captureBuildFingerprint,'function','captureBuildFingerprint must capture all build inputs');return integrity.captureBuildFingerprint(options)}
function verify(stamp,options){assert.equal(typeof integrity.verifyBuildStamp,'function','verifyBuildStamp must enforce schema 2');return integrity.verifyBuildStamp(stamp,options)}

test('legacy sourceDigest retains the original four-directory byte algorithm',t=>{
 const {root}=fixture(t,{capabilities:false})
 assert.equal(integrity.digestSource(root),'77c725fd1d0dbb1ef5d9dd93f1908f6019afa1ec605232240d29f182a13f26ef')
})

test('identical inputs produce a portable, order-independent schema 2 fingerprint',t=>{
 const {root,options}=fixture(t),before=capture(options)
 const second=mkdtempSync(join(tmpdir(),'rainy-relocated-'));t.after(()=>rmSync(second,{recursive:true,force:true}));cpSync(root,second,{recursive:true})
 const reordered={scope:toolchain.scope,creator:{...toolchain.creator},node:{executableSha256:toolchain.node.executableSha256,version:toolchain.node.version}}
 assert.deepEqual(capture({...options,root:second,toolchain:reordered}),before)
 assert.equal(before.schemaVersion,2)
 assert.equal(before.platform,'wechatgame')
 assert.match(before.inputDigest,/^[a-f0-9]{64}$/)
 assert.deepEqual(before.toolchain,toolchain)
 assert.equal(verify(before,options),true)
})

for(const path of [
 ...Object.keys(sourceFiles),'scripts/cocos/build.mjs','scripts/cocos/package-wechat.mjs','scripts/cocos/sync-shared.mjs',
 'scripts/prepare-release-config.mjs','scripts/release-integrity.mjs','scripts/check-release.mjs',
 'package.json','project.config.json','cocos-pilot/package.json','cocos-pilot/tsconfig.json','release/settings.json',
 'build-templates/web-mobile/index.ejs','cocos-pilot/build-templates/web-mobile/index.ejs'
])test(`changing build input ${path} invalidates an existing manifest`,t=>{
 const {root,options}=fixture(t)
 if(!existsSync(join(root,path)))write(root,path,'initial\n')
 const before=capture(options)
 const text=readFileSync(join(root,path),'utf8');write(root,path,text+'\n')
 assert.throws(()=>verify(before,options),/changed|mismatch|过期/)
})

for(const path of ['package-lock.json','npm-shrinkwrap.json','yarn.lock','pnpm-lock.yaml','bun.lock','bun.lockb','cocos-pilot/package-lock.json','cocos-pilot/npm-shrinkwrap.json','cocos-pilot/yarn.lock','cocos-pilot/pnpm-lock.yaml','cocos-pilot/bun.lock','cocos-pilot/bun.lockb'])test(`optional lockfile ${path} appearing invalidates an existing manifest`,t=>{
 const {root,options}=fixture(t),before=capture(options)
 assert.equal(before.inputs.find(entry=>entry.path===path)?.type,'missing')
 write(root,path,'lock\n')
 assert.throws(()=>verify(before,options),/changed|mismatch|过期/)
})

for(const path of ['extensions','cocos-pilot/extensions','packages','cocos-pilot/packages','build-templates','cocos-pilot/build-templates'])test(`optional directory ${path} records absence, empty presence, contents and removal`,t=>{
 const {root,options}=fixture(t),missing=capture(options)
 assert.equal(missing.inputs.find(entry=>entry.path===path)?.type,'missing')
 mkdirSync(join(root,path),{recursive:true})
 const empty=capture(options);assert.equal(empty.inputs.find(entry=>entry.path===path)?.type,'directory');assert.notEqual(empty.inputDigest,missing.inputDigest)
 write(root,path+'/plugin.js','module\n');const present=capture(options)
 assert.notEqual(present.inputDigest,empty.inputDigest)
 rmSync(join(root,path),{recursive:true});assert.throws(()=>verify(present,options),/changed|mismatch|过期/)
})

test('new untracked inputs and removed input files invalidate the manifest',t=>{
 const {root,options}=fixture(t),before=capture(options)
 write(root,'js/untracked.js','new code\n');assert.throws(()=>verify(before,options),/changed|mismatch|过期/)
 const added=capture(options);rmSync(join(root,'js/untracked.js'));assert.throws(()=>verify(added,options),/changed|mismatch|过期/)
})

test('build output and report writes do not invalidate the input fingerprint',t=>{
 const {root,options}=fixture(t),before=capture(options)
 write(root,'cocos-pilot/build/wechatgame/game.js','built\n')
 write(root,'cocos-pilot/package-report.json','{}\n')
 write(root,'cocos-pilot/temp/compile.log','log\n')
 write(root,'docs/release/preflight-report.json','{}\n')
 assert.equal(verify(before,options),true)
})

for(const [section,field] of [['node','version'],['node','executableSha256'],['creator','version'],['creator','executableSha256'],['creator','releaseInfoSha256'],['creator','versionInfoSha256']])test(`changed toolchain ${section}.${field} invalidates the manifest`,t=>{
 const {options}=fixture(t),before=capture(options),changed=structuredClone(toolchain)
 changed[section][field]=field==='version'?'99.0.0':'f'.repeat(64)
 assert.throws(()=>verify(before,{...options,toolchain:changed}),/changed|mismatch|过期/)
})

test('manifest rejects wrong platform and altered declared toolchain',t=>{
 const {options}=fixture(t),before=capture(options)
 assert.throws(()=>verify(before,{...options,platform:'web-mobile'}),/changed|mismatch|过期/)
 const altered=structuredClone(before);altered.toolchain.node.version='fake'
 assert.throws(()=>verify(altered,options),/changed|mismatch|过期/)
})

test('final stamp refuses inputs changed since the pre-build capture',t=>{
 const {root,folder,options}=fixture(t),before=capture(options)
 write(root,'js/source.js','changed mid-build\n')
 assert.throws(()=>integrity.stampBuild(folder,before,options),/changed|mismatch|过期/)
 assert.equal(existsSync(join(folder,'release-build.json')),false)
})

test('formal release gate rejects a legacy-only stamp and accepts the complete current stamp',t=>{
 const {folder,config,options}=fixture(t)
 writeFileSync(join(folder,'release-build.json'),JSON.stringify({version:config.version,appid:config.appid,sourceDigest:integrity.digestSource(options.root)}))
 const old=checkRelease('publication',options)
 assert.ok(old.blockers.some(message=>/schema|旧版|完整构建指纹/.test(message)),JSON.stringify(old.blockers))
 const before=capture(options);integrity.stampBuild(folder,before,options)
 assert.deepEqual(checkRelease('publication',options).blockers,[])
 const stamp=JSON.parse(readFileSync(join(folder,'release-build.json')))
 assert.equal(stamp.schemaVersion,2);assert.match(stamp.builtAt,/^\d{4}-\d{2}-\d{2}T/)
 write(options.root,'scripts/cocos/package-wechat.mjs','changed\n')
 assert.ok(checkRelease('publication',options).blockers.some(message=>/changed|mismatch|过期/.test(message)))
})

test('installed-toolchain inspection reads the actual executable, Creator version and release metadata',t=>{
 const {root}=fixture(t),creator=join(root,'FakeCreator.app/Contents/MacOS/CocosCreator')
 write(root,'FakeCreator.app/Contents/MacOS/CocosCreator','#!/bin/sh\nexit 0\n')
 write(root,'FakeCreator.app/Contents/Info.plist','<plist><dict><key>CFBundleShortVersionString</key><string>3.8.9</string></dict></plist>')
 write(root,'FakeCreator.app/Contents/Resources/info.json','{"engine":"actual-engine-revision"}')
 assert.equal(typeof integrity.readToolchain,'function','readToolchain must inspect the selected installation')
 const actual=integrity.readToolchain({creator})
 assert.equal(actual.node.version,process.version)
 assert.match(actual.node.executableSha256,/^[a-f0-9]{64}$/)
 assert.equal(actual.creator.version,'3.8.9')
 for(const key of ['executableSha256','releaseInfoSha256','versionInfoSha256'])assert.match(actual.creator[key],/^[a-f0-9]{64}$/)
 write(root,'FakeCreator.app/Contents/Resources/info.json','{"engine":"updated-engine-revision"}')
 assert.notEqual(integrity.readToolchain({creator}).creator.releaseInfoSha256,actual.creator.releaseInfoSha256)
 rmSync(join(root,'FakeCreator.app/Contents/Info.plist'))
 assert.throws(()=>integrity.readToolchain({creator}),/Creator|ENOENT/)
})

function cliFixture(t,{platform='wechatgame',mode='success',reportFailure=false,missingKeyart=false}={}){
 const setup=fixture(t),{root,folder}=setup
 for(const path of ['scripts/build-profile.mjs','scripts/release-integrity.mjs','scripts/cocos/build.mjs','scripts/cocos/package-wechat.mjs','scripts/cocos/sync-shared.mjs','scripts/prepare-release-config.mjs'])cpSync(new URL('../'+path,import.meta.url),join(root,path))
 write(root,'package.json','{"type":"module"}')
 write(root,'project.config.json',JSON.stringify({appid:setup.config.appid,setting:{}}))
 write(root,'cocos-pilot/build-configs/wechatgame.json','{"packages":{"wechatgame":{}}}')
 write(root,'cocos-pilot/build-configs/web-mobile.json','{}')
 mkdirSync(join(root,'js/config'),{recursive:true})
 mkdirSync(join(root,'cocos-pilot/assets/scripts'),{recursive:true})
 if(!missingKeyart)write(root,'cocos-pilot/assets/resources/loading/keyart.jpg','fixture image')
 if(reportFailure)mkdirSync(join(root,'cocos-pilot/package-report.json'))
 write(root,'test-build-control.json',JSON.stringify({mode}))
 const creator=join(root,'FakeCreator.app/Contents/MacOS/CocosCreator')
 write(root,'FakeCreator.app/Contents/Info.plist','<plist><dict><key>CFBundleShortVersionString</key><string>3.8.8</string></dict></plist>')
 write(root,'FakeCreator.app/Contents/Resources/info.json','{"engine":"fixture"}')
 write(root,'FakeCreator.app/Contents/MacOS/CocosCreator',`#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
const project=process.argv[process.argv.indexOf('--project')+1],root=path.resolve(project,'..');
const platform=path.basename(process.argv[process.argv.indexOf('--build')+1].split('configPath=')[1],'.json');
const output=path.join(project,'build',platform),{mode}=JSON.parse(fs.readFileSync(path.join(root,'test-build-control.json')));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value)};
fs.mkdirSync(output,{recursive:true});
if(platform==='wechatgame'){
 write(path.join(output,'src/settings.json'),JSON.stringify({assets:{}}));
 write(path.join(output,'game.json'),'{}');
 write(path.join(output,'project.config.json'),fs.readFileSync(path.join(root,'project.config.json')));
 for(const name of mode==='bad-bundle'?['internal']:['internal','main'])write(path.join(output,'assets',name,'config.json'),JSON.stringify({name}));
}
if(mode==='empty-directories')fs.mkdirSync(path.join(project,'settings/v2/default-profiles'),{recursive:true});
if(mode==='source-change')fs.appendFileSync(path.join(root,'js/source.js'),'changed during Creator build');
if(mode==='toolchain-change')write(path.join(root,'FakeCreator.app/Contents/Resources/info.json'),'{}');
console.log('build Task ('+platform+') Finished');
process.exit(mode==='creator-failure'?1:36);
`)
 chmodSync(creator,0o755)
 write(root,`cocos-pilot/build/${platform}/release-build.json`,'{"schemaVersion":1,"old":true}')
 const run=(args=[])=>{
  const result=spawnSync(process.execPath,[join(root,'scripts/cocos/build.mjs'),platform,...args],{encoding:'utf8',env:{...process.env,COCOS_CREATOR_PATH:creator}})
  return {...result,log:(result.stdout||'')+(result.stderr||'')}
 }
 return {...setup,creator,platform,folder:join(root,'cocos-pilot/build',platform),run}
}

test('build CLI stamps only the successfully packaged WeChat candidate after preparation',t=>{
 const {root,creator,folder,run}=cliFixture(t),result=run()
 assert.equal(result.status,0,result.log)
 assert.ok(existsSync(join(folder,'subpackages/main/config.json')))
 assert.ok(existsSync(join(root,'cocos-pilot/package-report.json')))
 assert.ok(existsSync(join(root,'js/config/releaseInfo.js')))
 const stamp=JSON.parse(readFileSync(join(folder,'release-build.json')))
 assert.equal(verify(stamp,{root,creator,platform:'wechatgame'}),true)
})

test('build CLI stamps web only after copying its loading image',t=>{
 const {root,creator,folder,run}=cliFixture(t,{platform:'web-mobile'}),result=run()
 assert.equal(result.status,0,result.log)
 assert.equal(readFileSync(join(folder,'loading-keyart.jpg'),'utf8'),'fixture image')
 assert.equal(verify(JSON.parse(readFileSync(join(folder,'release-build.json'))),{root,creator,platform:'web-mobile'}),true)
})

for(const scenario of [
 {mode:'bad-bundle',reason:/Missing built bundle main/},
 {mode:'creator-failure',reason:/Creator failed/},
 {mode:'source-change',reason:/changed/},
 {mode:'toolchain-change',reason:/changed/},
 {reportFailure:true,reason:/EISDIR/},
 {platform:'web-mobile',missingKeyart:true,reason:/ENOENT/}
])test(`failed build ${JSON.stringify(scenario)} leaves no old or new release stamp`,t=>{
 const {folder,run}=cliFixture(t,scenario),result=run()
 assert.notEqual(result.status,0,result.log)
 assert.match(result.log,scenario.reason)
 assert.equal(existsSync(join(folder,'release-build.json')),false,'failed candidates must not retain a release stamp')
})


test('fingerprint ignores Creator-created nested empty directories',t=>{
 const {root,options}=fixture(t),before=capture(options)
 mkdirSync(join(root,'cocos-pilot/settings/v2/default-profiles'),{recursive:true})
 mkdirSync(join(root,'scripts/cache/deep/empty'),{recursive:true})
 assert.equal(verify(before,options),true)
 assert.equal(capture(options).inputDigest,before.inputDigest)
 rmSync(join(root,'cocos-pilot/settings/v2'),{recursive:true})
 rmSync(join(root,'scripts/cache'),{recursive:true})
 assert.equal(verify(before,options),true)
})

test('optional roots retain presence checks while nested empty directories are ignored',t=>{
 const {root,options}=fixture(t),absent=capture(options)
 mkdirSync(join(root,'extensions'))
 const present=capture(options)
 assert.notEqual(present.inputDigest,absent.inputDigest)
 mkdirSync(join(root,'extensions/generated/cache'),{recursive:true})
 assert.equal(verify(present,options),true)
 rmSync(join(root,'extensions'),{recursive:true})
 assert.equal(verify(absent,options),true)
})

test('nested input file paths and content still invalidate the fingerprint',t=>{
 const {root,options}=fixture(t)
 write(root,'extensions/plugin/entry.js','plugin source')
 const original=capture(options)
 renameSync(join(root,'extensions/plugin'),join(root,'extensions/renamed'))
 assert.throws(()=>verify(original,options),/changed/)
 const moved=capture(options)
 write(root,'extensions/renamed/entry.js','changed plugin source')
 assert.throws(()=>verify(moved,options),/changed/)
})

test('empty symlinks retain identity and referenced content in the fingerprint',t=>{
 const {root,options}=fixture(t)
 mkdirSync(join(root,'extensions'))
 mkdirSync(join(root,'external-one'))
 mkdirSync(join(root,'external-two'))
 const absent=capture(options),link=join(root,'extensions/plugin-link')
 symlinkSync('../external-one',link)
 const linked=capture(options)
 assert.notEqual(linked.inputDigest,absent.inputDigest)
 rmSync(link)
 symlinkSync('../external-two',link)
 assert.throws(()=>verify(linked,options),/changed/)
 const retargeted=capture(options)
 write(root,'external-two/entry.js','referenced plugin source')
 assert.throws(()=>verify(retargeted,options),/changed/)
})

test('build CLI accepts a Creator-created directory before final stamp verification',t=>{
 const {root,creator,folder,run}=cliFixture(t,{platform:'web-mobile',mode:'empty-directories'}),result=run()
 assert.equal(result.status,0,result.log)
 assert.ok(existsSync(join(root,'cocos-pilot/settings/v2/default-profiles')))
 assert.equal(verify(JSON.parse(readFileSync(join(folder,'release-build.json'))),{root,creator,platform:'web-mobile'}),true)
})


test('build profile is attested from the compiled capability source and QA is never publishable',t=>{
 const {root,folder,options}=fixture(t),production=capture(options);assert.equal(production.profile,'production');
 writeBuildCapabilities(root,'qa');const qa=capture(options);assert.equal(qa.profile,'qa');assert.notEqual(qa.inputDigest,production.inputDigest);
 assert.throws(()=>verify(production,options),/profile|过期/);integrity.stampBuild(folder,qa,options);
 assert.equal(verify(qa,options),true);assert.ok(checkRelease('publication',options).blockers.some(message=>/QA构建/.test(message)));
 assert.ok(checkRelease('submission',options).blockers.some(message=>/QA构建/.test(message)));
 const falseDeclaration={...qa,profile:'production'};assert.throws(()=>verify(falseDeclaration,options),/profile|过期/);
 writeBuildCapabilities(root,'production');assert.throws(()=>verify(qa,options),/profile|过期/);
 integrity.stampBuild(folder,capture(options),options);assert.deepEqual(checkRelease('publication',options).blockers,[]);
})

for(const profile of ['production','qa'])test(`build CLI emits the explicit ${profile} capability and manifest`,t=>{
 const {root,creator,folder,run}=cliFixture(t,{platform:'web-mobile'}),result=run(['--profile='+profile]);assert.equal(result.status,0,result.log);
 assert.equal(readBuildProfile(root),profile);const stamp=JSON.parse(readFileSync(join(folder,'release-build.json')));assert.equal(stamp.profile,profile);
 assert.equal(verify(stamp,{root,creator,platform:'web-mobile'}),true);
})

test('default build resets a previous QA capability to production',t=>{
 const {root,folder,run}=cliFixture(t,{platform:'web-mobile'});writeBuildCapabilities(root,'qa');const result=run();assert.equal(result.status,0,result.log);
 assert.equal(readBuildProfile(root),'production');assert.equal(JSON.parse(readFileSync(join(folder,'release-build.json'))).profile,'production');
})

for(const args of [['--profile=dev'],['--profile=qa','--release'],['--profile=qa','--profile=production']])test(`invalid or release-ineligible profile fails before replacing a prior candidate: ${args.join(' ')}`,t=>{
 const {folder,run}=cliFixture(t),before=readFileSync(join(folder,'release-build.json'),'utf8'),result=run(args);
 assert.notEqual(result.status,0);assert.match(result.log,/profile/i);assert.equal(readFileSync(join(folder,'release-build.json'),'utf8'),before);
})
