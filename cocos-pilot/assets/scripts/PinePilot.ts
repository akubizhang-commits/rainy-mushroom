import {_decorator,Component,Node,Camera,Canvas,UITransform,Layers,view,ResolutionPolicy,Color,sys,profiler} from 'cc';
import {SurvivorView} from './SurvivorView';
import {runSurvivorSmoke} from './SurvivorSmoke';
const {ccclass}=_decorator;
// Scene host. The class name and UUID stay so the serialized scene keeps its reference.
// The only game is the survivor mode; the old forest/library/packing views were removed.
@ccclass('PinePilot')
export class PinePilot extends Component{
 canvas!:Node;survivor:SurvivorView|null=null;
 progressStorage:any=null;
 safeTop=28;safeBottom=20;
 private browserResize=()=>{if(sys.isBrowser)view.setFrameSize(window.innerWidth,window.innerHeight);};
 start(){
  view.setDesignResolutionSize(375,812,ResolutionPolicy.FIXED_WIDTH);
  this.canvas=new Node('Survivor Canvas');this.node.scene.addChild(this.canvas);this.canvas.layer=Layers.Enum.UI_2D;this.canvas.addComponent(UITransform);
  const canvas=this.canvas.addComponent(Canvas),cameraNode=new Node('Survivor UI Camera');this.node.scene.addChild(cameraNode);
  const camera=cameraNode.addComponent(Camera);camera.projection=Camera.ProjectionType.ORTHO;camera.clearFlags=Camera.ClearFlag.SOLID_COLOR;
  camera.clearColor=new Color('#263f3c');camera.visibility=Layers.Enum.UI_2D;cameraNode.setPosition(0,0,1000);camera.near=1;camera.far=2000;canvas.cameraComponent=camera;
  profiler.hideStats();this.measureSafeArea();
  // Browser smoke (?smoke=1) uses memory-only storage so it never touches a real save.
  const smoke=sys.isBrowser&&new URLSearchParams(window.location.search).get('smoke')==='1';
  if(smoke){const data=new Map();this.progressStorage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)};}
  this.survivor=new SurvivorView(this);
  view.on('canvas-resize',this.resize,this);
  if(sys.isBrowser){window.addEventListener('resize',this.browserResize);this.browserResize();}
  if(smoke)void runSurvivorSmoke(this);
 }
 private measureSafeArea(){try{const api=(globalThis as any).wx,info=api?.getWindowInfo?.()||api?.getSystemInfoSync?.(),capsule=api?.getMenuButtonBoundingClientRect?.();if(info){const scale=view.getVisibleSize().width/info.windowWidth;this.safeTop=Math.max(22,(capsule?.bottom+8||info.safeArea?.top||24)*scale);this.safeBottom=Math.max(16,(info.windowHeight-(info.safeArea?.bottom||info.windowHeight))*scale+10)}}catch{}}
 update(dt:number){this.survivor?.update(dt)}
 private resize(){this.measureSafeArea();this.survivor?.render()}
 onDestroy(){if(sys.isBrowser)window.removeEventListener('resize',this.browserResize);view.off('canvas-resize',this.resize,this);this.survivor?.destroy();this.survivor=null}
}
