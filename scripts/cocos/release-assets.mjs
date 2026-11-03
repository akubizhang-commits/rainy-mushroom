export {assertSafeBuildOutput} from '../release-integrity.mjs'
import fs from 'node:fs'
import {resourceGroup} from '../../js/xianxia/TowerResourceGroups.js'
export {resourceGroup} from '../../js/xianxia/TowerResourceGroups.js'
import {join,relative,dirname,extname,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'

const sha=value=>createHash('sha256').update(value).digest('hex')
const readJson=path=>JSON.parse(fs.readFileSync(path,'utf8'))
const pathKey=path=>path.split('\\').join('/')
const required=['assets','settings','package.json','tsconfig.json']
const optional=['build-configs','build-templates','extensions','packages']
const types={image:'cc.ImageAsset',json:'cc.JsonAsset','audio-clip':'cc.AudioClip',text:'cc.TextAsset'}
function files(root){
 const result=[]
 function visit(path){
  const stat=fs.lstatSync(path)
  if(stat.isSymbolicLink())throw Error('Release input symlink is not allowed: '+path)
  if(stat.isDirectory())for(const name of fs.readdirSync(path).filter(n=>n!=='.DS_Store').sort())visit(join(path,name))
  else if(stat.isFile())result.push(path)
  else throw Error('Unsupported release input: '+path)
 }
 visit(root);return result
}
function relativeAsset(path){
 if(typeof path!=='string'||!path||path.startsWith('/')||path.includes('\\')||path.split('/').some(p=>!p||p==='.'||p==='..')||/[?*\[\]:\0]/.test(path))throw Error('Unsafe resource policy path: '+path)
 return path
}
function resourceRecord(root,path){
 const name=pathKey(relative(root,path)),metaPath=path+'.meta'
 if(!fs.existsSync(metaPath))throw Error('Missing resource metadata: '+name)
 const meta=readJson(metaPath),type=types[meta.importer]
 if(!type||typeof meta.uuid!=='string')throw Error('Unsupported resource metadata: '+name)
 return {path:name,logicalPath:name.slice(0,-extname(name).length),type,uuid:meta.uuid,bytes:fs.statSync(path).size,sha256:sha(fs.readFileSync(path)),metaSha256:sha(fs.readFileSync(metaPath)),group:resourceGroup(name)}
}
/** All executable/serialized asset-selection inputs are reviewed together. Only the
 * generated boolean build capability is excluded; changing QA profile selects no art. */
export function runtimeSelectionDigest(root){
 const project=join(root,'cocos-pilot'),records=[]
 for(const dir of ['assets/scripts','assets/scenes','assets/prefabs']){
  const base=join(project,dir);if(!fs.existsSync(base))continue
  for(const file of files(base)){
   const name=pathKey(relative(project,file))
   if(name==='assets/scripts/TowerBuildCapabilities.ts'||name.endsWith('.meta'))continue
   records.push([name,sha(fs.readFileSync(file))])
  }
 }
 return sha(JSON.stringify(records.sort((a,b)=>a[0].localeCompare(b[0],'en'))))
}
export function createReleaseStage({root}){
 root=resolve(root)
 const project=join(root,'cocos-pilot'),policy=readJson(join(root,'release/asset-policy.json')),resourceRoot=join(project,'assets/resources')
 if(policy.version!==1||!Array.isArray(policy.exclude)||policy.reviewedRuntimeDigest!==runtimeSelectionDigest(root))throw Error('Resource exclusion audit is stale; review runtime selection changes before building')
 const inputs=[]
 for(const name of [...required,...optional]){
  const path=join(project,name)
  if(!fs.existsSync(path)){if(required.includes(name))throw Error('Missing release project input: '+name);continue}
  for(const file of files(path))inputs.push({path:pathKey(relative(project,file)),sha256:sha(fs.readFileSync(file))})
 }
 const inventory=files(resourceRoot).filter(p=>!p.endsWith('.meta')).map(p=>resourceRecord(resourceRoot,p)),byPath=new Map(inventory.map(r=>[r.path,r])),exclude=new Set()
 for(const entry of policy.exclude){
  const path=relativeAsset(entry.path)
  if(exclude.has(path))throw Error('Duplicate resource exclusion: '+path)
  exclude.add(path)
  const actual=byPath.get(path)
  if(!actual||actual.sha256!==entry.sha256||actual.metaSha256!==entry.metaSha256||actual.uuid!==entry.uuid)throw Error('Excluded resource hash/UUID changed: '+path)
  if(!entry.reason||!Array.isArray(entry.replacements)||!entry.replacements.length)throw Error('Missing reviewed replacement: '+path)
 }
 for(const entry of policy.exclude){
  for(const replacement of entry.replacements){
   relativeAsset(replacement)
   if(!byPath.has(replacement)||exclude.has(replacement))throw Error('Missing retained replacement: '+replacement)
  }
  // Textual UUID references include sub-assets; path matching checks complete logical paths.
  const logical=byPath.get(entry.path).logicalPath
  for(const input of inputs){
   if(input.path==='assets/resources/'+entry.path+'.meta')continue
   if(!/\.(?:ts|js|json|scene|prefab|meta|mtl|effect)$/.test(input.path))continue
   const text=fs.readFileSync(join(project,input.path),'utf8')
   if(text.includes(entry.uuid)||text.includes("'"+logical+"'")||text.includes('"'+logical+'"')||text.includes('`'+logical+'`'))throw Error('Excluded resource has a current reference: '+entry.path+' in '+input.path)
  }
 }
 const excludedPaths=new Set([...exclude].flatMap(p=>['assets/resources/'+p,'assets/resources/'+p+'.meta']))
 const retained=inputs.filter(i=>!excludedPaths.has(i.path)),resources=inventory.filter(r=>!exclude.has(r.path))
 const size=rows=>({count:rows.length,bytes:rows.reduce((sum,r)=>sum+r.bytes,0)})
 const manifest={version:1,policySha256:sha(fs.readFileSync(join(root,'release/asset-policy.json'))),reviewedRuntimeDigest:policy.reviewedRuntimeDigest,before:size(inventory),after:size(resources),excludedBytes:size(inventory.filter(r=>exclude.has(r.path))).bytes,excluded:inventory.filter(r=>exclude.has(r.path)),resources,inputs:retained}
 const stageRoot=fs.mkdtempSync(join(fs.realpathSync(tmpdir()),'rainy-release-')),destination=join(stageRoot,'project')
 try{
  for(const input of retained){const dest=join(destination,input.path);fs.mkdirSync(dirname(dest),{recursive:true});fs.copyFileSync(join(project,input.path),dest)}
  fs.writeFileSync(join(stageRoot,'stage.json'),JSON.stringify(manifest,null,2)+'\n')
  const stage={stageRoot,project:destination,manifest};verifyStagedInputs(stage);return stage
 }catch(error){fs.rmSync(stageRoot,{recursive:true,force:true});throw error}
}
export function verifyStagedInputs({project,manifest}){
 for(const input of manifest.inputs){
  const file=join(project,input.path)
  if(!fs.existsSync(file))throw Error('Missing staged input: '+input.path)
  if(fs.lstatSync(file).isSymbolicLink()||sha(fs.readFileSync(file))!==input.sha256)throw Error('Staged input changed: '+input.path)
 }
 const expected=new Set(manifest.inputs.map(i=>i.path))
 for(const name of [...required,...optional]){
  const root=join(project,name);if(!fs.existsSync(root))continue
  for(const file of files(root))if(!expected.has(pathKey(relative(project,file))))throw Error('Unexpected staged input: '+file)
 }
 return true
}
function decodeUuid(value){
 const [id,suffix]=value.split('@')
 if(id.length!==22)return value
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
 let hex=id.slice(0,2)
 for(let i=2;i<22;i+=2){const a=alphabet.indexOf(id[i]),b=alphabet.indexOf(id[i+1]);if(a<0||b<0)throw Error('Invalid compressed UUID');hex+=(a>>2).toString(16)+(((a&3)<<2)|(b>>4)).toString(16)+(b&15).toString(16)}
 return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-')+(suffix?'@'+suffix:'')
}
/** Cocos config uses a typed path entry and a corresponding UUID index. */
export function verifyBuiltResources(config,manifest){
 const uuids=(config.uuids||[]).map(decodeUuid),paths=config.paths||{},types=config.types||[],debug=config.debug===true
 // Creator 3.8.8 debug configs use UUID keys and literal type names; compact
 // configs use indices into uuids/types (engine asset-manager/config.ts).
 const uuidByKey=new Map((config.uuids||[]).map(id=>[id,decodeUuid(id)]))
 const referenced=debug?[...uuids,...Object.keys(paths).map(decodeUuid)]:uuids
 for(const removed of manifest.excluded)if(referenced.some(id=>id.split('@')[0]===removed.uuid))throw Error('Excluded UUID remains in built resources: '+removed.path)
 for(const asset of manifest.resources){
  const matches=Object.entries(paths).filter(([,entry])=>entry[0]===asset.logicalPath&&(debug?entry[1]:types[entry[1]])===asset.type)
  if(!matches.length)throw Error('Missing built typed resource: '+asset.path+' '+asset.type)
  if(!matches.some(([index])=>(debug?uuidByKey.get(index):uuids[Number(index)])===asset.uuid))throw Error('Built resource UUID mismatch: '+asset.path)
 }
 return true
}
export function verifyAndWriteAssetManifest(stage,output){
 verifyStagedInputs(stage)
 const folder=join(output,'assets/resources')
 const candidates=fs.readdirSync(folder).filter(name=>/^config(?:\.[a-zA-Z0-9_-]+)?\.json$/.test(name))
 if(candidates.length!==1)throw Error('Expected one built resources config')
 const config=readJson(join(folder,candidates[0]));verifyBuiltResources(config,stage.manifest)
 fs.writeFileSync(join(output,'asset-release.json'),JSON.stringify({...stage.manifest,validation:{stagedInputs:'pass',typedPathsAndUuids:'pass',device:'not-run',platformLimits:'unverified'}},null,2)+'\n')
 return stage.manifest
}
