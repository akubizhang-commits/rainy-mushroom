import {BUILD_CAPABILITIES} from './TowerBuildCapabilities';
import {TowerBreakthroughScene,BreakthroughModel} from './TowerBreakthroughScene';
import {TowerBreakthroughAudio} from './TowerBreakthroughAudio';
import {TowerLevelBeamArt} from './TowerLevelBeamArt';
import {breakthroughOptions,levelUpPresentation,CEREMONY_DURATION} from './shared/js/xianxia/TowerBreakthroughPresentation';
import { TowerKeyboardNavigation } from './TowerKeyboardNavigation';
import { presentationPreferences } from './TowerPreferences';
import {FlightSwordArt} from './FlightSwordArt';
import {flightRidePose} from './shared/js/xianxia/TowerFlight';
import {breakthroughReady,floorBreakthroughPreparation} from './shared/js/xianxia/TowerBreakthrough';
import {FlightStreamArt} from './FlightStreamArt';
import {NingshenAuraArt} from './NingshenAuraArt';
import {JianguAuraArt} from './JianguAuraArt';
import {BumieAuraArt} from './BumieAuraArt';
import { materialDrops } from './shared/js/xianxia/TowerMaterialLoot';
import { collectedMaterials, pendingCoreValue } from './shared/js/xianxia/TowerPickups';
import { PickupFeedback, pickupLabelBudget } from './shared/js/xianxia/TowerPickupPresentation';
import { CAMP_PILLS } from './shared/js/xianxia/TowerProfile';
import {JianxinAuraArt} from './JianxinAuraArt';
import {QingpingAudio} from './QingpingAudio';
import {SwordBurstArt} from './SwordBurstArt';
import {ConvergenceArt} from './ConvergenceArt';
import { drawMenuVeil, drawMenuClose } from './TowerMenuChrome';
import { isStarterEquipment } from './shared/js/xianxia/TowerEquipmentTiers';
import {setTowerDepth,sortTowerDepth,TowerBodyFallbacks} from './TowerDepthOrder';
import {TowerEnvironmentArt} from './TowerEnvironmentArt';
import {TowerProjectileArt} from './TowerProjectileArt';
import {TowerSkillEffects} from './TowerSkillEffects';
import {SwordArcArt} from './SwordArcArt';
import {SwordLineArt} from './SwordLineArt';
import {SwordShadowArt} from './SwordShadowArt';
import {TowerHitArt} from './TowerHitArt';
import {TowerDamageNumbers} from './TowerDamageNumbers';
import {TowerDebuffIcons} from './TowerDebuffIcons';
import {SwordTiandiArt} from './SwordTiandiArt';
import {CrossBurstArt} from './CrossBurstArt';
import {SwordQiArt} from './SwordQiArt';
import {OrbitSwordArt} from './OrbitSwordArt';
import {LiangyiFormationArt} from './LiangyiFormationArt';
import {SixiangFormationArt} from './SixiangFormationArt';
import {TowerStoneArt} from './TowerStoneArt';
import {createPlayerHud,drawPlayerHp,drawPlayerMana,drawPlayerXp,drawHudPortrait,drawHudActionIcon,SETTINGS_ICON_SIZE} from './TowerPlayerHud';
import {Node,UITransform,Graphics,Color,Label,LabelOutline,Button,BlockInputEvents,Mask,view,ResolutionPolicy,input,Input,KeyCode,EventKeyboard,EventTouch,isValid} from 'cc';
import {TowerCampaignStore,combatLoadout,TOWER_CAMPAIGN_KEY} from './shared/js/xianxia/TowerCampaign';
import {TowerRun,stats as combatStats} from './shared/js/xianxia/TowerRun';
import {FIRST_CLEAR_REWARDS,formatSpiritStones,legacyRewardToStones,spiritStoneLootSummary,splitSpiritStones,STONE_CAP} from './shared/js/xianxia/TowerEconomy';
import {FLOORS,SKILLS,ECONOMY} from './shared/js/xianxia/TowerContent';
import {cultivationAt} from './shared/js/xianxia/TowerProfile';
import {GROWTH_SKILLS,GROWTH_EVOLUTIONS,growthSummary,growthStageAt,realmPoints} from './shared/js/xianxia/TowerGrowth';
import {towerStorage,readPlaytestTools,savePlaytestTools,PLAYTEST_RESOURCE_ACTIONS} from './shared/js/xianxia/TowerPlaytest';
import {TowerPlatform} from './TowerPlatform';
import {TowerMenu} from './TowerMenu';
import {drawTowerArena,drawTowerArenaMap} from './TowerArenaView';
import {TowerMonsterArt} from './TowerMonsterArt';
import {TowerMonsterMechanicsView} from './TowerMonsterMechanicsView';
import {TowerCharacterArt} from './TowerCharacterArt';

const C=(s:string)=>new Color(s);
const UI={paper:'#F2F0E6',surface:'#FBF9F1',jade:'#35685C',ink:'#263F39',muted:'#59695F',edge:'#BCC7B6',gold:'#9A7744',danger:'#A44B3D'};
// Visual presets only: future realms do not add levels or change progression.
const FAMILY:any={rhino:['犀','#87928A'],yak:['牦','#554C41'],boar:['猪','#b59a7a'],wolf:['狼','#aabcc9'],spider:['蛛','#b49cc3'],crocodile:['鳄','#88a57b'],snake:['蛇','#8fba96'],bear:['熊','#aa947d'],tiger:['虎','#d9ad64'],bat:['蝠','#8c92c0'],scorpion:['蝎','#b19382'],centipede:['蜈','#ad7d79'],ape:['猿','#c2b39b'],falcon:['隼','#95b5c1']};
const STONE_COLORS=['#A4C6D4','#8ED5C4','#B4A4E3','#F1D58A'];
// Back-to-front pile layout, reused each frame; at most five sprites per denomination.
const STONE_PILE=[[-7,5],[6,7],[-10,-3],[9,-4],[0,-6]] as const;
const STONE_GRADES=['下品','中品','上品','极品'];
const ERROR:any={'wrong-realm':'境界不符，无法服用此突破物品。','drop-only':'此材料仅由Boss掉落。','breakthrough-required':'已达大圆满，请查看角色信息中的突破条件。','breakthrough-not-ready':'需达到当前境界十层满修为才能突破。','already-zhuji':'已经筑基，无需再次服用筑基丹。','cultivation-allowance':'本境修为丹6颗共享额度已用尽。','cultivation-stock-confirmation':'操作后库存将超过本境剩余服用额度，请确认。','cultivation-overflow-confirmation':'药力将超出本境瓶颈，请确认实际收益与浪费。','insufficient-materials':'炼丹材料不足，请查看来源。','not-usable':'此材料不可直接服用，可用于炼丹或出售。','save-failed':'保存失败，本次操作未提交。请重试。','stale-save':'另一游戏窗口已更新存档，请刷新此窗口后继续。','insufficient':'所需资源不足','floor-locked':'尚未通关前置塔层','in-tower':'请先结束当前塔内挑战','max-refine':'已达到最高强化等级','insufficient-contribution':'点眷不足','insufficient-cores':'灵石不足','insufficient-spirit-stones':'灵石不足','insufficient-stones':'灵石不足','insufficient-points':'功法点不足，提升境界可获得功法点','realm-locked':'当前境界尚未达到修习要求','stage-locked':'当前境界尚未达到修习要求','library-only':'此项修习需要返回宗门藏经阁','research-capped':'本阶段三次道悟研习已完成','full-health':'当前气血已满','cultivation-capped':'已到金丹大圆满','active-run':'请先结束本次塔内挑战','locked':'通塔进度尚未满足','invalid-loadout':'装备配装无效','refinement-disabled':'当前版本暂未开放强化','capacity':'装备仓库或资源已满','unowned-equipment':'尚未拥有此装备','locked-equipment':'请先解除装备锁定','equipped-equipment':'请先从所有配装卸下此装备','starter-equipment':'基础装备不能分解','locked-weapon':'请先解除武器锁定','equipped-weapon':'请先从所有配装卸下此武器','starter-weapon':'普通铁剑不能分解','max-level':'已经达到最高等级','no-pill':'丹药数量不足','unreadable':'无法读取存档，请检查浏览器存储后刷新','corrupt':'存档校验未通过，已停止写入，避免覆盖原数据'};

