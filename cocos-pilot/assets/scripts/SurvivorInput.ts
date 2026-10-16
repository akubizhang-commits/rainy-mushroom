import {Node,EventTouch,EventKeyboard,input,Input,KeyCode,Sprite,Color} from 'cc';
import {clampBase,computeMove} from './shared/js/survivor/Joystick';
import type {SafeInsets} from './SurvivorPlatform';
// 浮动摇杆输入（01 §4、02 §5.1、03 §6.3）。
// - 只跟踪第一个触点 id，其余触点忽略；TOUCH_CANCEL 视同松手。
// - 按下点在整屏上 1/3（按屏高，不是安全区高）不启动摇杆。
// - 底座按 Joystick.clampBase 钳制，偏移相对钳制后的中心计算；向量由 Joystick.computeMove 给出。
// - 浏览器调试支持 WASD / 方向键。
// 坐标：getUILocation() 为设计单位、左下原点，与 Joystick 纯函数一致。
const FADE=0.1;
export class SurvivorInput{
 x=0;y=0;enabled=true;
 private touchId:number|null=null;private base={x:0,y:0};private keys=new Set<number>();private fade=0;
 private baseSprite:Sprite;private knobSprite:Sprite;
 constructor(private surface:Node,private joyBase:Node,private joyKnob:Node,private width:number,private height:number,private safe:SafeInsets,private onFirstTouch:()=>void=()=>{}){
  this.baseSprite=joyBase.getComponent(Sprite)!;this.knobSprite=joyKnob.getComponent(Sprite)!;
  surface.on(Node.EventType.TOUCH_START,this.start,this);surface.on(Node.EventType.TOUCH_MOVE,this.move,this);
  surface.on(Node.EventType.TOUCH_END,this.end,this);surface.on(Node.EventType.TOUCH_CANCEL,this.end,this);
  input.on(Input.EventType.KEY_DOWN,this.keyDown,this);input.on(Input.EventType.KEY_UP,this.keyUp,this);
  this.show(false);
 }
 resize(width:number,height:number,safe:SafeInsets){this.width=width;this.height=height;this.safe=safe;this.reset()}
 private start(e:EventTouch){
  this.onFirstTouch();
  if(!this.enabled||this.touchId!==null)return;
  const p=e.getUILocation();if(p.y>this.height*2/3)return;
  this.touchId=e.getID();this.base=clampBase({x:p.x,y:p.y},this.safe);this.apply(p.x,p.y);this.show(true);
 }
 private move(e:EventTouch){if(e.getID()!==this.touchId)return;const p=e.getUILocation();this.apply(p.x,p.y)}
 private end(e:EventTouch){if(e.getID()!==this.touchId)return;this.release()}
 private apply(px:number,py:number){
  const m=computeMove(this.base,{x:px,y:py});this.x=m.x;this.y=m.y;
  // 摇杆头位置 = 底座中心 + 偏移（长度截断到 60u）
  let dx=px-this.base.x,dy=py-this.base.y;const d=Math.hypot(dx,dy);if(d>60){dx*=60/d;dy*=60/d}
  this.joyBase.setPosition(this.base.x-this.width/2,this.base.y-this.height/2);this.joyKnob.setPosition(this.base.x+dx-this.width/2,this.base.y+dy-this.height/2);
 }
 private release(){this.touchId=null;this.x=this.y=0;this.fade=FADE}
 // 暂停/升级/切后台：隐藏并清零，恢复后需要重新按下（02 §5.1）。
 reset(){this.touchId=null;this.x=this.y=0;this.fade=0;this.keys.clear();this.show(false)}
 private keyDown(e:EventKeyboard){this.keys.add(e.keyCode)}
 private keyUp(e:EventKeyboard){this.keys.delete(e.keyCode)}
 // 每帧读取：触摸优先，否则键盘。
 vector(dt:number){
  if(this.fade>0){this.fade-=dt;const a=Math.max(0,this.fade/FADE);this.alpha(a);if(this.fade<=0)this.show(false)}
  if(!this.enabled)return {x:0,y:0};
  if(this.touchId!==null)return {x:this.x,y:this.y};
  const k=this.keys;let kx=(k.has(KeyCode.KEY_D)||k.has(KeyCode.ARROW_RIGHT)?1:0)-(k.has(KeyCode.KEY_A)||k.has(KeyCode.ARROW_LEFT)?1:0);
  let ky=(k.has(KeyCode.KEY_W)||k.has(KeyCode.ARROW_UP)?1:0)-(k.has(KeyCode.KEY_S)||k.has(KeyCode.ARROW_DOWN)?1:0);
  const l=Math.hypot(kx,ky);if(l>0){kx/=l;ky/=l}return {x:kx,y:ky};
 }
 private show(on:boolean){this.joyBase.active=on;this.joyKnob.active=on;if(on)this.alpha(1)}
 private alpha(a:number){const c=new Color(255,255,255,Math.round(255*a));this.baseSprite.color=c;this.knobSprite.color=c}
 destroy(){
  if(this.surface.isValid){this.surface.off(Node.EventType.TOUCH_START,this.start,this);this.surface.off(Node.EventType.TOUCH_MOVE,this.move,this);this.surface.off(Node.EventType.TOUCH_END,this.end,this);this.surface.off(Node.EventType.TOUCH_CANCEL,this.end,this)}
  input.off(Input.EventType.KEY_DOWN,this.keyDown,this);input.off(Input.EventType.KEY_UP,this.keyUp,this);
 }
}
