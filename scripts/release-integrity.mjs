import fs from 'node:fs'
import {readBuildProfile} from './build-profile.mjs'
import {resolve,relative,dirname} from 'node:path'
import {createHash} from 'node:crypto'

export const projectRoot=resolve(import.meta.dirname,'..')
export const defaultCreator=process.env.COCOS_CREATOR_PATH||'/Applications/CocosCreator.app/Contents/MacOS/CocosCreator'
const sourceFolders=['js','cocos-pilot/assets','cocos-pilot/settings','cocos-pilot/build-configs']
const requiredInputs=[...sourceFolders,'scripts','package.json','project.config.json','cocos-pilot/package.json','cocos-pilot/tsconfig.json','release/settings.json']
const lockfiles=['package-lock.json','npm-shrinkwrap.json','yarn.lock','pnpm-lock.yaml','bun.lock','bun.lockb']
const optionalInputs=[
 'build-templates','cocos-pilot/build-templates','extensions','cocos-pilot/extensions','packages','cocos-pilot/packages',
 'release/asset-policy.json','tsconfig.json','.npmrc','cocos-pilot/.npmrc',...lockfiles,...lockfiles.map(name=>'cocos-pilot/'+name)
]
const sha256=value=>createHash('sha256').update(value).digest('hex')
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item)

/** Refuse a symlink at any existing output ancestor before a clean rebuild. */
export function assertSafeBuildOutput(path){
 let current=resolve(path)
 while(true){
  try{if(fs.lstatSync(current).isSymbolicLink())throw Error('Build output symlink is not allowed: '+current)}catch(error){if(error.code!=='ENOENT')throw error}
  const parent=dirname(current);if(parent===current)break;current=parent
 }
}

export function filesBelow(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.name==='.DS_Store'?[]:e.isDirectory()?filesBelow(resolve(folder,e.name)):[resolve(folder,e.name)]).sort()}
// Keep the legacy concatenation, ordering and path spelling for audit compatibility.
export function digestSource(root=projectRoot){const h=createHash('sha256');for(const folder of sourceFolders)for(const file of filesBelow(resolve(root,folder))){h.update(relative(root,file));h.update(fs.readFileSync(file))}return h.digest('hex')}

function inputRecord(root,path,optional=false){
 const file=resolve(root,path)
 let stat
 try{stat=fs.lstatSync(file)}catch(error){if(optional&&error.code==='ENOENT')return {path,type:'missing'};throw error}
 const entries=[]
 function visit(target,name,parents=new Set()){
  const entry=fs.lstatSync(target)
  if(entry.isSymbolicLink())entries.push({path:name,type:'symlink',target:fs.readlinkSync(target)})
  const followed=fs.statSync(target)
  if(followed.isDirectory()){
   const real=fs.realpathSync(target)
   if(parents.has(real))throw Error('Cyclic build input: '+target)
   const next=new Set(parents).add(real)
   // Explicit input roots retain presence; nested empty folders are Creator cache noise.
   // File paths and symlink records below still identify every substantive input.
   if(name===path)entries.push({path:name,type:'directory'})
   for(const child of fs.readdirSync(target).filter(name=>name!=='.DS_Store').sort())visit(resolve(target,child),name+'/'+child,next)
  }else if(followed.isFile())entries.push({path:name,type:'file',sha256:sha256(fs.readFileSync(target))})
  else throw Error('Unsupported build input: '+target)
 }
 visit(file,path)
 return {path,type:stat.isSymbolicLink()?'symlink':stat.isDirectory()?'directory':'file',sha256:sha256(canonical(entries))}
}

// This identifies the selected installation, not every file in the Creator engine.
// The current build driver targets the macOS Creator .app distribution.
export function readToolchain({creator=defaultCreator}={}){
 const executable=fs.realpathSync(creator),contents=resolve(dirname(executable),'..')
 const versionInfo=fs.readFileSync(resolve(contents,'Info.plist'))
 const version=versionInfo.toString('utf8').match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/)?.[1]
 if(!version||!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version))throw Error('Cannot read actual Creator version from Info.plist')
 const releaseInfo=fs.readFileSync(resolve(contents,'Resources/info.json'))
 JSON.parse(releaseInfo.toString('utf8'))
 return {
  node:{version:process.version,executableSha256:sha256(fs.readFileSync(process.execPath))},
  creator:{version,executableSha256:sha256(fs.readFileSync(executable)),releaseInfoSha256:sha256(releaseInfo),versionInfoSha256:sha256(versionInfo)},
  scope:'executable-and-release-metadata-only'
 }
}

export function captureBuildFingerprint({root=projectRoot,platform,creator=defaultCreator,toolchain,resourcePolicy='all'}={}){
 if(!['web-mobile','wechatgame','taptap-minigame'].includes(platform))throw Error('Unsupported build fingerprint platform')
 if(!['all','reviewed'].includes(resourcePolicy))throw Error('Unsupported resource policy')
 if(resourcePolicy==='reviewed'&&!fs.existsSync(resolve(root,'release/asset-policy.json')))throw Error('Reviewed resource policy requires release/asset-policy.json')
 const config=JSON.parse(fs.readFileSync(resolve(root,'release/settings.json')))
 const tools=JSON.parse(canonical(toolchain??readToolchain({creator})))
 const inputs=[...requiredInputs.map(path=>inputRecord(root,path)),...optionalInputs.map(path=>inputRecord(root,path,true))]
 const identity={schemaVersion:2,platform,profile:readBuildProfile(root),resourcePolicy,inputs,toolchain:tools}
 return {...identity,version:config.version,appid:platform==='taptap-minigame'?null:config.appid,...(platform==='taptap-minigame'?{intermediateWechatAppId:config.appid}:{}),sourceDigest:digestSource(root),inputDigest:sha256(canonical(identity))}
}

export function verifyBuildStamp(stamp,options={}){
 if(stamp?.schemaVersion!==2||!stamp.inputDigest||!stamp.toolchain||!stamp.inputs||!['production','qa'].includes(stamp.profile)||!['all','reviewed'].includes(stamp.resourcePolicy))throw Error('旧版或不完整的构建记录：需要 schemaVersion 2 完整构建指纹，请重新构建')
 const current=captureBuildFingerprint(options)
 for(const key of ['schemaVersion','platform','profile','resourcePolicy','version','appid','intermediateWechatAppId','sourceDigest','inputDigest','inputs','toolchain']){
  if(canonical(stamp[key])!==canonical(current[key]))throw Error('构建产物已过期，build inputs or toolchain changed ('+key+')，请重新构建')
 }
 return true
}

export function stampBuild(folder,before,options={}){
 verifyBuildStamp(before,options)
 const stamp={...before,builtAt:new Date().toISOString()}
 fs.writeFileSync(resolve(folder,'release-build.json'),JSON.stringify(stamp,null,2)+'\n')
 return stamp
}
