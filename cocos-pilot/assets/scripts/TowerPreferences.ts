import { sys } from 'cc';

const KEY='xianxia.presentation.v1';
type Preferences={soundVolume:number;reducedMotion:boolean;playerDamageNumbers:boolean};
const defaults:Preferences={soundVolume:1,reducedMotion:false,playerDamageNumbers:true};
let current:Preferences|null=null;
export function presentationPreferences():Readonly<Preferences>{
 if(!current){
  let saved:any={};try{saved=JSON.parse(sys.localStorage.getItem(KEY)||'{}')||{};}catch{}
  current={soundVolume:Number.isFinite(saved.soundVolume)?Math.max(0,Math.min(1,saved.soundVolume)):defaults.soundVolume,
   reducedMotion:saved.reducedMotion===true,playerDamageNumbers:saved.playerDamageNumbers!==false};
 }
 return current;
}
export function setPresentationPreference(patch:Partial<Preferences>):boolean{
 const next={...presentationPreferences(),...patch};
 next.soundVolume=Number.isFinite(next.soundVolume)?Math.max(0,Math.min(1,next.soundVolume)):1;
 next.reducedMotion=next.reducedMotion===true;
 next.playerDamageNumbers=next.playerDamageNumbers!==false;
 try{sys.localStorage.setItem(KEY,JSON.stringify(next));}catch{return false;}
 current=next;return true;
}
