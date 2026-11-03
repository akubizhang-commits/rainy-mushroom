import { BlockInputEvents, Button, Color, EditBox, Graphics, isValid, KeyCode, Node, ScrollView, UITransform, Vec2 } from 'cc';

/** One focus owner for the visible menu or its topmost modal. */
export class TowerKeyboardNavigation {
 private focused:Node|null=null;
 private ring:Node|null=null;
 clear(){if(this.ring&&isValid(this.ring)){this.ring.removeFromParent();this.ring.destroy();}this.ring=null;this.focused=null;}
 private walk(root:Node):Node[]{return root.activeInHierarchy?[root,...root.children.flatMap(n=>this.walk(n))]:[];}
 handle(root:Node,key:number):boolean{
  if(![KeyCode.ESCAPE,KeyCode.ENTER,KeyCode.SPACE,KeyCode.TAB,KeyCode.ARROW_LEFT,KeyCode.ARROW_RIGHT,KeyCode.ARROW_UP,KeyCode.ARROW_DOWN].includes(key))return false;
  const all=this.walk(root);
  const editor=all.map(n=>n.getComponent(EditBox)).find(e=>e?.isFocused());
  if(editor){if(key===KeyCode.TAB||key===KeyCode.ESCAPE)editor.blur();else return true;}
  // Nested overlays supersede their underlying page, including inventory confirmation.
  const overlays=all.filter(n=>n.getComponent(BlockInputEvents)&&(n.name==='突破仪式'||(/遮罩|弹窗|暂停菜单|对话面板|浮层/.test(n.name)&&this.walk(n).some(c=>c.getComponent(Button)))));
  const scope=overlays[overlays.length-1]||root;
  const targets=this.walk(scope).filter(n=>(n.getComponent(Button)?.interactable||n.getComponent(EditBox)?.enabledInHierarchy)&&n.getComponent(UITransform));
  if(!targets.length){this.clear();return scope!==root;}
  if(key===KeyCode.ESCAPE){
   const close=targets.find(n=>/^(关闭|取消)/.test(n.name))||targets.find(n=>/^(返回|继续挑战)/.test(n.name));
   if(close){this.clear();close.emit(Button.EventType.CLICK);return true;}
   // Do not escape through a mandatory transaction/error dialog.
   return scope!==root;
  }
  if(!this.focused||!isValid(this.focused)||!targets.includes(this.focused))this.focused=null;
  if((key===KeyCode.ENTER||key===KeyCode.SPACE)&&this.focused){
   const target=this.focused,editor=target.getComponent(EditBox);if(editor){editor.focus();return true;}
   this.clear();target.emit(Button.EventType.CLICK);return true;
  }
  let next=targets[0];
  if(this.focused){
   if(key===KeyCode.TAB)next=targets[(targets.indexOf(this.focused)+1)%targets.length];
   else{
    const p=this.focused.worldPosition,dx=key===KeyCode.ARROW_LEFT?-1:key===KeyCode.ARROW_RIGHT?1:0,dy=key===KeyCode.ARROW_UP?1:key===KeyCode.ARROW_DOWN?-1:0;
    const ranked=targets.filter(n=>n!==this.focused).map(n=>{
     const x=n.worldPosition.x-p.x,y=n.worldPosition.y-p.y,along=x*dx+y*dy,cross=Math.abs(x*dy-y*dx);
     return {n,along,score:along+cross*3};
    }).filter(v=>v.along>1).sort((a,b)=>a.score-b.score);
    next=ranked[0]?.n||this.focused;
   }
  }
  this.clear();this.focused=next;
  for(let parent=next.parent;parent;parent=parent.parent){
   const scroll=parent.getComponent(ScrollView);if(!scroll?.view)continue;
   const bounds=next.getComponent(UITransform)!.getBoundingBoxToWorld(),view=scroll.view.getBoundingBoxToWorld(),offset=scroll.getScrollOffset(),scale=parent.worldScale;
   const dy=bounds.yMin<view.yMin?view.yMin-bounds.yMin:bounds.yMax>view.yMax?view.yMax-bounds.yMax:0;
   const dx=bounds.xMin<view.xMin?view.xMin-bounds.xMin:bounds.xMax>view.xMax?view.xMax-bounds.xMax:0;
   scroll.stopAutoScroll();scroll.scrollToOffset(new Vec2(Math.max(0,-offset.x-dx/scale.x),Math.max(0,offset.y+dy/scale.y)),0);
  }
  const size=next.getComponent(UITransform)!.contentSize;
  this.ring=new Node('键盘焦点');this.ring.layer=next.layer;next.addChild(this.ring);
  const g=this.ring.addComponent(Graphics);g.strokeColor=new Color('#263F39');g.lineWidth=4;
  g.roundRect(-size.width/2+3,-size.height/2+3,size.width-6,size.height-6,7);g.stroke();
  g.strokeColor=new Color('#FFF9E8');g.lineWidth=2;
  g.roundRect(-size.width/2+6,-size.height/2+6,size.width-12,size.height-12,5);g.stroke();
  return true;
 }
}
