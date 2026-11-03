import {readFileSync,writeFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {digestSource} from '../../../scripts/release-integrity.mjs';
import {towerStorage} from '../../../js/xianxia/TowerPlaytest.js';
import {TowerCampaignStore} from '../../../js/xianxia/TowerCampaign.js';
const out={};
const map=new Map(),disk={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
const store=new TowerCampaignStore(towerStorage(disk),0);out.developerGrant={allowed:store.allowPlaytestTools,result:store.act({type:'playtestResources'},0)};
let complete;const logs=[];const ctx={setTimeout:()=>1,clearTimeout(){},console:{warn:(...a)=>logs.push(a.map(String)),error:(...a)=>logs.push(a.map(String))}};
runInNewContext(stripTypeScriptTypes(readFileSync('cocos-pilot/assets/scripts/TowerAssetQueue.ts','utf8'),{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.Queue=TowerAssetQueue',ctx);
const queue=new ctx.Queue((p,t,c)=>{complete=c});queue.load('probe',{},()=>{throw Error('binding failed')});complete(null,{addRef(){},decRef(){}});out.bindingFailure={state:queue.state,logs};queue.dispose();
const digest=digestSource();out.sourceDigest=digest;out.builds={};for(const p of ['web-mobile','wechatgame']){try{const s=JSON.parse(readFileSync(`cocos-pilot/build/${p}/release-build.json`));out.builds[p]={...s,matchesCurrentSource:s.sourceDigest===digest}}catch(e){out.builds[p]={error:String(e)}}}
console.log(JSON.stringify(out,null,2));
