import {Graphics,isValid,Node} from 'cc';
/** Larger world Y is farther away. Ground Y never includes sprite bob/height. */
export function setTowerDepth(node:Node,groundY:number){(node as any).towerGroundY=groundY;}
export function sortTowerDepth(parent:Node){
 const ordered=parent.children.slice().sort((a,b)=>((b as any).towerGroundY??0)-((a as any).towerGroundY??0)||a.name.localeCompare(b.name));
 ordered.forEach((n,i)=>n.setSiblingIndex(i));
}
/** Procedural monster fallbacks participate in the same ordering as sprites. */
export class TowerBodyFallbacks {
 private nodes=new Map<string,{node:Node;g:Graphics;seen:boolean}>();
 begin(){for(const a of this.nodes.values())a.seen=false;}
 draw(parent:Node,id:string,y:number){
  let a=this.nodes.get(id);
  if(!a||!isValid(a.node,true)||a.node.parent!==parent){
   const node=new Node(`妖兽轮廓-${id}`);node.layer=parent.layer;parent.addChild(node);
   a={node,g:node.addComponent(Graphics),seen:true};this.nodes.set(id,a);
  }
  a.seen=true;a.g.clear();setTowerDepth(a.node,y);return a.g;
 }
 end(){for(const [id,a] of this.nodes)if(!a.seen){a.node.destroy();this.nodes.delete(id)}}
 clear(){for(const a of this.nodes.values())if(isValid(a.node,true))a.node.destroy();this.nodes.clear();}
}
