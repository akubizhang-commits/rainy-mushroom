import {GameSession,FORAGING_SCENES,EXPLORATION_SPECIES,RELEASE_INFO} from './shared/js/cocos/GameSession';
import {ForestMeshes} from './ForestMeshes';
import {Node,Material,Button,Label} from 'cc';
import {PilotUI} from './PilotUI';
import {GameScreens} from './GameScreens';
import {PhotoLibrary} from './PhotoLibrary';
export async function runMigrationSmoke(parent:Node,materials:Record<string,Material>){
 const results:string[]=[];let forest:ForestMeshes|null=null;
 const check=(value:any,message:string)=>{if(!value)throw Error(message);results.push(message)};
 try{
  const intro:any=new GameSession({getStorageSync(){return null},setStorageSync(){}});
  intro.preview('yn-pine');check(intro.requestIntro('relaxed'),'首次出发显示指引');
  for(const page of ['onboarding','safety','age']){intro.screen=page;const ui=new PilotUI(parent,320,568),screens=new GameScreens(ui,intro,{act:fn=>fn(),run:()=>{},quality:()=>{},retry:()=>{}});try{screens.render();ui.restoreScroll(0);check(ui.root.getComponentsInChildren(Button).length>0,page+'：小屏页面与返回入口可创建')}finally{ui.destroy()}}
  intro.completeIntro();check(!intro.requestIntro('relaxed'),'已看过指引不重复打断');intro.destroy();
  const release:any=new GameSession({getStorageSync(){return null},setStorageSync(){}});
  for(const page of ['age','help']){
   release.screen=page;const ui=new PilotUI(parent,320,568),screens=new GameScreens(ui,release,{act:fn=>fn(),run:()=>{},quality:()=>{},retry:()=>{}});
   try{screens.render();const labels=ui.root.getComponentsInChildren(Label).map(l=>l.string).join('\n');
    if(page==='age'){check(!RELEASE_INFO.ageRating||labels.includes('适龄提示：'+RELEASE_INFO.ageRating),'适龄页面展示配置的等级');check(labels.includes('抵制不良游戏')&&labels.includes('享受健康生活'),'健康游戏忠告完整展示')}
    else check(!RELEASE_INFO.supportContact||labels.includes(RELEASE_INFO.supportContact),'帮助页面展示公开反馈邮箱');
   }finally{ui.destroy()}
  }
  release.destroy();
  for(const scene of FORAGING_SCENES){const memory=new Map(),s:any=new GameSession({getStorageSync:(k:string)=>memory.get(k),setStorageSync:(k:string,v:any)=>memory.set(k,v)});s.start('relaxed',scene.id);forest=new ForestMeshes(parent,s.world,materials);forest.update(s.state.currentRun);
   check(s.world.targets.length===10&&s.world.surfaces.length>=2,scene.name+'：场景、动物与10个菌物创建成功');
   const start={...s.player};s.forward=1;s.tick(0);for(let i=1;i<=25;i++)s.tick(i*17);check(Math.hypot(s.player.x-start.x,s.player.z-start.z)>.05,scene.name+'：可从入口行走');
   s.jump();s.tick(442);s.openCollection();const elapsed=s.state.currentRun.elapsedMs;s.tick(10000);s.closeCollection();check(s.screen==='pause'&&s.state.currentRun.elapsedMs===elapsed,scene.name+'：收藏返回暂停且计时冻结');s.resume();
   for(const hit of s.world.targets){if(!s.active)break;s.collect(hit);s.collect(hit)}forest.update(s.state.currentRun);check(s.screen==='result'&&s.state.goalProgress===8&&Array.from(forest.targets.values()).filter(n=>!n.active).length===8,scene.name+'：采集消失与通关正确');
   check(s.continueExploring()&&s.active,scene.name+'：达标后可继续探索');s.finish();
   const id=Object.keys(s.state.profile.collection).find(id=>s.state.profile.collection[id].sampled>0)!;s.openSpecies(id);
   // Exercise rendered controls on a freshly collected specimen, not just state methods.
   for(let i=0;i<3;i++){
    const ui=new PilotUI(parent,375,568),screens=new GameScreens(ui,s,{act:fn=>fn(),run:()=>{},quality:()=>{},retry:()=>{}});
    try{screens.render();const button=ui.root.getComponentsInChildren(Button).find(b=>b.node.name==='查看这条线索');check(Boolean(button),scene.name+'：新标本线索按钮'+(i+1)+'可用');button!.node.emit(Button.EventType.CLICK);check(s.state.getCollectionEntry(id).studiedClues===i+1,scene.name+'：线索'+(i+1)+'点击生效')}finally{ui.destroy()}
   }
   const ui=new PilotUI(parent,375,568),screens=new GameScreens(ui,s,{act:fn=>fn(),run:()=>{},quality:()=>{},retry:()=>{}});
   try{screens.render();const candidates=s.state.collectionCandidates,buttons=ui.root.getComponentsInChildren(Button);check(candidates.every((c:any)=>buttons.some(b=>b.node.name===c.name)),scene.name+'：三条线索后显示全部名称按钮');buttons.find(b=>b.node.name===s.state.selectedCollectionSpecies.name)!.node.emit(Button.EventType.CLICK);check(s.state.getCollectionEntry(id).identified,scene.name+'：点击名称鉴别成功')}finally{ui.destroy()}

   forest.destroy();forest=null;await new Promise(resolve=>setTimeout(resolve,40));
  }
  for(const sp of EXPLORATION_SPECIES){for(let i=0;i<sp.photos.length;i++){const a=await PhotoLibrary.acquire(sp.id,i);check(a.frame.originalSize.width>0,sp.name+'：分包照片'+(i+1)+'可读取');a.release()}}
  return {ok:true,results};
 }catch(error){return {ok:false,results,error:String(error)}}finally{forest?.destroy()}
}
