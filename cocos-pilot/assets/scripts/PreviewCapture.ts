import {RenderTexture,director,Director,Camera,Vec3} from 'cc';
import {GameSession,FORAGING_SCENES} from './shared/js/cocos/GameSession';
import {ForestMeshes} from './ForestMeshes';
const draw=()=>new Promise<void>(resolve=>director.once(Director.EVENT_AFTER_DRAW,resolve));
export async function capturePreviews(controller:any){
 const original=controller.session,camera:Camera=controller.camera,texture=new RenderTexture(),width=640,height=360,results:string[]=[];
 texture.initialize({width,height});controller.captureMode=true;controller.canvas.active=false;camera.targetTexture=texture;camera.fov=58;
 let forest:ForestMeshes|null=null;
 try{
  for(const scene of FORAGING_SCENES){
   controller.session=new GameSession({getStorageSync(){return null},setStorageSync(){}});controller.session.start('relaxed',scene.id);
   const world=controller.session.world;forest=new ForestMeshes(controller.node,world,controller.materials.items);forest.update(controller.session.state.currentRun);controller.applyLighting();
   const x=scene.environment==='river'?1.4:-1.9,z=8.6;camera.node.setPosition(x,world.heightAt(x,z)+2.3,z);camera.node.lookAt(new Vec3(scene.environment==='river'?4.2:1,1,-1.5));
   await draw();await draw();const pixels=texture.readPixels(0,0,width,height);if(!pixels)throw Error('RenderTexture readback failed');
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d')!,image=ctx.createImageData(width,height);
   for(let y=0;y<height;y++)image.data.set(pixels.subarray((height-1-y)*width*4,(height-y)*width*4),y*width*4);ctx.putImageData(image,0,0);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image encoding failed')),'image/jpeg',.87));
   const response=await fetch('/__preview/'+scene.id+'.jpg',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob});if(!response.ok)throw Error('Preview save failed '+response.status);
   results.push(scene.id);forest.destroy();forest=null;await draw();
  }
  return {ok:true,results};
 }catch(error){return {ok:false,results,error:String(error)}}finally{forest?.destroy();camera.targetTexture=null;texture.destroy();controller.session=original;controller.captureMode=false;controller.canvas.active=true;controller.lastUI=''}
}
