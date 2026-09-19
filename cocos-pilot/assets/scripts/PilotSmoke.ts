// Explicit, browser-only diagnostics. Uses memory storage; never touches player saves.
import {PilotSession} from './shared/js/pilot/PilotSession';
import {ForestMeshes} from './ForestMeshes';
import {Node,Material} from 'cc';
export function runPilotSmoke(parent:Node,material:Material){
 const results:string[]=[];const assert=(value:any,message:string)=>{if(!value)throw Error(message);results.push(message)};
 let forest:ForestMeshes|null=null;
 try{
  const data=new Map<string,any>();const s:any=new PilotSession({getStorageSync:(k:string)=>data.get(k),setStorageSync:(k:string,v:any)=>data.set(k,v)});
  s.start();forest=new ForestMeshes(parent,s.world,material);forest.update(s.state.currentRun);
  assert(forest.root.children.length>10,'场景分块、菌物和动物网格创建成功');
  assert(s.world.solidsNear(0,0,10).every((box:any)=>box.min?.length===3),'编译后空间查询返回正确碰撞盒');
  const before={...s.player};s.forward=1;s.tick(0);for(let i=1;i<=30;i++)s.tick(i*17);
  assert(Math.hypot(s.player.x-before.x,s.player.z-before.z)>.1,'玩家实际移动');
  s.jump();s.tick(527);assert(s.player.y>before.y,'跳跃抬升玩家位置');
  s.openCollection();const elapsed=s.state.currentRun.elapsedMs;s.tick(9000);s.closeCollection();
  assert(s.screen==='pause'&&s.state.currentRun.elapsedMs===elapsed,'收藏返回暂停，浏览期间计时冻结');s.resume();
  for(const hit of s.world.targets){if(!s.active)break;s.collect(hit);s.collect(hit)}
  forest.update(s.state.currentRun);
  assert(s.screen==='result'&&s.state.goalProgress===8,'采满8朵后结束本局');
  assert(Array.from(forest.targets.values()).filter(n=>!n.active).length===8,'采集的菌物从渲染场景消失');
  s.openCollection();const id=Object.keys(s.state.profile.collection).find(id=>s.state.profile.collection[id].sampled>0)!;
  s.openSpecies(id);for(let i=0;i<3;i++)s.study();assert(s.identify(id).correct,'三条线索后可完成收藏鉴别');
  const restored:any=new PilotSession({getStorageSync:(k:string)=>data.get(k),setStorageSync:(k:string,v:any)=>data.set(k,v)});
  assert(restored.state.getCollectionEntry(id).identified,'重建会话保留鉴别记录');
  return {ok:true,results};
 }catch(error){return {ok:false,results,error:String(error)}}finally{forest?.destroy()}
}
