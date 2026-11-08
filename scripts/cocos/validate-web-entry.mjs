import {readFileSync,statSync} from 'node:fs'
import {resolve,sep} from 'node:path'

// Creator's completion marker alone does not prove that its HTML and hashed
// boot assets belong to the same output. Fail before stamping a broken build.
export function validateWebEntry(folder) {
 const root=resolve(folder),html=readFileSync(resolve(root,'index.html'),'utf8').replace(/<!--[\s\S]*?-->/g,''),urls=new Set()
 for(const match of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi))urls.add(match[1])
 for(const match of html.matchAll(/\bSystem\.import\(\s*["']([^"']+)["']/g))urls.add(match[1])
 let checked=0
 for(const url of urls) {
  if(/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)||url.startsWith('#'))continue
  const local=decodeURIComponent(url.split(/[?#]/)[0]),file=resolve(root,local.replace(/^\//,''))
  if(!file.startsWith(root+sep))throw Error(`Web entry points outside build: ${url}`)
  let exists=false
  try{exists=statSync(file).isFile()}catch{}
  if(!exists)throw Error(`Web entry references missing build asset: ${url}`)
  checked++
 }
 if(!checked)throw Error('Web entry has no local boot assets')
 return {checked}
}
