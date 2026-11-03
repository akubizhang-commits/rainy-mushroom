import {AudioClip,AudioSource,Node,isValid} from 'cc';
import {towerResources as resources} from './TowerResources';
import {presentationPreferences} from './TowerPreferences';
export class TowerBreakthroughAudio {
 private clips=new Map<string,AudioClip>();private source:AudioSource|null=null;private dead=false;private requested=false;
 preload(){if(this.requested||this.dead)return;this.requested=true;for(const name of ['minor','gather','success','failure'])resources.load(`tower-breakthrough/${name}`,AudioClip,(error,clip)=>{if(this.dead||error||!clip)return;clip.addRef();this.clips.set(name,clip);});}
 play(parent:Node,name:string){this.preload();const clip=this.clips.get(name);if(!clip||!isValid(parent,true)||presentationPreferences().soundVolume===0)return;
  if(!this.source||!isValid(this.source,true)){this.source=parent.addComponent(AudioSource);this.source.playOnAwake=false;}
  this.source.stop();this.source.clip=clip;this.source.volume=.6*presentationPreferences().soundVolume;this.source.play();}
 stop(){if(this.source&&isValid(this.source,true))this.source.stop();}
 destroy(){this.dead=true;this.stop();if(this.source&&isValid(this.source,true))this.source.destroy();this.source=null;for(const c of this.clips.values())c.decRef();this.clips.clear();}
}
