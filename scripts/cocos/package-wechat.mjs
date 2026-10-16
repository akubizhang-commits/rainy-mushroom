import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync,rmSync,readdirSync,statSync} from 'node:fs'
import {resolve} from 'node:path'
// Creator 3.8's WeChat AssetManager loads declared subpackages from
// subpackages/<name>/config.json after wx.loadSubpackage executes game.js.
// Keep this explicit final packaging step reproducible for both CLI and CI.
export const OPTIONAL_BUNDLES=['survivor']
export function packageWechat(root){
 const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8')),write=(p,v)=>writeFileSync(resolve(root,p),JSON.stringify(v,null,2)+'\n')
 // Fixed bundles must exist; optional bundles (survivor, 03 §7.5 / D14) are appended only when built.
 const settings=read('src/settings.json'),game=read('game.json'),names=['internal','main','resources',...OPTIONAL_BUNDLES.filter(name=>existsSync(resolve(root,'assets',name,'config.json')))]
 for(const name of names){
  const from=resolve(root,'assets',name),to=resolve(root,'subpackages',name)
  if(!existsSync(resolve(from,'config.json')))throw Error('Missing built bundle '+name)
  const config=JSON.parse(readFileSync(resolve(from,'config.json'),'utf8'));if(config.name!==name)throw Error('Unexpected bundle name '+name)
  if(existsSync(to))rmSync(to,{recursive:true});mkdirSync(resolve(root,'subpackages'),{recursive:true});renameSync(from,to)
  writeFileSync(resolve(to,'game.js'),existsSync(resolve(to,'index.js'))?"require('./index.js');\n":"// Resource-only subpackage.\n")
 }
 settings.assets.subpackages=names;game.subpackages=names.map(name=>({name,root:'subpackages/'+name+'/'}));write('src/settings.json',settings);write('game.json',game)
 const bytes=p=>readdirSync(p,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?bytes(resolve(p,e.name)):statSync(resolve(p,e.name)).size),0)
 const total=bytes(root),subpackages=Object.fromEntries(names.map(name=>[name,bytes(resolve(root,'subpackages',name))])),main=total-Object.values(subpackages).reduce((n,x)=>n+x,0)
 const report={mainBytes:main,subpackageBytes:subpackages,totalBytes:total,mainLimitBytes:4*1024*1024,totalLimitBytes:20*1024*1024}
 if(main>report.mainLimitBytes||Object.values(subpackages).some(n=>n>4*1024*1024)||total>report.totalLimitBytes)throw Error('WeChat package exceeds project budget: '+JSON.stringify(report))
 return report
}
if(process.argv[1]===new URL(import.meta.url).pathname)console.log(JSON.stringify(packageWechat(resolve(process.argv[2]||'cocos-pilot/build/wechatgame')),null,2))
