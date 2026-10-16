import {game,Game,sys} from 'cc';
import {computeSafeArea} from './shared/js/survivor/SafeArea';
export type SafeInsets={safeTop:number,safeBottom:number,safeLeft:number,safeRight:number};
// wx 生命周期、安全区、震动与存储适配（03 §6.1）。安全区数学在 SafeArea 纯函数里（裁决 D18），
// 这里只取 wx 原始值；开发者工具/浏览器取不到时 computeSafeArea 回退默认值（02 §2.1）。
export class SurvivorPlatform{
 readonly storage:any;
 private hideFns:Array<()=>void>=[];private showFns:Array<()=>void>=[];
 constructor(host:any){this.storage=host?.progressStorage||sys.localStorage;game.on(Game.EVENT_HIDE,this.onHide,this);game.on(Game.EVENT_SHOW,this.onShow,this)}
 private get wx():any{return (globalThis as any).wx}
 safeArea():SafeInsets{
  let info:any=null,capsule:any=null;
  try{const api=this.wx;info=api?.getWindowInfo?.()||api?.getSystemInfoSync?.()||null;capsule=api?.getMenuButtonBoundingClientRect?.()||null}catch{info=capsule=null}
  return computeSafeArea(info,capsule) as SafeInsets;
 }
 // 02 §5.3：先判断接口存在，失败静默。
 vibrate(type:'light'|'medium'|'heavy'){try{const api=this.wx;if(api&&typeof api.vibrateShort==='function')api.vibrateShort({type,fail(){}})}catch{}}
 onHidden(fn:()=>void){this.hideFns.push(fn)}
 onShown(fn:()=>void){this.showFns.push(fn)}
 private onHide(){for(const fn of this.hideFns)fn()}
 private onShow(){for(const fn of this.showFns)fn()}
 destroy(){game.off(Game.EVENT_HIDE,this.onHide,this);game.off(Game.EVENT_SHOW,this.onShow,this);this.hideFns=[];this.showFns=[]}
}