/** Current sect/tower game host. */
export class TowerView {
 run:any=null; screen='camp';
 private breakthroughChoice='';private breakthroughLock=0;
 private ritual:TowerBreakthroughScene|null=null;private ritualAudio=new TowerBreakthroughAudio();
 private ceremony:{elapsed:number;success:boolean;burstPlayed:boolean}|null=null;private presentationHidden=false;
 private levelLabel:Label|null=null;private breakthroughEntry:Node|null=null;
 private store:any;private platform:TowerPlatform;private root:Node;
 private battle:Node|null=null;private menu:TowerMenu|null=null;private overlay:Node|null=null;
 private world:Graphics|null=null;private ui:Graphics|null=null;
 private foreground:Graphics|null=null;private warnings:Graphics|null=null;private monsterLayer:Node|null=null;
 private bodyFallbacks=new TowerBodyFallbacks();private playerBody:Graphics|null=null;
 private environmentArt=new TowerEnvironmentArt();
 private environmentGround:Node|null=null;private environmentProps:Node|null=null;
 private monsterArt=new TowerMonsterArt();
 private monsterMechanics:TowerMonsterMechanicsView|null=null;
 private projectileArt=new TowerProjectileArt();
 private skillEffects:TowerSkillEffects|null=null;
 private arcArt=new SwordArcArt('tower-ice');private arcLayer:Node|null=null;
 private flightSwordArt=new FlightSwordArt();
 private flightArt=new FlightStreamArt();private flightLayer:Node|null=null;
 private ningshenArt=new NingshenAuraArt();private ningshenLayer:Node|null=null;
 private jianguArt=new JianguAuraArt();private jianguLayer:Node|null=null;
 private bumieArt=new BumieAuraArt();private bumieLayer:Node|null=null;
 private jianxinArt=new JianxinAuraArt();private jianxinLayer:Node|null=null;
 private qingpingAudio=new QingpingAudio();
 private burstArt=new SwordBurstArt();private burstLayer:Node|null=null;
 private convergenceArt=new ConvergenceArt();private convergenceLayer:Node|null=null;
 private lineArt=new SwordLineArt();private lineLayer:Node|null=null;
 private shadowArt=new SwordShadowArt();private shadowLayer:Node|null=null;
 private hitArt=new TowerHitArt();
 private damageNumbers=new TowerDamageNumbers();
 private debuffIcons=new TowerDebuffIcons();
 private tiandiArt=new SwordTiandiArt();private tiandiLayer:Node|null=null;
 private crossBurstArt=new CrossBurstArt();private qiArt=new SwordQiArt();private qiLayer:Node|null=null;
 private orbitArt=new OrbitSwordArt();
 private formationArt=new LiangyiFormationArt();private formationLayer:Node|null=null;
 private sixiangArt=new SixiangFormationArt();private formationSprites=new Set<string>();
 private currencyLabels: Label[] = [];
 private currencyItems: Node[] = [];
 private currencyValue = '';
 private stoneArt=new TowerStoneArt();
 // Static HUD bindings must not be pruned by the drop renderer's endFrame.
 private hudArt=new TowerStoneArt();
 private stoneLayer:Node|null=null;
 private projectileLayer:Node|null=null;
 private characterArt=new TowerCharacterArt();
 private characterLayer:Node|null=null;
 private castLabel:Label|null=null;private castBar:Graphics|null=null;
 private labels:Label[]=[];private title:Label|null=null;private stats:Label|null=null;private foot:Label|null=null;
 private pickupFeedback=new PickupFeedback();
 private width=720;private height=1280;private page='hall';private notice='';
 private landscape=true;private resolutionKey='';private measuring=false;
 private orientationBlocked=false;private rotationOverlay:Node|null=null;
 private menuSize='';
 private breakthroughText='';private breakthroughUntil=0;
 private notices:Array<{text:string;duration:number;materials?:Record<string,number>}>=[];
 private levelEffects:Array<{started:number;duration:number;major:boolean;levels:number;name?:string;strong?:boolean}>=[];
 private levelBeam=new TowerLevelBeamArt();private levelBeamLayer:Node|null=null;
 private playerMotion={distance:0,moving:false,dx:1,dy:0};
 private attackTargetId:any=null;
 private enemyHealth=new Map<any,{hp:number;until:number}>();
 private hpLabel:Label|null=null;private manaLabel:Label|null=null;private bossLabel:Label|null=null;private targetRoleLabel:Label|null=null;private bossMechanicLabel:Label|null=null;private skillBadge:Node|null=null;
 private battleHud:ReturnType<typeof createPlayerHud>|null=null;
 private portraitGraphics:Graphics|null=null;private portraitRealm='';
 private hpBar:Graphics|null=null;private xpBar:Graphics|null=null;private bossBar:Graphics|null=null;
 private bossPanel:Node|null=null;private noticePanel:Node|null=null;private minimap:Graphics|null=null;
 private mapName:Label|null=null;private deviceTime:Label|null=null;private deviceNetwork:Label|null=null;private deviceBattery:Label|null=null;
 private deviceIcons:Graphics|null=null;private deviceStamp='';
 private camera={x:0,y:0};private keys=new Set<number>();private touch:number|null=null;
 private stick={x:0,y:0,dx:0,dy:0};private saveElapsed=0;private campElapsed=0;
 private pending:any=null;private training=false;private disposed=false;private skipFrame=false;
 private tools={speed:1,invincible:false};
 private syncFailed=false;
 private keyboardNavigation=new TowerKeyboardNavigation();
 private preventMenuKeyDefault=(event:KeyboardEvent)=>{
  if(this.orientationBlocked||this.host.assetLoading?.blocked)return;
  const target=event.target as HTMLElement;
  if(target?.tagName==='INPUT'||target?.tagName==='TEXTAREA'||target?.isContentEditable)return;
  if((this.screen!=='battle'||this.run?.state.phase!=='playing')&&['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(event.key))event.preventDefault();
 };
 private keyDown=(e:EventKeyboard)=>{
  if(this.orientationBlocked||this.host.assetLoading?.blocked)return;
  if((this.screen!=='battle'||this.run?.state.phase!=='playing')&&this.keyboardNavigation.handle(this.root,e.keyCode)){this.keys.clear();return;}
  if(e.keyCode===KeyCode.ESCAPE){
   if(this.closeTools())return;
   if(this.menu?.root.activeInHierarchy&&(this.menu.dismissInventory()||this.menu.dismissCharacterInfo()||this.menu.dismissSettings()||this.menu.dismissLibrary()))return;
   if(this.run?.state.phase==='playing'){this.pause();return;}
  }
  this.keys.add(e.keyCode);
 };
 private keyUp=(e:EventKeyboard)=>{this.keys.delete(e.keyCode);};
 private hide=()=>{this.presentationHidden=true;this.ritualAudio.stop();if(this.run?.state.phase==='playing')this.pause();else if(this.screen==='camp')this.store.act({type:'sync'},Date.now());this.resetInput();};
 private shown=()=>{this.presentationHidden=false;this.skipFrame=true;this.resetInput();};
 private visibility=()=>{if(document.hidden)this.hide();else this.shown();};
 constructor(private host:any){
  this.measureViewport();
  this.platform=new TowerPlatform(host);const size=view.getVisibleSize();this.width=size.width;this.height=size.height;
  this.root=this.node('落云宗·功能版',host.canvas,this.width,this.height);
  // SHOW_ALL reserves letterbox space but does not clip world-space Graphics.
  // Constrain the complete UI/world tree to the same logical input viewport.
  this.root.addComponent(Mask);
  const storage=towerStorage(this.platform.storage,BUILD_CAPABILITIES.developerTools);
  if(BUILD_CAPABILITIES.developerTools)this.tools=readPlaytestTools(this.platform.storage);
  this.store=new TowerCampaignStore(storage,Date.now());
  if(this.store.migrationReport?.reset)this.notice='开发期旧档已重置，已启用新资源规则。';
  if(!this.store.readOnly){const r=this.store.act({type:'sync'},Date.now());if(!r.ok)this.notice=this.reason(r.reason);}
  this.platform.onHidden(this.hide);this.platform.onShown(this.shown);
  if(typeof window!=='undefined')window.addEventListener('keydown',this.preventMenuKeyDefault,true);
  input.on(Input.EventType.KEY_DOWN,this.keyDown);input.on(Input.EventType.KEY_UP,this.keyUp);
  if(typeof window!=='undefined'){
   window.addEventListener('focus',this.shown);window.addEventListener('blur',this.hide);window.addEventListener('pagehide',this.hide);
   document.addEventListener('visibilitychange',this.visibility);
   // A smoke URL selects memory storage; only a QA build grants inspection access.
   if(BUILD_CAPABILITIES.developerTools&&new URLSearchParams(window.location.search).get('smoke')==='1'){
    (window as any).__towerTest={host:this,state:()=>JSON.parse(JSON.stringify(this.store.state)),run:()=>this.run?.snapshot(),action:(a:any)=>this.action(a),enter:(f:number)=>this.enterFloor(f),pause:()=>this.pause(),resume:()=>this.resume(),withdraw:()=>this.withdraw(),page:(p:string)=>this.goto(p)};
   }
  }
  if(this.store.state.activeRun&&!this.store.readOnly){
   try{this.run=TowerRun.restore(this.store.state.activeRun.snapshot);if(this.run.state.phase==='playing')this.run.pause();this.screen='battle';}
   catch{this.notice='战斗快照无法恢复，已保留原存档。';}
  }
  this.applyTools();
  this.render();
  if(this.run&&['won','lost','abandoned'].includes(this.run.state.phase))this.finish();
 }
 private reason(reason:string){return ERROR[reason]||`操作未完成：${reason||'请稍后重试'}`;}
 private measureViewport(){
  const frame=view.getFrameSize(),wide=frame.width>=frame.height;
  const key=`${wide}:${frame.width}:${frame.height}`;
  if(key!==this.resolutionKey){
   this.resolutionKey=key;this.landscape=true;this.orientationBlocked=!wide;this.measuring=true;
   // Keep a usable field and modal body when devtools or an ultrawide display
   // makes the frame very short. Fit the complete canvas instead of simulating
   // attacks underneath a HUD that occupies the whole viewport.
   const shortWide=wide&&1280*frame.height/Math.max(1,frame.width)<560;
   try{view.setDesignResolutionSize(1280,shortWide?560:720,
    !wide||shortWide?ResolutionPolicy.SHOW_ALL:ResolutionPolicy.FIXED_WIDTH);}
   finally{this.measuring=false;}
   this.resetInput();
  }
  const size=view.getVisibleSize();this.width=size.width;this.height=size.height;
 }
 private node(name:string,parent:Node,w=1,h=1){const n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);return n;}
 private label(text:string,parent:Node,x:number,y:number,w:number,h:number,size=26,color='#ece8d8'){
  const n=this.node(text||'动态文字',parent,w,h);n.setPosition(x,y);const l=n.addComponent(Label);
  l.string=text;l.fontSize=size;l.lineHeight=size*1.25;l.color=C(color);l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;l.cacheMode=Label.CacheMode.NONE;l.enableWrapText=true;return l;
 }
 private button(text:string,parent:Node,x:number,y:number,w:number,fn:()=>void,primary=false,height=88,inset=12){
  const n=this.node(text,parent,w,height);n.setPosition(x,y);const g=n.addComponent(Graphics);g.fillColor=C(primary?UI.jade:UI.surface);g.strokeColor=C(primary?UI.jade:UI.edge);g.lineWidth=1.5;g.roundRect(-w/2,-(height-inset)/2,w,height-inset,9);g.fill();g.stroke();
  this.label(text,n,0,0,w-20,height-inset,28,primary?UI.surface:UI.ink);const b=n.addComponent(Button);b.transition=Button.Transition.SCALE;b.zoomScale=.96;n.on(Button.EventType.CLICK,fn);return n;
 }
 private resetInput(){this.keys.clear();this.touch=null;this.stick.dx=0;this.stick.dy=0;this.run?.setInput(0,0);}
 private goto(page:string){if(page==='inventory'){if(this.screen==='battle')this.openInventory();else this.menu?.showInventory({...this.store.state,readOnly:this.store.readOnly,playtest:false});return;}this.page=this.screen==='skills'&&page!=='inventory'?'library':page;this.notice='';this.render();}
 private action(action:any){
  if(this.pending)return {ok:false,reason:'save-failed'};
  if(['decreaseSkill','respecSkills'].includes(action.type)
   &&(this.screen!=='camp'||this.page!=='library'||this.store.state.activeRun)){
   const result={ok:false,reason:'library-only'};
   this.notice='退点与重修只能在宗门藏经阁进行。';this.render();return result;
  }
  const before=cultivationAt(this.store.state.xp);
  const r=this.store.act(action,Date.now());
  if(r.ok){
   if(action.type==='drawForge'||action.type==='drawWeapon'||action.type==='drawEquipment'){
    const d=r.draw||r;this.notice=d.name?`炼制成功：${d.name}`:'炼制完成，请在整备中查看。';
   }else if(action.type==='usePill'&&typeof r.success==='boolean'){
    this.notice=r.success?`${r.target}成功！已晋升${r.target}初期。`:`突破失败：消耗1份${r.itemName}，满修为保留，可再次尝试（成功率${Math.round(r.successChance*100)}%）。`;
   }else if(action.type==='craftPill'){
    this.notice=`炼制成功：获得${(CAMP_PILLS as any)[action.id]?.name || action.id}×${action.count}，已收入背包。`;
   }else if(action.type==='buyPill'){
    this.notice=`购买成功：获得${(CAMP_PILLS as any)[action.id]?.name || action.id}×${action.count}。`;
   }else if(action.type==='sellMaterial'){
    this.notice=`已出售${r.count}份材料，获得${r.gained}下品灵石。`;
   }else if(action.type==='decreaseSkill'){
    const names=(r.changes||[]).map((c:any)=>`${(GROWTH_SKILLS as any[]).find(s=>s.id===c.id)?.name||(SKILLS as any[]).find(s=>s.id===c.id)?.name||c.id} ${c.from}→${c.to}`);
    this.notice=`已返还${r.returned}功法点${names.length>1?'，关联功法同步退点':''}；经卷保留。`;
   }else this.notice=action.type==='usePill'?'丹药已服用':['buyBook','learnSkill'].includes(action.type)?'修习已保存，进入战斗后自动生效':action.type==='respecSkills'?'已重修：实际投入点数已返还，经卷和教学领悟保留':action.type==='researchPoint'?`道悟研习完成，获得${r.points}点功法点`:['setLoadout','equipEquipment'].includes(action.type)?'装备配装已保存':'已保存';
   if(this.store.state.activeRun&&(this.screen==='skills'||['setLoadout','selectLoadout','equipEquipment'].includes(action.type))){
    // Campaign commits both permanent allocation and the paused combat snapshot.
    this.run=TowerRun.restore(this.store.state.activeRun.snapshot);
    this.applyTools();
   }
   const after=cultivationAt(this.store.state.xp);
   if(after.realm!==before.realm)this.notice=`突破${after.realm}！攻击与气血上限跃升；当前修为加成 +${Math.round((after.attackMultiplier-1)*100)}%`;
  }else this.notice=this.reason(r.reason);
  if(this.screen==='battle'&&this.menu?.inventoryOpen){
   this.menu.render({...this.store.state,readOnly:this.store.readOnly,playtest:false},'inventory',this.notice);
  }else this.render();return r;
 }
 private enterFloor(floor:number,prepared=false){
  if(this.store.state.activeRun){this.resume();return;}
  const preparation=!this.store.readOnly&&floor<=this.store.state.clearedFloor+1
   ?floorBreakthroughPreparation(this.store.state,floor):null;
  if(preparation&&!prepared){
   this.showModal('入塔提醒',
    `${preparation.ready?'已到突破之时':`即将突破${preparation.target}`}
可先准备突破材料，再入塔历练。`,[
     {text:'去丹霞峰准备',fn:()=>this.goto('pills'),primary:false},
     {text:'确认入塔',fn:()=>this.enterFloor(floor,true),primary:true},
    ],true,undefined,undefined,true);
   return;
  }
  const result=this.store.act({type:'startFloor',floor,seed:(Date.now()>>>0)||1},Date.now());
  if(!result.ok){this.notice=this.reason(result.reason);this.render();return;}
  this.run=TowerRun.restore(result.snapshot||this.store.state.activeRun.snapshot);
  this.applyTools();
  this.clearBattleFeedback();this.training=false;this.screen='battle';this.saveElapsed=0;this.notice='';this.skipFrame=true;this.render();
 }
 private enterTraining(){
  if(this.store.state.activeRun){this.notice='请先返回塔内，结束当前挑战后再演武。';this.render();return;}
  this.clearBattleFeedback();const s=this.store.state;this.run=new TowerRun({attemptId:1,floor:1,seed:737,hp:combatStats(s.xp,combatLoadout(s)).maxHp,xp:s.xp,normalCoreCounter:s.normalCoreCounter,loadout:combatLoadout(s),training:true});
  this.applyTools();
  this.training=true;this.screen='battle';this.notice='';this.render();
 }
 private persist(action:any){
  if(this.training)return true;
  const r=this.store.act(action,Date.now());
  if(r.ok){this.pending=null;return true;}
  this.pending=action;this.resetInput();this.showModal('保存尚未完成',this.reason(r.reason),[{text:'重试保存',fn:()=>this.retrySave()}]);return false;
 }
 private retrySave(){
  const action=this.pending;if(!action)return;
  if(!this.persist(action))return;
  if(action.type==='finishFloor')this.afterFinish(action.snapshot);else{if(this.run?.state.phase==='playing')this.run.pause();this.render();}
 }
 private pause(){
  if(!this.run||this.pending)return;
  this.run.pause();this.resetInput();this.persist({type:'checkpoint',snapshot:this.run.snapshot()});if(!this.pending)this.render();
 }
 private openInventory(){
  if(!this.run||this.training||this.pending||this.ceremony||this.menu?.inventoryOpen)return;
  if(this.screen==='skills'){this.goto('inventory');return;}
  const wasPlaying=this.run.state.phase==='playing';
  this.run.pause();this.resetInput();
  if(!this.persist({type:'checkpoint',snapshot:this.run.snapshot()}))return;
  this.menu=new TowerMenu(this.root,this.width,this.height,{action:(a:any)=>this.action(a),page:(p:string)=>this.goto(p),enterFloor:(f:number)=>this.enterFloor(f),resume:()=>this.resume(),training:()=>this.enterTraining()});
  this.menu.showInventory({...this.store.state,readOnly:this.store.readOnly,playtest:false},()=>{
   this.menu?.destroy();this.menu=null;
   if(wasPlaying)this.resume();
  });
 }
 private openSkills(){
  if(!this.run||this.training||this.pending||this.ceremony)return;
  // A crash/reload can present a paused local Run while its stored phase was
  // playing. Commit that pause before allowing a permanent allocation.
  this.run.pause();this.resetInput();
  if(!this.persist({type:'checkpoint',snapshot:this.run.snapshot()}))return;
  if(this.pending||this.run.state.phase!=='paused')return;
  this.screen='skills';this.page='library';this.notice='塔内已暂停，可按境界与资源修习功法；重置加点请回藏经阁。';this.render();
 }
 private resume(){
  if(this.pending||this.breakthroughLock>0)return;
  if(!this.run&&this.store.state.activeRun){this.run=TowerRun.restore(this.store.state.activeRun.snapshot);this.training=false;this.screen='battle';}
  if(!this.run)return;
  if(this.screen==='skills'&&this.store.state.activeRun){
   this.run=TowerRun.restore(this.store.state.activeRun.snapshot);
   if(this.run.state.breakthrough?.safe){this.screen='battle';this.render();return;}
  }
  this.applyTools();
  this.run.resume();this.resetInput();
  if(!this.training&&!this.persist({type:'checkpoint',snapshot:this.run.snapshot()}))return;
  this.skipFrame=true;this.screen='battle';this.render();
 }
 private withdraw(){
  if(!this.run||this.pending)return;
  this.run.abandon();this.finish();
 }
 private finish(){
  if(!this.run||this.pending)return;
  const snapshot=this.run.snapshot();
  if(this.training){this.run=null;this.training=false;this.screen='camp';this.page='training';this.notice='演武结束，气血、资源和塔层进度未发生变化。';this.render();return;}
  if(this.persist({type:'finishFloor',snapshot}))this.afterFinish(snapshot);
 }
 private afterFinish(snapshot:any){
  this.resetInput();this.run=null;this.screen='camp';this.page='tower';this.render();
  const e=this.store.state.lastResult.earned,won=snapshot.phase==='won';
  const first=this.store.state.lastResult?.firstClear;
  const title=won?`第${snapshot.floor}层已通关`:snapshot.phase==='lost'?'败退回宗':'已主动回宗';
  const prize=FIRST_CLEAR_REWARDS[snapshot.floor-1] as Readonly<{kind:string;amount:number}>;
  const loot=this.lootText(snapshot,e.spiritStones,first&&prize.kind==='spiritStones'?prize.amount:0);
  const materials=this.store.state.lastResult.materials || [];
  const overflow=this.store.state.lastResult.materialOverflow;
  const overflowText=overflow?.items?.length ? `\n材料库存已满，${overflow.items.map((i:any)=>`${(CAMP_PILLS as any)[i.id]?.name || i.id}×${i.count}`).join('、')}自动出售，到账${overflow.convertedStones}下品灵石${overflow.lostStones ? `，灵石已满损失${overflow.lostStones}` : ''}。` : '';
  const summary=`${first?'首通奖励已包含在收获中':''}${overflowText}\n${snapshot.phase==='lost'?'以1点气血苏醒，可在丹霞峰购丹后从背包服用。':'气血继承，可回宗整备后再次挑战。'}`.trim();
  const choices=[{text:'返回宗门',fn:()=>this.goto('hall'),primary:false}];
  if(won&&snapshot.floor<9)choices.push({text:`继续第${snapshot.floor+1}层`,fn:()=>this.enterFloor(snapshot.floor+1),primary:true});
  else choices.push({text:'前往丹霞峰',fn:()=>this.goto('pills'),primary:true});
  const creditedMaterials=materials.map((item:any)=>({...item,count:Math.max(0,item.count-(overflow?.items?.find((sold:any)=>sold.id===item.id)?.count||0))})).filter((item:any)=>item.count>0);
  const walletNotice=loot.includes('钱包已达上限')?'\n'+loot.split('\n').at(-1):'';
  this.showModal(title,summary+walletNotice,choices,false,creditedMaterials,{...e,skillPoints:first&&prize.kind==='skillPoints'?prize.amount:0});
 }
 private lootText(snapshot:any,credited?:number,extra=0){
  const loot=spiritStoneLootSummary(snapshot);
  if(!loot)return '本次灵石已按实际奖励结算；旧挑战未记录品阶明细。';
  const grades=loot.byGrade.map((n:number,i:number)=>n?`${STONE_GRADES[i]}×${n}`:'').filter(Boolean).join('、');
  const earned=legacyRewardToStones(snapshot.earned.cores);
  const bonus=Math.max(0,earned-loot.value);
  const overflow=credited===undefined?0:Math.max(0,earned+extra-credited);
  return `击杀灵石${grades?`：${grades}`:'：尚未掉落'}\n价值${formatSpiritStones(loot.value)}灵石${bonus?`，通层奖另加${formatSpiritStones(bonus)}灵石`:''}。${overflow?`\n钱包已达上限，${formatSpiritStones(overflow)}灵石未入账。`:'已自动入账。'}`;
 }
 private assetScene='';
 render(){
  if(this.disposed||this.measuring)return;
  this.measureViewport();
  this.root.getComponent(UITransform)!.setContentSize(this.width,this.height);
  if(this.orientationBlocked){
   this.resetInput();
   if(this.run?.state.phase==='playing'){
    this.run.pause();
    this.persist({type:'checkpoint',snapshot:this.run.snapshot()});
   }
   for(const child of this.root.children)child.active=false;
   if(!this.rotationOverlay){
    const n=this.rotationOverlay=this.node('HUD.RotateDevice',this.root,this.width,this.height);
    n.addComponent(BlockInputEvents);
    const g=n.addComponent(Graphics);g.fillColor=C(UI.paper);
    g.rect(-this.width/2,-this.height/2,this.width,this.height);g.fill();
    this.label('请横屏体验',n,0,50,1000,100,64,UI.jade);
    this.label(this.run?'旋转设备后继续 · 战斗已暂停':'本游戏仅支持横屏',n,0,-60,1100,80,38,UI.muted);
   }
   this.rotationOverlay.active=true;
   return;
  }
  this.rotationOverlay?.destroy();this.rotationOverlay=null;
  const assetScene=this.screen==='battle'?`battle:${this.training}:${this.run?.state.floor}`:`${this.screen}:${this.page}`;
  if(assetScene!==this.assetScene){
   this.assetScene=assetScene;this.host.assetLoading?.beginTransition();
  }
  for(const child of this.root.children)child.active=true;
  this.ritual?.close();
  this.overlay?.destroy();this.overlay=null;
  this.battleHud?.dispose();this.battleHud=null;
  this.currencyLabels=[];this.currencyItems=[];this.currencyValue='';
  this.hpLabel=null;this.manaLabel=null;this.bossLabel=null;this.targetRoleLabel=null;this.bossMechanicLabel=null;this.skillBadge=null;this.hpBar=null;this.xpBar=null;
  this.portraitGraphics=null;this.portraitRealm='';
  this.bossBar=null;this.bossPanel=null;this.noticePanel=null;this.minimap=null;
  this.mapName=null;this.deviceTime=null;this.deviceNetwork=null;this.deviceBattery=null;this.deviceIcons=null;this.deviceStamp="";
  this.title=null;this.stats=null;this.foot=null;
  if(this.screen==='camp')this.clearBattleFeedback();
  this.monsterMechanics?.destroy();this.monsterMechanics=null;
  this.bodyFallbacks.clear();this.playerBody=null;this.environmentArt.clearBindings();this.environmentGround=null;this.environmentProps=null;
  this.stoneArt.clearBindings();this.stoneLayer=null;
  this.hudArt.clearBindings();
  this.projectileArt.clearBindings();this.projectileLayer=null;this.monsterArt.clearBindings();this.characterArt.clearBindings();this.characterLayer=null;
  this.flightSwordArt.clearBindings();this.flightArt.clearBindings();this.flightLayer=null;
  this.ningshenArt.clearBindings();this.ningshenLayer=null;
  this.jianguArt.clearBindings();this.jianguLayer=null;
  this.bumieArt.clearBindings();this.bumieLayer=null;
  this.jianxinArt.clearBindings();this.jianxinLayer=null;
  this.arcArt.clearBindings();this.arcLayer=null;
  this.lineArt.clearBindings();this.lineLayer=null;this.burstArt.clearBindings();this.burstLayer=null;this.convergenceArt.clearBindings();this.convergenceLayer=null;
  this.shadowArt.clearBindings();this.shadowLayer=null;
  this.tiandiArt.clearBindings();this.tiandiLayer=null;
  this.crossBurstArt.clearBindings();this.qiArt.clearBindings();this.qiLayer=null;
  this.orbitArt.clearBindings();
  this.formationArt.clearBindings();this.sixiangArt.clearBindings();this.formationLayer=null;
  if(this.screen==='camp'||this.screen==='skills'){
   this.skillEffects=null;
   this.battle?.destroy();this.battle=null;this.labels=[];this.world=null;this.ui=null;
   this.foreground=null;this.warnings=null;this.monsterLayer=null;
   const sizeKey=`${this.width}:${this.height}`;
   if(!this.menu||this.menuSize!==sizeKey){
    this.menu?.destroy();
    this.menu=new TowerMenu(this.root,this.width,this.height,{action:(a:any)=>this.action(a),page:(p:string)=>this.goto(p),enterFloor:(f:number)=>this.enterFloor(f),resume:()=>this.resume(),training:()=>this.enterTraining(),...(BUILD_CAPABILITIES.developerTools?{tools:()=>this.showTools()}:{})});
    this.menuSize=sizeKey;
   }
   this.menu.render({...this.store.state,readOnly:this.store.readOnly,playtest:false},this.page,this.notice||this.reasonIfReadOnly());
  }else{
   this.menu?.destroy();this.menu=null;this.battle?.destroy();this.battle=null;this.labels=[];this.buildBattle();
  }
  if(this.pending)this.showModal('保存尚未完成','战斗已暂停，重试成功后才能继续。',[{text:'重试保存',fn:()=>this.retrySave()}]);
 }
 private buildCurrencyHud(root:Node,height:number){
  const row=this.node('HUD.Currency',root,620,48);
  row.setPosition(80,height/2-34);
  this.currencyLabels=[];this.currencyItems=[];this.currencyValue='';
  for(const grade of [3,2,1,0,-1]){
   const width=grade<0?176:106;
   const item=this.node(`HUD.CurrencyItem.${grade}`,row,width,48);
   this.currencyItems.push(item);
   const icon=this.node(grade<0?'HUD.ContributionIcon':`HUD.StoneIcon.${grade}`,item,32,36);
   icon.setPosition(16,0);
   const fallback=icon.addComponent(Graphics);fallback.fillColor=C(grade<0?'#C4B18A':STONE_COLORS[grade]);
   if(grade<0)fallback.roundRect(-10,-14,20,28,3);
   else {fallback.moveTo(0,15);fallback.lineTo(10,2);fallback.lineTo(0,-15);fallback.lineTo(-10,2);fallback.close();}
   fallback.fill();
   const ready=()=>{if(isValid(fallback,true))fallback.clear();};
   if(grade<0)this.hudArt.drawResource(icon,'currency-contribution','resource_contribution',0,0,32,ready);
   else this.hudArt.draw(icon,`currency-${grade}`,grade,0,0,32,ready);
   // Fixed 8-unit icon/text gap; spare space for large balances stays on the right.
   const textWidth=width-44;
   const label=this.label('',item,40+textWidth/2,0,textWidth,40,24,UI.surface);
   label.horizontalAlign=Label.HorizontalAlign.LEFT;
   this.outlineHudText(label);
   label.node.name=grade<0?'HUD.ContributionCount':`HUD.StoneCount.${grade}`;label.enableWrapText=false;
   label.overflow=Label.Overflow.SHRINK;
   this.currencyLabels.push(label);
  }
 }
 private refreshCurrencyHud(){
  if(!this.currencyLabels.length)return;
  const state=this.store.state,base=state.activeRun?.base,earned=this.run?.state.earned;
  // Checkpoints already include earnings: add the live run to its entry balance only.
  const live=!this.training&&!this.pending&&base&&earned;
  const active=state.activeRun;
  const stones=live?Math.min(STONE_CAP,base.spiritStones+legacyRewardToStones(earned.cores-pendingCoreValue(this.run!.state))
   +(active.materialOverflow?.convertedStones||0)-(active.spentSpiritStones||0)-(active.discardedSpiritStones||0)):state.spiritStones;
  const contribution=live?Math.min((ECONOMY as any).storage_cap,base.contribution+earned.contribution-(active.spentContribution||0)-(active.discardedContribution||0)):state.contribution;
  const values=[...splitSpiritStones(stones).reverse(),contribution],key=values.join(':');
  if(key===this.currencyValue)return;
  this.currencyValue=key;
  const first=values[0]>0?0:values[1]>0?1:2;
  // Keep the visible counts beside the map, independent of hidden leading grades.
  // Size only when balances change, preserving readable full integers even at the cap.
  const widths=values.map(value=>44+Math.max(62,`×${value}`.length*16));
  const mapLeft=1280/2-133-121;
  let left=mapLeft-16-80-widths.slice(first).reduce((sum,width)=>sum+width,0);
  values.forEach((value,index)=>{
   const label=this.currencyLabels[index],textWidth=widths[index]-44;
   label.string=`×${value}`;
   label.node.getComponent(UITransform)!.setContentSize(textWidth,40);
   label.node.setPosition(40+textWidth/2,0);
   const item=this.currencyItems[index];item.active=index>=first;
   item.getComponent(UITransform)!.setContentSize(widths[index],48);
   if(item.active){item.setPosition(left,0);left+=widths[index];}
  });
 }
 private reasonIfReadOnly(){return this.store.readOnly?this.reason(this.store.error):'';}
 private buildBattle(){
  this.monsterArt.preloadFloor(FLOORS[this.run?.state.floor-1]);
  this.stoneArt.preloadDrops();
  const W=1280,H=this.height;
  const root=this.battle=this.node('锁妖塔战场',this.root,this.width,this.height);
  this.environmentGround=this.node('青石地面',root);
  this.world=this.node('场地与妖兽',root).addComponent(Graphics);
  this.levelBeamLayer=this.node('晋升光柱层',root);this.levelBeam.preload();
  // Passive aura art is reserved for future domain skills; do not load or display it here.
  this.flightLayer=this.node('御剑飞行剑身层',root);this.flightSwordArt.preload();
  if(!this.skillEffects)this.skillEffects=new TowerSkillEffects();
  this.arcLayer=this.node('弦月斩特效层',root);this.arcArt.preload();
  this.ritualAudio.preload();
  this.burstLayer=this.node('剑罡爆裂层',root);this.burstArt.preload();this.qingpingAudio.preload();
  this.convergenceLayer=this.node('万剑归宗特效层',root);this.convergenceArt.preload();
  this.lineLayer=this.node('剑破虚空特效层',root);this.lineArt.preload();
  this.tiandiLayer=this.node('一剑开天特效层',root);this.tiandiArt.preload();
  this.environmentProps=this.node('镇妖柱与刷怪妖雾',root);
  const miasmaGround=this.node('怪物泥沼地面层',root);
  this.monsterLayer=this.node('妖兽静态素材',root);
  this.orbitArt.preload();
  this.warnings=this.node('攻击预警',root).addComponent(Graphics);
  this.formationLayer=this.node('剑阵落剑层',root);this.formationArt.preload();this.sixiangArt.preload();
  this.shadowLayer=this.node('分光连斩层',root);this.shadowArt.preload();
  this.foreground=this.node('战斗前景',root).addComponent(Graphics);
  this.stoneLayer=this.node('灵石掉落素材层',root);
  this.projectileLayer=this.node('御剑术飞剑层',root);
  this.qiLayer=this.node('月牙与十字剑气层',root);this.crossBurstArt.preload();this.qiArt.preload();
  this.monsterMechanics=new TowerMonsterMechanicsView(root,miasmaGround,this.monsterLayer);
  this.characterLayer=this.node('角色动作层',this.monsterLayer);
  this.playerBody=this.characterLayer.addComponent(Graphics);
  // The fixed thumbstick owns its touch. Taps on the field or right-hand UI do
  // not relocate the control or unexpectedly move the character.
  this.stick.x=-W/2+148;this.stick.y=-this.height/2+158;
  const surface=this.node('移动摇杆',root,224,224);
  surface.setPosition(this.stick.x,this.stick.y);
  const moveStick=(e:EventTouch)=>{
   const p=e.getUILocation(),dx=p.x-this.width/2-this.stick.x,dy=p.y-this.height/2-this.stick.y;
   const length=Math.hypot(dx,dy),d=Math.max(72,length);
   this.stick.dx=length<8?0:dx/d;this.stick.dy=length<8?0:dy/d;
  };
  surface.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{
   if(this.pending||this.run?.state.phase!=='playing'||this.touch!==null)return;const p=e.getUILocation();
   if(Math.hypot(p.x-this.width/2-this.stick.x,p.y-this.height/2-this.stick.y)>112)return;
   this.touch=e.getID();moveStick(e);
  });
  surface.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{if(e.getID()===this.touch)moveStick(e);});
  const release=(e:EventTouch)=>{if(e.getID()===this.touch){this.touch=null;this.stick.dx=0;this.stick.dy=0;}};
  surface.on(Node.EventType.TOUCH_END,release);surface.on(Node.EventType.TOUCH_CANCEL,release);
  const text=this.node('妖兽名牌',root);for(let i=0;i<60;i++)this.labels.push(this.label('',text,0,0,200,32,23));
  this.ui=this.node('战斗信息',root).addComponent(Graphics);
  const hud=this.battleHud=createPlayerHud(root,this.node.bind(this),this.label.bind(this),'paper');
  hud.root.setPosition(-W/2+206,H/2-86);
  hud.xpBar.node.parent=root;hud.xpBar.node.setPosition(0,-H/2+24);
  hud.xpBar.node.getComponent(UITransform)!.setContentSize(W-32,4);
  this.hpBar=hud.hpBar;this.hpLabel=hud.hpLabel;this.manaLabel=hud.manaLabel;this.xpBar=hud.xpBar;this.stats=hud.stats;
  this.portraitGraphics=hud.portraitGraphics;this.portraitRealm='';
  const casting=this.node('HUD.Casting',root,240,32);casting.setPosition(-W/2+220,H/2-153);
  this.castLabel=this.label('',casting,0,3,240,25,16,UI.surface);
  this.castBar=casting.addComponent(Graphics);
  this.buildCurrencyHud(root,H);
  // Fit directly below the currency row without painting over the battlefield.
  this.bossPanel=this.node('HUD.Boss',root,300,54);this.bossPanel.setPosition(0,H/2-83);
  this.bossLabel=this.label('',this.bossPanel,0,10,300,26,20,UI.surface);this.bossLabel.node.name='HUD.BossLabel';
  this.bossLabel.enableWrapText=false;this.bossLabel.overflow=Label.Overflow.SHRINK;
  this.outlineHudText(this.bossLabel);
  this.targetRoleLabel=this.label('',this.bossPanel,-130,10,40,22,16,'#D7E2EB');
  this.targetRoleLabel.node.name='HUD.TargetRole';this.targetRoleLabel.node.active=false;
  this.targetRoleLabel.enableWrapText=false;this.outlineHudText(this.targetRoleLabel);
  this.bossBar=this.node('HUD.BossHP',this.bossPanel,272,5).addComponent(Graphics);this.bossBar.node.setPosition(0,-7);
  this.bossMechanicLabel=this.label('',this.bossPanel,0,-25,300,24,18,UI.surface);this.bossMechanicLabel.node.name='HUD.BossMechanic';
  this.bossMechanicLabel.enableWrapText=false;this.bossMechanicLabel.overflow=Label.Overflow.SHRINK;
  this.outlineHudText(this.bossMechanicLabel);
  const mapCard=this.node('HUD.MapCard',root,242,204);
  mapCard.setPosition(W/2-133,H/2-118);
  const card=mapCard.addComponent(Graphics);
  card.fillColor=new Color(27,39,33,238);card.roundRect(-121,-102,242,204,8);card.fill();
  card.strokeColor=C('#89917A');card.lineWidth=1;card.roundRect(-121,-102,242,204,8);card.stroke();
  card.moveTo(-111,66);card.lineTo(111,66);card.moveTo(-111,-62);card.lineTo(111,-62);card.stroke();
  this.deviceTime=this.label('',mapCard,-81,84,62,28,21,'#F2EBD7');this.deviceTime.node.name='HUD.DeviceTime';
  this.deviceNetwork=this.label('',mapCard,-1,84,66,28,16,'#D4D9C6');this.deviceNetwork.node.name='HUD.DeviceNetwork';
  this.deviceBattery=this.label('',mapCard,88,84,56,28,17,'#D4D9C6');this.deviceBattery.node.name='HUD.DeviceBattery';
  this.deviceIcons=this.node('HUD.DeviceIcons',mapCard,242,30).addComponent(Graphics);this.deviceIcons.node.setPosition(0,84);
  this.minimap=this.node('HUD.Minimap',mapCard,132,88).addComponent(Graphics);
  this.minimap.node.setPosition(0,2);this.minimap.node.setScale(1.4,1.4,1);
  this.mapName=this.label('',mapCard,-24,-81,184,34,19,'#F2EBD7');this.mapName.node.name='HUD.MapName';
  // Group wave progress with the map: fixed width, left aligned, 8px below the card.
  const waveWidth=112,waveHeight=32,mapSize=mapCard.getComponent(UITransform)!;
  const wave=this.node('HUD.FloorWave',mapCard,waveWidth,waveHeight);
  wave.setPosition((waveWidth-mapSize.width)/2,-mapSize.height/2-8-waveHeight/2);
  const waveGround=wave.addComponent(Graphics);waveGround.fillColor=new Color(25,49,41,145);
  waveGround.roundRect(-waveWidth/2,-waveHeight/2,waveWidth,waveHeight,8);waveGround.fill();
  this.title=this.label('',wave,0,0,waveWidth-16,26,18,UI.surface);this.title.node.name='HUD.FloorWaveLabel';
  this.title.enableWrapText=false;this.title.overflow=Label.Overflow.SHRINK;
  this.outlineHudText(this.title);
  const nw=560;
  this.noticePanel=this.hudPanel('HUD.Notification',root,0,-H/2+58,nw,76);
  this.foot=this.label('',this.noticePanel,0,0,nw-24,64,21,UI.gold);this.foot.node.name='HUD.NotificationLabel';
  const noticeOutline=this.foot.node.addComponent(LabelOutline);
  noticeOutline.color=C('#263F39');noticeOutline.width=1.5;noticeOutline.enabled=false;
  const settings=this.node('HUD.Pause',mapCard,72,72);
  // Keep the 72px touch target inside the card while retaining the gear's visual position.
  settings.setPosition(82,-62);
  const visual=this.node('HUD.Pause图形',settings,36,36);visual.setPosition(0,-17);
  drawHudActionIcon(visual,'gear',.45);
  this.hudArt.drawResource(settings,'battle-gear','ui_settings',0,-17,36,
   ()=>{if(isValid(visual,true))visual.active=false;});
  const pauseButton=settings.addComponent(Button);
  pauseButton.transition=Button.Transition.SCALE;pauseButton.zoomScale=.92;
  settings.on(Button.EventType.CLICK,()=>this.pause());
  if(!this.training){
   this.hudAction('HUD.Inventory','bag',root,W/2-66,-H/2+64,()=>this.openInventory());
   const skill=this.hudAction('HUD.Skills','book',root,W/2-164,-H/2+64,()=>this.openSkills());
   const badge=this.node('HUD.SkillPointBadge',skill,12,12);badge.setPosition(-24,24);
   const bg=badge.addComponent(Graphics);bg.fillColor=C('#97422F');bg.circle(0,0,5);bg.fill();
   bg.strokeColor=C('#F4E9CC');bg.lineWidth=1;bg.circle(0,0,5);bg.stroke();
   this.skillBadge=badge;
  }
  this.levelLabel=this.label('',root,0,140,520,60,34,UI.gold);this.levelLabel.node.name='HUD.LevelUpTitle';this.outlineHudText(this.levelLabel);
  this.breakthroughEntry=this.button('可突破',root,0,-H/2+110,160,()=>{if(this.ceremony)return;this.run.requestBreakthrough();this.pause();if(this.run.state.breakthrough.safe)this.showBreakthrough();else this.resume();},true,60);
  this.breakthroughEntry.name='HUD.BreakthroughReady';this.breakthroughEntry.active=false;
  this.draw();
  if(this.run?.state.phase==='paused'){
   if(this.run.state.breakthrough?.safe&&!this.training&&(breakthroughReady(this.run.state.player.xp)||this.run.state.breakthrough.events.some((e:any)=>e.ticks===this.run.state.ticks))){this.showBreakthrough();return;}
   this.showPauseMenu([
    {text:'继续挑战',fn:()=>this.resume(),primary:true},
    ...(!this.training&&breakthroughReady(this.run.state.player.xp)?[{text:'本波结束后突破',fn:()=>{this.run.requestBreakthrough();this.resume();},primary:false}]:[]),
    {text:'返回宗门',fn:()=>this.withdraw(),primary:false},
   ]);
  }
 }
 private showPauseMenu(actions:Array<{text:string,fn:()=>void,primary:boolean}>){
  this.overlay?.destroy();
  const shade=this.overlay=this.node('暂停菜单',this.root,this.width,this.height);
  shade.addComponent(BlockInputEvents);
  drawMenuVeil(shade,this.width,this.height);
  const width=Math.min(480,this.width-64),height=(BUILD_CAPABILITIES.developerTools?188:108)+actions.length*84;
  const panel=this.node('暂停面板',shade,width,height);
  const g=panel.addComponent(Graphics);
  g.fillColor=C(UI.surface);g.strokeColor=C(UI.edge);g.lineWidth=1.5;
  g.roundRect(-width/2,-height/2,width,height,16);g.fill();g.stroke();
  const heading=this.label(this.training?'演武暂停':'塔内暂停',panel,0,height/2-48,width-64,56,34,UI.ink);
  heading.isBold=true;heading.horizontalAlign=Label.HorizontalAlign.LEFT;heading.overflow=Label.Overflow.CLAMP;
  heading.node.getComponent(UITransform)!.setContentSize(width-104,56);heading.node.setPosition(-20,height/2-42);
  const close=this.node('关闭暂停菜单',panel,72,72);close.setPosition(width/2-42,height/2-42);drawMenuClose(close);
  const resume=actions.find(action=>action.primary);
  const closeButton=close.addComponent(Button);closeButton.interactable=!!resume;
  close.on(Button.EventType.CLICK,()=>resume?.fn());
  actions.forEach((action,index)=>this.button(action.text,panel,0,height/2-132-index*84,
   width-64,action.fn,action.primary,72,0));
  if(BUILD_CAPABILITIES.developerTools){
   const ruleY=-height/2+80;
   g.moveTo(-width/2+32,ruleY);g.lineTo(width/2-32,ruleY);g.stroke();
   const tools=this.button('开发者工具',panel,0,-height/2+40,width-64,()=>this.showTools(),false,56,0);
   tools.getComponent(Graphics)!.clear();
   const caption=tools.children[0].getComponent(Label)!;
   caption.fontSize=24;caption.color=C(UI.muted);
  }
 }
 private showBreakthrough(message=''){
  if(!this.run?.state.breakthrough?.safe)return;
  const s=this.run.state,last=s.breakthrough.lastResult,success=!!last?.success&&!breakthroughReady(s.player.xp);
  const options=success?[]:breakthroughOptions(this.store.state,s.player.xp);
  if(!options.some((p:any)=>p.id===this.breakthroughChoice))this.breakthroughChoice=options[0]?.id||'';
  const selected=options.find((p:any)=>p.id===this.breakthroughChoice),current=cultivationAt(s.player.xp);
  const status=this.ceremony?'ceremony':success?'success':last&&!last.success?'failure':'prepare';
  let detail='';
  if(success){
   const before=combatStats(s.player.xp-1,s.loadout),after=combatStats(s.player.xp,s.loadout);
   detail=`攻击 ${Math.round(before.attack)}→${Math.round(after.attack)} · 气血上限 ${Math.round(before.maxHp)}→${Math.round(after.maxHp)}\n气血已恢复，可修习新功法`;
  }else if(selected)detail=`${selected.name} · 成功率 ${Math.round(selected.successChance*100)}%${selected.purchase?` · 持有 ${this.store.state.spiritStones}下品灵石`:` · 持有 ${selected.count}份`}`;
  const model:BreakthroughModel={status,realm:current.realm,target:selected?.target||current.realm,options,selected:this.breakthroughChoice,
   message:message||(!selected?.affordable&&!success?'灵石不足，可稍后准备材料':''),detail,contribution:this.store.state.contribution,
   elapsed:this.ceremony?.elapsed||0,success:this.ceremony?.success??success,
   actionText:selected?.purchase?`购买并突破 · ${selected.price}灵石`:'消耗1份 · 开始突破',canAttempt:!!selected?.affordable};
  this.renderBreakthrough(model,{select:(id:string)=>{this.breakthroughChoice=id;this.showBreakthrough();},attempt:()=>this.tryBreakthrough(),
   resume:()=>this.resume(),skills:()=>this.openSkills()});
 }
 private renderBreakthrough(model:BreakthroughModel,handlers:any){
  this.overlay?.destroy();this.overlay=null;
  this.ritual??=new TowerBreakthroughScene();this.ritualAudio.preload();
  this.ritual.render(this.root,this.width,this.height,model,this.run.state,handlers);
 }
 private tryBreakthrough(){
  if(this.pending||this.ceremony||this.breakthroughLock>0||!this.run?.state.breakthrough?.safe)return;
  const b=this.run.state.breakthrough;
  const r=this.store.act({type:'breakthrough',attemptId:this.run.state.attemptId,sequence:b.sequence+1,id:this.breakthroughChoice,buyIfMissing:true},Date.now());
  if(!r.ok){this.showBreakthrough(this.reason(r.reason));return;}
  this.run=TowerRun.restore(r.snapshot);this.applyTools();
  this.ceremony={elapsed:0,success:r.success,burstPlayed:false};this.breakthroughLock=CEREMONY_DURATION;
  this.resetInput();this.showBreakthrough();this.ritualAudio.play(this.root,'gather');
 }
 private outlineHudText(label:Label){
  label.enableOutline=true;label.outlineColor=C('#20352f');label.outlineWidth=2;
 }
 private hudAction(name:string,kind:'bag'|'book'|'gear',parent:Node,x:number,y:number,run:()=>void,scale=.75){
  const n=this.node(name,parent,80,80);n.setPosition(x,y);
  const visual=this.node(`${name}图形`,n,80,80);
  drawHudActionIcon(visual,kind,scale);
  this.hudArt.drawResource(n,`battle-${kind}`,kind==='bag'?'ui_bag':kind==='book'?'ui_skills':'ui_settings',0,0,kind==='gear'?SETTINGS_ICON_SIZE:70*scale/.75,
   ()=>{if(isValid(visual,true))visual.active=false;});
  const button=n.addComponent(Button);button.transition=Button.Transition.SCALE;button.zoomScale=.96;
  n.on(Button.EventType.CLICK,run);return n;
 }
 private hudPanel(name:string,parent:Node,x:number,y:number,w:number,h:number){
  const n=this.node(name,parent,w,h);n.setPosition(x,y);
  const g=n.addComponent(Graphics);g.fillColor=new Color(242,240,230,232);g.strokeColor=C(UI.edge);g.lineWidth=1;
  g.roundRect(-w/2,-h/2,w,h,10);g.fill();g.stroke();return n;
 }
 private drawBar(g:Graphics|null,w:number,h:number,ratio:number,color:string){
  if(!g)return;g.clear();g.fillColor=C('#D8DFD3');g.rect(-w/2,-h/2,w,h);g.fill();
  const fill=w*Math.max(0,Math.min(1,ratio));if(fill>0){g.fillColor=C(color);g.rect(-w/2,-h/2,fill,h);g.fill();}
 }
 private drawPlayerHp(ratio:number){drawPlayerHp(this.hpBar,ratio,'paper');}
 private refreshHudPortrait(realm:string){
  if(!this.portraitGraphics||this.portraitRealm===realm)return;
  this.drawHudPortrait(this.portraitGraphics,realm);this.portraitRealm=realm;
 }
 private drawHudPortrait(g:Graphics,realm='炼气'){drawHudPortrait(g,realm,'paper');}
 private clearBattleFeedback(){
  this.debuffIcons.reset();
  this.pickupFeedback?.reset();
  this.skillEffects?.resetAftershocks();this.burstArt.reset();this.qingpingAudio.reset();
  this.notices=[];this.breakthroughText='';this.breakthroughUntil=0;this.enemyHealth?.clear();this.attackTargetId=null;
  this.levelEffects=[];this.ceremony=null;this.breakthroughLock=0;this.ritual?.close();this.ritualAudio.stop();this.playerMotion={distance:0,moving:false,dx:1,dy:0};this.characterArt.reset();
  this.arcArt.reset();
  this.lineArt.reset();this.convergenceArt.reset();
  this.shadowArt.reset();
  this.tiandiArt.reset();this.hitArt.reset();
  this.crossBurstArt.reset();this.qiArt.reset();
  this.orbitArt.reset();
  this.formationArt.reset();
  this.sixiangArt.reset();this.formationSprites.clear();
 }
 private enqueueNotice(text:string,duration:number){
  (this.notices??=[]).push({text,duration});
 }
 private queueMaterialNotice(snapshot:any,start:number){
  if(this.training||snapshot.training||snapshot.rewardIsolated)return;
  const cursor=snapshot.pickups?snapshot.pickups.collected.length:snapshot.killLedger.length;
  if(cursor<=start)return;
  const drops=snapshot.pickups?collectedMaterials(snapshot,start):materialDrops(snapshot,start);
  if(!drops.length)return;
  // Keep at most one queued material notice; new kills merge while other notices play.
  let notice=this.notices.find(item=>item.materials);
  if(!notice){notice={text:'',duration:1.8,materials:{}};this.notices.push(notice);}
  for(const id of drops)notice.materials![id]=(notice.materials![id]||0)+1;
  const rows=Object.entries(notice.materials!);
  const total=rows.reduce((sum,[,count])=>sum+count,0);
  notice.text=`材料 +${total}：${rows.slice(0,3).map(([id,count])=>`${(CAMP_PILLS as any)[id]?.name||id}×${count}`).join('、')}${rows.length>3?'等（结算时查看）':''}`;
 }
 private advanceNotice(time:number){
  if(time<this.breakthroughUntil)return;
  const next=this.notices?.shift();this.breakthroughText=next?.text||'';
  this.breakthroughUntil=next?time+next.duration:0;
 }
 private showModal(title:string,body:string,buttons:Array<{text:string,fn:()=>void,primary?:boolean,disabled?:boolean}>,compact=false,harvest?:Array<{id:string,count:number}>,earned?:{spiritStones?:number;contribution?:number;skillPoints?:number},notice=false){
  this.overlay?.destroy();const o=this.overlay=this.node('对话面板',this.root,this.width,this.height);o.addComponent(BlockInputEvents);
  const g=drawMenuVeil(o,this.width,this.height);
  const actionsOnly=compact&&!body;
  const columns=actionsOnly?1:this.landscape?Math.max(1,Math.min(2,buttons.length)):buttons.length>2?1:Math.max(1,buttons.length);
  const width=this.landscape?Math.min(harvest?884:notice?720:actionsOnly?480:1080,this.width-64):640,bodyWidth=width-70;
  const rows=body.split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/Math.floor(bodyWidth/26))),0);
  const actionHeight=72,actionGap=12,actionPadding=32;
  const step=actionsOnly?actionHeight+actionGap:compact?80:100;
  const buttonRows=Math.ceil(buttons.length/columns),h=Math.min(notice?360:harvest?620:actionsOnly?224+step*(buttonRows-1):Math.max(420,230+step*(buttonRows-1)+Math.max(116,rows*33)),this.height-24);
  g.fillColor=C(UI.surface);g.strokeColor=C(UI.edge);g.lineWidth=2;g.roundRect(-width/2,-h/2,width,h,12);g.fill();g.stroke();
  g.strokeColor=C(actionsOnly?UI.edge:UI.gold);g.lineWidth=actionsOnly?1:2;
  const ruleHalf=actionsOnly?width/2-actionPadding:28,ruleY=h/2-(actionsOnly?88:96);
  g.moveTo(-ruleHalf,ruleY);g.lineTo(ruleHalf,ruleY);g.stroke();
  const heading=this.label(title,o,0,h/2-(actionsOnly?44:54),width-(actionsOnly?actionPadding*2:50),68,actionsOnly?34:36,UI.ink);
  if(!harvest&&!notice){heading.horizontalAlign=Label.HorizontalAlign.LEFT;heading.overflow=Label.Overflow.CLAMP;heading.node.getComponent(UITransform)!.setContentSize(width-104,68);heading.node.setPosition(-20,h/2-42);heading.isBold=true;}
  // Reserve a readable body even when actions require several rows. Excess
  // actions scroll inside their fixed footer; neither region can cover the other.
  const buttonHeight=actionsOnly?actionHeight:compact?72:88;
  const actionTotal=Math.max(0,buttonRows-1)*step+buttonHeight;
  const actionArea=Math.min(actionTotal,Math.max(buttonHeight,h-(body?262:132)));
  const actionTop=-h/2+24+actionArea;
  const bodyTop=h/2-110,bodyBottom=actionTop+16;
  const bodyHeight=Math.max(0,bodyTop-bodyBottom),bodyY=(bodyTop+bodyBottom)/2;
  if(harvest){
   const rewards=this.node('结算收获区',o,bodyWidth,bodyHeight);rewards.setPosition(0,bodyY);
   this.menu?.renderSettlementRewards(rewards,body,harvest,bodyWidth,bodyHeight,earned);
  }else if(body&&notice){
   const message=this.label(body,o,0,bodyY,bodyWidth,bodyHeight,26,UI.ink);
   message.node.name='入塔准备提示';message.horizontalAlign=Label.HorizontalAlign.CENTER;
   message.verticalAlign=Label.VerticalAlign.CENTER;message.overflow=Label.Overflow.CLAMP;
  }else if(body)TowerMenu.renderModalBody(o,body,bodyY,bodyWidth,bodyHeight);
  const cell=(width-(actionsOnly?actionPadding*2:56))/columns;
  const actionContent=actionTotal>actionArea?TowerMenu.createModalScroll(o,'弹窗操作卷轴',-h/2+24+actionArea/2,width-56,actionArea,actionTotal):null;
  buttons.forEach((b,i)=>{const button=this.button(b.text,actionContent||o,(i%columns-(columns-1)/2)*cell,
   (actionContent?0:actionTop)-buttonHeight/2-Math.floor(i/columns)*step,cell-(actionsOnly?0:18),b.fn,b.primary??(i===buttons.findIndex(action=>!/^(取消|退出|返回|关闭)/.test(action.text))),buttonHeight,actionsOnly?0:12);if(b.disabled)button.getComponent(Button)!.interactable=false;});
 }
 private applyTools(){this.run?.setPlaytestAssist(BUILD_CAPABILITIES.developerTools&&this.tools.invincible);}
 private closeTools(){
  if(this.overlay?.name!=='开发者工具遮罩')return false;
  this.render();return true;
 }
 private backFromTools(){
  if(!this.closeTools())return;
  if(this.screen!=='battle')this.menu?.showSettings();
 }
 private showTools(){
  if(!BUILD_CAPABILITIES.developerTools||this.pending)return;
  if(this.run?.state.phase==='playing'
   ||this.run?.state.phase==='paused'&&this.store.state.activeRun?.snapshot.phase==='playing')this.pause();
  if(this.pending)return;
  if(this.store.readOnly){
   this.showModal('存档无法读写',this.reason(this.store.error),[{text:'关闭',fn:()=>this.render()}]);return;
  }
  this.overlay?.destroy();
  const shade=this.overlay=this.node('开发者工具遮罩',this.root,this.width,this.height);
  shade.addComponent(BlockInputEvents);
  drawMenuVeil(shade,this.width,this.height);
  shade.on(Node.EventType.TOUCH_END,(event:any)=>{if(event.target===shade)this.closeTools();});
  const width=Math.min(520,this.width-64),height=Math.min(660,this.height-32);
  const box=this.node('开发者工具面板',shade,width,height);box.addComponent(BlockInputEvents);
  const panel=box.addComponent(Graphics);panel.fillColor=C(UI.surface);panel.strokeColor=C(UI.edge);panel.lineWidth=2;
  panel.roundRect(-width/2,-height/2,width,height,12);panel.fill();panel.stroke();
  const headerY=height/2-50;
  this.label('开发者工具',box,0,headerY,width-160,64,36,UI.ink);
  const back=this.button('<',box,-width/2+48,headerY,64,()=>this.backFromTools(),false,64);back.name='返回设置';
  const close=this.button('',box,width/2-48,headerY,72,()=>this.closeTools(),false,72);close.name='关闭开发者工具';
  drawMenuClose(close);
  const cell=width-72,step=(height-120)/6,buttonHeight=step-10;
  const rowY=(index:number)=>height/2-100-step*(index+.5);
  this.button(`游戏速度 ×${this.tools.speed}`,box,0,rowY(0),cell,
   ()=>this.changeTools({speed:this.tools.speed%3+1}),true,buttonHeight);
  this.button(`无敌：${this.tools.invincible?'开启':'关闭'}`,box,0,rowY(1),cell,
   ()=>this.changeTools({invincible:!this.tools.invincible}),false,buttonHeight);
  const grant=PLAYTEST_RESOURCE_ACTIONS[0];
  this.button(grant.label,box,0,rowY(2),cell,()=>this.editPlaytest(grant.action.type,grant.action),false,buttonHeight);
  this.button('+999功法点',box,0,rowY(3),cell,()=>this.editPlaytest('playtestAddSkillPoints'),false,buttonHeight);
  this.button('提升一小境界',box,0,rowY(4),cell,()=>this.editPlaytest('playtestNextStage'),false,buttonHeight);
  this.button('重置游戏进度',box,0,rowY(5),cell,()=>this.resetProgress(),false,buttonHeight);
 }
 private resetProgress(){
  if(!BUILD_CAPABILITIES.developerTools||this.pending||this.store.readOnly)return;
  const result=this.store.act({type:'playtestReset'},Date.now());
  if(!result.ok){
   this.showModal('操作未完成',this.reason(result.reason),[{text:'返回工具',fn:()=>this.showTools()}]);return;
  }
  this.resetInput();this.clearBattleFeedback();this.run=null;this.training=false;
  this.saveElapsed=0;this.campElapsed=0;this.syncFailed=false;this.skipFrame=true;
  this.screen='camp';this.page='hall';this.notice='游戏进度已重置，可以重新开始。';this.render();
 }
 private editPlaytest(type:string,params:any={}){
  if(!BUILD_CAPABILITIES.developerTools||this.pending||this.store.readOnly||!['playtestResources','playtestNextStage','playtestAddSkillPoints'].includes(type))return;
  if(type==='playtestNextStage'&&this.training){
   this.showModal('请先结束演武','回到宗门后可提升境界。',[{text:'返回工具',fn:()=>this.showTools()}]);return;
  }
  const result=this.store.act({...params,type},Date.now());
  if(!result.ok){
   this.showModal('操作未完成',this.reason(result.reason),[{text:'返回工具',fn:()=>this.showTools()}]);return;
  }
  if(this.store.state.activeRun)this.run=TowerRun.restore(this.store.state.activeRun.snapshot);
  this.applyTools();this.showTools();
 }
 private changeTools(patch:any){
  if(!BUILD_CAPABILITIES.developerTools)return;
  const next={...this.tools,...patch};
  try{savePlaytestTools(this.platform.storage,next);}
  catch{this.showModal('设置未保存','工具设置写入失败，当前设置保持。',[{text:'返回工具',fn:()=>this.showTools()}]);return;}
  this.tools=next;this.applyTools();this.showTools();
 }
 /** Prepare draw-time bindings under the loading cover without advancing combat. */
 prepareAssets(){
  this.resetInput();
  if(!this.disposed&&!this.orientationBlocked&&this.screen==='battle')this.draw();
 }
 update(dt:number){
  if(this.disposed)return;
  if(this.orientationBlocked)return;
  this.menu?.updateEffects(dt);
  if(!this.presentationHidden&&this.ceremony){
   this.ceremony.elapsed+=Math.max(0,Math.min(.1,dt));this.breakthroughLock=Math.max(0,CEREMONY_DURATION-this.ceremony.elapsed);
   if(this.ceremony.elapsed>=2&&!this.ceremony.burstPlayed){this.ceremony.burstPlayed=true;this.ritualAudio.play(this.root,this.ceremony.success?'success':'failure');}
   if(this.breakthroughLock===0){this.ceremony=null;this.showBreakthrough();}
  }
  if(!this.presentationHidden)this.ritual?.update(dt,this.ceremony?.elapsed);
  if(this.skipFrame){this.skipFrame=false;return;}
  if(this.screen==='skills')return;
  if(this.screen==='camp'){
   this.campElapsed+=dt;
   if(this.campElapsed>5&&!this.store.readOnly){
    this.campElapsed=0;
    const r=this.store.act({type:'sync'},Date.now());
    if(r.ok){
     const state={...this.store.state,readOnly:false,playtest:false};
     if(this.syncFailed){this.syncFailed=false;this.notice='保存已恢复，可以继续操作。';this.menu?.render(state,this.page,this.notice);}
     else this.menu?.refreshVitals(state);
    }else{this.syncFailed=true;this.notice=this.reason(r.reason);this.menu?.render({...this.store.state,readOnly:true,playtest:false},this.page,this.notice);}
   }
   return;
  }
  if(!this.run||this.pending)return;
  if(['won','lost','abandoned'].includes(this.run.state.phase)){this.finish();return;}
  if(this.run.state.phase==='playing'){
   const p=this.run.state.player;
   const cameraY=this.landscape?12:40,top=this.landscape?108:161,bottom=this.landscape?72:86;
   this.run.setViewport({xmin:p.x-this.width/2+8,xmax:p.x+this.width/2-8,ymin:p.y+cameraY-this.height/2+bottom+8,ymax:p.y+cameraY+this.height/2-top-8,followPlayer:true});
   let x=this.stick.dx,y=this.stick.dy;
   if(this.touch===null){x=(this.keys.has(KeyCode.KEY_D)||this.keys.has(KeyCode.ARROW_RIGHT)?1:0)-(this.keys.has(KeyCode.KEY_A)||this.keys.has(KeyCode.ARROW_LEFT)?1:0);y=(this.keys.has(KeyCode.KEY_W)||this.keys.has(KeyCode.ARROW_UP)?1:0)-(this.keys.has(KeyCode.KEY_S)||this.keys.has(KeyCode.ARROW_DOWN)?1:0);}
   const before=cultivationAt(p.xp),beforePoints=realmPoints(p.xp),known=new Set(Object.keys(this.run.state.loadout.active));
   const killStart=this.run.state.pickups?.collected.length??this.run.state.killLedger.length;
   const oldX=p.x,oldY=p.y,characterBefore=this.characterArt.sample(this.run.state);
   const d=Math.max(1,Math.hypot(x,y));this.run.setInput(x/d,y/d);this.run.advance(Math.min(.1,dt)*(BUILD_CAPABILITIES.developerTools?this.tools.speed:1),
    (cast:any)=>this.characterArt.observeCast(cast));
   this.characterArt.observe(characterBefore,this.run.state);
   this.queueMaterialNotice(this.run.state,killStart);
   const after=cultivationAt(this.run.state.player.xp);
   if(!before.breakthroughReady&&after.breakthroughReady)this.enqueueNotice('修为已满，本波结束后可尝试突破',4);
   const movedX=this.run.state.player.x-oldX,movedY=this.run.state.player.y-oldY,moved=Math.hypot(movedX,movedY);
   const motion=this.playerMotion??={distance:0,moving:false,dx:1,dy:0};
   motion.moving=moved>.001;
   if(motion.moving){motion.distance+=moved;motion.dx=movedX/moved;motion.dy=movedY/moved;}
   // Only a live simulation advance may create a burst. Snapshot restore/render
   // never infer an event from the player's current level.
   if(after.level>before.level){
    const major=after.realm!==before.realm;
    const feedback=levelUpPresentation(before,after)!;
    (this.levelEffects??=[]).push({...feedback,started:this.run.state.time,duration:1.2,major,levels:after.level-before.level});
    this.ritualAudio.play(this.root,'minor');
   }
   if(after.realm!==before.realm){
    this.enqueueNotice(`突破${after.realm}！\n攻击、气血上限跃升 · 获得${realmPoints(this.run.state.player.xp)-beforePoints}功法点`,3);
   }
   const learned=Object.keys(this.run.state.loadout.active).filter(id=>!known.has(id));
   if(learned.length){
    this.enqueueNotice(`领悟 ${learned.map(id=>(GROWTH_SKILLS as any[]).find(k=>k.id===id)?.name||(SKILLS as any[]).find(k=>k.id===id)?.name||id).join('、')}\n永久掌握 · 自动施法`,4);
   }
   this.saveElapsed+=dt;
   if(['won','lost','abandoned'].includes(this.run.state.phase)){this.finish();return;}
   if(this.run.state.phase==='paused'){this.resetInput();if(this.persist({type:'checkpoint',snapshot:this.run.snapshot()}))this.render();return;}
   if(this.saveElapsed>=.75){this.saveElapsed=0;if(!this.persist({type:'checkpoint',snapshot:this.run.snapshot()}))return;}
  }
  this.draw();
 }
 private draw(){
  this.refreshCurrencyHud();
  if(!this.run||!this.world||!this.ui||!this.foreground||!this.warnings||!this.monsterLayer)return;
  const s=this.run.state,p=s.player,W=this.width,H=this.height;
  let g=this.world;
  this.foreground.clear();this.warnings.clear();this.monsterArt.beginFrame();this.bodyFallbacks.begin();
  this.camera.x=p.x;this.camera.y=p.y+(this.landscape?12:40);
  const heavyKick=p.hp>0?this.tiandiArt.cameraKick(s.time):{x:0,y:0};
  const convergenceKick=this.convergenceArt.cameraKick(s),burstKick=this.burstArt.cameraKick(s);
  if(!presentationPreferences().reducedMotion){this.camera.x+=heavyKick.x+convergenceKick.x+burstKick.x;this.camera.y+=heavyKick.y+convergenceKick.y+burstKick.y;}
  const sx=(x:number)=>x-this.camera.x,sy=(y:number)=>y-this.camera.y;
  const floorReady=this.environmentGround&&this.environmentProps?this.environmentArt.draw(this.environmentGround,this.environmentProps,s,this.camera,W,H,this.monsterLayer):false;
  g.clear();drawTowerArena(g,this.camera,W,H,s.arenaVersion,!!floorReady);
  if(this.flightLayer)this.flightSwordArt.syncTower(this.flightLayer,flightRidePose(s),this.camera);
  // Friendly rings are below attacks, drops and actors so telegraphs remain readable.
  this.drawLevelEffects(g,s.time,sx(p.x),sy(p.y));
  if(this.playerBody&&this.characterLayer){
   this.characterLayer.active=!this.ritual?.root;
   this.playerBody.clear();setTowerDepth(this.characterLayer,p.y);
   this.drawPlayer(this.playerBody,s,sx(p.x),sy(p.y));
  }
  this.hitArt.sample(s);
  const arcSprites=this.arcLayer&&p.hp>0?this.arcArt.syncTower(this.arcLayer,s.effects||[],s.time,this.camera):undefined;
  const lineChestHeight=this.characterArt.waistPosition?this.characterArt.waistPosition.y-sy(p.y)+18:70;
  const lineSprites=this.lineLayer&&p.hp>0?this.lineArt.syncTower(this.lineLayer,s.effects||[],s.time,this.camera,lineChestHeight,{width:W,height:H}):undefined;
   const shadowSprites=this.shadowLayer?this.shadowArt.syncTower(this.shadowLayer,s,this.camera):undefined;
  const tiandiSprites=this.tiandiLayer&&p.hp>0?this.tiandiArt.syncTower(this.tiandiLayer,s.effects||[],s.time,this.camera,lineChestHeight):undefined;
  const qiSprites=this.qiLayer&&p.hp>0?this.qiArt.syncTower(this.qiLayer,s.projectiles||[],s.effects||[],s.time,this.camera):undefined;
  const crossSprites=this.qiLayer&&p.hp>0?this.crossBurstArt.syncTower(this.qiLayer,s.effects||[],s.time,this.camera):new Set<string>();
  // Creator's downlevel spread treats Sets as array elements, not iterables.
  const combinedQiSprites=new Set<string>();
  qiSprites?.forEach(id=>combinedQiSprites.add(id));
  crossSprites.forEach(id=>combinedQiSprites.add(id));
  const orbitSprites=this.orbitArt.syncTower(this.monsterLayer,s,this.camera,this.characterArt.waistPosition);
  this.formationSprites.clear();
  if(this.convergenceLayer)for(const id of this.convergenceArt.syncTower(this.convergenceLayer,s,this.camera))this.formationSprites.add(id);
  if(this.formationLayer){
   for(const id of this.formationArt.syncTower(this.world.node,this.formationLayer,s,this.camera))this.formationSprites.add(id);
   for(const id of this.sixiangArt.syncTower(this.world.node,this.formationLayer,s,this.camera))this.formationSprites.add(id);
  }
  if(p.hp<=0){this.arcArt.reset();this.lineArt.reset();this.convergenceArt.reset();this.tiandiArt.reset();this.crossBurstArt.reset();this.qiArt.reset();}
   this.skillEffects?.draw(g,s,this.camera,arcSprites,lineSprites,tiandiSprites,combinedQiSprites,orbitSprites,this.formationSprites,this.characterArt.waistPosition,shadowSprites,this.hitArt.covered);
  this.qingpingAudio.sync(this.foreground.node,s);
  this.skillEffects?.drawQingpingMarks(this.foreground,s,this.camera);
  this.hitArt.draw(this.foreground,this.camera);
  this.damageNumbers.draw(this.foreground.node,s,this.camera);
  this.debuffIcons.draw(this.foreground.node,s,this.camera,W,H);
  if(p.hp>0&&s.armorState?.shield>0&&s.time<s.armorState.shieldUntil){
   const shield=this.foreground;shield.strokeColor=C('#A8DBE7');shield.lineWidth=3;
   shield.ellipse(sx(p.x),sy(p.y)+44,40,58);shield.stroke();
  }
  if(this.burstLayer)this.burstArt.sync(this.burstLayer,this.foreground,s,this.camera);
  const legacyHits={...s,effects:(s.effects||[]).filter((e:any)=>!this.hitArt.covered.has(e.id))};
  this.skillEffects?.drawWuwoHits(this.foreground,legacyHits,this.camera);
  this.skillEffects?.drawShadowHits(this.foreground,legacyHits,this.camera);
  // All attack markers share world coordinates; only elites keep world nameplates.
  for(const r of s.reserved||[]){const g=this.warnings,x=sx(r.x??r.position?.x??0),y=sy(r.y??r.position?.y??0);g.strokeColor=C('#d1a574');g.lineWidth=2;g.circle(x,y,28);g.stroke();}
  for(const z of [...(s.zones||[]),...(s.effects||[])]){
   if(z.kind==='heal_pickup'||this.skillEffects?.handles(z))continue;
   const g=z.hostile?this.warnings:this.world;
   const x=sx(z.x??z.fromX??p.x),y=sy(z.y??z.fromY??p.y);if(!Number.isFinite(x+y))continue;
   const hostile=!!z.hostile,active=z.phase==='active';
   g.strokeColor=C(hostile?(active?'#f3b08c':'#e59478'):z.kind==='armor_heal'?'#b8e9bd':'#9ddbd9');g.lineWidth=hostile?3:2;
   g.fillColor=hostile?new Color(210,102,68,active?90:35):new Color(121,207,211,24);
   if(z.shape==='sector'){
    const dir=Math.atan2(z.faceY??0,z.faceX??1),half=(z.angle||90)*Math.PI/360,r=Math.hypot((z.toX??z.x)-z.x,(z.toY??z.y)-z.y)||z.radius;
    g.moveTo(x,y);g.arc(x,y,r,dir-half,dir+half,false);g.close();g.fill();g.stroke();
   }else if(z.shape==='circle'||z.toX===undefined){
    g.circle(x,y,Math.min(480,z.radius||30));g.fill();g.stroke();
   }else{
    const tx=sx(z.toX),ty=sy(z.toY),length=Math.hypot(tx-x,ty-y)||1,r=(z.width||z.radius*2||4)/2,dx=-(ty-y)/length*r,dy=(tx-x)/length*r;
    g.moveTo(x+dx,y+dy);g.lineTo(tx+dx,ty+dy);g.lineTo(tx-dx,ty-dy);g.lineTo(x-dx,y-dy);g.close();g.fill();g.stroke();
    if(z.shape==='capsule'){g.circle(tx,ty,r);g.stroke();}
   }
  }
  g=this.foreground;
  this.stoneArt.beginFrame();
  let li=0;
  const labelParent=this.labels[0]?.node.parent,needed=pickupLabelBudget(s.drops||[],this.camera,W,H);
  while(labelParent&&this.labels.length<needed)this.labels.push(this.label('',labelParent,0,0,200,32,23));
  for(const d of s.drops||[]){
   const age=s.time-(d.bornAt??s.time),bounce=d.receipts&&!d.attracting&&age<.5?Math.sin(Math.PI*Math.max(0,age)/.5)*12:0;
   const x=sx(d.x),y=sy(d.y)+bounce;if(!Number.isFinite(x+y))continue;
   if(Math.abs(x)>W/2+64||Math.abs(y)>H/2+64)continue;
   const heal=(d.kind||d.type)==='heal',core=d.kind==='core';
   if(d.receipts){
    g.fillColor=new Color(22,49,40,90);g.ellipse(x,sy(d.y)-12,14,4);g.fill();
    if(li<this.labels.length){
     const label=this.labels[li++];label.node.active=true;label.fontSize=16;label.lineHeight=20;
     label.node.setPosition(x,y-24);label.color=C('#FFF3C9');
     label.string=core?`${legacyRewardToStones(d.amount)}`:`×${d.amount}`;
    }
   }
   if(core){
    // Legacy reward weights are private simulation units. Crystal denomination
    // comes from the converted amount, never from the slain monster's rank.
    const value=legacyRewardToStones(d.amount),denominations=splitSpiritStones(value),grades:number[]=[];
    for(let grade=0;grade<4;grade++)if(denominations[grade]>0)grades.push(grade);
    for(let i=0;i<grades.length;i++){
     const grade=grades[i],cx=x+(i-(grades.length-1)/2)*32,r=10+grade*2;
     const count=Math.min(5,denominations[grade]);
     for(let piece=0;piece<count;piece++){
      const px=cx+(count===1?0:STONE_PILE[piece][0]);
      const py=y+(count===1?0:STONE_PILE[piece][1]);
      if(this.stoneLayer&&this.stoneArt.draw(this.stoneLayer,`${d.id}:${grade}:${piece}`,grade,px,py,r*2/.75))continue;
      g.fillColor=C(STONE_COLORS[grade]);g.strokeColor=C('#E6F1ED');g.lineWidth=1;
      g.moveTo(px,py+r);g.lineTo(px+7,py+3);g.lineTo(px+6,py-r*.65);
      g.lineTo(px,py-r);g.lineTo(px-6,py-r*.65);g.lineTo(px-7,py+3);g.close();g.fill();g.stroke();
      g.moveTo(px,py+r);g.lineTo(px-2,py+1);g.lineTo(px,py-r);g.stroke();
     }
    }
   }else if(d.kind==='material'){
    if(this.stoneLayer&&this.stoneArt.drawResource(this.stoneLayer,`${d.id}:material`,
     `pill_${d.itemId}` as any,x,y,30))continue;
    g.fillColor=C('#B9D793');g.roundRect(x-10,y-10,20,20,5);g.fill();
   }else if(heal){
    if(this.stoneLayer&&this.stoneArt.drawResource(this.stoneLayer,`${d.id}:heal`,
     'drop_heal',x,y,24))continue;
    g.fillColor=C('#df837c');g.circle(x,y,9);g.fill();
    g.strokeColor=C('#fff3df');g.lineWidth=2;g.moveTo(x-4,y);g.lineTo(x+4,y);g.moveTo(x,y-4);g.lineTo(x,y+4);g.stroke();
   }else if(d.kind==='resource'){
    // XP is already credited by the simulation. This orb is feedback only.
    const r=d.role==='boss'?10:d.role==='elite'?8:5;
    if(this.stoneLayer&&this.stoneArt.drawResource(this.stoneLayer,`${d.id}:xp`,
     'resource_xp_essence',x,y,r*2/.75))continue;
    g.fillColor=C('#BDD68E');g.circle(x,y,r);g.fill();
    g.strokeColor=new Color(233,241,186,170);g.lineWidth=1;g.circle(x,y,r+2);g.stroke();
    g.fillColor=C('#F0F3D3');g.circle(x-r*.25,y+r*.3,Math.max(1,r*.25));g.fill();
   }
  }
  let arrivalRow=0;
  for(const {effect:e,amount} of this.pickupFeedback.sample(s)){
   if(li>=this.labels.length)break;
   const x=sx(p.x)+54,y=sy(p.y)+42+arrivalRow++*26+(s.time-e.startedAt)*24;
   const label=this.labels[li++];label.node.active=true;label.fontSize=18;label.lineHeight=22;
   label.node.setPosition(x+72,y);label.color=C('#FFF3C9');
   label.string=e.lootKind==='core'?`灵石 +${legacyRewardToStones(amount)}`:`${(CAMP_PILLS as any)[e.itemId]?.name||'材料'} +${amount}`;
   if(this.stoneLayer){
    if(e.lootKind==='core')this.stoneArt.draw(this.stoneLayer,`pickup:${e.id}`,0,x-24,y,22);
    else this.stoneArt.drawResource(this.stoneLayer,`pickup:${e.id}`,`pill_${e.itemId}` as any,x-24,y,22);
   }
  }
  this.stoneArt.endFrame();
  // View-owned observations: no monster mutation, wall clock or persisted timers.
  // Observe offscreen enemies too so camera movement never restarts their HP reveal.
  const health=this.enemyHealth??=new Map<any,{hp:number;until:number}>(),live=new Set<any>();
  const damaged:any[]=[];
  const bodyReactions=this.hitArt.bodies;
  for(const e of s.enemies||[]){
   live.add(e.id);const previous=health.get(e.id);
   if(previous&&e.hp>0&&e.hp<previous.hp&&!e.temporary&&!this.monsterMechanics?.isObject(e))damaged.push(e);
   const until=e.hp<(previous?.hp??e.maxHp)?s.time+3:previous?.until??0;
   health.set(e.id,{hp:e.hp,until});
   const art=TowerMonsterArt.artFamily(e.family||e.archetype?.split('_')[0]||'boar',e.archetype);
   const bodyScale=TowerMonsterArt.bodyScale(art,e.role);
   const margin=bodyScale>1?265:90;
   const x=sx(e.x),y=sy(e.y),r=e.radius||18;if(x<-W/2-margin||x>W/2+margin||y<-H/2-margin||y>H/2+margin)continue;
   if(this.monsterMechanics?.isObject(e))continue;
   const family=e.family||e.archetype?.split('_')[0]||'boar',style=FAMILY[family]||FAMILY.boar;
   const size=this.monsterArt.draw(this.monsterLayer,e.id,art,x,y,e.x,p.x,r,{time:s.time,ai:e.ai,worldY:e.y,hp:e.hp,mechanic:e.mechanic,role:e.role});
   if(size)this.monsterMechanics?.styleActor(e,this.monsterLayer.children.find(node=>node.name===`妖兽素材-${e.id}`));
   const impact=bodyReactions.get(e.id);
   if(size&&impact)this.monsterArt.applyImpact(e.id,impact);
   if(!size)this.beast(this.bodyFallbacks.draw(this.monsterLayer,String(e.id),e.y),family,x+(impact?.x||0),y+r*.8+(impact?.y||0),r*bodyScale*(e.mechanic?.enraged?1.2:1),e.temporary?.kind==='clone'?'#B1E0F196':style[1]);
   const extent=size?size/2:r;
   if(e.role==='elite'||e.role==='boss'){
    const fy=y-(['spider-lady','spider-queen','rhino','yak','white-tiger','snake-lady','bear-humanoid','crocodile-humanoid','wolf-humanoid','falcon-humanoid','ape-humanoid','bat-humanoid','boar-humanoid','scorpion-humanoid','centipede-humanoid'].includes(art)?0:extent)-7,d=e.role==='boss'?4:5;
    g.fillColor=C(e.role==='boss'?'#f1bf64':'#dbb0dc');
    g.moveTo(x,fy+d);g.lineTo(x+d,fy);g.lineTo(x,fy-d);g.lineTo(x-d,fy);g.close();g.fill();
   }
   // Telegraph an aimed charge/strike when the combat state exposes it.
   if(e.telegraph||e.ai?.mode==='windup'||e.mode==='windup'){g.strokeColor=C('#eb9c78');g.lineWidth=3;g.circle(x,y,r+18);g.stroke();}
  }
  for(const id of health.keys())if(!live.has(id))health.delete(id);
  // Follow actual damage rather than promoting an idle boss. Keep the current
  // target during area hits; otherwise choose the nearest newly hit monster.
  if(damaged.length&&!damaged.some(e=>e.id===this.attackTargetId)){
   damaged.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
   this.attackTargetId=damaged[0].id;
  }
  if(!(s.enemies||[]).some((e:any)=>e.id===this.attackTargetId&&e.hp>0))this.attackTargetId=null;
  this.monsterArt.endFrame(s.time,new Set((s.killLedger||[]).map(e=>e.id)),(x,y)=>({x:sx(x),y:sy(y)}));this.bodyFallbacks.end();
  this.projectileArt.beginFrame();
  if(this.projectileLayer)this.projectileArt.syncHover(this.projectileLayer,s,this.camera,this.characterArt.visibleFacing);
  for(const b of s.projectiles||[]){
   const x=sx(b.x),y=sy(b.y),r=b.radius||5;if(!Number.isFinite(x+y))continue;
   if(!b.hostile&&(b.bladeKind==='crescent'||b.bladeKind==='cross')){
    if(p.hp>0&&!qiSprites?.has(b.id))this.skillEffects?.drawSwordQi(g,b,s.time,this.camera);
    continue;
   }
   if(this.projectileLayer&&this.projectileArt.draw(this.projectileLayer,b,x,y,s.time,this.camera,g))continue;
   const element=b.hostile?b.element:undefined;
   if(element==='feather'){
    const length=Math.hypot(b.vx,b.vy)||1,dx=b.vx/length,dy=b.vy/length;
    g.fillColor=C('#e8d9b1');g.moveTo(x+dx*r,y+dy*r);
    g.lineTo(x-dy*r*.6,y+dx*r*.6);g.lineTo(x-dx*r,y-dy*r);
    g.lineTo(x+dy*r*.6,y-dx*r*.6);g.close();g.fill();
   }else if(element==='sonic'){
    g.strokeColor=C('#c5a7e8');g.lineWidth=3;g.circle(x,y,r);g.stroke();g.circle(x,y,r*.5);g.stroke();
   }else{
    g.fillColor=C(element==='poison'?'#b9d875':b.hostile?'#f3a08f':'#aadeee');g.circle(x,y,r);g.fill();
    if(element==='poison'){g.fillColor=C('#517945');g.circle(x-r*.25,y+r*.25,r*.3);g.fill();}
   }
  }
  this.projectileArt.endFrame();
  this.monsterMechanics?.draw(s,this.camera,{width:this.width,height:this.height});
  sortTowerDepth(this.monsterLayer);
  if(s.loadout?.ring?.affixes?.some((a:any)=>a.type==='focus')){
   const flash=(s.effects||[]).some((e:any)=>e.weaponFocus);
   for(let i=0;i<4;i++){
    g.fillColor=C(flash||i<(s.weaponState?.focusCount||0)?'#E6D3A6':'#4A625A');
    g.circle(sx(p.x)-15+i*10,sy(p.y)+66,3);g.fill();
   }
   if(flash&&li<this.labels.length){
    const label=this.labels[li++];label.node.active=true;label.fontSize=23;label.lineHeight=28;
    label.node.setPosition(sx(p.x),sy(p.y)+91);label.string='会心';label.color=C('#E6D3A6');
   }
  }
  const armorHeal=(s.effects||[]).find((e:any)=>e.kind==='armor_heal');
  if(armorHeal&&li<this.labels.length){
   const label=this.labels[li++];label.node.active=true;label.fontSize=23;label.lineHeight=28;
   label.node.setPosition(sx(p.x),sy(p.y)+113);
   label.string=`+${Number(armorHeal.amount.toFixed(2))}`;label.color=C('#B8E9BD');
  }
  if(p.hp>0&&li<this.labels.length){
   const activeShield=s.armorState?.shield>0&&s.time<s.armorState.shieldUntil;
   const recovering=s.loadout.armor?.affixes.some((a:any)=>a.type==='safeRecovery')&&s.time-(s.armorState?.lastHitAt??s.time)>=4;
   if(activeShield||recovering){const label=this.labels[li++];label.node.active=true;label.fontSize=18;label.lineHeight=22;
    label.node.setPosition(sx(p.x),sy(p.y)+132);label.color=C(activeShield?'#A8DBE7':'#B8E9BD');
    label.string=activeShield?`护盾 ${Math.ceil(s.armorState.shield)} · ${(s.armorState.shieldUntil-s.time).toFixed(1)}秒`:'凝息 · 回复增强';
   }
  }
  for(;li<this.labels.length;li++)this.labels[li].node.active=false;
  const u=this.ui;
  u.clear();
  u.fillColor=new Color(13,34,30,this.touch===null?55:130);u.circle(this.stick.x,this.stick.y,82);u.fill();
  u.strokeColor=new Color(199,222,208,this.touch===null?65:205);u.lineWidth=3;u.circle(this.stick.x,this.stick.y,72);u.stroke();
  for(let i=0;i<4;i++){const a=i*Math.PI/2;u.moveTo(this.stick.x+Math.cos(a)*86,this.stick.y+Math.sin(a)*86);u.lineTo(this.stick.x+Math.cos(a)*94,this.stick.y+Math.sin(a)*94);}u.stroke();
  u.fillColor=new Color(183,211,195,this.touch===null?85:225);u.circle(this.stick.x+this.stick.dx*52,this.stick.y+this.stick.dy*52,27);u.fill();
  if(this.minimap){this.minimap.clear();drawTowerArenaMap(this.minimap,s,0,0);}
  const c=cultivationAt(p.xp),floor=(FLOORS as any[])[s.floor-1];
  const xpStart=c.xpStart,xpEnd=c.xpEnd;
  this.drawPlayerHp(p.hp/p.maxHp);
  drawPlayerMana(this.battleHud?.manaBar,p.mana/p.maxMana);
  if(this.manaLabel)this.manaLabel.string=`灵力 ${Math.floor(p.mana)}/${Math.round(p.maxMana)}`;
  drawPlayerXp(this.xpBar,(p.xp-xpStart)/(xpEnd-xpStart),c.capped);
  if(this.hpLabel)this.hpLabel.string=`${Math.min(Math.ceil(p.hp),Math.round(p.maxHp))}/${Math.round(p.maxHp)}`;
  this.title!.string=`波次 ${s.wave}/20`;
  if(this.mapName)this.mapName.string=this.training?'演武场':`第${s.floor}层 · ${floor?.name||'锁妖塔'}`;
  this.refreshDeviceStatus();
  const stage=growthStageAt(p.xp);
  this.refreshHudPortrait(stage.realm);
  this.stats!.string=TowerMenu.realmLabel(c,stage);
  const realmPulse=this.levelEffects?.at(-1);this.stats!.color=C(realmPulse&&s.time-realmPulse.started<1.2?'#A56B23':UI.ink);
  if(this.castLabel&&this.castBar){
   const action=s.actions?.current;
   const visible=action&&action.releaseAt-action.startedAt>=.29&&s.time<action.releaseAt;
   this.castLabel.node.active=!!visible;this.castBar.clear();
   if(visible){
    const definition=[...GROWTH_SKILLS,...GROWTH_EVOLUTIONS].find((entry:any)=>entry.id===action.skill);
    this.castLabel.string=`${definition?.name||'施法'}  ${Math.max(0,action.releaseAt-s.time).toFixed(1)}秒`;
    const progress=Math.min(1,Math.max(0,(s.time-action.startedAt)/(action.releaseAt-action.startedAt)));
    this.castBar.fillColor=C('#243C42');this.castBar.rect(-100,-14,200,3);this.castBar.fill();
    this.castBar.fillColor=C('#D6BD7F');this.castBar.rect(-100,-14,200*progress,3);this.castBar.fill();
   }
  }
  const boss=(s.enemies||[]).find((e:any)=>e.id===this.attackTargetId&&e.hp>0);
  if(this.bossPanel)this.bossPanel.active=!!boss;
  if(boss){

   const roleTitle=boss.role==='boss'?'妖王':boss.role==='elite'?'精英':'';
   if(this.targetRoleLabel){
    this.targetRoleLabel.string=roleTitle;this.targetRoleLabel.node.active=!!roleTitle;
    this.targetRoleLabel.color=C(boss.role==='boss'?'#F0C66C':'#D7E2EB');
   }
   if(this.bossLabel){
    this.bossLabel.string=`${boss.name||'妖兽'} · ${boss.rank}阶  ${Math.ceil(boss.hp)}/${Math.round(boss.maxHp)}`;
    this.bossLabel.node.setPosition(roleTitle?25:0,10);
    this.bossLabel.node.getComponent(UITransform)!.setContentSize(roleTitle?250:300,26);
   }
   this.drawBar(this.bossBar,272,5,boss.hp/boss.maxHp,UI.danger);
   if(this.bossBar)this.skillEffects?.drawQingpingBadge(this.bossBar,boss,s.time,-120,-19);
   if(this.bossMechanicLabel)this.bossMechanicLabel.string=boss.role==='boss'?(this.monsterMechanics?.bossStatus(boss,s.time)||''):'';
  }
  const available=growthSummary({...this.store.state,xp:p.xp,skills:{...s.loadout.active,...s.loadout.passive},tutorialWaves:s.loadout.tutorialWaves??this.store.state.tutorialWaves}).available;
  if(this.skillBadge)this.skillBadge.active=available>0;
  this.advanceNotice(s.time);
  this.foot!.string=s.time<this.breakthroughUntil?this.breakthroughText:'';
  if(this.breakthroughEntry)this.breakthroughEntry.active=!this.training&&!this.ritual?.root&&breakthroughReady(s.player.xp);
  const levelEffect=this.levelEffects?.at(-1),levelAge=levelEffect?s.time-levelEffect.started:99;
  if(this.levelLabel){this.levelLabel.node.active=levelAge>=0&&levelAge<1.2&&!this.ritual?.root;
   if(this.levelLabel.node.active){this.levelLabel.string=levelEffect!.name||'境界提升';this.levelLabel.node.setPosition(0,130+Math.min(1,levelAge)*24);this.levelLabel.color=new Color(247,221,161,Math.round(255*Math.min(1,(1.2-levelAge)/.35)));}}

  const materialNotice=this.foot!.string.startsWith('材料 +');
  const noticeBackground=this.noticePanel?.getComponent(Graphics);
  if(noticeBackground)noticeBackground.enabled=!materialNotice;
  this.foot!.color=C(materialNotice?'#FFE3A3':UI.gold);
  const noticeOutline=this.foot!.node.getComponent(LabelOutline);
  if(noticeOutline)noticeOutline.enabled=materialNotice;
  if(this.noticePanel)this.noticePanel.active=!!this.foot!.string;
 }

 private refreshDeviceStatus(){
  if(!this.deviceTime||!this.deviceIcons)return;
  const now=new Date(),time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const status=this.platform.deviceStatus?.()||{network:'unknown',battery:-1,charging:false};
  const stamp=`${time}/${status.network}/${status.battery}/${status.charging}`;
  if(stamp===this.deviceStamp)return;this.deviceStamp=stamp;
  this.deviceTime.string=time;
  const labels:any={wifi:'Wi-Fi',none:'离线','2g':'2G','3g':'3G','4g':'4G','5g':'5G',ethernet:'有线',cellular:'移动'};
  this.deviceNetwork!.string=labels[status.network]||'--';
  this.deviceBattery!.string=status.battery<0?'--':`${status.battery}%`;
  const g=this.deviceIcons;g.clear();g.strokeColor=C('#D4D9C6');g.fillColor=C('#D4D9C6');g.lineWidth=1.8;
  if(status.network==='wifi'){
   for(const r of [5,9,13]){g.moveTo(-46-r*.7,-r*.3);g.quadraticCurveTo(-46,r*.75,-46+r*.7,-r*.3);g.stroke();}
   g.circle(-46,-7,1.7);g.fill();
  }else{
   for(let i=0;i<3;i++){g.rect(-54+i*5,-7,3,5+i*5);}g.stroke();
   if(status.network==='none'||status.network==='unknown'){g.moveTo(-56,-10);g.lineTo(-38,10);g.stroke();}
  }
  g.roundRect(38,-7,21,14,2);g.stroke();g.rect(60,-3,2,6);g.fill();
  if(status.battery>=0){g.fillColor=C(status.battery<=20?'#EF9B83':'#D4D9C6');g.rect(41,-4,15*status.battery/100,8);g.fill();}
  if(status.charging){g.strokeColor=C('#E6C779');g.moveTo(50,11);g.lineTo(45,0);g.lineTo(52,0);g.lineTo(47,-11);g.stroke();}
 }

 private drawLevelEffects(g:Graphics,time:number,x:number,groundY:number){
  this.levelEffects=(this.levelEffects||[]).filter(e=>time>=e.started&&time<e.started+e.duration);
  const reduced=presentationPreferences().reducedMotion;
  if(this.levelBeamLayer)this.levelBeam.draw(this.levelBeamLayer,this.levelEffects.at(-1),time,x,groundY,this.height,reduced);
  for(const effect of this.levelEffects){
   const age=time-effect.started,t=age/effect.duration,burst=Math.max(0,(t-.25)/.75),strength=effect.strong?1.35:1;
   if(t>=.25||reduced){
    const radius=(reduced?38:18+105*(1-(1-burst)*(1-burst)))*strength;
    g.strokeColor=new Color(240,217,154,Math.round(210*(1-burst)));g.lineWidth=effect.strong?3:2;
    g.ellipse(x,groundY+2,radius,radius*.34);g.stroke();
    g.strokeColor=new Color(156,218,193,Math.round(140*(1-burst)));g.ellipse(x,groundY+2,radius*.74,radius*.25);g.stroke();
   }
   const count=reduced?8:effect.strong?30:22;
   for(let i=0;i<count;i++){
    // Stable per-event samples: scattered volume, independent travel times, no ring.
    const sample=(salt:number)=>{
     const n=Math.sin((i+1)*127.1+effect.started*17.7+salt*311.7)*43758.5453;
     return n-Math.floor(n);
    };
    const angle=sample(1)*Math.PI*2,radius=24+Math.sqrt(sample(2))*120;
    const delay=sample(3)*.2,duration=.3+sample(4)*.45;
    const progress=reduced?0:Math.max(0,Math.min(1,(age-delay)/duration));
    const remaining=1-progress*progress;
    const px=x+Math.cos(angle)*radius*remaining;
    const py=groundY+42+(Math.sin(angle)*radius*.7+sample(5)*22-11)*remaining;
    const alpha=reduced?1-t:1-progress;
    g.fillColor=new Color(233,222,169,Math.round(230*alpha));g.circle(px,py,1.4+sample(6)*1.6);g.fill();
   }
  }
 }
 private drawPlayer(g:Graphics,s:any,px:number,groundY:number){
  const p=s.player,flying=(s.loadout?.passive?.sj_flight||0)>0;
  const motion=this.playerMotion,walking=!flying&&!!motion?.moving;
  const stride=walking?Math.sin(motion.distance/12):0;
  // Ground stays fixed. Only the visible body and sword bob when flight is learned.
  const py=groundY+20+(flying?7+Math.sin(s.time*3)*2:0);
  g.fillColor=new Color(31,58,49,150);g.ellipse(px,groundY,flying?29:20,6);g.fill();

  if(this.characterLayer&&this.characterArt.draw(this.characterLayer,s,px,groundY,flying))return;
  if(!flying){
   g.strokeColor=C('#647D87');g.lineWidth=7;
   for(const side of [-1,1]){
    const step=stride*side,footX=px+side*8+step*6,footY=groundY+Math.max(0,step)*3;
    g.moveTo(px+side*7,py-7);g.lineTo(footX,footY+3);g.stroke();
    g.fillColor=C('#D9E6E6');g.ellipse(footX+2,footY+1,7,3);g.fill();
   }
  }
  g.fillColor=C('#d9e6e6');g.moveTo(px-14,py+4);g.lineTo(px+14,py+4);g.lineTo(px+23,py-12);g.lineTo(px-23,py-12);g.close();g.fill();
  g.fillColor=C('#8db5c8');g.roundRect(px-14,py-5,28,34,7);g.fill();
  g.fillColor=C('#eee7d4');g.circle(px,py+35,14);g.fill();
  g.fillColor=C('#d7e4e4');g.arc(px,py+40,16,0,Math.PI,false);g.fill();g.circle(px-10,py+54,7);g.fill();
  const face=p.faceX<0?-1:1;g.fillColor=C('#244f62');g.circle(px+face*6,py+36,2.5);g.fill();
  const weapon=s.loadout?.weapon,wid=weapon?.definitionId||s.loadout?.weaponId||'';
  const wc='#dce4e6';
  const broad=['zhenyue','xuanjun','tianshu','taiheng','dingyue','panxi','xingluo','shoushan'].some(id=>wid.includes(id));
  const reach=isStarterEquipment(weapon)?31:broad?39:48;
  g.fillColor=C(wc);g.moveTo(px+face*(broad?10:13),py+20);g.lineTo(px+face*reach,py+reach+6);g.lineTo(px+face*(broad?23:18),py+15);g.close();g.fill();
  g.strokeColor=C('#d6bd7f');g.lineWidth=3;g.moveTo(px+face*9,py+20);g.lineTo(px+face*23,py+12);g.stroke();
 }
 private beast(g:Graphics,f:string,x:number,y:number,r:number,color:string){
  if(TowerMonsterArt.drawHornedFallback(g,f,x,y,r))return;
  g.fillColor=C(color);g.strokeColor=C(color);g.lineWidth=3;
  if(f==='spider'||f==='scorpion'||f==='centipede'){
   for(let i=-1;i<=1;i++){g.moveTo(x-r*.3,y+i*r*.5);g.lineTo(x-r*1.2,y+(i+.3)*r);g.moveTo(x+r*.3,y+i*r*.5);g.lineTo(x+r*1.2,y+(i+.3)*r);}g.stroke();
   g.ellipse(x,y,r*.65,r);g.fill();if(f==='scorpion'){g.moveTo(x,y+r*.5);g.quadraticCurveTo(x+r*1.3,y+r*1.9,x+r,y+r*.5);g.stroke();}
  }else if(f==='bat'||f==='falcon'){
   g.moveTo(x,y+r*.7);g.lineTo(x-r*1.6,y+r);g.lineTo(x-r*.5,y-r*.6);g.lineTo(x,y-r);g.lineTo(x+r*.5,y-r*.6);g.lineTo(x+r*1.6,y+r);g.close();g.fill();
  }else if(f==='snake'||f==='crocodile'){g.roundRect(x-r*1.3,y-r*.55,r*2.6,r*1.1,r*.5);g.fill();g.moveTo(x-r,y);g.lineTo(x-r*1.9,y-r*.5);g.stroke();}
  else{g.ellipse(x,y,r,r*.85);g.fill();g.circle(x-r*.6,y+r*.6,r*.35);g.circle(x+r*.6,y+r*.6,r*.35);g.fill();if(f==='boar'){g.fillColor=C('#e0d3b4');g.moveTo(x-r*.7,y-r*.3);g.lineTo(x-r*.9,y-r);g.lineTo(x-r*.2,y-r*.5);g.close();g.fill();}}
  g.fillColor=C('#26322f');g.circle(x-r*.28,y+r*.12,Math.max(2,r*.09));g.circle(x+r*.28,y+r*.12,Math.max(2,r*.09));g.fill();
 }
 destroy(){
  this.levelBeam.destroy();this.levelBeamLayer=null;
  if(this.disposed)return;this.hide();this.disposed=true;this.resetInput();
  if(typeof window!=='undefined')window.removeEventListener('keydown',this.preventMenuKeyDefault,true);
  this.keyboardNavigation.clear();
  input.off(Input.EventType.KEY_DOWN,this.keyDown);input.off(Input.EventType.KEY_UP,this.keyUp);
  if(typeof window!=='undefined'){window.removeEventListener('focus',this.shown);window.removeEventListener('blur',this.hide);window.removeEventListener('pagehide',this.hide);document.removeEventListener('visibilitychange',this.visibility);delete (window as any).__towerTest;}
  this.battleHud?.dispose();this.battleHud=null;
  this.shadowArt.destroy();this.shadowLayer=null;
  this.monsterMechanics?.destroy();this.monsterMechanics=null;
  this.clearBattleFeedback();this.ritual?.destroy();this.ritualAudio.destroy();this.skillEffects=null;this.flightSwordArt.destroy();this.flightArt.destroy();this.flightLayer=null;this.ningshenArt.destroy();this.ningshenLayer=null;this.jianguArt.destroy();this.jianguLayer=null;this.bumieArt.destroy();this.bumieLayer=null;this.jianxinArt.destroy();this.jianxinLayer=null;this.arcArt.destroy();this.arcLayer=null;this.qingpingAudio.destroy();this.burstArt.destroy();this.burstLayer=null;this.convergenceArt.destroy();this.convergenceLayer=null;this.lineArt.destroy();this.lineLayer=null;this.tiandiArt.destroy();this.tiandiLayer=null;this.crossBurstArt.destroy();this.qiArt.destroy();this.qiLayer=null;this.orbitArt.destroy();this.formationArt.destroy();this.sixiangArt.destroy();this.formationLayer=null;this.bodyFallbacks.clear();this.environmentArt.destroy();this.hudArt.destroy();this.stoneArt.destroy();this.projectileArt.destroy();this.monsterArt.destroy();this.characterArt.destroy();this.platform.destroy();this.menu?.destroy();this.root.destroy();
  this.portraitGraphics=null;this.portraitRealm='';
 }
}
