import {Asset,AudioClip,resources} from 'cc';
import {TowerAssetQueue} from './TowerAssetQueue';

let session:TowerAssetQueue|null=null;
export function beginTowerResources(){
 session?.dispose();
 return session=new TowerAssetQueue((path,type,complete)=>resources.load(path,type,complete));
}
export function endTowerResources(queue:TowerAssetQueue){
 if(session===queue)session=null;
 queue.dispose();
}
/** Preserve the resources.load call shape and typed callbacks in art renderers. */
export const towerResources={
 getInfoWithPath:resources.getInfoWithPath.bind(resources),
 load<T extends Asset>(path:string,type:new(...args:any[])=>T,complete:(error:Error|null,asset:T)=>void){
  // Missing optional sound must never prevent entering the game.
  if(!session||(type as unknown)===AudioClip){resources.load(path,type,complete);return;}
  session.load(path,type,complete);
 }
};
