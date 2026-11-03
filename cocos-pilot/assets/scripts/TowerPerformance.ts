import {resourceGroup} from './shared/js/xianxia/TowerResourceGroups';

export type PerformanceOptions={clock?:()=>number;heap?:()=>number|null;frameCapacity?:number;cpuCapacity?:number;eventCapacity?:number;memoryCapacity?:number;environment?:string};
export type ResourceDiagnostic={stage:'transport'|'binding'|'lifetime'|'optional-audio';status:'start'|'ready'|'failed'|'released';path:string;type:string;attempt:number;token:number;retryable?:boolean;width?:number;height?:number};
const scenarios=['startup','camp','ordinary-battle','many-enemies','multi-skill','dense-effects','long-session','battle-cycles','scene-switch','background-resume','network-failure','storage-failure'];
const segments=['update','simulation','snapshot','persist','draw'];
const defaultClock=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();
const defaultHeap=()=>{const value=(globalThis as any).performance?.memory?.usedJSHeapSize;return typeof value==='number'&&Number.isFinite(value)?value:null;};
function capacity(value:number|undefined,fallback:number,limit:number){return Number.isInteger(value)&&value!>=1?Math.min(value!,limit):fallback;}
function quantiles(values:number[]){
 if(!values.length)return {count:0,p50:null,p95:null,p99:null,max:null};
 values.sort((a,b)=>a-b);const at=(p:number)=>values[Math.max(0,Math.ceil(values.length*p)-1)];
 return {count:values.length,p50:at(.5),p95:at(.95),p99:at(.99),max:values[values.length-1]};
}
/** QA only. Fixed storage records the first N samples, with explicit dropped counts.
 * Export allocation happens only on a manual snapshot/stop, never in the frame loop. */
