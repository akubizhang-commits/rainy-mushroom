import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync,rmSync,readdirSync,statSync} from 'node:fs'
import {resolve} from 'node:path'
// Creator 3.8's WeChat AssetManager loads declared subpackages from
// subpackages/<name>/config[.<ver>].json after wx.loadSubpackage executes game.js.
// Bundles listed as remote are moved out of the package to <outDir>/remote/<name>;
// the engine then loads their config from <server>remote/<name>/ and requires
// their script from src/bundle-scripts/<name>/ inside the package.
// Keep this explicit final packaging step reproducible for both CLI and CI.
// Current tower artwork is emitted as the resources bundle.
export const OPTIONAL_BUNDLES=['resources']
// Exactly one file matching <stem>.json/.js or <stem>.<ver>.json/.js (md5Cache) in dir, or null when none.
function findOne(dir,stem,ext,required=true){
 const re=new RegExp('^'+stem+'(\\.[0-9a-zA-Z]+)?\\.'+ext+'$'),hits=existsSync(dir)?readdirSync(dir).filter(name=>re.test(name)):[]
 if(hits.length>1)throw Error(`Expected one ${stem}.*.${ext} in ${dir}, found ${hits.join(', ')}`)
 if(!hits.length&&required)throw Error(`Missing ${stem}.*.${ext} in ${dir}`)
 return hits[0]||null
}
export function resolveRemoteBaseUrl(releaseConfig,env=process.env){
 const url=String(env.WECHAT_REMOTE_BASE_URL||releaseConfig?.remoteAssetBaseUrl||'').trim()
 if(!/^https?:\/\/[^/]/.test(url))throw Error('Remote asset base URL must start with http:// or https:// (release/settings.json remoteAssetBaseUrl or WECHAT_REMOTE_BASE_URL): '+JSON.stringify(url))
 return url.endsWith('/')?url:url+'/'
}
export function packageWechat(root,{remote=null}={}){
 const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8')),write=(p,v)=>writeFileSync(resolve(root,p),JSON.stringify(v,null,2)+'\n')
 const settingsPath='src/'+findOne(resolve(root,'src'),'settings','json')
 const hasConfig=name=>!!findOne(resolve(root,'assets',name),'config','json',false)
 // Fixed bundles must exist; resources is appended when built.
 const settings=read(settingsPath),game=read('game.json'),built=['internal','main',...OPTIONAL_BUNDLES.filter(hasConfig)]
 const remoteNames=remote?built.filter(name=>remote.bundles.includes(name)):[],names=built.filter(name=>!remoteNames.includes(name))
 const checkConfig=(dir,name)=>{if(!hasConfig(name))throw Error('Missing built bundle '+name);const config=JSON.parse(readFileSync(resolve(dir,findOne(dir,'config','json')),'utf8'));if(config.name!==name)throw Error('Unexpected bundle name '+name)}
 for(const name of names){
  const from=resolve(root,'assets',name),to=resolve(root,'subpackages',name)
  checkConfig(from,name)
  if(existsSync(to))rmSync(to,{recursive:true});mkdirSync(resolve(root,'subpackages'),{recursive:true});renameSync(from,to)
  const index=findOne(to,'index','js',false)
  writeFileSync(resolve(to,'game.js'),index?`require('./${index}');\n`:"// Resource-only subpackage.\n")
 }
 for(const name of remoteNames){
  const from=resolve(root,'assets',name),to=resolve(remote.outDir,'remote',name),scripts=resolve(root,'src/bundle-scripts',name)
  checkConfig(from,name)
  const index=findOne(from,'index','js',false)
  if(existsSync(scripts))rmSync(scripts,{recursive:true});if(index){mkdirSync(scripts,{recursive:true});renameSync(resolve(from,index),resolve(scripts,index))}
  if(existsSync(to))rmSync(to,{recursive:true});mkdirSync(resolve(remote.outDir,'remote'),{recursive:true});renameSync(from,to)
 }
 settings.assets.subpackages=names;game.subpackages=names.map(name=>({name,root:'subpackages/'+name+'/'}))
 if(remote){settings.assets.remoteBundles=remoteNames;settings.assets.server=remote.server}
 write(settingsPath,settings);write('game.json',game)
 const bytes=p=>readdirSync(p,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?bytes(resolve(p,e.name)):statSync(resolve(p,e.name)).size),0)
 const total=bytes(root),subpackages=Object.fromEntries(names.map(name=>[name,bytes(resolve(root,'subpackages',name))])),main=total-Object.values(subpackages).reduce((n,x)=>n+x,0)
 const report={mainBytes:main,subpackageBytes:subpackages,totalBytes:total,mainLimitBytes:4*1024*1024,totalLimitBytes:20*1024*1024}
 if(remote)Object.assign(report,{remoteBytes:Object.fromEntries(remoteNames.map(name=>[name,bytes(resolve(remote.outDir,'remote',name))])),remoteServer:remote.server,remoteRoot:resolve(remote.outDir)})
 if(main>report.mainLimitBytes||Object.values(subpackages).some(n=>n>4*1024*1024)||total>report.totalLimitBytes)throw Error('WeChat package exceeds project budget: '+JSON.stringify(report))
 return report
}
if(process.argv[1]===new URL(import.meta.url).pathname)console.log(JSON.stringify(packageWechat(resolve(process.argv[2]||'cocos-pilot/build/wechatgame')),null,2))
