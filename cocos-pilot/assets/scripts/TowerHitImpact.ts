import {AudioClip,AudioSource,Node,isValid} from 'cc';
import {towerResources as resources} from './TowerResources';
import {presentationPreferences} from './TowerPreferences';
import {hitImpact} from './shared/js/xianxia/TowerHitFeedback';

const SOUNDS=['slash','crescent','stab','graze','drop','heavy'];
// Per-sound base volume: light layers stay under heavy ones.
const VOLUME:Record<string,number>={slash:.42,crescent:.48,stab:.38,graze:.22,drop:.46,heavy:.62};
const MAX_PER_FRAME=3;

/** 2026-11-09 打击感（game-feel）：每个真实正伤害命中只读一次，按档位驱动
 * 音效、衰减式镜头震动和受击怪物的动画定格。全部是表现层：不写战斗状态，
 * 镜头只偏移相机，定格只替换传给怪物渲染器的动画时间。 */
export class TowerHitImpact {
 private clips=new Map<string,AudioClip>();private source:AudioSource|null=null;
 private requested=false;private dead=false;
 private seen=new Set<string>();private state:any=null;private time=-1;
 private lastSound=new Map<string,number>();private lastKick=new Map<string,number>();
 private trauma=0;private holds=new Map<string|number,{at:number;until:number}>();

 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  for(const name of SOUNDS)resources.load(`tower-skill-fx/hit-${name}`,AudioClip,(err,clip)=>{
   if(this.dead||err||!clip)return;clip.addRef();this.clips.set(name,clip);
  });
 }

 /** Call once per drawn frame, before the camera and monsters are drawn. */
 sync(parent:Node|null,s:any){
  this.preload();
  if(this.state!==s||!Number.isFinite(s?.time)||s.time<this.time)this.reset(s);
  const dt=Math.max(0,s.time-this.time);this.time=s.time;
  this.trauma=Math.max(0,this.trauma-dt*3.2);
  // A real pause adds no new hits; only settled or failed runs stop the feedback.
  if(!['playing','paused'].includes(s.phase)||!(s.player?.hp>0)){this.trauma=0;this.holds.clear();return}
  if(parent&&(!this.source||!isValid(this.source,true))&&isValid(parent,true)){
   this.source=parent.addComponent(AudioSource);this.source.playOnAwake=false;
  }
  const prefs=presentationPreferences();let played=0,kick=0;
  for(const e of s.effects||[]){
   if(e?.kind!=='hit'||!e.id||this.seen.has(e.id))continue;
   const at=e.startedAt??e.expiresAt-.25;if(!Number.isFinite(at)||s.time-at>.12)continue;
   this.seen.add(e.id);
   const impact=hitImpact(e);if(!impact)continue;
   if(impact.sound&&played<MAX_PER_FRAME&&s.time-(this.lastSound.get(impact.sound)??-9)>=impact.gap){
    const clip=this.clips.get(impact.sound);
    if(clip&&this.source&&prefs.soundVolume>0){
     this.source.playOneShot(clip,VOLUME[impact.sound]*prefs.soundVolume*(e.critical?1.15:1));
     this.lastSound.set(impact.sound,s.time);played++;
    }
   }
   if(impact.kick>0&&s.time-(this.lastKick.get(impact.skill)??-9)>=.1){
    kick=Math.max(kick,impact.kick);this.lastKick.set(impact.skill,s.time);
   }
   if(impact.hold>0){
    const old=this.holds.get(e.targetId);
    if(!old||old.until<=at)this.holds.set(e.targetId,{at,until:at+impact.hold});
    else old.until=Math.max(old.until,at+impact.hold);
   }
  }
  // Hits add trauma; they never reset it. Cap keeps a volley readable.
  this.trauma=Math.min(.8,this.trauma+kick);
  for(const [id,h] of this.holds)if(h.until<=s.time)this.holds.delete(id);
  if(this.seen.size>4096)this.seen.clear();
 }

 /** Smooth decaying shake (trauma²), never a per-frame random jitter. */
 cameraKick(time:number){
  if(this.trauma<=0||presentationPreferences().reducedMotion)return {x:0,y:0};
  const k=this.trauma*this.trauma;
  return {x:6*k*Math.sin(time*61),y:3.5*k*Math.sin(time*83+1.3)};
 }

 /** Animation time for a monster: frozen at the hit moment while the hold lasts.
  * Enemies telegraphing an attack keep real time so warnings stay accurate. */
 monsterTime(e:any,time:number){
  const h=this.holds.get(e?.id);
  if(!h||presentationPreferences().reducedMotion||e?.ai?.attack)return time;
  return time<h.until?Math.min(time,h.at):time;
 }

 reset(s:any=null){
  this.seen.clear();this.lastSound.clear();this.lastKick.clear();this.holds.clear();
  this.trauma=0;this.state=s;this.time=Number.isFinite(s?.time)?s.time:-1;
  // Effects already on screen when a run is (re)attached do not replay.
  for(const e of s?.effects||[])if(e?.kind==='hit'&&e.id)this.seen.add(e.id);
 }

 destroy(){
  this.dead=true;this.reset();
  if(this.source&&isValid(this.source,true))this.source.destroy();this.source=null;
  for(const c of this.clips.values())c.decRef();this.clips.clear();
 }
}
