import fs from 'node:fs'
import {basename,dirname,isAbsolute,join,relative,resolve,sep} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {spawnSync} from 'node:child_process'
import {prepareSubpackages,measurePackage} from './package-wechat.mjs'

const scriptDir=import.meta.dirname
const lock=JSON.parse(fs.readFileSync(resolve(scriptDir,'../../cocos-pilot/build-configs/taptap-minigame.lock.json')))
const sha256=data=>createHash('sha256').update(data).digest('hex')
const readJson=path=>JSON.parse(fs.readFileSync(path,'utf8'))
const writeJson=(path,value)=>fs.writeFileSync(path,JSON.stringify(value,null,2)+'\n')
const validation=()=>({offlineConversion:'not-run',platformImport:'not-run',device:'not-run',releaseEligible:false})
const identity=()=>({tapGameId:null,tapAppId:null,accountVerified:false})

export function assertNoSymlinkPath(path){
 for(let cursor=resolve(path);;cursor=dirname(cursor)){
  let entry
  try{entry=fs.lstatSync(cursor)}catch(error){if(error.code!=='ENOENT')throw error}
  if(entry?.isSymbolicLink())throw Error('Symbolic link path is not permitted: '+cursor)
  if(dirname(cursor)===cursor)break
 }
}
function contains(parent,child){const path=relative(parent,child);return path===''||(!path.startsWith('..'+sep)&&path!=='..'&&!isAbsolute(path))}
function assertDisjoint(a,b){if(contains(a,b)||contains(b,a))throw Error('Conversion paths must not overlap or contain one another: '+a+' / '+b)}
export function snapshotTree(root){
 assertNoSymlinkPath(root)
 const files={};let bytes=0
 function visit(folder){
  for(const name of fs.readdirSync(folder).sort()){
   const path=join(folder,name),stat=fs.lstatSync(path)
   if(stat.isSymbolicLink())throw Error('Symbolic link in conversion tree: '+path)
   if(stat.isDirectory())visit(path)
   else if(stat.isFile()){const content=fs.readFileSync(path);files[relative(root,path).split(sep).join('/')]=sha256(content);bytes+=content.length}
   else throw Error('Unsupported conversion input: '+path)
  }
 }
 visit(root)
 const sorted=Object.fromEntries(Object.entries(files).sort(([a],[b])=>a<b?-1:a>b?1:0))
 return {treeSha256:sha256(Object.entries(sorted).map(([path,digest])=>path+'\0'+digest+'\n').join('')),fileCount:Object.keys(sorted).length,bytes,files:sorted}
}
function assertNoBabelConfig(root,snapshot){
 if(fs.existsSync(join(root,'@babel')))throw Error('Babel skip marker is not permitted: @babel')
 for(const path of Object.keys(snapshot.files)){
  const name=basename(path)
  if(path==='@babel'||path.startsWith('@babel/')||/^\.babelrc(?:\.|$)|^babel\.config\.|^\.browserslistrc$/.test(name))throw Error('Babel discovery config or skip marker is not permitted: '+path)
  if(name==='package.json'){const config=readJson(join(root,path));if(config.babel||config.browserslist)throw Error('Babel/Browserslist package config is not permitted: '+path)}
 }
}
function assertNoAmbientConfig(path){
 for(let cursor=resolve(path);;cursor=dirname(cursor)){
  for(const name of fs.readdirSync(cursor))if(/^\.babelrc(?:\.|$)|^babel\.config\.|^\.browserslistrc$/.test(name))throw Error('Ambient Babel config is not permitted: '+join(cursor,name))
  const pkg=join(cursor,'package.json')
  if(fs.existsSync(pkg)){const config=readJson(pkg);if(config.babel||config.browserslist)throw Error('Ambient Babel package config is not permitted: '+pkg)}
  if(dirname(cursor)===cursor)break
 }
}
function validateSource(source){
 const snapshot=snapshotTree(source);assertNoBabelConfig(source,snapshot)
 for(const name of ['game.js','game.json','src/settings.json'])if(!Object.hasOwn(snapshot.files,name))throw Error('Missing raw Creator input: '+name)
 const game=readJson(join(source,'game.json'))
 for(const [name,info] of Object.entries(game.plugins||{})){
  if(!/^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(name)||!info||typeof info!=='object'||(info.version!==undefined&&!/^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(String(info.version))))throw Error('Unsafe plugin name/version path: '+name)
 }
 return snapshot
}
export function prepareTapInput(source,input){
 source=resolve(source);input=resolve(input)
 assertNoSymlinkPath(input);assertDisjoint(source,input)
 validateSource(source)
 if(fs.existsSync(input))throw Error('Tap input staging must be a new exclusive directory')
 fs.cpSync(source,input,{recursive:true,dereference:false})
 prepareSubpackages(input)
 const game=readJson(join(input,'game.json'))
 game.deviceOrientation='landscape';delete game.orientation
 game.subPackages=game.subpackages;delete game.subpackages
 // WeChat's editor identity is an intermediate-build input, never a Tap identity.
 for(const key of Object.keys(game))if(key.toLowerCase()==='appid')delete game[key]
 writeJson(join(input,'game.json'),game)
 for(const name of ['project.config.json','project.private.config.json','release-build.json','tap-build.json','tap-input-manifest.json'])fs.rmSync(join(input,name),{force:true})
 return measurePackage(input,game.subPackages.map(entry=>entry.name))
}
export function verifyPinnedPlugin({pluginDir,archivePath}){
 if(!pluginDir||!archivePath)throw Error('Set TAP_PLUGIN_DIR and TAP_PLUGIN_ARCHIVE to the fixed official 1.2.2 package; no download/install is implicit')
 pluginDir=resolve(pluginDir);archivePath=resolve(archivePath)
 assertNoSymlinkPath(pluginDir);assertNoSymlinkPath(archivePath)
 for(const path of Object.values(lock.dependencies))if(!fs.existsSync(join(pluginDir,path)))throw Error('Missing bundled dependency: '+path+'; implicit npm install is forbidden')
 if(!fs.existsSync(archivePath)||fs.statSync(archivePath).size!==lock.archiveBytes||sha256(fs.readFileSync(archivePath))!==lock.archiveSha256)throw Error('Pinned official ZIP archive hash/length mismatch')
 const tree=snapshotTree(pluginDir)
 if(tree.treeSha256!==lock.extractedTreeSha256||tree.fileCount!==lock.extractedFileCount)throw Error('Pinned plugin extracted tree hash mismatch')
 const pkg=readJson(join(pluginDir,'package.json'))
 if(pkg.name!==lock.name||pkg.version!==lock.version)throw Error('Pinned plugin package identity mismatch')
 const require=createRequire(join(pluginDir,'package.json'))
 for(const [name,path] of Object.entries(lock.dependencies)){
  const entry=require.resolve(name,{paths:[name.startsWith('@babel/')?join(pluginDir,'converter'):pluginDir]})
  if(entry!==join(pluginDir,path))throw Error('Bundled dependency resolved outside locked entry: '+name)
 }
 return {...lock}
}
export function assertStrictConversionLog(log){
 if(/npm\s+(?:install|ci)\b/.test(log))throw Error('Offline converter attempted or requested npm install')
 if(/\[Babel\]\s*转换失败/.test(log))throw Error('Babel partially failed; ZIP is not a valid candidate')
 const summaries=[...log.matchAll(/Babel转换完成:\s*成功\s*(\d+),\s*跳过\s*(\d+),\s*失败\s*(\d+)/g)]
 if(summaries.length!==1||Number(summaries[0][1])===0||Number(summaries[0][3])!==0)throw Error('Missing, empty or failing Babel summary')
 return {success:Number(summaries[0][1]),skipped:Number(summaries[0][2]),failed:Number(summaries[0][3])}
}
function cleanEnvironment(){
 return Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^NODE_|^BABEL_|^BROWSERSLIST/.test(key)))
}
function verifyGame(gameDir,gameVersion){
 const game=readJson(join(gameDir,'game.json')),settings=readJson(join(gameDir,'src/settings.json'))
 if(game.deviceOrientation!=='landscape'||game.orientation||game.productVersion!==gameVersion||game.convertScriptVersion!==lock.converterVersion)throw Error('Tap game config contract failed')
 if(Object.hasOwn(game,'subpackages')||!Array.isArray(game.subPackages)||!game.subPackages.length)throw Error('Tap requires camelCase game.subPackages')
 const names=game.subPackages.map(entry=>entry.name)
 if(JSON.stringify(names)!==JSON.stringify(settings.assets?.subpackages))throw Error('Cocos subpackage order differs from platform order')
 for(const entry of game.subPackages){
  if(!/^[A-Za-z0-9_-]+$/.test(entry.name)||entry.root!==`subpackages/${entry.name}/`)throw Error('Unsafe Tap subpackage path')
  if(readJson(join(gameDir,entry.root,'config.json')).name!==entry.name||!fs.existsSync(join(gameDir,entry.root,'game.js')))throw Error('Missing Tap subpackage entry/config: '+entry.name)
 }
 if(!fs.readFileSync(join(gameDir,'game.js'),'utf8').startsWith('/* Unity Converter Injection */')||!fs.existsSync(join(gameDir,'check-version.js')))throw Error('Missing official converter runtime injection')
 if(fs.existsSync(join(gameDir,'project.config.json'))||fs.existsSync(join(gameDir,'release-build.json')))throw Error('WeChat identity/stamp leaked into Tap output')
 return measurePackage(gameDir,names)
}
function verifyZip(zipPath,gameDir){
 const result=spawnSync('python3',[join(scriptDir,'tap-verify-zip.py'),zipPath,gameDir],{encoding:'utf8',env:cleanEnvironment(),maxBuffer:2*1024*1024})
 if(result.status!==0)throw result.error||Error('Tap ZIP validation failed: '+result.stderr)
 return JSON.parse(result.stdout)
}

