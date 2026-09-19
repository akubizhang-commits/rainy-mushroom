import fs from 'node:fs'
import {resolve,relative} from 'node:path'
import {createHash} from 'node:crypto'
export const projectRoot=resolve(import.meta.dirname,'..')
export function filesBelow(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.name==='.DS_Store'?[]:e.isDirectory()?filesBelow(resolve(folder,e.name)):[resolve(folder,e.name)]).sort()}
export function digestSource(){const h=createHash('sha256');for(const folder of ['js','cocos-pilot/assets','cocos-pilot/settings','cocos-pilot/build-configs'])for(const file of filesBelow(resolve(projectRoot,folder))){h.update(relative(projectRoot,file));h.update(fs.readFileSync(file))}return h.digest('hex')}
export function stampBuild(folder){const config=JSON.parse(fs.readFileSync(resolve(projectRoot,'release/settings.json')));fs.writeFileSync(resolve(folder,'release-build.json'),JSON.stringify({version:config.version,appid:config.appid,builtAt:new Date().toISOString(),sourceDigest:digestSource()},null,2)+'\n')}
