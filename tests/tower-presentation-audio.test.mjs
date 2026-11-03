import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
function fixture(name){
 let volume=1;const sounds=[];
 class AudioClip{addRef(){}decRef(){}}
 class AudioSource{volume=1;playing=false;stop(){this.playing=false;}play(){this.playing=true;}destroy(){}}
 const context={AudioClip,AudioSource,ImageAsset:class{},isValid:()=>true,presentationPreferences:()=>({soundVolume:volume}),
  resources:{load(_path,type,callback){type===AudioClip?callback(null,new AudioClip()):callback(Error('no visual in audio test'));}}};
 const source=stripTypeScriptTypes(readFileSync(new URL(`../cocos-pilot/assets/scripts/${name}.ts`,import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
 const Type=runInNewContext(source+`;${name}`,context),art=new Type(),parent={addComponent(Type){const source=new Type();sounds.push(source);return source;}};
 return {art,parent,sounds,volume:v=>volume=v};
}
test('Qingping sound honors volume changes and stops on pause without mutating combat state',()=>{
 const f=fixture('QingpingAudio');const state={phase:'playing',time:0,player:{hp:100},enemies:[{id:'a',hp:10,qingping:{startedAt:0,applied:false}}],effects:[]};
 const before=JSON.stringify(state);f.volume(.25);f.art.sync(f.parent,state);
 assert.equal(f.sounds[0].volume,.125);assert.equal(f.sounds[0].playing,true);assert.equal(JSON.stringify(state),before);
 f.volume(0);f.art.sync(f.parent,state);assert.equal(f.sounds[0].volume,0);
 state.phase='paused';f.art.sync(f.parent,state);assert.equal(f.sounds[0].playing,false);
});
test('sword burst existing source follows sound volume and pause',()=>{
 const f=fixture('SwordBurstArt'),state={phase:'playing',time:0,player:{hp:100},enemies:[],effects:[]};
 f.volume(.5);f.art.sync(f.parent,{},state,{x:0,y:0});assert.equal(f.sounds[0].volume,.275);
 f.sounds[0].playing=true;f.volume(0);state.phase='paused';f.art.sync(f.parent,{},state,{x:0,y:0});
 assert.equal(f.sounds[0].volume,0);assert.equal(f.sounds[0].playing,false);
});
