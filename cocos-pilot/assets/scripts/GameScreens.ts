import {HEALTH_NOTICE,FIRST_STEPS,SAFETY_SUMMARY,SAFETY_CARDS,SAFETY_SOURCE} from './shared/js/cocos/GameSession';
import {Label,Node,Graphics,Color,UITransform,Button,director} from 'cc';
import {PilotUI,UI} from './PilotUI';
import {FORAGING_REGIONS,FORAGING_SCENES,FORAGING_SCENE_BY_ID,EXPLORATION_SPECIES,PHOTO_RIGHTS,RELEASE_INFO,copyPublicLink,SPECIES_BY_ID,SPECIES_KNOWLEDGE,RARITY_LABELS,collectionItems,findingNotes,COMMISSIONS} from './shared/js/cocos/GameSession';
export const countdown=(ms:number)=>`${Math.floor(Math.ceil(ms/1000)/60)}:${String(Math.ceil(ms/1000)%60).padStart(2,'0')}`;
export type ScreenActions={act:(fn:()=>void)=>void,run:(mode:string)=>void,quality:(value:string)=>void,retry:()=>void};
export class GameScreens{
 timer:Label|null=null;notice:Label|null=null;lock:Label|null=null;joystick:Node|null=null;feedbackLabel:Label|null=null;
 constructor(public u:PilotUI,public s:any,private actions:ScreenActions){}
 button(text:string,fn:()=>void,parent=this.u.content!,tone='green'){return this.u.button(text,()=>this.actions.act(fn),parent,parent.getComponent(UITransform)!.width-24,52,tone)}
 text(text:string,parent=this.u.content!,size=18,color=UI.ink){return this.u.paragraph(text,parent,Math.max(14,size),color)}
 row(items:Array<[string,()=>void,boolean?]>,parent=this.u.content!){return this.u.row(items.map(([label,fn,selected])=>({label,action:()=>this.actions.act(fn),selected})),parent)}
 card(title:string,description?:string){const n=this.u.card();this.text(title,n,20);if(description)this.text(description,n,16,UI.muted);return n}
 end(n:Node){this.u.decorateCard(n)}
 render(){
  const {s,u}=this;
  if(s.screen==='field'){this.field();return}
  if(s.screen==='advertisement'){u.page('观看视频广告');this.text('完整观看后，本局增加60秒。每局限一次。');this.text('游戏已暂停，提前关闭不扣收获。',undefined,16,UI.muted);return}
  const titles:Record<string,string>={onboarding:'第一次进林',safety:'野生菌安全说明',age:'适龄与健康游戏',home:'雨后菌语',scenes:s.state.regionData?.name||'选择场景',brief:'准备出发',pool:'场景菌物名录',pause:'林间休息',result:'探索收获',collection:'菌物收藏',detail:'菌物图鉴',journal:'林间手记',guide:'玩法手册',sources:'资料与图片来源',credits:'照片版权与许可',settings:'画面与操作',privacy:'隐私与存档',help:'帮助与反馈',basket:'本局采集'};
  u.page(titles[s.screen]||'雨后菌语',s.screen==='home'?undefined:()=>this.actions.act(()=>s.screen==='pause'?s.resume():s.screen==='result'?s.home():s.back()));
  const renderers:Record<string,()=>void>={onboarding:()=>this.onboarding(),safety:()=>this.safety(),age:()=>this.age(),home:()=>this.home(),scenes:()=>this.scenes(),brief:()=>this.brief(),pool:()=>this.pool(),pause:()=>this.pause(),result:()=>this.result(),collection:()=>this.collection(),detail:()=>this.detail(),journal:()=>this.journal(),guide:()=>this.guide(),sources:()=>this.sources(),credits:()=>this.credits(),settings:()=>this.settings(),basket:()=>this.basket(),privacy:()=>this.privacy(),help:()=>this.help()};
  if(s.resourceStatus==='failed'){const c=this.card('场景素材未能加载','请检查网络后重试。收藏和笔记仍可查看。');this.button('重新加载素材',()=>this.actions.retry(),c);this.end(c)}
  renderers[s.screen]?.();
  const toast=u.node('操作反馈',u.root,u.width-40,68);u.box(toast,UI.green,14);toast.setPosition(0,-u.height/2+u.bottom+40);this.feedbackLabel=u.text('',toast,u.width-64,62,15,UI.paper).getComponent(Label);toast.active=false;
  this.text('游戏中可采集，不代表现实中可食用。',u.content!,12,UI.muted);
 }
 home(){const {s}=this,identified=EXPLORATION_SPECIES.filter(sp=>s.state.profile.collection[sp.id]?.identified).length;
  this.text('选一片林子，开始寻找',undefined,22);this.text(`已鉴别 ${identified}/${EXPLORATION_SPECIES.length} 种 · 已通关 ${s.state.profile.successfulChallenges} 次`,undefined,14,UI.muted);
  this.button('试玩 · 林间寻宝',()=>{if(!this.s.resourceStatus||this.s.resourceStatus==='ready')this.s.open('trial');else this.s.notice('素材准备好后即可试玩')});
  this.button('🍄 Roguelike 试玩（新玩法预览）',()=>director.loadScene('roguelike-mvp'),undefined,'paper');
  this.row([['菌物收藏',()=>s.openCollection()],['林间手记',()=>s.openJournal('notes')]]);
  for(const region of FORAGING_REGIONS){const n=this.card(region.name,region.climate);this.u.photo(region.sceneIds[0],0,n,124,true);const done=region.sceneIds.filter(id=>s.state.profile.completedScenes[id]).length;this.text(`${done}/${region.sceneIds.length} 处完成 · ${region.subtitle||'多次探索，发现新的菌物'}`,n,14,UI.muted);this.button('进入分区',()=>s.region(region.id),n);this.end(n)}
  this.row([['玩法手册',()=>s.open('guide')],['画面设置',()=>s.open('settings')]]);this.button('资料与图片来源',()=>s.open('sources'),undefined,'paper');this.row([['隐私与存档',()=>s.open('privacy')],['帮助与反馈',()=>s.open('help')]]);this.row([['适龄与健康游戏',()=>s.open('age')],['野生菌安全',()=>s.open('safety')]]);this.text('版本 '+RELEASE_INFO.version,undefined,14,UI.muted);
 }
 scenes(){const {s}=this;this.text(s.state.regionData.climate,undefined,14,UI.muted);
  for(const id of s.state.regionData.sceneIds){const scene=FORAGING_SCENE_BY_ID[id],p=s.state.sceneSpeciesProgress(id),n=this.u.card();this.u.photo(id,0,n,136,true);this.text(scene.name,n,21);this.text(scene.subtitle,n,14,UI.muted);
   this.text(Array.from(new Set(scene.animals.map((a:any)=>a.name))).join(' · '),n,14,UI.green);
   this.button(p.historyIncomplete?`历史记录待补录 · ${p.found}/${p.total} 种`:`已采集 ${p.found}/${p.total} 种 · 查看名录`,()=>{s.selectedSceneId=id;s.poolPage=0;s.open('pool')},n,'paper');
   this.text(s.state.profile.completedScenes[id]?'已完成，可再次探索':'每局10朵，采满8朵即可通关',n,13,UI.muted);this.button('进入场景',()=>s.preview(id),n);this.end(n)}
 }
 brief(){const {s}=this,scene=s.scene,n=this.u.card();this.u.photo(scene.id,0,n,166,true);this.text(scene.name,n,22);this.text(scene.subtitle,n,15,UI.muted);this.text('走近菌物，轻点采集。藏在落叶下的菌物，先拨开再采。采满8朵后，可带回收藏或留在林间继续探索。',n);this.end(n);
  const easy=this.card('悠闲采集','没有倒计时与猛兽，动物最多吃掉1朵。适合慢慢观察和寻找。');this.button('悠闲出发',()=>this.actions.run('relaxed'),easy);this.end(easy);
  const timed=this.card('限时挑战','3分钟内采满8朵。动物30秒后觅食，猛兽1分钟后入场；碰到即失败，已采收获仍保留。');this.button('挑战出发',()=>this.actions.run('timed'),timed);this.end(timed);
 }
 pool(){const {s}=this,p=s.state.sceneSpeciesProgress(s.selectedSceneId);this.text(s.scene.name,undefined,21);this.text(`已采 ${p.found}/${p.total} 种 · 已解锁 ${p.unlocked}/${p.total} 种`,undefined,14,UI.green);
  if(p.historyIncomplete)this.text('旧存档缺少此场景的种类明细。原有通关与收藏保留，再次采集会补录记录。',undefined,14,UI.muted);
  const pool=p.pool.slice().sort((a:any,b:any)=>a.unlockAt-b.unlockAt),total=pool.filter((e:any)=>e.unlockAt<=p.identified).reduce((n:number,e:any)=>n+e.weight,0);
  this.pagination(s.poolPage,Math.ceil(pool.length/6),page=>s.paginate('poolPage',page));
  for(const entry of pool.slice(s.poolPage*6,s.poolPage*6+6)){const sp=SPECIES_BY_ID[entry.speciesId],known=s.state.profile.collection[sp.id]?.identified,found=s.state.profile.sceneDiscoveries[s.selectedSceneId].includes(sp.id),open=entry.unlockAt<=p.identified,n=this.card(known?sp.name:found?'已采集 · 待鉴别':open?'尚未采集':'尚未解锁');this.text(`${RARITY_LABELS[sp.rarity]} · ${open?`抽取参考 ${(entry.weight/total*100).toFixed(1)}%`:`累计鉴别 ${entry.unlockAt} 种解锁`}`,n,14,UI.muted);if(found)this.button('查看收藏',()=>s.openSpecies(sp.id),n,'paper');this.end(n)}
  this.pagination(s.poolPage,Math.ceil(pool.length/6),page=>s.paginate('poolPage',page));
  this.text('百分比为普通抽取占比，不是单局遇见率。稀有度和场景分布为游戏设计。',undefined,13,UI.muted);
 }
 pause(){const {s}=this;this.text('探索已暂停，回来后从原地继续。');this.button('继续探索',()=>s.resume());if(s.canWatchTimeAd){this.button('观看视频广告 · 加时60秒',()=>{void s.watchTimeAd()},undefined,'paper');this.text('自愿观看，每局限一次。提前关闭不扣收获。',undefined,14,UI.muted)}else if(s.state.currentRun?.adTimeBonusMs)this.text('本局已使用视频加时60秒',undefined,14,UI.muted);this.row([['本局采集',()=>s.open('basket')],['菌物收藏',()=>s.openCollection()]]);this.row([['林间手记',()=>s.openJournal()],['画面设置',()=>s.open('settings')]]);this.button('带回收获 · 结束探索',()=>{s.screen='field';s.finish()},undefined,'paper');this.text('结束探索会保存收获并显示结算。',undefined,14,UI.muted)}
 result(){const {s}=this,r=s.state.lastResult,success=r.status==='success',n=this.card(r.bonusEndReason?'探索结束 · 已通关':success?'采集达标！':r.status==='predator-contact'?'遇到猛兽 · 挑战失败':r.status==='time-expired'?'时间到 · 未达标':'探索结束');this.text(`采集 ${r.collectedMushroomCount}/${r.targetCollectCount} 朵 · 动物吃掉 ${r.eatenCount} 朵`,n);this.text('已采集的菌物和发现记录均已保存。',n,14,UI.muted);this.end(n);
  this.button('前往菌物收藏',()=>s.openCollection());if(s.state.canContinueExploring)this.button('留在林间 · 继续探索',()=>s.continueExploring(),undefined,'paper');this.row([['再探一次',()=>this.actions.run(s.state.currentRun.huntMode)],['换个场景',()=>{s.history=[];s.screen='scenes'}]]);
  this.text(`此处进度 ${r.discoveriesBefore} → ${r.discoveriesAfter}/${r.discoveriesTotal} 种`,undefined,19);
  for(const id of r.newSceneSpeciesIds||[]){const sp=SPECIES_BY_ID[id],known=s.state.getCollectionEntry(id).identified,c=this.card(known?sp.name:'新菌物 · 待鉴别');this.u.photo(id,0,c,110);this.button('查看收藏',()=>s.openSpecies(id),c,'paper');this.end(c)}
  if(r.badges?.length)this.text('收藏纪念：'+r.badges.join(' · '));this.text(r.commission?.completed?'观察完成：'+r.commission.reward:'观察委托可选，不影响通关。',undefined,14,UI.muted);
  const next=s.state.nextUnlock();this.text(next?`再鉴别 ${next.remaining} 种，可解锁更多菌物。`:'全部种类已解锁，继续补齐场景名录。',undefined,14,UI.green);
 }
 collection(){const {s}=this;this.row([['全部',()=>s.setFilter('all'),s.collectionFilter==='all'],['待鉴别',()=>s.setFilter('pending'),s.collectionFilter==='pending'],['已鉴别',()=>s.setFilter('identified'),s.collectionFilter==='identified']]);
  const items=collectionItems(s.state,s.collectionFilter),pages=Math.max(1,Math.ceil(items.length/6));s.collectionPage=Math.min(s.collectionPage,pages-1);this.text(`${items.length} 种 · 第 ${s.collectionPage+1}/${pages} 页`,undefined,14,UI.muted);
  if(!items.length)this.text(s.collectionFilter==='pending'?'当前没有待鉴别的菌物。采集新种类后再来看看。':s.collectionFilter==='identified'?'还没有鉴别成功的菌物。先到待鉴别中比较照片与线索。':'收藏还是空的，去林间找找吧。');this.pagination(s.collectionPage,pages,page=>s.paginate('collectionPage',page));
  for(const sp of items.slice(s.collectionPage*6,s.collectionPage*6+6)){
   const e=s.state.profile.collection[sp.id],sampled=e?.sampled>0,available=sampled||e?.identified,width=this.u.width-32,n=this.u.node('收藏卡片',this.u.content!,width,available?176:100);this.u.box(n,UI.paper,18);
   const title=e?.identified?sp.name:sampled?'待鉴别菌物':e?.seen?'已目击 · 待采集':'尚未发现';
   if(available){
    this.u.photo(sp.id,0,n,152,false,{width:136,fit:'cover'}).setPosition(-width/2+80,0);
    const textWidth=width-172,x=width/2-12-textWidth/2;
    const label=(text:string,y:number,h:number,size:number,color=UI.ink)=>{const node=this.u.text(text,n,textWidth,h,size,color);node.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.LEFT;node.setPosition(x,y);return node};
    label(title,47,62,19);label(RARITY_LABELS[sp.rarity],7,24,14,UI.muted);label(e?.identified?'已鉴别 · 已采 '+e.sampled+' 朵':'已采 '+e.sampled+' 朵',-20,26,14,UI.muted);label(e?.identified?'查看图鉴 ›':'开始鉴别 ›',-58,30,16,UI.green);
    const button=n.addComponent(Button);button.transition=Button.Transition.SCALE;button.zoomScale=.985;n.on(Button.EventType.CLICK,()=>this.actions.act(()=>s.openSpecies(sp.id)));
   }else{
    const name=this.u.text(title,n,width-28,32,18);name.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.LEFT;name.setPosition(0,22);
    const hint=this.u.text(`${RARITY_LABELS[sp.rarity]} · 在林间采集后解锁照片`,n,width-28,38,14,UI.muted);hint.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.LEFT;hint.setPosition(0,-20);
   }
  }
  this.pagination(s.collectionPage,pages,page=>s.paginate('collectionPage',page));this.button('寻找笔记',()=>s.openJournal('notes'),undefined,'paper');
 }
 detail(){const {s}=this,sp=s.state.selectedCollectionSpecies,e=s.state.getCollectionEntry(sp.id),k=SPECIES_KNOWLEDGE[sp.id],studiedClues=e.studiedClues||0;
  if(!e.sampled&&!e.identified){this.text('先在探索中采集，再回来比较线索。');return}
  const n=this.u.card();this.text(e.identified?sp.name:'收藏鉴别',n,23);if(e.identified)this.text(sp.scientificName,n,14,UI.muted);this.u.photo(sp.id,s.state.collectionPhotoIndex%sp.photos.length,n,192);this.button(`换一张实拍 · ${s.state.collectionPhotoIndex%sp.photos.length+1}/${sp.photos.length}`,()=>s.state.collectionPhotoIndex++,n,'paper');
  const photoIndex=s.state.collectionPhotoIndex%sp.photos.length,rights=PHOTO_RIGHTS.find(r=>r.speciesId===sp.id&&r.index===photoIndex);const credit=sp.photoCredits?.[photoIndex];if(credit)this.text(credit,n,11,UI.muted);if(rights)this.text(rights.note,n,12,UI.muted);this.button('照片来源与许可',()=>{s.creditsPage=Math.floor(PHOTO_RIGHTS.findIndex(r=>r.speciesId===sp.id&&r.index===photoIndex)/2);s.open('credits')},n,'paper');this.text(`已采 ${e.sampled} 朵 · ${e.identified?'已鉴别':'已查看 '+studiedClues+'/3 条线索'}`,n,14,UI.green);this.end(n);
  this.text(SAFETY_SUMMARY,undefined,14,UI.amber);this.button('查看野生菌安全说明',()=>s.open('safety'),undefined,'paper');
  if(e.identified){
   this.row(['形态','生态','辨识','来源'].map((label,index)=>[label,()=>{s.detailTab=index},s.detailTab===index] as [string,()=>void,boolean]));
   const title=[k.formTitle,k.storyTitle,'辨识边界','资料来源'][s.detailTab],c=this.card(title);
   this.text([k.form+'\n\n生长环境\n'+sp.ecology,k.story,k.comparison,k.source.publisher+'\n'+k.source.title][s.detailTab],c);this.end(c);
   if(s.detailTab===3){this.text(k.source.url,undefined,12,UI.muted);this.button('复制资料链接',()=>this.copy(k.source.url),undefined,'paper')}
   this.button('查看寻找笔记',()=>{const notes=findingNotes(s.state.profile,undefined);s.notePage=Math.max(0,notes.findIndex((n:any)=>n.speciesId===sp.id));s.openJournal('notes')},undefined,'paper');
  }else{
   if(studiedClues<3)this.text('依次点击“查看这条线索”，看完3条后即可选择菌物名称。',undefined,15,UI.green);
   for(const [i,clue]of s.state.collectionClues.entries()){const c=this.card(`${i+1} · ${clue.label}`);this.text(i<studiedClues?clue.text:'查看下一条线索后解锁。',c,16,i<studiedClues?UI.ink:UI.muted);if(i===studiedClues)this.button('查看这条线索',()=>s.study(),c);this.end(c)}
   if(studiedClues===3&&s.state.collectionLockRemaining()>0){this.lock=this.text('稍后可再次鉴别',undefined,16,UI.amber).getComponent(Label);const hint=s.state.correctionHint;if(hint){const c=this.card('再比较一下关键特征');this.text('上次选择：'+hint.chosenName+'\n'+hint.chosen+'\n\n这份标本：\n'+hint.actual,c);this.end(c)}this.button('返回收藏，看看其他菌物',()=>s.back(),undefined,'paper')}
   else if(studiedClues===3){this.text('对照照片和三条线索，选择名称');for(const candidate of s.state.collectionCandidates)this.button(candidate.name,()=>s.identify(candidate.id),undefined,'paper')}
   this.text('答错等待45秒，再错等待2分钟；期间可以继续探索。',undefined,13,UI.muted);
  }
 }
 journal(){const {s}=this,ongoing=s.hasOngoingExploration,r=ongoing?s.state.currentRun:null;
  if(!ongoing&&s.journalTab==='routes')s.journalTab='notes';
  const tabs:Array<[string,()=>void,boolean?]>=[['寻找笔记',()=>s.journalTab='notes',s.journalTab==='notes']];
  if(ongoing)tabs.unshift(['本局路线',()=>s.journalTab='routes',s.journalTab==='routes']);
  tabs.push([ongoing?'本局观察':'观察成就',()=>s.journalTab='commission',s.journalTab==='commission']);this.row(tabs);
  if(ongoing){this.text('探索已暂停，查看手记不会消耗挑战时间。',undefined,14,UI.muted);this.button('返回探索',()=>s.returnToExploration());}
  if(s.journalTab==='routes'&&r){
   this.text(s.state.sceneData.name,undefined,20);this.text('选择路线只做标记，请根据地面石块和路标自行前往。',undefined,14,UI.muted);
   const map=this.u.node('路线示意图',this.u.content!,this.u.width-40,220);this.u.box(map,UI.paper);const diagram=this.u.node('路径',map,this.u.width-40,220);const g=diagram.addComponent(Graphics);
   const points=r.routes.flatMap((route:any)=>route.points);if(s.player)points.push([s.player.x,s.player.z]);const xs=points.map((p:number[])=>p[0]),zs=points.map((p:number[])=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),scale=Math.min((this.u.width-100)/Math.max(1,maxX-minX),152/Math.max(1,maxZ-minZ));
   const project=([x,z]:number[])=>[(x-(minX+maxX)/2)*scale,-(z-(minZ+maxZ)/2)*scale];
   for(const [index,route]of r.routes.entries()){
    g.strokeColor=new Color(route.color);g.lineWidth=r.selectedRouteId===route.id?5:3;route.points.forEach((point:number[],i:number)=>{const [x,y]=project(point);if(i)g.lineTo(x,y);else g.moveTo(x,y)});g.stroke();
    const [x,y]=project(route.points[route.points.length-1]);g.fillColor=UI.green;g.circle(x,y,11);g.fill();this.u.text(String(index+1),diagram,22,22,13,UI.paper).setPosition(x,y);
   }
   if(s.player){const [x,y]=project([s.player.x,s.player.z]);g.fillColor=UI.ink;g.circle(x,y,5);g.fill();g.strokeColor=UI.ink;g.lineWidth=2;g.moveTo(x,y);g.lineTo(x+Math.sin(s.player.yaw)*15,y+Math.cos(s.player.yaw)*15);g.stroke()}
   this.text('黑点是你的位置，短线表示朝向；数字对应下方路线。',undefined,14,UI.muted);
   for(const [index,route]of r.routes.entries()){const c=this.card(`${index+1} · ${route.name}`+(r.visitedRouteIds.includes(route.id)?' · 已到达':''),route.hint);this.text('认准路标：'+route.landmark,c,14,UI.muted);this.button(r.selectedRouteId===route.id?'已标记此路线':'标记此路线',()=>{s.state.chooseRoute(route.id);s.notice('路线已标记，返回林间后按路标前往')},c,r.selectedRouteId===route.id?'green':'paper');this.end(c)}
  }else if(s.journalTab==='notes'){
   const notes=findingNotes(s.state.profile,undefined);this.text(`已整理 ${notes.length} 种寻找笔记`,undefined,20);
   if(!notes.length){this.text('笔记会在菌物鉴别成功后自动整理，记录该看哪些树木、落叶和生长位置。');this.button('前往菌物收藏',()=>s.openCollection());return}
   s.notePage=Math.min(s.notePage,notes.length-1);this.pagination(s.notePage,notes.length,p=>s.paginate('notePage',p));const note=notes[s.notePage],c=this.card(note.name,'寻找时，先观察这些地方');this.text(note.text,c);this.text('生长环境',c,16,UI.green);this.text(note.ecology,c,16,UI.muted);this.button('查看菌物图鉴',()=>s.openSpecies(note.speciesId),c,'paper');this.end(c);
  }else{
   const task=r?s.state.commission:null;
   if(task){const c=this.card(task.title,task.description);this.text(task.completed?'已完成 · 成就已保存':task.skipped?'本局已跳过':`进度 ${task.progress}/${task.target}`,c,16,UI.green);this.text('完成后获得：'+task.reward,c,14,UI.muted);
    if(!task.completed&&!task.skipped){this.button('换一个观察任务',()=>s.state.changeCommission(),c,'paper');this.button('本局暂不参与',()=>s.state.changeCommission(true),c,'paper')}this.end(c)
   }else this.text('观察任务在探索中完成，与采满8朵的通关目标相互独立。',undefined,16,UI.muted);
   this.text('我的观察成就',undefined,20);for(const [id,c]of Object.entries(COMMISSIONS) as any){const card=this.card(`${s.state.profile.observationRewards[id]?'已获得':'尚未获得'} · ${c.reward}`,c.description);this.end(card)}
  }
 }
 basket(){const {s}=this;this.text(`本局已采 ${s.state.goalProgress}/${s.state.goalTarget} 朵`,undefined,21);for(const {species}of s.state.basketItems)this.button(s.state.getCollectionEntry(species.id).identified?species.name:'待鉴别菌物',()=>s.openSpecies(species.id),undefined,'paper');if(!s.state.basketItems.length)this.text('还没有收获，回到林间继续寻找。')}
 guide(){this.row([['野生菌安全',()=>this.s.open('safety')],['适龄说明',()=>this.s.open('age')]]);const steps=[['移动与观察','左下摇杆行走，右侧拖动环顾。电脑用WASD，空格跳跃，C蹲下，Shift快跑。'],['采满8朵即可通关','每局10朵，所有游戏菌物都可采集。走近轻点；被松针覆盖时先拨开。达标后可继续探索。'],['观察动物','30秒后食菌动物开始觅食。悠闲最多吃掉1朵，挑战最多2朵，始终保留足够通关数量。'],['挑战中躲避猛兽','3分钟挑战，50秒预警，1分钟后猛兽入场。碰到即失败；躲到树石后，隐蔽6秒可以脱险。'],['收藏中学习','观察实拍照片，依次点击三条线索，再向下滑动选择名称。答对解锁图鉴和寻找笔记。答错等45秒，再错等2分钟，可以继续探索。'],['发现更多种类','多次探索会变化天气和菌物位置。随着鉴别进度，更多种类逐步出现；场景名录统计在此处采过的不同种类。']];for(const [title,description]of steps){const c=this.card(title,description);this.end(c)}}
 sources(){const c=this.card('资料与素材说明');this.text('物种资料沿用馆藏凭证、分类研究、中国疾控及物种红色名录等来源。每种菌物的图鉴中都保留具体资料链接。',c);this.text('生态分区、概率、隐藏点位、朵数、动物与倒计时为游戏设计，不代表实际分布或采集建议。',c);this.end(c);const p=this.card('照片与三维素材');this.text('菌物实拍来自 iNaturalist、Mushroom Observer / Wikimedia Commons 及开放获取论文，分别按 CC BY、CC0 或 CC BY-SA 许可使用。裁剪、缩放等修改均有记录。干巴菌的局部图与原图采用相同的 CC BY-SA 3.0 许可。三维几何和材质纹理由本项目生成。',p);this.end(p);this.button('查看全部照片版权与许可',()=>{this.s.creditsPage=0;this.s.open('credits')});this.button('查看物种图鉴',()=>safelyCollection(this.s),undefined,'paper')}
 credits(){const s=this.s,pages=Math.ceil(PHOTO_RIGHTS.length/2);s.creditsPage=Math.max(0,Math.min(s.creditsPage||0,pages-1));this.text('以下许可适用于对应照片；保留原作者署名，不表示作者或机构为游戏背书。',undefined,14,UI.muted);
  this.pagination(s.creditsPage,pages,p=>s.paginate('creditsPage',p));
  for(const r of PHOTO_RIGHTS.slice(s.creditsPage*2,s.creditsPage*2+2)){const c=this.card(`${r.name} · 照片 ${r.index+1}`,r.note);this.text(r.credit,c,13,UI.green);this.text(r.title,c,12,UI.muted);this.text(r.license,c,14,UI.green);this.text('原始来源：'+r.source,c,12,UI.muted);this.text('许可：'+r.licenseUrl,c,12,UI.muted);this.text('修改记录：'+r.changes,c,12,UI.muted);this.end(c)}
  this.pagination(s.creditsPage,pages,p=>s.paginate('creditsPage',p));
 }
 settings(){const {s}=this;this.text('画面质量',undefined,21);this.row([['流畅',()=>this.actions.quality('performance'),s.settings.quality==='performance'],['细腻',()=>this.actions.quality('balanced'),s.settings.quality==='balanced']]);this.text('流畅模式减少阴影和环境动画。模型和采集规则保持一致。',undefined,14,UI.muted);this.button(s.settings.reducedMotion?'环境动画：关闭':'环境动画：开启',()=>s.settings.reducedMotion=!s.settings.reducedMotion,undefined,'paper');this.text('存档会自动保存；旧版本收藏与进度会在首次进入新版时接续。',undefined,14,UI.muted)}
 pagination(page:number,pages:number,set:(page:number)=>void){if(pages<=1)return;
  const parent=this.u.content!,width=parent.getComponent(UITransform)!.width,n=this.u.node('分页',parent,width,52),w=(width-84)/2;
  const previous=this.u.button(page>0?'上一页':'已到首页',()=>this.actions.act(()=>set(page-1)),n,w,52,'paper');previous.setPosition(-width/2+w/2,0);previous.getComponent(Button)!.interactable=page>0;previous.getComponentInChildren(Label)!.color=page>0?UI.ink:UI.muted;
  const next=this.u.button(page+1<pages?'下一页':'已到末页',()=>this.actions.act(()=>set(page+1)),n,w,52,'paper');next.setPosition(width/2-w/2,0);next.getComponent(Button)!.interactable=page+1<pages;next.getComponentInChildren(Label)!.color=page+1<pages?UI.ink:UI.muted;
  this.u.text(`${page+1}/${pages}`,n,76,52,14,UI.muted);
 }
 onboarding(){const s=this.s,begin=()=>{s.completeIntro();this.actions.run(s.introMode||'relaxed')};
  const health=this.card('健康游戏忠告',HEALTH_NOTICE);this.end(health);
  this.text('第一次推荐选择悠闲模式，慢慢观察，没有倒计时和猛兽。',undefined,16,UI.green);
  this.button('跳过指引，直接出发',begin,undefined,'paper');
  for(const [title,text]of FIRST_STEPS){const c=this.card(title,text);this.end(c)}
  const c=this.card('带走知识，守住安全',SAFETY_SUMMARY);this.end(c);
  this.row([['安全说明',()=>s.open('safety')],['适龄说明',()=>s.open('age')]]);
  this.button(s.introMode==='timed'?'知道了，开始限时挑战':'知道了，开始悠闲采集',begin);
 }
 safety(){this.text(SAFETY_SUMMARY,undefined,19,UI.amber);for(const [title,text]of SAFETY_CARDS){const c=this.card(title,text);this.end(c)}this.text('参考：'+SAFETY_SOURCE.title,undefined,14,UI.muted);this.text(SAFETY_SOURCE.url,undefined,12,UI.muted);this.button('复制安全科普链接',()=>this.copy(SAFETY_SOURCE.url),undefined,'paper')}
 age(){const rating=RELEASE_INFO.ageRating;this.text(rating?'适龄提示：'+rating:'正式适龄等级尚待后台核验',undefined,22,UI.green);
  const c=this.card('内容说明','本游戏包含三维森林探索、菌物实拍照片与名称辨识。限时挑战有倒计时、猛兽追逐和接触后失败提示；悠闲模式没有倒计时与猛兽。');this.end(c);
  const health=this.card('健康游戏忠告',HEALTH_NOTICE);this.end(health);
  const p=this.card('给玩家与监护人','根据平台展示的适龄等级选择体验。未成年人请在监护人指导下使用，合理安排游戏时间；眼睛疲劳或感到紧张时，可暂停休息或退出。游戏里的辨识结果不能用于现实采食。');this.end(p);
  this.text(rating?'建议年满'+rating.replace('+','')+'周岁的玩家体验；未成年人请在监护人指导下游戏。':'本页说明不代表平台已完成评级。正式年龄标识以微信后台审核及启动页展示为准。',undefined,14,UI.muted);
  this.text(this.s.ads.enabled?'提供自愿视频加时，每局限一次；不观看也可正常游戏。':'当前版本未启用广告。',undefined,14,UI.muted);this.button('查看野生菌安全说明',()=>this.s.open('safety'),undefined,'paper');
 }
 privacy(){const c=this.card('存档保存在本机');this.text('收藏、鉴别进度、探索记录和画面设置保存在当前设备的游戏存储中。清理游戏数据、换机或更换小游戏账号后，记录可能无法恢复；当前版本没有云端同步。',c);this.end(c);
  const p=this.card('复制资料链接');this.text('仅在你点击复制按钮并同意平台隐私授权后，将公开资料链接写入剪贴板。游戏不会读取剪贴板内容；拒绝复制授权仍可正常探索和鉴别。',p);this.end(p);
  this.text(this.s.ads.enabled?'本版本提供自愿激励视频广告，由微信平台提供。完整观看可获得本局加时；游戏未自行接入统计上传，平台数据处理以其隐私说明为准。':'当前版本未启用广告或自行接入的统计上传。微信平台自身的数据处理以其隐私说明为准。',undefined,16,UI.muted);
  this.button('查看平台隐私保护指引',()=>{const api=(globalThis as any).wx;if(api?.openPrivacyContract)api.openPrivacyContract({fail:()=>this.s.notice('暂时无法打开平台指引，请稍后重试')});else this.s.notice('请在正式微信小游戏中查看平台隐私指引')});
 }
 help(){const c=this.card('需要帮助？');this.text('遇到问题时，请记录发生问题的场景、操作步骤、手机型号和下方版本号。不要在反馈中发送密码、身份证或其他敏感信息。',c);this.text('版本：'+RELEASE_INFO.version,c,16,UI.green);if(RELEASE_INFO.supportContact)this.text('联系开发者：'+RELEASE_INFO.supportContact,c);else this.text('测试期间请通过当前项目沟通渠道反馈。正式版本的联系方式尚待配置。',c,16,UI.muted);this.end(c);this.button('查看玩法手册',()=>this.s.open('guide'),undefined,'paper');this.button('查看存档说明',()=>this.s.open('privacy'),undefined,'paper');}
 private copy(text:string){const api=(globalThis as any).wx;if(api){copyPublicLink(api,text).then(status=>this.s.notice(({copied:'链接已复制',denied:'未授权复制，可继续在页面查看资料',unsupported:'当前微信版本不支持此复制方式',failed:'复制失败，资料链接仍可查看',invalid:'资料链接暂不可用'} as any)[String(status)]));}else if(typeof navigator!=='undefined'&&navigator.clipboard)navigator.clipboard.writeText(text).then(()=>this.s.notice('链接已复制'),()=>this.s.notice('复制失败，请在来源文字中查看链接'));else this.s.notice('当前环境不支持复制，请在来源文字中查看链接')}
 field(){const {u,s}=this,w=u.width,h=u.height,y=h/2-u.top-28;
  u.icon('pause',()=>this.actions.act(()=>s.pause())).setPosition(-w/2+38,y);
  const counter=u.node('采集进度',u.root,148,44);u.box(counter);this.timer=u.text('',counter,138,44,15).getComponent(Label);counter.setPosition(0,y);
  u.icon('journal',()=>this.actions.act(()=>s.openJournal())).setPosition(w/2-38,y);
  const cross=u.text('+',u.root,26,26,22,UI.paper);cross.setPosition(0,0);
  const notice=u.node('林间提示',u.root,w-110,64);u.box(notice,new Color(250,247,238,225),12);notice.setPosition(-22,y-64);this.notice=u.text('',notice,w-130,60,13).getComponent(Label);
  const by=-h/2+u.bottom+58;
  const joystick=u.node('移动摇杆',u.root,104,104);joystick.setPosition(-w/2+68,by+10);const g=joystick.addComponent(Graphics);g.fillColor=new Color(250,247,238,105);g.circle(0,0,48);g.fill();g.strokeColor=new Color(250,247,238,180);g.lineWidth=1.5;g.circle(0,0,48);g.stroke();this.joystick=u.node('摇杆中心',joystick,34,34);const knob=this.joystick.addComponent(Graphics);knob.fillColor=new Color(250,247,238,200);knob.circle(0,0,17);knob.fill();
  u.button(s.player.crouched?'站起':'蹲下',()=>this.actions.act(()=>s.crouch()),u.root,66,48,'paper').setPosition(w/2-111,by);
  u.button('跳起',()=>this.actions.act(()=>s.jump()),u.root,66,48).setPosition(w/2-38,by);
  if(!s.state.currentRun.hasPanned){const n=u.text('左侧行走 · 右侧环顾 · 走近轻点采集',u.root,w-42,46,13,UI.paper);n.setPosition(0,by+100)}
 }
 update(){const {s}=this,r=s.state.currentRun;if(this.feedbackLabel){this.feedbackLabel.string=s.feedback;this.feedbackLabel.node.parent!.active=!!s.feedback}if(this.timer)this.timer.string=`${s.state.goalProgress}/${s.state.goalTarget} 朵${r.huntMode==='timed'?' · '+countdown(r.timeRemainingMs):' · 悠闲'}`;if(this.lock)this.lock.string=`还需 ${countdown(s.state.collectionLockRemaining())} 可再次鉴别。`;
  if(this.notice){this.notice.string=s.feedback||(r.predatorNoticeUntil>r.elapsedMs?r.predatorMessage:'')||(r.animalNoticeUntil>r.elapsedMs?r.animalNotice:'');this.notice.node.parent!.active=!!this.notice.string}
  this.joystick?.setPosition(s.side*20,s.forward*20,0);
 }
}
function safelyCollection(s:any){s.openCollection()}
