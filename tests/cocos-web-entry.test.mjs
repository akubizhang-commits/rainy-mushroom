import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {validateWebEntry} from '../scripts/cocos/validate-web-entry.mjs'

function fixture(t,html,files) {
 const root=mkdtempSync(join(tmpdir(),'cocos-entry-'))
 t.after(()=>rmSync(root,{recursive:true,force:true}))
 writeFileSync(join(root,'index.html'),html)
 for(const file of files){mkdirSync(join(root,file,'..'),{recursive:true});writeFileSync(join(root,file),'/* asset */')}
 return root
}
test('web entry rejects unversioned script references when only hashed output exists',t=>{
 const root=fixture(t,'<script src="src/system.bundle.js"></script>',['src/system.bundle.abcde.js'])
 assert.throws(()=>validateWebEntry(root),/src[/]system.bundle.js/)
})
test('web entry checks hashed scripts, styles and System entry relative to the build root',t=>{
 const root=fixture(t,'<!-- <link href=".png"> --><link rel="stylesheet" href="style.abc.css"><script src="src/system.abc.js?v=1"></script><script>System.import("./index.abc.js")</script>',['style.abc.css','src/system.abc.js','index.abc.js'])
 assert.equal(validateWebEntry(root).checked,3)
})
test('web entry rejects a missing System entry and a path outside the output',t=>{
 const root=fixture(t,'<script>System.import("./missing.js")</script>',[])
 assert.throws(()=>validateWebEntry(root),/missing.js/)
 writeFileSync(join(root,'index.html'),'<script src="../outside.js"></script>')
 assert.throws(()=>validateWebEntry(root),/outside build/)
})