export class TowerPerformance {
 private running=false;private dead=false;private scenario='startup';private started=0;private stopped:number|null=null;
 private lastFrame:number|null=null;private hidden=false;private resumed=false;private lastHeap=-Infinity;
 private frameCount=0;private cpuCount=0;private memoryCount=0;
 private dropped={frames:0,cpu:0,events:0,resources:0,memory:0,images:0};
 private frames:Float64Array;private cpu:Float64Array;private cpuKinds:Uint8Array;private memory:Float64Array;
 private events:Array<{atMs:number;kind:string}>=[];private resources:any[]=[];
 private images=new Map<string,{path:string;type:string;width:number|null;height:number|null;group:string}>();
 private installedTarget:any=null;private installedApi:any=null;
 private clockSource:string;private clock:()=>number;private heap:()=>number|null;private environment:string;
 readonly frameCapacity:number;readonly cpuCapacity:number;readonly eventCapacity:number;readonly memoryCapacity:number;
 constructor(options:PerformanceOptions={}){
  this.frameCapacity=capacity(options.frameCapacity,60000,120000);this.cpuCapacity=capacity(options.cpuCapacity,180000,360000);
  this.eventCapacity=capacity(options.eventCapacity,4096,16384);this.memoryCapacity=capacity(options.memoryCapacity,7500,14400);
  this.frames=new Float64Array(this.frameCapacity*4);this.cpu=new Float64Array(this.cpuCapacity*2);this.cpuKinds=new Uint8Array(this.cpuCapacity);this.memory=new Float64Array(this.memoryCapacity*2);
  this.clockSource=options.clock?'injected clock':typeof performance!=='undefined'&&typeof performance.now==='function'?'performance.now':'Date.now wall-clock fallback';
  this.clock=options.clock||defaultClock;this.heap=options.heap||defaultHeap;
  this.environment=['browser-local','mini-game-unverified'].includes(options.environment||'')?options.environment!:'unknown';
 }
 private now(){try{const n=this.clock();return Number.isFinite(n)?n:0;}catch{return 0;}}
 get active(){return this.running&&!this.dead;}
 start(scenario:string){
  if(this.dead)throw Error('Performance sampler was destroyed');
  if(!scenarios.includes(scenario))throw Error('Unknown performance scenario');
  this.scenario=scenario;this.started=this.now();this.stopped=null;this.frameCount=0;this.cpuCount=0;this.memoryCount=0;
  this.events=[];this.resources=[];this.dropped={frames:0,cpu:0,events:0,resources:0,memory:0,images:0};
  this.lastFrame=null;this.resumed=false;this.lastHeap=-Infinity;this.running=true;
 }
 stop(){if(this.running){this.stopped=this.now();this.running=false;}return this.snapshot();}
 begin(){return this.active?this.now():NaN;}
 end(segment:string,started:number){
  if(!this.active||!Number.isFinite(started))return;
  const kind=segments.indexOf(segment);if(kind<0)return;
  const now=this.now();if(this.cpuCount>=this.cpuCapacity){this.dropped.cpu++;return;}
  const i=this.cpuCount++;this.cpu[i*2]=Math.max(0,now-this.started);this.cpu[i*2+1]=Math.max(0,now-started);this.cpuKinds[i]=kind;
 }
 frame(dt:number,loadingBlocked:boolean){
  if(!this.active)return;
  const now=this.now(),interval=this.lastFrame===null?NaN:Math.max(0,now-this.lastFrame);this.lastFrame=now;
  if(this.frameCount<this.frameCapacity){
   const i=this.frameCount++*4;this.frames[i]=Math.max(0,now-this.started);this.frames[i+1]=interval;this.frames[i+2]=Number.isFinite(dt)?dt*1000:NaN;
   this.frames[i+3]=(loadingBlocked?1:0)|(this.hidden?2:0)|(this.resumed?4:0);
  }else this.dropped.frames++;
  this.resumed=false;
  if(now-this.lastHeap>=1000){
   this.lastHeap=now;
   if(this.memoryCount<this.memoryCapacity){
    let heap:number|null=null;try{heap=this.heap();}catch{}
    const i=this.memoryCount++*2;this.memory[i]=Math.max(0,now-this.started);this.memory[i+1]=typeof heap==='number'&&Number.isFinite(heap)&&heap>=0?heap:NaN;
   }else this.dropped.memory++;
  }
 }
 setHidden(hidden:boolean){
  if(this.dead||hidden===this.hidden)return;
  this.hidden=hidden;if(!hidden)this.resumed=true;
  this.mark(hidden?'hidden':'visible');
 }
 mark(kind:string){
  if(!this.active||!['interactive-ready','hidden','visible'].includes(kind))return;
  if(this.events.length>=this.eventCapacity){this.dropped.events++;return;}
  this.events.push({atMs:Math.max(0,this.now()-this.started),kind});
 }
 resource(event:ResourceDiagnostic){
  if(this.dead||!event||typeof event.path!=='string'||!/^[-\w/]+$/.test(event.path)||event.path.length>240||typeof event.type!=='string'||!/^[-\w.]+$/.test(event.type)||event.type.length>80)return;
  if(!['transport','binding','lifetime','optional-audio'].includes(event.stage)||!['start','ready','failed','released'].includes(event.status))return;
  const key=event.type+':'+event.path,group=resourceGroup(event.path);
  if(event.stage==='lifetime'&&event.status==='released')this.images.delete(key);
  if(event.stage==='transport'&&event.status==='ready'&&event.type.endsWith('ImageAsset')){
   const width=Number.isFinite(event.width)&&event.width!>0?event.width!:null,height=Number.isFinite(event.height)&&event.height!>0?event.height!:null;
   if(this.images.has(key)||this.images.size<this.eventCapacity)this.images.set(key,{path:event.path,type:event.type,width,height,group});
   else this.dropped.images++;
  }
  if(!this.active)return;
  if(this.resources.length>=this.eventCapacity){this.dropped.resources++;return;}
  this.resources.push({atMs:Math.max(0,this.now()-this.started),stage:event.stage,status:event.status,path:event.path,type:event.type,group,attempt:Number.isInteger(event.attempt)?event.attempt:0,token:Number.isInteger(event.token)?event.token:0,...(typeof event.retryable==='boolean'?{retryable:event.retryable}:{})});
 }
 snapshot(){
  const frames=[],cpu=[],memory=[],intervals:number[]=[],bySegment:Record<string,number[]>={};
  for(const name of segments)bySegment[name]=[];
  for(let i=0;i<this.frameCount;i++){
   const k=i*4,flags=this.frames[k+3],interval=this.frames[k+1];
   frames.push({atMs:this.frames[k],intervalMs:Number.isFinite(interval)?interval:null,engineDtMs:Number.isFinite(this.frames[k+2])?this.frames[k+2]:null,loadingBlocked:!!(flags&1),hidden:!!(flags&2),resumed:!!(flags&4)});
   if(Number.isFinite(interval)&&!(flags&6))intervals.push(interval);
  }
  for(let i=0;i<this.cpuCount;i++){const segment=segments[this.cpuKinds[i]],duration=this.cpu[i*2+1];cpu.push({atMs:this.cpu[i*2],segment,durationMs:duration});bySegment[segment].push(duration);}
  for(let i=0;i<this.memoryCount;i++)memory.push({atMs:this.memory[i*2],jsHeapBytes:Number.isFinite(this.memory[i*2+1])?this.memory[i*2+1]:null});
  const images=Array.from(this.images.values(),image=>({...image})),cpuMs:Record<string,ReturnType<typeof quantiles>>={};
  for(const name of segments)cpuMs[name]=quantiles(bySegment[name]);
  return {schemaVersion:1,metadata:{profile:'qa',scenario:this.scenario,environment:this.environment,deviceValidation:'not-run',frameSource:'Cocos Component.update',captureBoundary:'PinePilot host; engine/module download precedes capture',heapSource:'optional performance.memory.usedJSHeapSize estimate',imageEstimateSource:'queue-held ImageAsset source pixels × 4; not GPU residency',samplePolicy:'first N samples; later samples counted as dropped',fixedSampleBufferBytes:this.frames.byteLength+this.cpu.byteLength+this.cpuKinds.byteLength+this.memory.byteLength,clockSource:this.clockSource,startedAtClockMs:this.started,durationMs:Math.max(0,(this.stopped??this.now())-this.started),active:this.active},capacities:{frames:this.frameCapacity,cpu:this.cpuCapacity,events:this.eventCapacity,resources:this.eventCapacity,memory:this.memoryCapacity},dropped:{...this.dropped},summary:{engineFrameMs:quantiles(intervals),cpuMs,knownImages:{count:images.length,unknownDimensions:images.filter(x=>x.width===null||x.height===null).length,rgba8EstimateBytes:images.reduce((sum,x)=>sum+(x.width||0)*(x.height||0)*4,0)},gpuMs:null,processMemoryBytes:null,temperatureC:null,batteryPercent:null},frames,cpu,memory,events:this.events.map(e=>({...e})),resources:this.resources.map(e=>({...e})),images};
 }
 install(target:any){
  if(this.dead)return;
  if(this.installedTarget&&this.installedTarget.__towerPerf===this.installedApi)delete this.installedTarget.__towerPerf;
  this.installedTarget=target;this.installedApi=Object.freeze({scenarios:Object.freeze([...scenarios]),start:(scenario:string)=>this.start(scenario),stop:()=>this.stop(),snapshot:()=>this.snapshot()});
  target.__towerPerf=this.installedApi;
 }
 destroy(){
  if(this.dead)return;
  this.running=false;this.dead=true;this.images.clear();
  if(this.installedTarget?.__towerPerf===this.installedApi)delete this.installedTarget.__towerPerf;
  this.installedTarget=null;this.installedApi=null;
 }
}
export function createTowerPerformance(capabilities:{profile?:unknown;developerTools?:unknown},options:PerformanceOptions={}){
 return capabilities?.profile==='qa'&&capabilities.developerTools===true?new TowerPerformance(options):null;
}
