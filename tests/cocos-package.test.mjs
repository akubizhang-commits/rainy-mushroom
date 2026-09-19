import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {packageWechat} from '../scripts/cocos/package-wechat.mjs'
test('WeChat packaging relocates complete bundles and declares matching entry scripts',()=>{
 const root=mkdtempSync(join(tmpdir(),'rainy-pack-'));try{
  mkdirSync(join(root,'src'));writeFileSync(join(root,'src/settings.json'),JSON.stringify({assets:{projectBundles:['internal','main','resources']}}));writeFileSync(join(root,'game.json'),'{}')
  for(const name of ['internal','main','resources',...Array.from({length:6},(_,i)=>'catalogue-'+i)]){const path=join(root,'assets',name);mkdirSync(path,{recursive:true});writeFileSync(join(path,'config.json'),JSON.stringify({name}));writeFileSync(join(path,'index.js'),'/* bundle module */')}
  const report=packageWechat(root),settings=JSON.parse(readFileSync(join(root,'src/settings.json'))),game=JSON.parse(readFileSync(join(root,'game.json')))
  assert.equal(settings.assets.subpackages.length,9);assert.equal(game.subpackages.length,9);assert.ok(report.mainBytes<report.mainLimitBytes)
  for(const entry of game.subpackages){assert.ok(existsSync(join(root,entry.root,'config.json')));assert.equal(readFileSync(join(root,entry.root,'game.js'),'utf8'),"require('./index.js');\n");assert.ok(!existsSync(join(root,'assets',entry.name)))}
 }finally{rmSync(root,{recursive:true,force:true})}
})
