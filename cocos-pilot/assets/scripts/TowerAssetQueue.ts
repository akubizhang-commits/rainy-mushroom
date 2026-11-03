type AssetValue = {addRef():unknown;decRef():unknown};
type Complete = (error:any,asset:any)=>void;
type Entry = {
 path:string;type:any;status:'pending'|'ready'|'failed';asset?:AssetValue;
 callbacks:Complete[];attempt:number;token:number;timer:any;
};
export type LoadingState = {pending:number;failed:number;completed:number;total:number};

/** One host lifetime. Failed bindings remain pending until retry succeeds. */
export class TowerAssetQueue {
 private entries=new Map<any,Map<string,Entry>>();
 private dead=false;
 private batch:Entry[]=[];
 private blocking=true;
 onChange:((state:LoadingState)=>void)|null=null;
 constructor(private transport:(path:string,type:any,complete:Complete)=>void){}
 beginBlocking(){
  if(this.dead||this.blocking)return;
  this.blocking=true;this.batch=[];this.emit();
 }
 endBlocking(){this.blocking=false;this.batch=[];this.emit();}
 get state():LoadingState{
  let pending=0,failed=0,completed=0;
  for(const e of this.batch){
   if(e.status==='pending')pending++;
   else if(e.status==='failed')failed++;
   else completed++;
  }
  return {pending,failed,completed,total:this.batch.length};
 }
 load(path:string,type:any,complete:Complete){
  if(this.dead)return;
  let group=this.entries.get(type);
  if(!group){group=new Map();this.entries.set(type,group);}
  let e=group.get(path);
  if(e){
   if(e.status==='ready')complete(null,e.asset);
   else {
    e.callbacks.push(complete);
    if(this.blocking&&!this.batch.includes(e)){
     this.batch.push(e);
     if(e.status==='failed'){e.status='pending';e.attempt=0;this.start(e);}
     this.emit();
    }
   }
   return;
  }
  if(!this.state.pending&&!this.state.failed)this.batch=[];
  e={path,type,status:'pending',callbacks:[complete],attempt:0,token:0,timer:null};
  group.set(path,e);if(this.blocking)this.batch.push(e);this.emit();this.start(e);
 }
 retryFailed(){
  if(this.dead)return;
  for(const e of this.batch)if(e.status==='failed'){
   e.status='pending';e.attempt=0;this.start(e);
  }
  this.emit();
 }
 dispose(){
  this.dead=true;this.onChange=null;
  for(const group of this.entries.values())for(const e of group.values()){
   clearTimeout(e.timer);e.callbacks=[];e.asset?.decRef();
  }
  this.entries.clear();this.batch=[];
 }
 private emit(){this.onChange?.(this.state);}
 private start(e:Entry){
  const token=++e.token;e.attempt++;
  let settled=false;
  const finish=(error:any,asset:any)=>{
   if(this.dead||settled||token!==e.token)return;
   settled=true;clearTimeout(e.timer);
   if(error||!asset){
    if(e.attempt<3)e.timer=setTimeout(()=>this.start(e),400*e.attempt);
    else {e.status='failed';console.warn(`[TowerAssets] ${e.path}: resource unavailable`,error);}
    this.emit();return;
   }
   asset.addRef();e.asset=asset;
   // Keep this entry pending while callbacks request dependent images/metadata.
   const callbacks=e.callbacks.splice(0);
   for(const callback of callbacks){
    try{callback(null,asset);}catch(error){console.error(`[TowerAssets] ${e.path}: binding failed`,error);}
   }
   e.status='ready';this.emit();
  };
  e.timer=setTimeout(()=>finish(new Error('Resource load timed out'),null),15000);
  try{this.transport(e.path,e.type,finish);}catch(error){finish(error,null);}
 }
}
