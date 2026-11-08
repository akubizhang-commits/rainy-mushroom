import {Node} from 'cc';
import {TowerShockwaveArt} from './TowerShockwaveArt';
import {TowerEarthWaveArt} from './TowerEarthWaveArt';

/** Reuses dust/rubble painters through local descriptors, never gameplay zones. */
export class TowerSlamArt {
 private dust:TowerShockwaveArt;
 private rubble:TowerEarthWaveArt;
 constructor(parent:Node){
  this.dust=new TowerShockwaveArt(parent);
  this.rubble=new TowerEarthWaveArt(parent);
 }
 draw(state:any,camera:{x:number;y:number}){
  const dust:any[]=[],rubble:any[]=[];
  for(const e of state.enemies||[]){
   const ai=e.ai,a=ai?.attack;
   if(e.hp<=0||!['bear','ape','yak'].includes(e.family)||a?.kind!=='slam'||a.shape!=='circle'||!['windup','active'].includes(ai.mode))continue;
   if(![a.x,a.y,a.radius,a.startedAt,a.active,ai.until,state.time].every(Number.isFinite)||a.radius<=0||a.active<=0||state.time>=ai.until)continue;
   const start=ai.mode==='windup'?ai.until:ai.until-a.active;
   const end=ai.mode==='windup'?start+a.active:ai.until;
   const base={id:`slam:${a.id}`,ownerId:e.id,x:a.x,y:a.y,radius:a.radius,startedAt:a.startedAt,activatesAt:start,expiresAt:end};
   // M07/M09 select existing painters only; these descriptors never enter state.
   dust.push({...base,skillId:'M07',innerRadius:0,angle:Math.PI*2,faceX:1,faceY:0});
   // Horizontal debris stays inside the real damage disk, centred at impact.
   rubble.push({...base,skillId:'M09',shape:'capsule',x:a.x-a.radius*.65,toX:a.x+a.radius*.65,toY:a.y,width:a.radius*.48});
  }
  this.dust.draw({time:state.time,enemies:state.enemies,monsterMechanics:{zones:dust}},camera);
  this.rubble.draw({time:state.time,enemies:state.enemies,monsterMechanics:{zones:rubble}},camera);
 }
 destroy(){this.dust.destroy();this.rubble.destroy();}
}
