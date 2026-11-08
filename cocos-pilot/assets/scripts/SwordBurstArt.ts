import {presentationPreferences} from './TowerPreferences';
import {towerResources as resources} from './TowerResources';
import {Color,Graphics,isValid,Node,AudioSource,AudioClip} from 'cc';
/** Approved v4: a body fracture followed by staggered white, pointed jian silhouettes. */
export class SwordBurstArt {
 private clip:AudioClip|null=null;private sound:AudioSource|null=null;private requested=false;private dead=false;
 private bursts=new Map<string,any>();private sounded=new Set<string>();private state:any=null;private time=-1;private lastSound=-1;
 private actors=new Map<string,{x:number;y:number}>();
 readonly covered=new Set<string>();
 preload(){if(this.requested||this.dead)return;this.requested=true;
  resources.load('tower-skill-fx/sword-burst',AudioClip,(err,clip)=>{if(this.dead||err||!clip)return;clip.addRef();this.clip=clip});
 }
 cameraKick(s:any){let age=1;if(s.player?.hp<=0)return {x:0,y:0};
  for(const e of s.effects||[])if(e.kind==='sword_burst'&&Math.hypot(e.x-s.player.x,e.y-s.player.y)<600){const a=s.time-e.startedAt;if(a>=0)age=Math.min(age,a)}
  const f=Math.max(0,1-age/.105);return {x:Math.sin(age*158)*3.8*f,y:-Math.sin(age*158)*1.52*f};
 }
 sync(parent:Node,g:Graphics,s:any,camera:{x:number;y:number}){
  this.preload();if(this.state!==s||s.time<this.time){this.reset();this.state=s}this.time=s.time;this.covered.clear();this.actors.clear();
  if(s.player?.hp<=0){this.reset();return}
  if(!this.sound&&isValid(parent,true)){this.sound=parent.addComponent(AudioSource);this.sound.playOnAwake=false}
  if(this.sound)this.sound.volume=.55*presentationPreferences().soundVolume;
  if(s.phase!=='playing')this.sound?.stop();
  const clamp=(x:number)=>Math.max(0,Math.min(1,x)),ease=(x:number)=>1-(1-clamp(x))**3;
  const rand=(i:number)=>{const x=Math.sin(i*127.17+73.13)*43758.54;return x-Math.floor(x)};
  const lift=(r:number)=>Math.min(80,Math.max(34,r*1.4));
  const poly=(pts:number[][],color:Color)=>{g.fillColor=color;pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.close();g.fill()};
  const line=(pts:number[][],width:number,color:Color)=>{g.lineWidth=width;g.strokeColor=color;pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke()};
  const sword=(id:string,x:number,y:number,a:number,len:number,alpha:number,small=false)=>{
   if(alpha<=0||this.actors.size>=128)return;this.actors.set(id,{x,y});
   const w=small?2.1:3.2,tail=-len*.48,tip=len*.52,guard=tail+len*.17,c=Math.cos(a),d=Math.sin(a);
   const shape=(pts:number[][],col:Color)=>poly(pts.map(([u,v])=>[x-camera.x+c*u-d*v,y-camera.y+d*u+c*v]),col);
   shape([[guard,-w*.55],[tail-len*.65,0],[guard,w*.55]],new Color(232,246,255,Math.round(alpha*.18)));
   shape([[tip,0],[guard+len*.17,-w],[guard,-w*.7],[guard,w*.7],[guard+len*.17,w]],new Color(255,255,255,Math.round(alpha)));
   shape([[tip,0],[guard+len*.17,w],[guard,w*.7],[guard,0]],new Color(217,230,237,Math.round(alpha*.85)));
   shape([[guard+1.5,-w*1.8],[guard-1.5,-w*1.8],[guard-2,w*1.8],[guard+1.5,w*1.8]],new Color(255,255,255,Math.round(alpha)));
   shape([[guard,-w*.5],[tail,-w*.35],[tail-2,0],[tail,w*.35],[guard,w*.5]],new Color(245,250,255,Math.round(alpha)));
  };
  for(const e of s.swordBursts||[]){
   const p=clamp((s.time-e.startedAt)/.2),cx=e.x-camera.x,cy=e.y+lift(e.targetRadius||24)-camera.y;
   for(let i=0;i<7;i++){const a=i*2.399+.26,r=(18+rand(i)*24)*ease(p);
    const pts=[[cx,cy],[cx+Math.cos(a+.18)*r*.33,cy+Math.sin(a+.18)*r*.33],[cx+Math.cos(a-.12)*r*.62,cy+Math.sin(a-.12)*r*.62],[cx+Math.cos(a)*r,cy+Math.sin(a)*r]];
    line(pts,3,new Color(98,221,255,Math.round(150*p*p)));line(pts,1,new Color(255,255,255,Math.round(255*p*p)));
   }
  }
  for(const e of s.effects||[])if(e.kind==='sword_burst'&&!this.bursts.has(e.id))this.bursts.set(e.id,{...e});
  for(const [id,e] of this.bursts){
   const age=s.time-e.startedAt;if(age<0||age>=.65){this.bursts.delete(id);this.sounded.delete(id);continue}this.covered.add(id);
   const x=e.x,y=e.y+lift(e.targetRadius||24),cx=x-camera.x,cy=y-camera.y;
   if(s.phase==='playing'&&!this.sounded.has(id)){this.sounded.add(id);if(this.clip&&this.sound&&s.time-this.lastSound>.09){this.sound.stop();this.sound.clip=this.clip;this.sound.play();this.lastSound=s.time}}
   const fade=(1-clamp(age/.52))**1.6,open=ease(age/.16),pts:number[][]=[];
   for(let i=0;i<40;i++){const a=i*Math.PI/20,r=(i%2?11+rand(i)*16:38+rand(i)*36)*(.4+.6*open);pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r*.8])}
   poly(pts,new Color(23,61,80,Math.round(120*fade)));poly(pts.map(([u,v])=>[cx+(u-cx)*.87,cy+(v-cy)*.87]),new Color(186,242,255,Math.round(85*fade)));
   if(age<.085){const star:number[][]=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,r=(i%2?8+rand(i)*7:23+rand(i)*35)*(.7+.3*open);star.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r*.77])}poly(star,new Color(255,255,250,Math.round(255*(1-age/.085))))}
   if(age<.28){const f=1-age/.28,r=17+72*ease(age/.2);for(let k=0;k<3;k++){const arc:number[][]=[];for(let j=0;j<15;j++){const a=k*2.17+.3+j*.055,rr=r*(.95+.055*Math.sin(j*2+k));arc.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.73])}line(arc,1.4*f,new Color(225,250,255,Math.round(170*f)))}}
   // Twelve visual short swords: staggered starts and distances, no gameplay hits.
   for(let i=0;i<12;i++){const a=i*2.399+.19,launch=.026+rand(i+90)*.064,duration=.16+rand(i+53)*.07,local=age-launch;
    if(local<0||local>=duration)continue;const p=clamp(local/duration),dist=(88+rand(i+40)*68)*(1-(1-p)**1.12);
    sword(`${id}:short:${i}`,x+Math.cos(a)*dist,y+Math.sin(a)*dist,a,(31+rand(i+6)*16)*(.65+.35*ease(local/.025)),255*clamp(local/.008)*clamp((duration-local)/.045),true);
   }
   for(let i=0;i<24;i++){const a=i*2.399,r=(24+rand(i)*72)*ease(age/(.17+rand(i+3)*.2)),u=cx+Math.cos(a)*r,v=cy+Math.sin(a)*r*.8-age*age*43,l=(2+rand(i+9)*5)*fade;
    poly([[u+Math.cos(a)*l,v+Math.sin(a)*l],[u-Math.sin(a),v+Math.cos(a)],[u-Math.cos(a)*l*.55,v-Math.sin(a)*l*.55]],new Color(225,246,255,Math.round(180*fade)));
   }
  }
  for(const b of s.swordBurstShots||[]){
   const age=s.time-b.launchAt;if(age<0)continue;const target=s.enemies.find((e:any)=>e.id===b.targetId&&e.hp>0);if(!target)continue;
   const distance=Math.hypot(b.x-b.originX,b.y-b.originY),remaining=Math.hypot(target.x-b.x,target.y-b.y),p=distance/Math.max(1,distance+remaining);
   const y=b.y+lift(b.originRadius)*(1-p)+lift(target.radius||24)*p;
   sword(b.id,b.x,y,Math.atan2(target.y+lift(target.radius||24)-y,target.x-b.x),(51+rand(b.index)*10)*(.65+.35*ease(age/.025)),255*clamp(age/.008));
  }
  for(const e of s.effects||[])if(e.kind==='sword_burst_hit'){
   const age=s.time-e.startedAt;if(age<0||age>.25)continue;this.covered.add(e.id);const f=1-age/.25,a=e.angle+.85,len=28*ease(age/.035),x=e.x-camera.x,y=e.y+lift(e.targetRadius||24)-camera.y;
   line([[x-Math.cos(a)*len,y-Math.sin(a)*len],[x+Math.cos(a)*len,y+Math.sin(a)*len]],3*f,new Color(240,252,255,Math.round(255*f)));
  }
 }
 clearBindings(){this.actors.clear();this.sound?.stop();this.sound?.destroy();this.sound=null}
 reset(){this.clearBindings();this.bursts.clear();this.sounded.clear();this.lastSound=-1;this.time=-1;this.state=null;this.covered.clear()}
 destroy(){this.dead=true;this.reset();this.clip?.decRef()}
}
