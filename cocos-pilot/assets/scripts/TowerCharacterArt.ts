import {towerResources as resources} from './TowerResources';
import { castActionTiming } from './shared/js/xianxia/TowerSkillTiming';
import { WeaponQualityArt } from './WeaponQualityArt';
import { isStarterEquipment } from './shared/js/xianxia/TowerEquipmentTiers';
import { Color, Graphics, ImageAsset, isValid, JsonAsset, Node, Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';

type Pair = [number, number];
type Frame = { x: number; y: number; w: number; h: number; grip: Pair; guard: Pair; direction: Pair };
type Clip = { frames: number[]; fps: number; loop: boolean; hitFrame?: number };
type Atlas = { version: number; width: number; height: number; cellWidth: number; cellHeight: number;
 facing: 'right' | 'left'; anchor: Pair; bodyHeight: number; frames: Frame[]; clips: Record<'idle' | 'walk' | 'run' | 'slash', Clip> & {flightSlash?:Clip} };
type SealAtlas = Omit<Atlas,'clips'> & { clips: Record<string,Clip> };
export type CharacterSample = { time: number; x: number; y: number };
const PATH = 'tower-character/ground-actions';
const RENDER_BODY_HEIGHT = 108;
// Derived from the approved HD illustrations by scripts/art/prepare_held_weapons.py.
const HELD_WEAPONS:Record<string,{guard:Pair;bladePixels:number;bladeLength:number}>={
 eq_sword_biluo:{"guard":[175,60],"bladePixels":543.4722,"bladeLength":72},
 eq_sword_caiyun:{"guard":[190,128],"bladePixels":500.9361,"bladeLength":72},
 eq_sword_chengming:{"guard":[190,129],"bladePixels":450.2022,"bladeLength":72},
 eq_sword_dingyue:{"guard":[186,60],"bladePixels":533.1885,"bladeLength":72},
 eq_sword_duanliu:{"guard":[175,131],"bladePixels":519.9356,"bladeLength":72},
 eq_sword_guiyan:{"guard":[208,123],"bladePixels":489.7397,"bladeLength":72},
 eq_sword_hanguang:{"guard":[177,128],"bladePixels":498.9589,"bladeLength":72},
 eq_sword_hechuan:{"guard":[175,128],"bladePixels":506.928,"bladeLength":72},
 eq_sword_iron:{"guard":[203,123],"bladePixels":494.0162,"bladeLength":46.5},
 eq_sword_jinghong:{"guard":[177,121],"bladePixels":530.1368,"bladeLength":72},
 eq_sword_kunwu:{"guard":[190,127],"bladePixels":520.5247,"bladeLength":72},
 eq_sword_lingxi:{"guard":[188,127],"bladePixels":511.0323,"bladeLength":72},
 eq_sword_liuquan:{"guard":[208,123],"bladePixels":481.3647,"bladeLength":72},
 eq_sword_liuxia:{"guard":[166,61],"bladePixels":542.6389,"bladeLength":72},
 eq_sword_luotian:{"guard":[155,60],"bladePixels":557.2881,"bladeLength":72},
 eq_sword_ningshuang:{"guard":[199,123],"bladePixels":492.4683,"bladeLength":72},
 eq_sword_panxi:{"guard":[209,127],"bladePixels":486.4124,"bladeLength":72},
 eq_sword_qingfeng:{"guard":[163,60],"bladePixels":535.8517,"bladeLength":72},
 eq_sword_qingxiao:{"guard":[163,60],"bladePixels":551.0,"bladeLength":72},
 eq_sword_qiyao:{"guard":[162,65],"bladePixels":533.5804,"bladeLength":72},
 eq_sword_shoushan:{"guard":[200,128],"bladePixels":493.5474,"bladeLength":72},
 eq_sword_songfeng:{"guard":[193,121],"bladePixels":515.2106,"bladeLength":72},
 eq_sword_suwen:{"guard":[208,63],"bladePixels":489.5222,"bladeLength":74},
 eq_sword_taiheng:{"guard":[154,127],"bladePixels":551.6593,"bladeLength":72},
 eq_sword_tianshu:{"guard":[162,59],"bladePixels":536.4644,"bladeLength":72},
 eq_sword_tingyu:{"guard":[149,59],"bladePixels":558.7933,"bladeLength":72},
 eq_sword_wangshu:{"guard":[168,60],"bladePixels":525.9629,"bladeLength":72},
 eq_sword_xiaohan:{"guard":[166,64],"bladePixels":541.7933,"bladeLength":72},
 eq_sword_xingluo:{"guard":[212,125],"bladePixels":503.5871,"bladeLength":72},
 eq_sword_xuanjun:{"guard":[157,61],"bladePixels":557.3455,"bladeLength":72},
 eq_sword_xuanwei:{"guard":[150,63],"bladePixels":558.7021,"bladeLength":72},
 eq_sword_zhaodan:{"guard":[159,126],"bladePixels":555.1333,"bladeLength":72},
 eq_sword_zhaoyuan:{"guard":[156,63],"bladePixels":554.4872,"bladeLength":72},
 eq_sword_zhenyue:{"guard":[183,59],"bladePixels":526.833,"bladeLength":72},
 eq_sword_zhufeng:{"guard":[161,56],"bladePixels":555.9011,"bladeLength":72},
 eq_sword_zhuiri:{"guard":[160,57],"bladePixels":551.7626,"bladeLength":72},
};
type HeldArt={image:ImageAsset;texture:Texture2D;full:SpriteFrame;blade:SpriteFrame;cut:number};
const CAST_STYLE:Record<string,{priority:number;style:string}>={
 basic_attack:{priority:3,style:'sweep'},
 sj_yujian:{priority:1,style:'command'},sj_arc:{priority:3,style:'sweep'},
 sj_moon:{priority:3,style:'sweep'},sj_moon_triple:{priority:3,style:'sweep'},
 sj_cross:{priority:4,style:'sweep'},
 sj_line:{priority:4,style:'thrust'},sj_shadow:{priority:2,style:'seal'},
 sj_sancai:{priority:5,style:'seal'},sj_formation:{priority:5,style:'seal'},evo_sixiang:{priority:5,style:'seal'},
 sj_wanjian:{priority:5,style:'seal'},evo_wuwo:{priority:5,style:'seal'},
 evo_wanjian:{priority:6,style:'command'},evo_tiandi:{priority:7,style:'heavy'},
};

/** Presentation only. Observations never write to the run, RNG, or save state. */
export class TowerCharacterArt {
 constructor(private readonly options:{sealActions?:boolean}={}){}
 private dead = false;
 private requested = false;
 private failed = false;
 private image: ImageAsset | null = null;
 private atlas: Atlas | null = null;
 private texture: Texture2D | null = null;
 private frames: SpriteFrame[] = [];
 private sealRequested=false;
 private sealFailed=false;
 private sealAtlas:SealAtlas|null=null;
 private sealImage:ImageAsset|null=null;
 private sealTexture:Texture2D|null=null;
 private sealFrames:SpriteFrame[]=[];
 private root: Node | null = null;
 private body: Sprite | null = null;
 private sword: Graphics | null = null;
 private heldHilt:Sprite|null=null;
 private heldBlade:Sprite|null=null;
 private heldArt=new Map<string,HeldArt>();
 private heldRequested=new Set<string>();
 private qualityArt=new WeaponQualityArt();
 private qualityLight:Graphics|null=null;
 private qualityTrail:Graphics|null=null;
 private mode: 'idle' | 'walk' | 'run' = 'idle';
 private modeAt = 0;
 private defeated = false;
 private attack: { start: number; release: number; end?:number; face: number; priority:number; style:string } | null = null;
 private bladeColor=new Color('#dce4e6');private guardColor=new Color('#d6bd7f');
 waistPosition:{x:number;y:number}|null=null;
 visibleFacing=1;

 sample(s: any): CharacterSample {
  return { time: s.time, x: s.player.x, y: s.player.y };
 }
 observe(before: CharacterSample, s: any) {
  if (this.updateLife(s)) return;
  const elapsed = s.time - before.time;
  if (elapsed <= 0) return;
  const speed = Math.hypot(s.player.x - before.x, s.player.y - before.y) / elapsed;
  const ratio = speed / Math.max(1, s.player.moveSpeed);
  const mode = speed < 1 ? 'idle' : ratio >= (this.mode === 'run' ? .62 : .72) ? 'run' : 'walk';
  if (mode !== this.mode) { this.mode = mode; this.modeAt = s.time; }
 }
 /** Called only by a live simulation advance, never inferred from a snapshot. */
 observeCast(event: { skill: string; formId?:string; startedAt: number; releaseAt: number; bodyReleaseAt?:number; endsAt?:number; dirX: number; dirY: number; pulseIndex?:number }) {
  const form=event.formId||event.skill,preset=CAST_STYLE[form];
  if (this.dead || this.defeated || !preset || ![event.startedAt,event.releaseAt,event.dirX,event.dirY].every(Number.isFinite)) return;
  // One sword-qi gesture emits the whole volley. Replaying the hit pose on
  // continuation impacts would snap the recovering hand and blade backwards.
  if((['sj_line','sj_arc','sj_moon_triple'].includes(form))&&(event.pulseIndex??1)>1)return;
  // One body cannot perform several simultaneous poses. Let the strongest
  // committed action finish its release before a lower-priority action replaces it.
  if(this.attack&&this.attack.priority>preset.priority&&event.startedAt<this.attack.release-1e-8)return;
  const release = Math.ceil((event.bodyReleaseAt ?? event.releaseAt) * 60 - 1e-8) / 60;
  this.attack = { start: event.startedAt, release, end:event.endsAt, face: event.dirX < 0 ? -1 : 1,...preset };
 }
 reset() { this.mode = 'idle'; this.modeAt = 0; this.attack = null; this.defeated = false; this.qualityArt.reset(); }

 private syncAction(s:any){
  const live=s.actions?.current||s.actions?.basic;
  if(live&&s.time<live.endsAt&&CAST_STYLE[live.skill]){
   let start=live.startedAt,release=live.releaseAt,end=live.endsAt;
   // Split the saved melee action into three complete strokes. Midpoints
   // leave recovery before the next windup; pause/restore uses the same clock.
   if(live.skill==='sj_arc'){
    const times=castActionTiming(live.skill,live.hits??3,live.speed??0).releases.map(t=>live.startedAt+t);
    let index=0;
    while(index<times.length-1&&s.time>=(times[index]+times[index+1])/2)index++;
    start=index? (times[index-1]+times[index])/2:live.startedAt;
    release=times[index];
    end=index<times.length-1?(times[index]+times[index+1])/2:live.endsAt;
   }
   this.attack={start,release,end,
    face:(live.dirX??s.player.faceX)<0?-1:1,...CAST_STYLE[live.skill]};
  }else if(s.actions&&this.attack?.end!==undefined&&s.time>=this.attack.end)this.attack=null;
 }

 private updateLife(s: any) {
  this.defeated = s.player.hp <= 0 || s.phase === 'lost';
  if (this.defeated) {
   this.qualityArt.reset();this.qualityLight?.clear();this.qualityTrail?.clear();
   this.waistPosition=null;
   this.attack = null; this.mode = 'idle';
   if (this.root && isValid(this.root, true)) this.root.active = false;
  }
  return this.defeated;
 }

 /** False asks TowerView to retain its original procedural character. */
 draw(parent: Node, s: any, x: number, groundY: number, flying: boolean): boolean {
  this.waistPosition=null;
  this.visibleFacing=s.player.faceX<0?-1:1;
  if (this.dead || !isValid(parent, true)) return false;
  // Report handled even before assets load so the procedural fallback cannot
  // show a living, attacking character after a lethal simulation tick.
  if (this.updateLife(s)) return true;
  this.load();
  if (!this.atlas || !this.texture || this.failed) return false;
  if (!this.root || !isValid(this.root, true) || this.root.parent !== parent) this.bind(parent);
  this.root!.active = true;
  // The saved action clock is authoritative, including after pause/restore.
  this.syncAction(s);
  if(this.drawSeal(s,x,groundY,flying))return true;
  const bodyTransform=this.body!.node.getComponent(UITransform)!;
  bodyTransform.setContentSize(256,384);
  bodyTransform.setAnchorPoint(this.atlas.anchor[0]/256,1-this.atlas.anchor[1]/384);
  let name: 'idle' | 'walk' | 'run' | 'slash' = flying ? 'idle' : this.mode;
  let ordinal = 0;
  const slash = (flying ? this.atlas.clips.flightSlash : null) || this.atlas.clips.slash, attack = this.attack;
  if (attack && s.time >= attack.start && (!flying || this.atlas.clips.flightSlash)) {
   const hit = slash.hitFrame!;
   ordinal = s.time < attack.release
    ? Math.min(Math.max(0, hit - 1), Math.floor((s.time - attack.start) / Math.max(1e-8, attack.release - attack.start) * hit))
    : hit + Math.floor((s.time - attack.release + 1e-8) *
      (attack.end!==undefined ? (slash.frames.length-hit)/Math.max(1e-8,attack.end-attack.release) : slash.fps));
   if (ordinal < slash.frames.length) name = 'slash';
  }
  const clip = name==='slash' ? slash : this.atlas.clips[name];
  if (name !== 'slash') {
   const age = Math.max(0, s.time - (flying ? 0 : this.modeAt));
   ordinal = Math.floor(age * clip.fps);
   ordinal = clip.loop ? ordinal % clip.frames.length : Math.min(ordinal, clip.frames.length - 1);
  }
  // Riding slash frames retain frame 1's planted soles while the
  // authored upper body and equipment anchors complete the sword swing.
  const index = flying && name!=='slash' ? 1 : clip.frames[ordinal], frame = this.atlas.frames[index];
  this.body!.spriteFrame = this.frames[index];
  const face = name === 'slash' && !flying ? attack!.face : s.player.faceX < 0 ? -1 : 1;
  this.visibleFacing=face;
  // Align both planted soles (frame 1, row 283) with the riding blade surface.
  this.root!.setPosition(x, groundY + (flying ? 15 + Math.sin(s.time * 3) * 2 : 0));
  const scale = RENDER_BODY_HEIGHT / this.atlas.bodyHeight;
  this.root!.setScale(face * (this.atlas.facing === 'left' ? -1 : 1) * scale, scale, 1);
  // Existing slash frames support each release; these restrained timing/lean
  // accents are procedural staging, not newly authored animation clips.
  this.root!.angle=name==='slash'&&!flying
   ?face*(attack!.style==='heavy'?-5:attack!.style==='thrust'?3:attack!.style==='sweep'?-2:0)
   :0;
  // Belt center measured on the 256×384 ground-action cells. Apply the same
  // mirror, body scale, lean and flight bob as the character, not its foot anchor.
  const wx=(140-this.atlas.anchor[0])*scale*face*(this.atlas.facing==='left'?-1:1);
  const wy=(this.atlas.anchor[1]-201)*scale,a=this.root!.angle*Math.PI/180;
  this.waistPosition={x:x+wx*Math.cos(a)-wy*Math.sin(a),
   y:groundY+(flying?15+Math.sin(s.time*3)*2:0)+wx*Math.sin(a)+wy*Math.cos(a)};
  this.drawSword(frame, s.loadout?.weapon, s.loadout?.weaponId,this.atlas,s.time,name==='slash'&&ordinal>=slash.hitFrame!&&ordinal<slash.frames.length-1,`${face}:${flying}`);
  return true;
 }

 clearBindings() {
  this.waistPosition=null;
  if (this.root && isValid(this.root, true)) {
   this.root.active = false;
   if (this.body) this.body.spriteFrame = null;
   this.root.removeFromParent(); this.root.destroy();
  }
  this.root = null; this.body = null; this.sword = null;
  this.heldHilt=null;this.heldBlade=null;
  this.qualityLight=null;this.qualityTrail=null;this.qualityArt.reset();
 }
 destroy() {
  if (this.dead) return;
  this.dead = true; this.clearBindings(); this.release();this.releaseSeal();
  for(const art of this.heldArt.values()){
   art.full.destroy();art.blade.destroy();art.texture.destroy();art.image.decRef();
  }
  this.heldArt.clear();
 }
 private release() {
  for (const frame of this.frames) frame.destroy();
  this.frames = []; this.texture?.destroy(); this.texture = null;
  this.image?.decRef(); this.image = null; this.atlas = null;
 }
 private bind(parent: Node) {
  this.clearBindings();
  const root = this.root = new Node('角色动作'); root.layer = parent.layer; parent.addChild(root);
  root.addComponent(UITransform).setContentSize(256, 384);
  const trail=new Node('武器品质拖尾');trail.layer=root.layer;root.addChild(trail);
  trail.addComponent(UITransform);this.qualityTrail=trail.addComponent(Graphics);
  // Hilt is behind the original fingers; blade and guard are in front of the robe.
  this.heldHilt=this.bindHeldSprite(root,'手持武器剑柄');
  const body = new Node('角色人身'); body.layer = parent.layer; root.addChild(body);
  const transform = body.addComponent(UITransform);
  const anchor = this.atlas!.anchor;
  transform.setContentSize(256, 384); transform.setAnchorPoint(anchor[0] / 256, 1 - anchor[1] / 384);
  this.body = body.addComponent(Sprite); this.body.sizeMode = Sprite.SizeMode.CUSTOM; this.body.trim = false;
  const sword = new Node('角色手持剑'); sword.layer = parent.layer; root.addChild(sword);
  sword.addComponent(UITransform).setContentSize(256, 384); this.sword = sword.addComponent(Graphics);
  this.heldBlade=this.bindHeldSprite(root,'手持武器剑身');
  const light=new Node('武器品质刃光');light.layer=root.layer;root.addChild(light);
  light.addComponent(UITransform);this.qualityLight=light.addComponent(Graphics);
 }
 private bindHeldSprite(parent:Node,name:string):Sprite{
  const node=new Node(name);node.layer=parent.layer;parent.addChild(node);
  node.addComponent(UITransform);
  const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;
  sprite.trim=false;sprite.color=new Color('#ffffff');node.active=false;return sprite;
 }
 private loadHeld(id:string){
  if(this.heldRequested.has(id))return;
  this.heldRequested.add(id);
  resources.load('tower-held-weapons-v2/'+id,ImageAsset,(error,image)=>{
   if(this.dead||error||!image)return;
   image.addRef();
   const texture=new Texture2D();
   // Set before upload: the engine allocates and generates the mip chain on image assignment.
   // POT padding and invisible RGB bleed are prepared offline, retaining the HD blade.
   texture.setMipFilter(Texture2D.Filter.LINEAR);
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   texture.image=image;
   // Include the complete guard on the foreground slice, but let the hand occlude the grip.
   const cut=Math.max(0,HELD_WEAPONS[id].guard[0]-20);
   const make=(x:number,width:number)=>{
    const f=new SpriteFrame();f.texture=texture;f.rect=new Rect(x,0,width,image.height);
    f.originalSize=new Size(width,image.height);return f;
   };
   this.heldArt.set(id,{image,texture,cut,full:make(0,cut),blade:make(cut,image.width-cut)});
  });
 }
 private drawHeld(id:string,guard:Pair,dx:number,dy:number,bodyScale:number):boolean{
  this.heldHilt!.node.active=false;this.heldBlade!.node.active=false;
  const spec=HELD_WEAPONS[id];if(!spec)return false;
  this.loadHeld(id);
  const art=this.heldArt.get(id);if(!art)return false;
  const scale=spec.bladeLength/spec.bladePixels/bodyScale;
  for(const [sprite,frame,cut] of [[this.heldHilt!,art.full,0],[this.heldBlade!,art.blade,art.cut]] as [Sprite,SpriteFrame,number][]){
   sprite.node.active=true;sprite.spriteFrame=frame;
   const width=cut===0?art.cut:art.image.width-cut,ui=sprite.node.getComponent(UITransform)!;
   ui.setContentSize(width*scale,art.image.height*scale);
   ui.setAnchorPoint((spec.guard[0]-cut)/width,1-spec.guard[1]/art.image.height);
   sprite.node.setPosition(guard[0],guard[1]);sprite.node.angle=Math.atan2(dy,dx)*180/Math.PI;
  }
  return true;
 }
 private drawSeal(s:any,x:number,groundY:number,flying:boolean):boolean{
  const a=this.attack,atlas=this.sealAtlas;
  if(!a||!atlas||!this.sealFrames.length||!['seal','command'].includes(a.style)
   ||s.time<a.start||s.time>=(a.end??a.release+.2))return false;
  const face=flying?(s.player.faceX<0?-1:1):a.face;
  const side=face<0?'left':'right',end=a.end??a.release+.2;
  // Preserve an explicit release pose, then recover inside the authoritative
  // action window. Effect lifetimes never hold the character's action open.
  const recoveryAt=a.release+(end-a.release)*.3;
  const sealAt=a.start+(a.release-a.start)*.65;
  let phase:string,progress:number;
  if(s.time<sealAt){phase='Windup';progress=(s.time-a.start)/Math.max(1e-8,sealAt-a.start)}
  else if(s.time<recoveryAt){phase='Hold';progress=(s.time-sealAt)/Math.max(1e-8,recoveryAt-sealAt)}
  else{phase='Recovery';progress=(s.time-recoveryAt)/Math.max(1e-8,end-recoveryAt)}
  const clip=atlas.clips[side+phase];
  const ordinal=Math.min(clip.frames.length-1,Math.max(0,Math.floor(progress*clip.frames.length)));
  const index=clip.frames[ordinal],frame=atlas.frames[index];
  this.body!.spriteFrame=this.sealFrames[index];
  const ui=this.body!.node.getComponent(UITransform)!;
  ui.setContentSize(atlas.cellWidth,atlas.cellHeight);
  ui.setAnchorPoint(atlas.anchor[0]/atlas.cellWidth,1-atlas.anchor[1]/atlas.cellHeight);
  const scale=RENDER_BODY_HEIGHT/atlas.bodyHeight,bob=flying?15+Math.sin(s.time*3)*2:0;
  this.root!.setPosition(x,groundY+bob);this.root!.setScale(scale,scale,1);this.root!.angle=0;
  this.visibleFacing=face;
  this.waistPosition={x,y:groundY+bob+RENDER_BODY_HEIGHT*.52};
  this.drawSword(frame,s.loadout?.weapon,s.loadout?.weaponId,atlas,s.time,false,`seal:${face}:${flying}`);
  return true;
 }
 private drawSword(frame: Frame, weapon: any, weaponId: string,atlas:Atlas|SealAtlas=this.atlas!,time=0,active=false,binding='') {
  const g = this.sword!; g.clear();
  const anchor = atlas.anchor, scale = RENDER_BODY_HEIGHT / atlas.bodyHeight;
  const point = (p: Pair): Pair => [p[0] - anchor[0], anchor[1] - p[1]];
  const guard = point(frame.guard);
  const length = Math.hypot(...frame.direction), dx = frame.direction[0] / length, dy = -frame.direction[1] / length;
  const id = weapon?.definitionId || weaponId || '';
  const broad = ['zhenyue', 'xuanjun', 'tianshu', 'taiheng', 'dingyue', 'panxi', 'xingluo', 'shoushan'].some(key => id.includes(key));
  const held=this.drawHeld(id,guard,dx,dy,scale);
  // Visual length only: sized for the 108-unit body, unrelated to skill reach.
  const displayLength=held?HELD_WEAPONS[id].bladeLength:isStarterEquipment(weapon)?46.5:broad?58.5:72;
  this.qualityArt.draw(this.qualityLight!,this.qualityTrail!,{
   id,quality:weapon?.quality,time,guard,direction:[dx,dy],length:displayLength,scale,
   edge:held?(broad?2.8:1.5):(broad?4.5:2.5),warm:broad,active,binding:binding+':'+held,
  });
  if(held)return;
  const bladeLength = displayLength / scale;
  const half = (broad ? 4.5 : 2.5) / scale, gx = guard[0], gy = guard[1];
  // Keep the shaft 5 (broad: 9) design units wide. A long triangular taper
  // exposes the narrow robe repair underneath the removed source blade.
  const shoulder = bladeLength - 4 / scale;
  // The source retains its hand and grip. Replace only guard-to-tip artwork.
  g.fillColor = this.bladeColor;
  g.moveTo(gx - dy * half, gy + dx * half);
  g.lineTo(gx + dx * shoulder - dy * half, gy + dy * shoulder + dx * half);
  g.lineTo(gx + dx * bladeLength, gy + dy * bladeLength);
  g.lineTo(gx + dx * shoulder + dy * half, gy + dy * shoulder - dx * half);
  g.lineTo(gx + dy * half, gy - dx * half); g.close(); g.fill();
  g.strokeColor = this.guardColor; g.lineWidth = 3 / scale;
  g.moveTo(gx - dy * 8 / scale, gy + dx * 8 / scale);
  g.lineTo(gx + dy * 8 / scale, gy - dx * 8 / scale); g.stroke();
 }
 private load() {
  if(this.options.sealActions!==false)this.loadSeal();
  if (this.requested) return;
  this.requested = true;
  const fail = () => { this.failed = true; this.release(); };
  try {
   resources.load(PATH, ImageAsset, (error, image) => {
    if (this.dead || this.failed) return;
    if (error || !image) { fail(); return; }
    image.addRef(); this.image = image; this.prepare();
   });
   resources.load(PATH, JsonAsset, (error, asset) => {
    if (this.dead || this.failed) return;
    if (error || !this.valid(asset?.json)) { fail(); return; }
    this.atlas = asset.json as Atlas; this.prepare();
   });
  } catch { fail(); }
 }
 private releaseSeal(){
  for(const f of this.sealFrames)f.destroy();
  this.sealFrames=[];this.sealTexture?.destroy();this.sealTexture=null;
  this.sealImage?.decRef();this.sealImage=null;this.sealAtlas=null;
 }
 private loadSeal(){
  if(this.sealRequested)return;this.sealRequested=true;
  const fail=()=>{this.sealFailed=true;this.releaseSeal()};
  const prepare=()=>{
   if(!this.sealImage||!this.sealAtlas||this.sealTexture)return;
   const a=this.sealAtlas;
   if(this.sealImage.width!==a.width||this.sealImage.height!==a.height){fail();return}
   try{
    const texture=this.sealTexture=new Texture2D();texture.image=this.sealImage;
    texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    for(const info of a.frames){
     const f=new SpriteFrame();this.sealFrames.push(f);f.texture=texture;
     f.rect=new Rect(info.x,info.y,info.w,info.h);f.originalSize=new Size(info.w,info.h);
    }
   }catch{fail()}
  };
  try{
   resources.load('tower-character/seal-actions',ImageAsset,(err,image)=>{
    if(this.dead||this.sealFailed)return;
    if(err||!image){fail();return}image.addRef();this.sealImage=image;prepare();
   });
   resources.load('tower-character/seal-actions',JsonAsset,(err,asset)=>{
    if(this.dead||this.sealFailed)return;
    const a=asset?.json;
    const pair=(p:any)=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
    const names=['rightWindup','rightHold','rightRecovery','leftWindup','leftHold','leftRecovery'];
    if(err||!a||a.version!==1||a.cellWidth!==512||a.cellHeight!==512
     ||!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.width<=0||a.height<=0
     ||!Number.isFinite(a.bodyHeight)||a.bodyHeight<=0||a.bodyHeight>512
     ||!pair(a.anchor)||a.anchor.some((v:number)=>v<0||v>512)
     ||!Array.isArray(a.frames)||!a.frames.length
     ||!a.frames.every((f:any)=>f&&Number.isInteger(f.x)&&Number.isInteger(f.y)&&f.x>=0&&f.y>=0
       &&f.w===512&&f.h===512&&f.x+512<=a.width&&f.y+512<=a.height
       &&pair(f.grip)&&pair(f.guard)&&pair(f.direction)&&Math.hypot(...f.direction)>0)
     ||!names.every(name=>{const c=a.clips?.[name];return c&&Number.isFinite(c.fps)&&c.fps>0
       &&typeof c.loop==='boolean'&&Array.isArray(c.frames)&&c.frames.length
       &&c.frames.every((i:any)=>Number.isInteger(i)&&i>=0&&i<a.frames.length)})){fail();return}
    this.sealAtlas=a;prepare();
   });
  }catch{fail()}
 }
 private valid(value: any): value is Atlas {
  const pair = (p: any) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
  if (!value || value.version !== 1 || value.cellWidth !== 256 || value.cellHeight !== 384
   || ![value.width, value.height].every(n => Number.isInteger(n) && n > 0)
   || !['left', 'right'].includes(value.facing) || !pair(value.anchor) || value.anchor[0] < 0 || value.anchor[0] > 256
   || value.anchor[1] < 0 || value.anchor[1] > 384 || !Number.isFinite(value.bodyHeight) || value.bodyHeight <= 0 || value.bodyHeight > 384
   || !Array.isArray(value.frames) || !value.frames.length || !value.clips) return false;
  if (!value.frames.every((f: any) => f && [f.x, f.y].every(n => Number.isInteger(n) && n >= 0)
   && f.w === 256 && f.h === 384 && pair(f.grip) && pair(f.guard) && pair(f.direction) && Math.hypot(...f.direction) > 0)) return false;
  for (const name of ['idle', 'walk', 'run', 'slash', ...(value.clips.flightSlash?['flightSlash']:[])]) {
   const c = value.clips[name];
   if (!c || !Array.isArray(c.frames) || !c.frames.length || !c.frames.every((i: any) => Number.isInteger(i) && i >= 0 && i < value.frames.length)
    || !Number.isFinite(c.fps) || c.fps <= 0 || typeof c.loop !== 'boolean') return false;
  }
  return [value.clips.slash,value.clips.flightSlash].filter(Boolean).every(c=>
   !c.loop && Number.isInteger(c.hitFrame) && c.hitFrame >= 0 && c.hitFrame < c.frames.length);
 }
 private prepare() {
  if (!this.image || !this.atlas || this.texture) return;
  try {
   if (this.image.width !== this.atlas.width || this.image.height !== this.atlas.height) throw Error('Character atlas dimensions mismatch');
   if (this.atlas.frames.some(f => f.x + f.w > this.image!.width || f.y + f.h > this.image!.height)) throw Error('Character frame outside atlas');
   const texture = this.texture = new Texture2D(); texture.image = this.image;
   texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
   for (const info of this.atlas.frames) {
    const frame = new SpriteFrame(); this.frames.push(frame); frame.texture = texture;
    frame.rect = new Rect(info.x, info.y, info.w, info.h); frame.originalSize = new Size(info.w, info.h);
   }
  } catch { this.failed = true; this.release(); }
 }
}
