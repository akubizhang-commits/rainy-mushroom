import {towerResources as resources} from './TowerResources';
import {setTowerDepth} from './TowerDepthOrder';
import {ARCHETYPES} from './shared/js/xianxia/TowerContent';
import { Color, Graphics, ImageAsset, isValid, JsonAsset, Node, Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';

type Entry = { done: boolean; image: ImageAsset | null; texture: Texture2D | null; frame: SpriteFrame | null };
// Spider death has no delivered clip, so its existing on-screen pose stays this long before cleanup removes it.
const SPIDER_DEATH_HOLD_SECONDS = 1.5;
type Actor = { node: Node; sprite: Sprite; transform: UITransform; family: string; x: number; facing: number; seen: boolean; top?:number; worldY?:number; enraged?:boolean; diedAt?:number; motionTime?:number; moving?:boolean; bodySize?:number };
const families = new Set(['boar', 'wolf', 'bear', 'tiger', 'tiger-humanoid', 'white-tiger', 'ape', 'snake', 'crocodile', 'scorpion', 'centipede', 'rhino', 'yak', 'falcon', 'spider-lady', 'spider', 'bat', 'spider-queen', 'snake-lady', 'bear-humanoid', 'crocodile-humanoid', 'wolf-humanoid', 'falcon-humanoid', 'ape-humanoid', 'bat-humanoid', 'boar-humanoid', 'scorpion-humanoid','centipede-humanoid']);
export type MonsterMotion = {
 time: number;
 hp?: number; moving?: boolean; role?: string; rank?: number;
 mechanic?: {skillId?:string;phase?:string;startedAt?:number;until?:number;enraged?:boolean;chargeX?:number};
 worldY?: number;
 ai: { mode: string; until: number; attack?: {
  id?: string; kind?: string; startedAt: number; active: number; recovery?: number; dirX: number; emissionFaceX?:number;
 } | null };
};
type MotionClip = { frames: string[]; fps: number; loop: boolean; phases?: Record<string,[number,number]> };
type MotionAtlas = {
 version: number; width: number; height: number; facing: 'left' | 'right' | 'front'; anchor: [number, number];
 frames: Record<string, { x: number; y: number; w: number; h: number; displayScale?: number; anchor?: [number,number] }>;
 clips: Record<string, MotionClip>;
};
type PhaseTrack = { key: string; start: number; time: number; seen: boolean };

/** View-lifetime resource cache, with only visible enemies retained in the node pool.
 * Load callbacks never capture actors: clearing bindings cancels all presentation
 * work, while completed resources can be reused after pause/menu/resize.
 */
export class TowerMonsterArt {
 private static archetypeArt: Map<string,string> | undefined;
 // Enable each new raster here when its 256px transparent PNG is delivered.
 static bodyScale(family:string,role?:string,rank=1) {
  return this.bodySize(family,role,24,rank)/this.bodySize(family,'normal',24,1);
 }
 static bodySize(family:string,role?:string,radius=24,rank=1) {
  const species=family==='white-tiger'?'tiger':family.replace(/-(humanoid|lady|queen)$/,'');
  const normalRadius:Record<string,number>={scorpion:24,centipede:24,boar:26,wolf:22,bear:32,crocodile:30,ape:28,tiger:28,bat:18,falcon:20};
  // Alpha >=32 bounding-box longest edges, measured from the delivered portraits.
  // Calibrate forms against the low-rank silhouette, not transparent canvas area.
  const extent:Record<string,number>={boar:232/256,wolf:230/256,bear:231/256,tiger:230/256,ape:230/256,snake:230/256,crocodile:462/512,scorpion:230/256,centipede:230/256,spider:470/512,bat:470/512,falcon:470/512,rhino:206/256,yak:206/256};
  const portraitExtent=family===species?(extent[species]??1):
   ['bat-humanoid','falcon-humanoid','centipede-humanoid'].includes(family)?410/512:206/256;
  const calibration=(extent[species]??portraitExtent)/portraitExtent;
  const flight=['bat','falcon'].includes(species)?1.25:1;
  const base=Math.max(64,Math.min(110,(role?normalRadius[species]??24:radius)*3.2))*flight*calibration;
  const band=Number.isFinite(rank)?Math.max(0,Math.min(2,Math.floor((rank-1)/3))):0;
  if(role==='boss')return Math.max(220*flight,base*2.2*1.3);
  return base*(role==='elite'?[1.7,1.95,2.2]:[1,1.2,1.4])[band];
 }
 static artFamily(family:string,archetype?:string) {
  // Resource selection is authored by species/form stage, independent of role
  // and encounter ID. Missing form art remains an explicit data/audit gap.
  this.archetypeArt??=new Map((ARCHETYPES as any[]).map(a=>[a.id,a.art_family]));
  return this.archetypeArt.get(archetype||'')||family;
 }
 /** Measured portrait landmarks: mouths, scorpion stingers and falcon wing roots.
  * UVs use the delivered left-facing image; support is its opaque ground anchor.
  * All ranged windup/active poses currently use portraits, including flying beasts. */
 private static emissionLandmark(family:string):{u:number;v:number;support:number}|null {
  const marks:Record<string,[number,number,number]>={
   snake:[.19,.32,.9492],'snake-lady':[.426,.258,.9],
   scorpion:[.65,.255,.9453],'scorpion-humanoid':[.78,.20,.9],
   bat:[.40,.65,.72],'bat-humanoid':[.36,.30,.9],
   falcon:[.48,.50,.72],'falcon-humanoid':[.40,.39,.9]
  };
  const m=marks[family];return m?{u:m[0],v:m[1],support:m[2]}:null;
 }
 /** A launch pose is reconstructed from immutable release data, including after
  * reload/owner death. The ground projectile remains the authority for collisions.
  * Descend onto that path before the originally aimed player's collision boundary. */
 static projectilePose(shot:any):{x:number;y:number;angle:number;lift:number} {
  const base={x:shot.x,y:shot.y,angle:Math.atan2(shot.vy,shot.vx),lift:0},l=shot.launch;
  if(!shot.hostile||!l)return base;
  const m=this.emissionLandmark(l.family);
  if(!m||![l.x,l.y,l.range,l.radius,l.rank,l.faceX,shot.x,shot.y,shot.vx,shot.vy].every(Number.isFinite))return base;
  const size=this.bodySize(l.family,l.role,l.radius,l.rank)*(l.enraged?1.2:1);
  const ox=(m.u-.5)*size*-l.faceX,oy=(m.support-m.v)*size;
  const landing=Math.max(1,Math.min(220,l.range-18-(shot.radius||12)-8));
  const travelled=Math.hypot(shot.x-l.x,shot.y-l.y),t=Math.min(1,travelled/landing);
  // Smooth descent avoids a hard bend where the visual meets the ground path.
  const weight=1-3*t*t+2*t*t*t,speed=Math.hypot(shot.vx,shot.vy);
  const slope=(-6*t+6*t*t)/landing*speed;
  return {x:shot.x+ox*weight,y:shot.y+oy*weight,
   angle:Math.atan2(shot.vy+oy*slope,shot.vx+ox*slope),lift:oy*weight};
 }
 // Each delivered species owns its lazy texture cache and independent phase clocks.
 private speciesRenderers = new Map<string,TowerMonsterArt>();
 constructor(private motionFamily: 'boar' | 'wolf' | 'spider' | 'bat' | 'falcon' | 'crocodile' | 'bear' | 'tiger' | 'rhino' | 'yak' | 'wolf-humanoid' | 'tiger-humanoid' | 'falcon-humanoid' | 'bear-humanoid' | 'snake' | 'boar-humanoid' | 'crocodile-humanoid' | 'white-tiger' | 'snake-lady' | 'spider-lady' | 'bat-humanoid' = 'boar') {}
 preloadFloor(floor:any){
  if(this.dead||!floor)return;
  const ids=new Set<string>([floor.boss_id]);
  for(const wave of floor.waves||[])for(const group of wave.enemy_groups||[])ids.add(group.archetype);
  for(const id of ids){
   const row=(ARCHETYPES as any[]).find(a=>a.id===id);
   if(row)this.preload(TowerMonsterArt.artFamily(row.species,id));
  }
 }
 private preload(family:string){
  if(this.dead||!TowerMonsterArt.hasRaster(family))return;
  if((family==='wolf'||family==='spider'||family==='bat'||family==='falcon'||family==='crocodile'||family==='bear'||family==='tiger'||family==='rhino'||family==='yak'||family==='wolf-humanoid'||family==='tiger-humanoid'||family==='falcon-humanoid'||family==='bear-humanoid'||family==='snake'||family==='boar-humanoid'||family==='crocodile-humanoid'||family==='white-tiger'||family==='snake-lady'||family==='spider-lady'||family==='bat-humanoid')&&this.motionFamily!==family){
   let renderer=this.speciesRenderers.get(family);
   if(!renderer){renderer=new TowerMonsterArt(family);this.speciesRenderers.set(family,renderer);}
   renderer.preload(family);return;
  }
  if(!this.entries.has(family)){
   const entry:Entry={done:false,image:null,texture:null,frame:null};
   this.entries.set(family,entry);
   try{resources.load(`tower-monsters/${family}`,ImageAsset,(error,image)=>this.finish(entry,error,image));}
   catch(error){this.finish(entry,error,null);}
  }
  if(family===this.motionFamily)this.loadMotion();
 }
 /** Authored mouth landmarks in the delivered snake portraits, in screen space. */
 mouthPosition(id:string|number):{x:number;y:number}|null {
  const a=this.actors.get(id);
  if(!a||!a.seen||a.diedAt!==undefined)return null;
  const uv=a.family==='snake-lady'?[.426,.258]:a.family==='snake'?[.19,.32]:null;
  if(!uv)return null;
  return {x:a.node.position.x+(uv[0]-a.transform.anchorX)*a.transform.width*a.node.scale.x,
   y:a.node.position.y+(1-uv[1]-a.transform.anchorY)*a.transform.height*a.node.scale.y};
 }
 /** Live model attachments for channeled effects and the launch of thrown webs.
  * Screen-space output includes mirror, mechanic scale and hit reactions. */
 attachmentPosition(id:string|number,kind:'web'|'spirit'):{x:number;y:number}|null {
  const a=this.actors.get(id);
  if(!a){for(const r of this.speciesRenderers.values()){const p=r.attachmentPosition(id,kind);if(p)return p;}return null;}
  if(!a.seen||a.diedAt!==undefined)return null;
  const webs:Record<string,[number,number]>={spider:[.5,.56],'spider-lady':[.235,.465],'spider-queen':[.32,.53]};
  const uv=kind==='web'?webs[a.family]:a.family==='snake-lady'?[.47,.44]:[.5,.5];
  if(!uv)return null;
  return {x:a.node.position.x+(uv[0]-a.transform.anchorX)*a.transform.width*a.node.scale.x,
   y:a.node.position.y+(1-uv[1]-a.transform.anchorY)*a.transform.height*a.node.scale.y};
 }
 static hasRaster(family: string) { return families.has(family); }
 /** Lightweight species silhouette while the matching raster asset is unavailable. */
 static drawHornedFallback(g: Graphics, family: string, x: number, y: number, r: number): boolean {
  if (family !== 'rhino' && family !== 'yak') return false;
  const yak = family === 'yak';
  g.fillColor = new Color(yak ? '#554C41' : '#87928A');
  g.ellipse(x, y, r * .84, r * .5); g.fill();
  for (const dx of [-.55, -.3, .35, .6]) {
   g.roundRect(x + dx * r - r * .1, y - r * .73, r * .2, r * .55, r * .05); g.fill();
  }
  if (yak) {
   for (let i = 0; i < 9; i++) {
    const dx = x + (i / 8 - .5) * r * 1.5;
    g.moveTo(dx - r * .13, y - r * .15); g.lineTo(dx, y - r * .64);
    g.lineTo(dx + r * .13, y - r * .15); g.close(); g.fill();
   }
  }
  g.ellipse(x - r * .76, y - r * .03, r * .4, r * .31); g.fill();
  g.fillColor = new Color('#DDD6BB');
  if (yak) {
   for (const dx of [-.92, -.55]) {
    g.moveTo(x + dx * r, y + r * .15); g.lineTo(x + (dx - .16) * r, y + r * .65);
    g.lineTo(x + (dx + .15) * r, y + r * .2); g.close(); g.fill();
   }
  } else {
   g.moveTo(x - r * 1.13, y + r * .03); g.lineTo(x - r * 1.23, y + r * .6);
   g.lineTo(x - r * .91, y + r * .12); g.close(); g.fill();
   g.moveTo(x - r * .9, y + r * .18); g.lineTo(x - r * .87, y + r * .43);
   g.lineTo(x - r * .7, y + r * .2); g.close(); g.fill();
  }
  g.fillColor = new Color('#23332D'); g.circle(x - r * .85, y + r * .04, r * .035); g.fill();
  return true;
 }
 private entries = new Map<string, Entry>();
 private actors = new Map<string | number, Actor>();
 private dead = false;
 private motionRequested = false;
 private motionFailed = false;
 private motionImage: ImageAsset | null = null;
 private motionTexture: Texture2D | null = null;
 private motionAtlas: MotionAtlas | null = null;
 private motionFrames = new Map<string, SpriteFrame>();
 private motionLayouts = new Map<SpriteFrame, {displayScale?:number;anchor?:[number,number]}>();
 private rageImage: ImageAsset | null = null;
 private rageTexture: Texture2D | null = null;
 private rageFrames = new Map<string, SpriteFrame>();
 private observations = new Map<string | number,{hp?:number;hitAt:number}>();
 private phaseTracks = new Map<string | number, PhaseTrack>();

 beginFrame() {
  for(const renderer of this.speciesRenderers.values())renderer.beginFrame();
  for (const actor of this.actors.values()) actor.seen = false;
  for (const track of this.phaseTracks.values()) track.seen = false;
 }

 /** Apply after mechanic styling. draw() restores the base transform each frame;
  * recoil never alters world position, facing, attack state, or depth ordering. */
 applyImpact(id:string|number,pose:{x:number;y:number;scaleX:number;scaleY:number}|undefined) {
  for(const renderer of this.speciesRenderers.values())renderer.applyImpact(id,pose);
  const actor=this.actors.get(id);
  if(!actor||!pose||![pose.x,pose.y,pose.scaleX,pose.scaleY].every(Number.isFinite))return;
  const node=actor.node;
  node.setPosition(node.position.x+pose.x,node.position.y+pose.y);
  node.setScale(node.scale.x*pose.scaleX,node.scale.y*pose.scaleY,1);
  if(actor.top!==undefined)actor.top+=pose.y;
 }

 /** Returns rendered size, or zero to request the existing vector beast. */
 draw(parent: Node, id: string | number, family: string, x: number, y: number,
  worldX: number, playerX: number, radius: number, motion?: MonsterMotion): number {
  if (this.dead || !TowerMonsterArt.hasRaster(family) || id === undefined || id === null
   || !Number.isFinite(x + y + worldX + playerX + radius) || !isValid(parent, true)) return 0;
  if((family==='wolf'||family==='spider'||family==='bat'||family==='falcon'||family==='crocodile'||family==='bear'||family==='tiger'||family==='rhino'||family==='yak'||family==='wolf-humanoid'||family==='tiger-humanoid'||family==='falcon-humanoid'||family==='bear-humanoid'||family==='snake'||family==='boar-humanoid'||family==='crocodile-humanoid'||family==='white-tiger'||family==='snake-lady'||family==='spider-lady'||family==='bat-humanoid') && this.motionFamily!==family) {
   let renderer=this.speciesRenderers.get(family);
   if(!renderer){renderer=new TowerMonsterArt(family);this.speciesRenderers.set(family,renderer);}
   return renderer.draw(parent,id,family,x,y,worldX,playerX,radius,motion);
  }
  let entry = this.entries.get(family);
  if (!entry) {
   entry = { done: false, image: null, texture: null, frame: null };
   this.entries.set(family, entry);
   const current = entry;
   try {
    resources.load(`tower-monsters/${family}`, ImageAsset, (error, image) => this.finish(current, error, image));
   } catch (error) { this.finish(current, error, null); }
  }
  // Only the delivered species opts into motion. Legacy callers and all other
  // families retain their existing image path and do not request new assets.
  const animate = family === this.motionFamily && motion && Number.isFinite(motion.time);
  if (animate) this.loadMotion();
  const prior=this.actors.get(id);
  const moving=motion?.moving ?? (prior?.motionTime===motion?.time ? prior?.moving : !!prior && (Math.abs(worldX-prior.x)>.01 || Math.abs((motion?.worldY??0)-(prior.worldY??0))>.01));
  const animatedFrame = animate ? this.motionFrame(id, {...motion,moving}) : null;
  const frame = animatedFrame || entry.frame;
  if (!frame) return 0;
  let actor = this.actors.get(id);
  if (actor && (actor.family !== family || actor.node.parent !== parent || !isValid(actor.node, true))) {
   this.remove(id, actor); actor = undefined;
  }
  if (!actor) {
   const node = new Node(`妖兽素材-${id}`);
   node.layer = parent.layer; parent.addChild(node);
   const transform = node.addComponent(UITransform), sprite = node.addComponent(Sprite);
   sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.trim = false;
   sprite.spriteFrame = frame;
   actor = { node, sprite, transform, family, x: worldX, facing: playerX < worldX ? -1 : 1, seen: true };
   this.actors.set(id, actor);
  }
  const dx = worldX - actor.x;
  const attack = motion && motion.ai?.mode !== 'approach' ? motion.ai?.attack : null;
  if (motion?.mechanic?.skillId==='M06' && ['windup','active'].includes(motion.mechanic.phase||'') && Math.abs((motion.mechanic.chargeX??worldX)-worldX)>.01) actor.facing=motion.mechanic.chargeX!<worldX?-1:1;
  else if (attack && Math.abs(attack.dirX) > .01) actor.facing = attack.dirX < 0 ? -1 : 1;
  else if (attack?.kind==='shot' && (attack.emissionFaceX===-1||attack.emissionFaceX===1)) actor.facing=attack.emissionFaceX;
  else if (Math.abs(dx) > .01) actor.facing = dx < 0 ? -1 : 1;
  else if (Math.abs(playerX - worldX) > .01) actor.facing = playerX < worldX ? -1 : 1;
  actor.x = worldX; actor.worldY=motion?.worldY; actor.enraged=!!motion?.mechanic?.enraged; actor.seen = true; actor.diedAt=undefined; actor.motionTime=motion?.time; actor.moving=moving;
  actor.sprite.spriteFrame = frame;
  const size = TowerMonsterArt.bodySize(family,motion?.role,radius,motion?.rank);
  actor.bodySize=size;
  const layout = animatedFrame ? this.motionLayouts.get(animatedFrame) : undefined;
  const renderSize = size * (layout?.displayScale ?? 1);
  actor.transform.setContentSize(renderSize, renderSize);
  // The human white-tiger portrait scales around its feet during blood rage.
  const anchor = animatedFrame ? layout?.anchor ?? this.motionAtlas!.anchor : ['white-tiger','tiger-humanoid','snake-lady','bear-humanoid','crocodile-humanoid','wolf-humanoid','falcon-humanoid','ape-humanoid','bat-humanoid','boar-humanoid','scorpion-humanoid','centipede-humanoid'].includes(family) ? [.5, .9] : [.5, .5];
  // Both coordinates are normalized; atlas Y uses top-left, Cocos uses bottom-left.
  actor.transform.setAnchorPoint(anchor[0], 1 - anchor[1]);
  // Grounded combat callers align opaque feet rather than the image center.
  const feet:Record<string,number>={boar:.9492,ape:.9492,tiger:.9062,'tiger-humanoid':.9,'white-tiger':.9,centipede:.9258,wolf:.8984,falcon:.72,snake:.9492,bear:.9492,scorpion:.9453,crocodile:.84,spider:.8457,rhino:.9,yak:.9,bat:.72,'spider-lady':.9,'spider-queen':.9,'snake-lady':.9,'bear-humanoid':.9,'crocodile-humanoid':.9,'wolf-humanoid':.9,'falcon-humanoid':.9,'ape-humanoid':.9,'bat-humanoid':.9,'boar-humanoid':.9,'scorpion-humanoid':.9,'centipede-humanoid':.9};
  const rage=(motion?.hp===undefined||motion.hp>0)&&motion?.mechanic?.enraged?1.2:1;
  const lift=motion?.worldY===undefined?0:size*((animatedFrame ? anchor[1] : feet[family]??.9)-anchor[1])*rage;
  actor.node.setPosition(x, y+lift);
  actor.top=y+lift+renderSize*anchor[1]*rage;
  setTowerDepth(actor.node,motion?.worldY??y);
  // The restored side-view crocodile faces left. The frontal spider still
  // needs directional art; mirroring its symmetric portrait cannot turn it.
  const frontPortrait=family==='spider';
  actor.node.setScale(frontPortrait?1:actor.facing * (animatedFrame && this.motionAtlas!.facing === 'right' ? 1 : -1), 1, 1);
  return size;
 }

 top(id:string|number){
  const own=this.actors.get(id)?.top;if(own!==undefined)return own;
  for(const renderer of this.speciesRenderers.values()){const top=renderer.top(id);if(top!==undefined)return top;}
  return undefined;
 }

 endFrame(time?:number, killed?:Set<string|number>, project?:(x:number,y:number)=>{x:number;y:number}) {
  for(const renderer of this.speciesRenderers.values())renderer.endFrame(time,killed,project);
  for (const [id, actor] of this.actors) if (!actor.seen) {
   const clip=this.motionAtlas?.clips.death;
   // Spider atlas has no death clip: the pose on screen at death is held until cleanup.
   if(!clip && this.motionFamily==='spider' && actor.family==='spider' && time!==undefined && (actor.diedAt!==undefined || killed?.has(id))) {
    actor.diedAt??=time;
    if(time-actor.diedAt < SPIDER_DEATH_HOLD_SECONDS) continue;
   }
   if(time!==undefined && clip && actor.family===this.motionFamily && (actor.diedAt!==undefined || killed?.has(id))) {
    actor.diedAt??=time;actor.enraged=false;
    const age=Math.max(0,time-actor.diedAt);
    if(age < clip.frames.length/clip.fps+.35) {
     actor.sprite.spriteFrame=(actor.enraged?this.rageFrames:this.motionFrames).get(clip.frames[Math.min(clip.frames.length-1,Math.floor(age*clip.fps))])||actor.sprite.spriteFrame;
     const layout=this.motionLayouts.get(actor.sprite.spriteFrame);
     const size=(actor.bodySize??actor.transform.width)*(layout?.displayScale??1);
     actor.transform.setContentSize(size,size);
     const anchor=layout?.anchor??this.motionAtlas!.anchor;
     actor.transform.setAnchorPoint(anchor[0],1-anchor[1]);
     actor.sprite.color=new Color(255,255,255,255);
     if(project&&actor.worldY!==undefined){const p=project(actor.x,actor.worldY);actor.node.setPosition(p.x,p.y);}
     const scale=actor.enraged?1.2:1;actor.node.setScale(this.motionAtlas?.facing==='front'?scale:actor.facing*(this.motionAtlas?.facing==='right'?1:-1)*scale,scale,1);
     continue;
    }
   }
   this.remove(id, actor);this.observations.delete(id);
  }
  for (const [id, track] of this.phaseTracks) if (!track.seen) this.phaseTracks.delete(id);
 }

 clearBindings() {
  for(const renderer of this.speciesRenderers.values())renderer.clearBindings();
  this.observations.clear();
  for (const [id, actor] of this.actors) this.remove(id, actor);
 }

 destroy() {
  if (this.dead) return;
  this.dead = true; this.clearBindings();
  for(const renderer of this.speciesRenderers.values())renderer.destroy();this.speciesRenderers.clear();
  for (const entry of this.entries.values()) this.release(entry);
  this.entries.clear();
  this.releaseMotion(); this.phaseTracks.clear();
  // Body animation paths belong exclusively to this floor's monster renderer.
  // Shared portraits and skill effects keep their host-lifetime cache.
  if(this.motionRequested){
   const path=`tower-monsters-motion/${this.motionFamily==='boar'?'boar-v3':this.motionFamily+'-v1'}`;
   resources.release?.(path,ImageAsset);
   resources.release?.(path,JsonAsset);
   if(this.motionFamily==='boar')resources.release?.('tower-monsters-motion/boar-v3-enraged',ImageAsset);
  }
 }

 private motionFrame(id: string | number, motion: MonsterMotion): SpriteFrame | null {
  const atlas=this.motionAtlas,ai=motion.ai,m=motion.mechanic;
  if(!atlas||!this.motionTexture||!ai)return null;
  // 2026-11-09: the rhino Boss charges only through M06, and through M20 once it starts charging a pillar; both play the charge clip by mechanic phase.
  // 2026-11-09/11-11: skill clips by mechanic phase (11-11 adds rhino M20 brace before the charge, yak M19 channel, wolf-humanoid M05 howl, tiger/falcon-humanoid M07 stomp; 11-12 adds bat-humanoid M07 stomp, white-tiger M06 charge / M19 channel / M01 cast, snake-lady M03 heal; 11-13 adds yak M05 summon, crocodile-humanoid M12 cast, spider-lady M22 summon / M11 cast, snake-lady M11 cast; M02 rage stays static): bear-humanoid M07 stomp / M04 guard / M09 heave (Meowa), rhino M07 stomp, yak M15 roar. Other skills stay static.
  const skillClip=this.motionFamily==='rhino'&&(m?.skillId==='M06'||m?.skillId==='M20'&&m.chargeStarted)?'charge'
   :({'bear-humanoid':{M07:'stomp',M04:'guard',M09:'heave'},rhino:{M07:'stomp',M20:'brace'},yak:{M15:'roar',M19:'channel',M05:'summon'},'wolf-humanoid':{M05:'howl'},'tiger-humanoid':{M07:'stomp'},'falcon-humanoid':{M07:'stomp'},'bat-humanoid':{M07:'stomp'},'white-tiger':{M06:'charge',M19:'channel',M01:'cast'},'snake-lady':{M03:'heal',M11:'cast'},'crocodile-humanoid':{M12:'cast'},'spider-lady':{M22:'summon',M11:'cast'}} as Record<string,Record<string,string>>)[this.motionFamily]?.[m?.skillId??'']||'';
  if(skillClip&&m&&['windup','active','recovery'].includes(m.phase||'')&&atlas.clips[skillClip]?.phases?.[m.phase!]) {
   const clip=atlas.clips[skillClip];let [offset,count]=clip.phases![m.phase!];
   // M01/M05/M07/M09/M11/M15/M19/M22 resolve on the impact tick (no mechanic active phase), so their recovery opens with the clip's impact frames.
   const instant=['M01','M05','M07','M09','M11','M15','M19','M22'].includes(m.skillId),act=clip.phases!.active;
   if(instant&&m.phase==='recovery'&&act&&act[0]+act[1]===offset){offset=act[0];count+=act[1];}
   // M20 starts directly in its 2s active setup (no windup) and its charge has its own windup, so brace plays windup+active there.
   if(skillClip==='brace'&&m.phase==='active'&&clip.phases!.windup&&act){offset=clip.phases!.windup[0];count=clip.phases!.windup[1]+act[1];}
   const key=`${skillClip}:${m.skillId}:${m.phase}:${m.startedAt??''}`;let track=this.phaseTracks.get(id);
   if(!track||track.key!==key||motion.time<track.time){track={key,start:m.phase==='windup'?Math.min(m.startedAt??motion.time,motion.time):motion.time,time:motion.time,seen:true};this.phaseTracks.set(id,track);}
   track.time=motion.time;track.seen=true;
   const span=Math.max(1e-6,(m.until??motion.time)-track.start),k=Math.min(count-1,Math.floor(Math.max(0,motion.time-track.start)/span*count));
   return this.motionFrames.get(clip.frames[offset+k])||null;
  }
  // Crocodile sweep follows the existing combat phases; mechanics retain their own presentation.
  // 83号：普通熊掌抓、虎爪是普通攻击 bite，复用各自的挥击动作，避免出招时静止。
  if((this.motionFamily==='crocodile'||this.motionFamily==='bear'&&['slam','bite'].includes(ai.attack?.kind??'')||this.motionFamily==='tiger'&&['sweep','bite'].includes(ai.attack?.kind??'')||(this.motionFamily==='wolf-humanoid'||this.motionFamily==='tiger-humanoid')&&['sweep','bite'].includes(ai.attack?.kind??'')||this.motionFamily==='falcon-humanoid'&&ai.attack?.kind==='bite'||(this.motionFamily==='snake'||this.motionFamily==='boar-humanoid')&&ai.attack?.kind==='bite'||this.motionFamily==='boar-humanoid'&&ai.attack?.kind==='charge'||this.motionFamily==='bear-humanoid'&&['slam','bite'].includes(ai.attack?.kind??'')||this.motionFamily==='rhino'&&['sweep','charge'].includes(ai.attack?.kind??'')||this.motionFamily==='yak'&&ai.attack?.kind==='slam'||(this.motionFamily==='bat'||this.motionFamily==='falcon')&&ai.attack?.kind==='bite') && ai.attack && ['windup','active','recovery'].includes(ai.mode)
    && !['windup','active','recovery'].includes(m?.phase||'')) {
   // 低阶妖蝠、妖隼普攻：飞行帧+程序前扑残影（2026-11-06用户验收）；音波/羽弹 shot 仍保持立绘。
   const clip=atlas.clips[(this.motionFamily==='boar-humanoid'||this.motionFamily==='rhino')&&ai.attack.kind==='charge'?'charge':(this.motionFamily==='bear'||this.motionFamily==='bear-humanoid'||this.motionFamily==='yak')?'slam':(this.motionFamily==='bat'||this.motionFamily==='falcon'||this.motionFamily==='snake'||this.motionFamily==='boar-humanoid')?'bite':'sweep'],range=clip?.phases?.[ai.mode];
   if(!clip||!range)return null;
   const [offset,count]=range;
   const duration=ai.mode==='windup'?ai.until-ai.attack.startedAt:
    ai.mode==='active'?ai.attack.active:ai.attack.recovery;
   if(!Number.isFinite(duration)||duration!<=0)return null;
   const progress=Math.max(0,Math.min(1,1-(ai.until-motion.time)/duration!));
   return this.motionFrames.get(clip.frames[offset+Math.min(count-1,Math.floor(progress*count))])||null;
  }
  // Other combat poses have no delivered animation.
  if((this.motionFamily==='bat'||this.motionFamily==='falcon'||this.motionFamily==='crocodile'||this.motionFamily==='bear'||this.motionFamily==='tiger'||this.motionFamily==='rhino'||this.motionFamily==='yak'||this.motionFamily==='wolf-humanoid'||this.motionFamily==='tiger-humanoid'||this.motionFamily==='falcon-humanoid'||this.motionFamily==='bear-humanoid'||this.motionFamily==='snake'||this.motionFamily==='boar-humanoid'||this.motionFamily==='crocodile-humanoid'||this.motionFamily==='white-tiger'||this.motionFamily==='snake-lady'||this.motionFamily==='spider-lady'||this.motionFamily==='bat-humanoid')) {
   if(ai.mode!=='approach'||['windup','active','recovery'].includes(m?.phase||''))return null;
   if((this.motionFamily==='tiger'||this.motionFamily==='rhino'||this.motionFamily==='yak'||this.motionFamily==='wolf-humanoid'||this.motionFamily==='tiger-humanoid'||this.motionFamily==='falcon-humanoid'||this.motionFamily==='bear-humanoid'||this.motionFamily==='snake'||this.motionFamily==='boar-humanoid'||this.motionFamily==='crocodile-humanoid'||this.motionFamily==='white-tiger'||this.motionFamily==='snake-lady'||this.motionFamily==='spider-lady'||this.motionFamily==='bat-humanoid')&&!motion.moving)return null;
   const clip=atlas.clips.move;
   return this.motionFrames.get(clip.frames[Math.floor(Math.max(0,motion.time)*clip.fps)%clip.frames.length])||null;
  }
  let obs=this.observations.get(id);
  if(!obs){obs={hp:motion.hp,hitAt:-Infinity};this.observations.set(id,obs);}
  if(motion.hp!==undefined && obs.hp!==undefined && motion.hp>0 && motion.hp<obs.hp)obs.hitAt=motion.time;
  obs.hp=motion.hp;
  const wolf=this.motionFamily==='wolf',spider=this.motionFamily==='spider';
  let name=motion.moving?'move':(wolf||spider)?'bite':'gore',start=motion.time,end:number|undefined,hold=!motion.moving;
  let offset=0,count:number|undefined;
  if(spider && m?.skillId==='M10' && ['windup','active','recovery'].includes(m.phase||'')) {
   name='cast';hold=false;end=m.until;
   const phase=atlas.clips.cast.phases?.[m.phase!];
   if(phase){[offset,count]=phase;}
   start=m.phase==='windup'?(m.startedAt??motion.time):motion.time;
  } else if(wolf && ['M01','M05'].includes(m?.skillId||'') && ['windup','active','recovery'].includes(m?.phase||'')) {
   name='howl';hold=false;end=m?.until;
   const phase=atlas.clips.howl.phases?.[m?.phase==='windup'?'windup':'recovery'];
   if(phase){[offset,count]=phase;}
   start=m?.phase==='windup'?(m.startedAt??motion.time):motion.time;
  } else if(this.motionFamily==='boar' && m?.skillId==='M06' && ['windup','active','recovery'].includes(m.phase||'')) {
   name=m.phase==='windup'?'charge-start':m.phase==='active'?'charge-loop':'charge-end';hold=false;
   start=m.phase==='windup'?(m.startedAt??motion.time):motion.time;end=m.until;
  } else if(this.motionFamily==='boar' && m?.skillId==='M02'&&m.phase==='windup') {
   name='enrage';hold=false;start=m.startedAt??motion.time;end=m.until;
  } else if(ai.attack&&['windup','active','recovery'].includes(ai.mode)) {
   name=(wolf||spider)?'bite':'gore';hold=false;end=ai.until;
   if(wolf||spider){[offset,count]=atlas.clips.bite.phases![ai.mode];}
   else {offset=ai.mode==='windup'?0:ai.mode==='active'?16:22;count=ai.mode==='windup'?16:ai.mode==='active'?6:10;}
   start=ai.mode==='windup'?ai.attack.startedAt:ai.mode==='active'?ai.until-ai.attack.active:motion.time;
  // 2026-11-13: a hit flinch only replaces the idle pose; while the actor is displaced (e.g. a spider elite backing away) the walk cycle wins, otherwise it slides in the flinch pose.
  } else if(!motion.moving&&motion.time-obs.hitAt<.4) {name='hit';hold=false;start=obs.hitAt;end=obs.hitAt+.4;}
  const clip=atlas.clips[name];if(!clip)return null;
  const key=`${name}:${hold}:${offset}:${end??''}:${ai.attack?.id??''}:${m?.startedAt??''}`;
  let track=this.phaseTracks.get(id);
  if(!track||track.key!==key||motion.time<track.time){track={key,start:Math.min(start,motion.time),time:motion.time,seen:true};this.phaseTracks.set(id,track);}
  track.time=motion.time;track.seen=true;
  const age=Math.max(0,motion.time-track.start),length=count??clip.frames.length;
  const n=hold?0:clip.loop?Math.floor(age*clip.fps)%length:end!==undefined?Math.min(length-1,Math.floor(age/Math.max(1e-8,end-track.start)*length)):Math.min(length-1,Math.floor(age*clip.fps));
  return (this.motionFamily==='boar'&&m?.enraged?this.rageFrames:this.motionFrames).get(clip.frames[offset+n])||null;
 }

 private loadMotion() {
  if (this.motionRequested) return;
  this.motionRequested = true;
  const path=`tower-monsters-motion/${this.motionFamily==='boar'?'boar-v3':this.motionFamily+'-v1'}`;
  const fail = () => { this.motionFailed = true; this.releaseMotion(); };
  try {
   resources.load(path, ImageAsset, (error, image) => {
    if (this.dead || this.motionFailed) return;
    if (error || !image) { fail(); return; }
    image.addRef(); this.motionImage = image; this.prepareMotion();
   });
   if(this.motionFamily==='boar')resources.load('tower-monsters-motion/boar-v3-enraged', ImageAsset, (error,image)=>{
    if(this.dead||this.motionFailed)return;
    if(error||!image){fail();return;}
    image.addRef();this.rageImage=image;this.prepareMotion();
   });
   resources.load(path, JsonAsset, (error, json) => {
    if (this.dead || this.motionFailed) return;
    if (error || !this.validMotion(json?.json)) { fail(); return; }
    this.motionAtlas = json.json as MotionAtlas; this.prepareMotion();
   });
  } catch { fail(); }
 }

 private validMotion(value: any): value is MotionAtlas {
  if (!value || value.version !== 2 || !['left', 'right', 'front'].includes(value.facing)
   || ![value.width, value.height].every(n => Number.isInteger(n) && n > 0)
   || !Array.isArray(value.anchor) || value.anchor.length !== 2
   || !value.anchor.every((n: any) => Number.isFinite(n) && n >= 0 && n <= 1)
   || !value.frames || !value.clips) return false;
  const frames: any[] = Object.values(value.frames);
  if (!frames.length || !frames.every(f => f && [f.x, f.y, f.w, f.h].every(Number.isInteger)
   && f.x >= 0 && f.y >= 0 && f.w > 0 && f.h > 0 && f.w === f.h
   && (f.displayScale===undefined || Number.isFinite(f.displayScale)&&f.displayScale>0&&f.displayScale<=2)
   && (f.anchor===undefined || Array.isArray(f.anchor)&&f.anchor.length===2&&f.anchor.every((n:any)=>Number.isFinite(n)&&n>=0&&n<=1))
   && f.x + f.w <= value.width && f.y + f.h <= value.height)) return false;
  if((this.motionFamily==='bat'||this.motionFamily==='falcon'||this.motionFamily==='crocodile'||this.motionFamily==='bear'||this.motionFamily==='tiger'||this.motionFamily==='rhino'||this.motionFamily==='yak'||this.motionFamily==='wolf-humanoid'||this.motionFamily==='tiger-humanoid'||this.motionFamily==='falcon-humanoid'||this.motionFamily==='bear-humanoid'||this.motionFamily==='snake'||this.motionFamily==='boar-humanoid'||this.motionFamily==='crocodile-humanoid'||this.motionFamily==='white-tiger'||this.motionFamily==='snake-lady'||this.motionFamily==='spider-lady'||this.motionFamily==='bat-humanoid') && !value.clips.move)return false;
  const phasedClip=(this.motionFamily==='crocodile'||this.motionFamily==='rhino'||this.motionFamily==='tiger'||this.motionFamily==='wolf-humanoid'||this.motionFamily==='tiger-humanoid'||this.motionFamily==='falcon-humanoid')?value.clips.sweep:(this.motionFamily==='bear'||this.motionFamily==='bear-humanoid'||this.motionFamily==='yak')?value.clips.slam:(this.motionFamily==='bat'||this.motionFamily==='falcon'||this.motionFamily==='snake'||this.motionFamily==='boar-humanoid')?value.clips.bite:undefined;
  if(phasedClip) {
   for(const phase of ['windup','active','recovery']) {
    const range=phasedClip.phases?.[phase];
    if(!Array.isArray(range)||range.length!==2||!range.every(Number.isInteger)||range[0]<0||range[1]<1||range[0]+range[1]>phasedClip.frames?.length)return false;
   }
  }
  if(this.motionFamily==='spider') {
   for(const name of ['move','bite','cast','hit'])if(!value.clips[name])return false;
   for(const name of ['bite','cast'])for(const phase of ['windup','active','recovery']) {
    const range=value.clips[name].phases?.[phase];
    if(!Array.isArray(range)||range.length!==2||!range.every(Number.isInteger)||range[0]<0||range[1]<1||range[0]+range[1]>value.clips[name].frames?.length)return false;
   }
  }
  if(this.motionFamily==='wolf') {
   for(const name of ['move','bite','howl','hit','death'])if(!value.clips[name])return false;
   for(const [name,phases] of [['bite',['windup','active','recovery']],['howl',['windup','recovery']]] as const) {
    for(const phase of phases){const range=value.clips[name].phases?.[phase];if(!Array.isArray(range)||range.length!==2||!range.every(Number.isInteger)||range[0]<0||range[1]<1||range[0]+range[1]>value.clips[name].frames?.length)return false;}
   }
  }
  return Object.entries(value.clips).every(([name, raw]) => {
   const clip = raw as MotionClip;
   return ['move','gore','bite','sweep','slam','howl','cast','charge','stomp','guard','roar','heave','channel','brace','heal','summon','charge-start','charge-loop','charge-end','enrage','hit','death'].includes(name) && clip
    && Number.isFinite(clip.fps) && clip.fps > 0 && typeof clip.loop === 'boolean'
    && (['move','charge-loop'].includes(name) || !clip.loop) && Array.isArray(clip.frames) && clip.frames.length > 0
    && clip.frames.every(key => Object.prototype.hasOwnProperty.call(value.frames, key));
  });
 }

 private prepareMotion() {
  if (!this.motionImage || (this.motionFamily==='boar'&&!this.rageImage) || !this.motionAtlas || this.motionTexture) return;
  try {
   if (this.motionImage.width !== this.motionAtlas.width || this.motionImage.height !== this.motionAtlas.height) throw Error('Boar atlas dimensions');
   if(this.rageImage && (this.rageImage.width!==this.motionAtlas.width||this.rageImage.height!==this.motionAtlas.height))throw Error('Rage atlas dimensions');
   if(this.rageImage){this.rageTexture=new Texture2D();this.rageTexture.image=this.rageImage;this.rageTexture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);}
   const texture = this.motionTexture = new Texture2D(); texture.image = this.motionImage;
   texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
   for (const [key, info] of Object.entries(this.motionAtlas.frames)) {
    const frame = new SpriteFrame(); this.motionFrames.set(key, frame); this.motionLayouts.set(frame,info); frame.texture = texture;
    frame.rect = new Rect(info.x, info.y, info.w, info.h); frame.originalSize = new Size(info.w, info.h);
    if(this.rageTexture){const red=new SpriteFrame();red.texture=this.rageTexture;red.rect=new Rect(info.x,info.y,info.w,info.h);red.originalSize=new Size(info.w,info.h);this.rageFrames.set(key,red);this.motionLayouts.set(red,info);}
   }
  } catch { this.motionFailed = true; this.releaseMotion(); }
 }

 private releaseMotion() {
  for(const frame of this.rageFrames.values())frame.destroy();this.rageFrames.clear();
  this.rageTexture?.destroy();this.rageTexture=null;this.rageImage?.decRef();this.rageImage=null;
  for (const frame of this.motionFrames.values()) frame.destroy();
  this.motionFrames.clear(); this.motionLayouts.clear(); this.motionTexture?.destroy(); this.motionTexture = null;
  this.motionImage?.decRef(); this.motionImage = null; this.motionAtlas = null;
 }

 private remove(id: string | number, actor: Actor) {
  // Detach immediately; Cocos defers destroy until the end of the frame.
  if (isValid(actor.node, true)) {
   actor.node.active = false; actor.sprite.spriteFrame = null;
   actor.node.removeFromParent(); actor.node.destroy();
  }
  this.actors.delete(id);
 }

 private finish(entry: Entry, error: unknown, image: ImageAsset | null) {
  if (this.dead || entry.done) return;
  entry.done = true;
  if (error || !image || ![256,512].includes(image.width) || image.height !== image.width) return;
  try {
   image.addRef(); entry.image = image;
   const texture = entry.texture = new Texture2D();
   texture.image = image; texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
   const frame = entry.frame = new SpriteFrame(); frame.texture = texture;
  } catch { this.release(entry); }
 }

 private release(entry: Entry) {
  entry.frame?.destroy(); entry.frame = null;
  entry.texture?.destroy(); entry.texture = null;
  entry.image?.decRef(); entry.image = null;
 }
}
