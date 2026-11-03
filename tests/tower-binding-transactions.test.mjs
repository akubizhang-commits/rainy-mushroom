import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';

// Execute the real queue and art callbacks; only Cocos/GPU boundaries are fakes.
function harness(name){
 const jobs=[],textures=[],frames=[],errors=[];let failFrame=0,failTexture=false;
 class Texture2D{
  static Filter={LINEAR:1};
  constructor(){this.destroyed=false;textures.push(this)}
  set image(value){if(failTexture)throw Error('GPU upload');this.value=value}
  setFilters(){}
  destroy(){assert.equal(this.destroyed,false);this.destroyed=true}
 }
 class SpriteFrame{
  constructor(){this.destroyed=false;frames.push(this)}
  set texture(value){if(frames.length===failFrame)throw Error('frame upload');this.value=value}
  destroy(){assert.equal(this.destroyed,false);this.destroyed=true}
 }
 const ctx={console:{error:(...args)=>errors.push(args),warn(){}},setTimeout:()=>1,clearTimeout(){},
  ImageAsset:class{},Texture2D,SpriteFrame,Rect:class{},Color:class{},FlightStreamState:class{reset(){}}};
 const source=n=>stripTypeScriptTypes(readFileSync(new URL(`../cocos-pilot/assets/scripts/${n}.ts`,import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
 runInNewContext(source('TowerAssetQueue')+'\nglobalThis.Queue=TowerAssetQueue',ctx);
 const queue=new ctx.Queue((path,type,done)=>jobs.push({path,type,done}));
 ctx.resources={load:(...args)=>queue.load(...args)};
 runInNewContext(source(name)+`\nglobalThis.Art=${name}`,ctx);
 return {queue,jobs,textures,frames,errors,Art:ctx.Art,
  failAtFrame(n){failFrame=n},failAtTexture(value){failTexture=value},
  image(){return {refs:0,addRef(){this.refs++},decRef(){this.refs--}}}};
}

test('actual flight atlas callback releases a partially built atlas and retries without duplicate frames or refs',()=>{
 const h=harness('FlightStreamArt'),art=new h.Art(),image=h.image();
 h.failAtFrame(13);art.preload();h.jobs[0].done(null,image);
 assert.equal(h.queue.state.failed,1);assert.equal(h.queue.state.restartRequired,0);
 assert.equal(art.ready,false);assert.equal(art.frames.length,0);assert.equal(image.refs,1);
 assert.equal(h.frames.length,13);assert.ok(h.frames.every(f=>f.destroyed));assert.ok(h.textures.every(t=>t.destroyed));
 h.failAtFrame(0);h.queue.retryFailed();
 assert.equal(art.ready,true);assert.equal(art.frames.length,32);assert.equal(image.refs,2);assert.equal(h.jobs.length,1);
 assert.equal(h.frames.filter(f=>!f.destroyed).length,32);
 h.queue.retryFailed();assert.equal(h.frames.length,45);
 art.destroy();h.queue.dispose();assert.equal(image.refs,0);assert.ok(h.frames.every(f=>f.destroyed));
});
for(const failure of ['texture','frame'])test(`actual loading artwork rolls back ${failure} failure before retry`,()=>{
 const h=harness('TowerLoadingScreen'),screen=Object.create(h.Art.prototype),image=h.image();
 Object.assign(screen,{dead:false,artwork:{spriteFrame:null},title:{},tagline:{},image:null,texture:null,frame:null,state:h.queue.state});
 h.queue.onChange=state=>{screen.state=state};
 if(failure==='texture')h.failAtTexture(true);else h.failAtFrame(1);
 screen.loadArtwork();h.jobs[0].done(null,image);
 assert.equal(h.queue.state.failed,1);assert.equal(h.queue.state.restartRequired,0);assert.equal(screen.presentationReady,true);
 assert.equal(screen.image,null);assert.equal(screen.frame,null);assert.equal(screen.texture,null);assert.equal(image.refs,1);
 assert.ok(h.frames.every(f=>f.destroyed));assert.ok(h.textures.every(t=>t.destroyed));
 h.failAtTexture(false);h.failAtFrame(0);h.queue.retryFailed();
 assert.equal(h.queue.state.failed,0);assert.equal(h.jobs.length,1);assert.equal(image.refs,2);
 assert.equal(screen.artwork.spriteFrame,screen.frame);assert.ok(screen.frame);
 screen.releaseArtwork();h.queue.dispose();assert.equal(image.refs,0);assert.equal(screen.artwork.spriteFrame,null);
 assert.ok(h.frames.every(f=>f.destroyed));assert.ok(h.textures.every(t=>t.destroyed));
});
