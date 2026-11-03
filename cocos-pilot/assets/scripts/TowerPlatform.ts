import { presentationPreferences } from './TowerPreferences';
import {game,Game,sys} from 'cc';
import {computeSafeArea} from './shared/js/xianxia/SafeArea';
export type SafeInsets={safeTop:number,safeBottom:number,safeLeft:number,safeRight:number};
// wx 气血周期、安全区、震动与存储适配（03 §6.1）。安全区数学在 SafeArea 纯函数里（裁决 D18），
// 这里只取 wx 原始值；开发者工具/浏览器取不到时 computeSafeArea 回退默认值（02 §2.1）。
export class TowerPlatform{
 readonly storage:any;
 private hideFns:Array<()=>void>=[];private showFns:Array<()=>void>=[];
 constructor(host:any){this.storage=host?.progressStorage||sys.localStorage;game.on(Game.EVENT_HIDE,this.onHide,this);game.on(Game.EVENT_SHOW,this.onShow,this)}
 private get wx():any{return (globalThis as any).wx}
 safeArea():SafeInsets{
  let info:any=null,capsule:any=null;
  try{const api=this.wx;info=api?.getWindowInfo?.()||api?.getSystemInfoSync?.()||null;capsule=api?.getMenuButtonBoundingClientRect?.()||null}catch{info=capsule=null}
  return computeSafeArea(info,capsule) as SafeInsets;
 }
 // Cache device reads independently from simulation speed; no per-frame API calls.
 private statusAt=-Infinity;
 private device={network:'unknown',battery:-1,charging:false};
 deviceStatus(){
  const now=Date.now();
  if(now-this.statusAt>=15000){
   this.statusAt=now;
   const api=this.wx,nav=(globalThis as any).navigator;
   const battery=(level:number,charging:boolean)=>{this.device.battery=Number.isFinite(level)&&level>=0&&level<=100?Math.round(level):-1;this.device.charging=!!charging;};
   if(api){
    try{api.getNetworkType?.({success:(r:any)=>{this.device.network=r.networkType||'unknown';},fail:()=>{this.device.network='unknown';}});}catch{this.device.network='unknown';}
    try{api.getBatteryInfo?.({success:(r:any)=>battery(r.level,r.isCharging),fail:()=>battery(-1,false)});}catch{battery(-1,false);}
   }else if(nav){
    this.device.network=nav.onLine===false?'none':nav.connection?.type||'unknown';
    try{nav.getBattery?.().then((r:any)=>battery(r.level*100,r.charging)).catch(()=>battery(-1,false));}catch{battery(-1,false);}
   }
  }
  return {...this.device};
 }
 // 02 §5.3：先判断接口存在，失败静默。频率限制：任意两次间隔 ≥ 120ms，light 之间 ≥ 300ms（连续受伤/连升不连震）。
 private vibeAt=-1e9;private lightAt=-1e9;
 vibrate(type:'light'|'medium'|'heavy'){
  if(presentationPreferences().reducedMotion)return;
  const now=Date.now();if(now-this.vibeAt<120||(type==='light'&&now-this.lightAt<300))return;
  this.vibeAt=now;if(type==='light')this.lightAt=now;
  try{const api=this.wx;if(api&&typeof api.vibrateShort==='function')api.vibrateShort({type,fail(){}})}catch{}
 }
 onHidden(fn:()=>void){this.hideFns.push(fn)}
 onShown(fn:()=>void){this.showFns.push(fn)}
 private onHide(){for(const fn of this.hideFns)fn()}
 private onShow(){for(const fn of this.showFns)fn()}
 destroy(){game.off(Game.EVENT_HIDE,this.onHide,this);game.off(Game.EVENT_SHOW,this.onShow,this);this.hideFns=[];this.showFns=[]}
}
