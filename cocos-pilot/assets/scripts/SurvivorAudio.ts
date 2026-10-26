import {Node,AudioSource,AudioClip,AssetManager,input,Input} from 'cc';
// 音效加载、并发与频率限制、静音（03 §6.4，08 P4）。
// - 资源：survivor 分包 audio/<id>（scripts/survivor/gen-sfx.mjs 程序化生成）；
// - 6 个 AudioSource 轮转；每种音效有最小间隔与同类并发上限，超出直接丢弃（数百次命中/净化不会挤爆音频）；
// - settings.sound=false 时不播放并立即停掉在播的；切后台 suspend() 停掉全部并拒绝新播放，回前台 resume()；
// - 首次触摸后才播放（浏览器自动播放策略）；加载失败静默降级，console.warn 一次。
// 只由 SurvivorView 驱动（读 drainEvents），不碰逻辑层。
export type SfxId='pickup'|'purify'|'hit'|'hurt'|'levelup'|'boss_warn'|'boss_appear'|'boss_charge'|'win'|'click';
// gap = 同类最小间隔（ms），max = 同类同时在播上限，vol = 音量
const RULES:Record<SfxId,{gap:number,max:number,vol:number}>={
 pickup:{gap:50,max:2,vol:.5},
 purify:{gap:40,max:3,vol:.45},
 hit:{gap:60,max:2,vol:.35},
 hurt:{gap:150,max:1,vol:.7},
 levelup:{gap:250,max:1,vol:.7},
 boss_warn:{gap:500,max:1,vol:.8},
 boss_appear:{gap:500,max:1,vol:.85},
 boss_charge:{gap:300,max:1,vol:.6},
 win:{gap:500,max:1,vol:.8},
 click:{gap:60,max:1,vol:.5},
};
const IDS=Object.keys(RULES) as SfxId[];
const VOICES=6;
type Voice={src:AudioSource,id:SfxId|null,endAt:number};
export class SurvivorAudio{
 private node:Node;private voices:Voice[]=[];private next=0;
 private clips:Partial<Record<SfxId,AudioClip>>={};private lastAt:Partial<Record<SfxId,number>>={};
 private enabled=true;private suspended=false;private unlocked=false;private warned=false;private disposed=false;
 constructor(parent:Node){
  this.node=new Node('Survivor audio');parent.addChild(this.node);
  for(let i=0;i<VOICES;i++){const src=this.node.addComponent(AudioSource);src.playOnAwake=false;src.loop=false;this.voices.push({src,id:null,endAt:0})}
  input.on(Input.EventType.TOUCH_START,this.unlock,this);input.on(Input.EventType.MOUSE_DOWN,this.unlock,this);
 }
 private unlock(){this.unlocked=true;input.off(Input.EventType.TOUCH_START,this.unlock,this);input.off(Input.EventType.MOUSE_DOWN,this.unlock,this)}
 private warn(error:any){if(!this.warned){this.warned=true;console.warn('[SurvivorAudio] 音效加载失败，静默降级',error)}}
 // 单个失败不影响其它音效；全部失败也不抛错（03 §8：可恢复，该音效静默）
 async load(bundle:AssetManager.Bundle){
  // 重试加载时只补缺失的，避免重复 addRef
  await Promise.all(IDS.filter(id=>!this.clips[id]).map(id=>new Promise<void>(ok=>bundle.load(`audio/${id}`,AudioClip,(e,clip)=>{
   if(e||!clip)this.warn(e);else if(!this.disposed){clip.addRef();this.clips[id]=clip}
   ok();
  }))));
 }
 setEnabled(on:boolean){this.enabled=on;if(!on)this.stopAll()}
 suspend(){this.suspended=true;this.stopAll()}
 resume(){this.suspended=false}
 play(id:SfxId){
  if(!this.enabled||this.suspended||!this.unlocked||this.disposed)return;
  const clip=this.clips[id];if(!clip)return;
  const rule=RULES[id],now=Date.now();
  if(now-(this.lastAt[id]??-1e9)<rule.gap)return;
  let busy=0;for(const v of this.voices)if(v.id===id&&v.endAt>now)busy++;
  if(busy>=rule.max)return;
  // 优先空闲声道；都忙时轮转抢占最早开始的那个
  let voice:Voice|null=null;
  for(let i=0;i<VOICES;i++){const v=this.voices[(this.next+i)%VOICES];if(v.endAt<=now){voice=v;break}}
  if(!voice)voice=this.voices[this.next];
  this.next=(this.voices.indexOf(voice)+1)%VOICES;
  this.lastAt[id]=now;voice.id=id;voice.endAt=now+Math.max(30,clip.getDuration()*1000);
  try{voice.src.stop();voice.src.clip=clip;voice.src.volume=rule.vol;voice.src.play()}catch(error){this.warn(error)}
 }
 // 逻辑事件 → 音效（03 drainEvents 事件表）
 event(e:any){
  switch(e.type){
   case 'pickup':this.play('pickup');break;
   case 'purified':this.play('purify');break;
   case 'hit':this.play('hit');break;
   case 'playerHurt':this.play('hurt');break;
   case 'levelUp':this.play('levelup');break;
   case 'bossWarning':this.play('boss_warn');break;
   case 'bossSpawn':this.play('boss_appear');break;
   case 'bossCharge':case 'eliteCharge':this.play('boss_charge');break;
   case 'eliteSpawn':this.play('boss_warn');break;
   case 'evolved':this.play('levelup');break;
   case 'won':this.play('win');break;
  }
 }
 private stopAll(){for(const v of this.voices){v.endAt=0;v.id=null;try{v.src.stop()}catch{}}}
 destroy(){
  if(this.disposed)return;this.disposed=true;this.stopAll();
  input.off(Input.EventType.TOUCH_START,this.unlock,this);input.off(Input.EventType.MOUSE_DOWN,this.unlock,this);
  for(const id of IDS){this.clips[id]?.decRef();}this.clips={};
  this.node.destroy();
 }
}