export async function convertTapBuild({source,outputRoot,pluginDir,archivePath,gameVersion,fingerprint,effectiveConfig={},creatorLog,verifyInputs=()=>{}}){
 const plugin=verifyPinnedPlugin({pluginDir,archivePath})
 source=resolve(source);outputRoot=resolve(outputRoot);pluginDir=resolve(pluginDir);archivePath=resolve(archivePath)
 if(!/^\d+\.\d+\.\d+$/.test(gameVersion))throw Error('Tap gameVersion must be explicit numeric major.minor.patch')
 if(fingerprint?.platform!=='taptap-minigame'||fingerprint.appid!==null)throw Error('Tap requires a distinct fingerprint with null unverified AppID')
 const rawBefore=validateSource(source)
 assertNoSymlinkPath(outputRoot);assertDisjoint(source,outputRoot);assertDisjoint(pluginDir,outputRoot)
 fs.mkdirSync(outputRoot,{recursive:true})
 const runDir=fs.mkdtempSync(join(outputRoot,'run-'))
 const scratch=fs.mkdtempSync(join(fs.realpathSync(tmpdir()),'rainy-tap-'))
 const input=join(scratch,'input'),target=join(scratch,'output'),context=join(scratch,'context'),metricsPath=join(scratch,'metrics.json')
 let stagedBefore
 try{
  fs.mkdirSync(context);assertNoAmbientConfig(context)
  prepareTapInput(source,input)
  const content=snapshotTree(input)
  const inputManifest={schemaVersion:1,target:'taptap-minigame',distribution:'ordinary-minigame',route:'official-cocos-converter',plugin,identity:identity(),validation:validation(),sizeLimits:plugin.sizeLimits,fingerprint,inputs:{rawTreeSha256:rawBefore.treeSha256,stagingContentTreeSha256:content.treeSha256,gameVersion,effectiveConfig,effectiveConfigSha256:sha256(JSON.stringify(effectiveConfig)),creatorLogSha256:creatorLog===undefined?null:sha256(creatorLog)}}
  writeJson(join(input,'tap-input-manifest.json'),inputManifest)
  stagedBefore=snapshotTree(input)
  fs.mkdirSync(target)
  const args=['--experimental-permission','--allow-fs-read=*',`--allow-fs-write=${target}`,`--allow-fs-write=${metricsPath}`,join(scriptDir,'tap-worker.cjs'),pluginDir,input,target,metricsPath,gameVersion]
  const child=spawnSync(process.execPath,args,{cwd:context,env:cleanEnvironment(),encoding:'utf8',maxBuffer:32*1024*1024,timeout:5*60*1000})
  fs.writeFileSync(join(runDir,'converter.stdout.log'),child.stdout||'');fs.writeFileSync(join(runDir,'converter.stderr.log'),child.stderr||'')
  if(creatorLog!==undefined)fs.writeFileSync(join(runDir,'creator.log'),creatorLog)
  writeJson(join(runDir,'effective-build-config.json'),effectiveConfig)
  if(fs.existsSync(metricsPath))fs.copyFileSync(metricsPath,join(runDir,'converter-metrics.json'))
  const babel=assertStrictConversionLog((child.stdout||'')+(child.stderr||''))
  if(child.status!==0)throw child.error||Error('Official converter failed with exit code '+child.status)
  const metrics=readJson(metricsPath)
  if(!metrics.success||metrics.childProcessAttempts.length||metrics.networkAttempts.length||metrics.externalLoadedModules.length)throw Error('Converter process permission/side-effect contract failed')
  const gameDir=join(target,'game'),zipPath=join(target,'game.zip')
  const measured=verifyGame(gameDir,gameVersion),tree=snapshotTree(gameDir),zip=verifyZip(zipPath,gameDir)
  if(tree.treeSha256!==zip.treeSha256||tree.bytes!==zip.uncompressedBytes)throw Error('ZIP normalized tree digest mismatch')
  if(rawBefore.treeSha256!==snapshotTree(source).treeSha256||stagedBefore.treeSha256!==snapshotTree(input).treeSha256)throw Error('Immutable conversion source changed')
  verifyPinnedPlugin({pluginDir,archivePath})
  fs.cpSync(gameDir,join(runDir,'game'),{recursive:true});fs.copyFileSync(zipPath,join(runDir,'game.zip'))
  const copied=snapshotTree(join(runDir,'game'))
  if(copied.treeSha256!==tree.treeSha256||sha256(fs.readFileSync(join(runDir,'game.zip')))!==sha256(fs.readFileSync(zipPath)))throw Error('Published copy differs from validated staging')
  // The caller re-reads source/config/toolchain after every artifact write, before attestation.
  verifyInputs()
  const manifest={...inputManifest,builtAt:new Date().toISOString(),validation:{...validation(),offlineConversion:'pass'},inputs:{...inputManifest.inputs,stagingTreeSha256:stagedBefore.treeSha256},outputs:{gameTreeSha256:tree.treeSha256,zipTreeSha256:zip.treeSha256,zipSha256:sha256(fs.readFileSync(zipPath)),zipBytes:fs.statSync(zipPath).size,fileCount:tree.fileCount,uncompressedBytes:zip.uncompressedBytes,...measured},logs:{stdoutSha256:sha256(child.stdout||''),stderrSha256:sha256(child.stderr||''),babel},behavior:metrics,paths:{source,scratch,pluginDir,archivePath}}
  const manifestPath=join(runDir,'tap-build.json');writeJson(manifestPath,manifest)
  return {runDir,scratch,gameDir:join(runDir,'game'),zipPath:join(runDir,'game.zip'),manifestPath,manifest}
 }catch(error){
  const unchanged={}
  try{unchanged.rawSource=rawBefore.treeSha256===snapshotTree(source).treeSha256;unchanged.stagingSource=!stagedBefore||stagedBefore.treeSha256===snapshotTree(input).treeSha256;unchanged.plugin=snapshotTree(pluginDir).treeSha256===plugin.extractedTreeSha256}catch(checkError){unchanged.error=String(checkError)}
  writeJson(join(runDir,'tap-failure.json'),{error:error.stack||String(error),validation:validation(),unchanged,paths:{source,scratch,pluginDir,archivePath}})
  error.message+=`; failure evidence: ${runDir}`
  throw error
 }
}
