import {Asset,AudioClip,resources} from 'cc';
import {AssetDiagnosticObserver,BindingOptions,TowerAssetQueue} from './TowerAssetQueue';

let session:TowerAssetQueue|null=null;
let diagnostic:AssetDiagnosticObserver|undefined;
let audioToken=0;
export function beginTowerResources(observer?:AssetDiagnosticObserver){
 session?.dispose();diagnostic=observer;audioToken=0;
 return session=new TowerAssetQueue((path,type,complete)=>resources.load(path,type,complete),observer);
}
export function endTowerResources(queue:TowerAssetQueue){
 if(session===queue){session=null;diagnostic=undefined;}
 queue.dispose();
}
/** Preserve the resources.load call shape and typed callbacks in art renderers. */
export const towerResources={
 getInfoWithPath:resources.getInfoWithPath.bind(resources),
 load<T extends Asset>(path:string,type:new(...args:any[])=>T,complete:(error:Error|null,asset:T)=>void,options:BindingOptions={}){
  // Missing optional sound must never prevent entering the game.
  if(!session||(type as unknown)===AudioClip){
   const observer=diagnostic;
   if(!observer||(type as unknown)!==AudioClip){resources.load(path,type,complete);return;}
   const token=++audioToken;
   const observe=(status:'start'|'ready'|'failed')=>{try{observer({stage:'optional-audio',status,path,type:'AudioClip',attempt:1,token});}catch{}};
   observe('start');let callbackEntered=false;
   try{resources.load(path,type,(error,asset)=>{callbackEntered=true;observe(error||!asset?'failed':'ready');complete(error,asset);});}
   catch(error){if(!callbackEntered)observe('failed');throw error;}
   return;
  }
  session.load(path,type,complete,options);
 }
};
