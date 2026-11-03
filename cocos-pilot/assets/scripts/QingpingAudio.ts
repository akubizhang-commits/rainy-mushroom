import { presentationPreferences } from './TowerPreferences';
import {towerResources as resources} from './TowerResources';
import {AudioClip,AudioSource,Node,isValid} from 'cc';
/** One swoosh per pending sword; impact audio requires its real positive damage receipt. */
export class QingpingAudio {
 private clips=new Map<string,AudioClip>();private sources=new Map<string,AudioSource>();
 private seen=new Set<string>();private state:any=null;private time=-1;private dead=false;private requested=false;
 preload(){if(this.requested||this.dead)return;this.requested=true;for(const name of ['swoosh','impact'])resources.load(`tower-skill-fx/qingping-${name}`,AudioClip,(err,clip)=>{if(this.dead||err||!clip)return;clip.addRef();this.clips.set(name,clip)})}
 sync(parent:Node,s:any){
  this.preload();if(this.state!==s||s.time<this.time){this.reset();this.state=s}this.time=s.time;
  for(const a of this.sources.values())a.volume=.5*presentationPreferences().soundVolume;
  if(s.phase!=='playing'||s.player.hp<=0){for(const a of this.sources.values())a.stop();return}
  const play=(id:string,name:string)=>{if(this.seen.has(id))return;this.seen.add(id);const clip=this.clips.get(name);if(!clip||!isValid(parent,true))return;let a=this.sources.get(name);if(!a){a=parent.addComponent(AudioSource);a.playOnAwake=false;a.volume=.5*presentationPreferences().soundVolume;this.sources.set(name,a)}a.stop();a.clip=clip;a.play()};
  for(const e of s.enemies||[]){const q=e.qingping;if(e.hp>0&&q&&!q.applied&&s.time-q.startedAt<.15)play(`${e.id}:${q.startedAt}`,'swoosh')}
  for(const e of s.effects||[])if(e.kind==='hit'&&e.impact?.skill==='sj_mark'&&e.damage>0&&s.time-e.startedAt<.12)play(e.id,'impact');
  if(this.seen.size>2048){this.seen.clear()}
 }
 reset(){for(const a of this.sources.values()){a.stop();a.destroy()}this.sources.clear();this.seen.clear();this.state=null;this.time=-1}
 destroy(){this.dead=true;this.reset();for(const c of this.clips.values())c.decRef();this.clips.clear()}
}
