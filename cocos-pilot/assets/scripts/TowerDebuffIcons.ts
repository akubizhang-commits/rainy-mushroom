import {Node,UITransform,Color,Label,isValid} from 'cc';
import {enemyDebuffs} from './shared/js/xianxia/TowerEnemyStatuses';
import {TowerStatusIconArt,STATUS_ICON_SIZE} from './TowerStatusIconArt';
/** Compact skill artwork below HP; clockwise shading follows simulation time. */
export class TowerDebuffIcons {
 private icons=new TowerStatusIconArt();
 private pool:{node:Node;label:Label;art:ReturnType<TowerStatusIconArt['attach']>;icon:string}[]=[];
 get hasActiveIcons(){return this.pool.some(p=>isValid(p.node,true)&&p.node.active);}
 draw(parent:Node,s:any,anchors:Map<any,{x:number;y:number}>){
  let used=0;
  for(const e of s.enemies||[]){
   const anchor=anchors.get(e.id);if(!anchor)continue;
   const statuses=enemyDebuffs(e,s.time);
   for(let column=0;column<statuses.length;column++){
    const status=statuses[column];let p=this.pool[used++];
    if(!p||!isValid(p.node,true)||p.node.parent!==parent||p.icon!==status.icon){
     if(p&&isValid(p.node,true))p.node.destroy();
     const node=new Node('敌人状态');node.layer=parent.layer;parent.addChild(node);
     node.addComponent(UITransform).setContentSize(STATUS_ICON_SIZE,STATUS_ICON_SIZE);
     const art=this.icons.attach(node,status.icon);
     const text=new Node('状态层数');text.layer=node.layer;node.addChild(text);
     text.setPosition(8,-9);text.addComponent(UITransform).setContentSize(18,12);
     const label=text.addComponent(Label);label.fontSize=9;label.lineHeight=12;
     label.horizontalAlign=Label.HorizontalAlign.RIGHT;
     label.color=new Color('#FFF1D8');label.enableOutline=true;label.outlineWidth=1;label.outlineColor=new Color('#192B28');
     p={node,label,art,icon:status.icon};this.pool[used-1]=p;
    }
    p.node.active=true;p.node.name=`敌人状态-${e.id}-${status.key}`;
    p.node.setPosition(anchor.x+STATUS_ICON_SIZE/2+column*(STATUS_ICON_SIZE+4),anchor.y);
    p.label.string=String(status.stacks);
    const elapsed=Math.max(0,Math.min(1,1-status.seconds/status.duration));
    p.art.setProgress(elapsed);
   }
  }
  for(let i=used;i<this.pool.length;i++)if(isValid(this.pool[i].node,true))this.pool[i].node.active=false;
 }
 reset(){for(const p of this.pool)if(isValid(p.node,true))p.node.active=false;}
 destroy(){this.icons.destroy();for(const p of this.pool)if(isValid(p.node,true))p.node.destroy();this.pool=[];}
}
