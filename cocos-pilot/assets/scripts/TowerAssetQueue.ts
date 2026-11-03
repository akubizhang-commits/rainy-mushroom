type AssetValue = {addRef():unknown;decRef():unknown};
type Complete = (error:any,asset:any)=>void;
/** Opt in only after the binding is transactional, or provide complete cleanup.
 * rollback runs immediately after each throw. A cleanup throw disables retry.
 * Unannotated bindings require a full runtime restart after failure: never replay unknown
 * side effects such as addRef(), GPU allocations or partially created nodes. */
export type BindingOptions = {retryable?:boolean;rollback?:()=>void};
type Binding = {
 complete:Complete;options:BindingOptions;status:'pending'|'running'|'failed';retryable:boolean;
};
type Entry = {
 path:string;type:any;status:'pending'|'ready'|'failed';asset?:AssetValue;
 bindings:Binding[];attempt:number;token:number;timer:any;
};
export type LoadingState = {pending:number;failed:number;completed:number;total:number;restartRequired:number};

/** One host lifetime; transport completion and binding completion are separate. */
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
  let pending=0,failed=0,completed=0,restartRequired=0;
  for(const e of this.batch){
   const broken=e.bindings.filter(b=>b.status==='failed');
   if(e.status==='failed'||broken.length)failed++;
   else if(e.status==='pending'||e.bindings.length)pending++;
   else completed++;
   if(broken.some(b=>!b.retryable))restartRequired++;
  }
  return {pending,failed,completed,total:this.batch.length,restartRequired};
 }
 load(path:string,type:any,complete:Complete,options:BindingOptions={}){
  if(this.dead)return;
  let group=this.entries.get(type);
  if(!group){group=new Map();this.entries.set(type,group);}
  let e=group.get(path);
  const fresh=!e;
  if(!e){
   e={path,type,status:'pending',bindings:[],attempt:0,token:0,timer:null};
   group.set(path,e);
  }
  const binding:Binding={complete,options,status:'pending',retryable:false};
  const adopted=this.track(e);
  e.bindings.push(binding);
  this.emit();
  if(e.asset)this.bind(e,binding);
  else if(fresh||(adopted&&e.status==='failed')){
   e.status='pending';e.attempt=0;this.start(e);
  }
 }
 retryFailed(){
  if(this.dead)return;
  for(const e of [...this.batch]){
   if(e.status==='failed'){
    e.status='pending';e.attempt=0;this.start(e);
   }else if(e.asset){
    for(const binding of [...e.bindings])if(binding.status==='failed'&&binding.retryable){
     binding.status='pending';this.bind(e,binding);
    }
   }
  }
  this.emit();
 }
 dispose(){
  if(this.dead)return;
  this.dead=true;this.onChange=null;
  for(const group of this.entries.values())for(const e of group.values()){
   clearTimeout(e.timer);e.bindings=[];e.asset?.decRef();
  }
  this.entries.clear();this.batch=[];
 }
 private track(e:Entry){
  if(!this.blocking||this.batch.includes(e))return false;
  if(!this.state.pending&&!this.state.failed)this.batch=[];
  this.batch.push(e);return true;
 }
 private emit(){if(!this.dead)this.onChange?.(this.state);}
 private bind(e:Entry,binding:Binding){
  if(this.dead||binding.status!=='pending')return;
  binding.status='running';
  try{
   binding.complete(null,e.asset);
   // Drop successful callback closures; another binding's retry never repeats it.
   const index=e.bindings.indexOf(binding);
   if(index>=0)e.bindings.splice(index,1);
  }catch(error){
   binding.status='failed';binding.retryable=binding.options.retryable===true;
   if(binding.options.rollback){
    try{binding.options.rollback();binding.retryable=true;}
    catch(cleanupError){
     binding.retryable=false;
     console.error(`[TowerAssets] ${e.path}: binding cleanup failed; restart required`,cleanupError);
    }
   }
   console.error(`[TowerAssets] ${e.path}: binding failed${binding.retryable?'':' ; restart required'}`,error);
  }
  this.emit();
 }
 private start(e:Entry){
  if(this.dead)return;
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
   asset.addRef();e.asset=asset;e.status='ready';
   // Running bindings remain pending, including while they request dependencies.
   for(const binding of [...e.bindings])this.bind(e,binding);
   this.emit();
  };
  e.timer=setTimeout(()=>finish(new Error('Resource load timed out'),null),15000);
  try{this.transport(e.path,e.type,finish);}catch(error){finish(error,null);}
 }
}
