import {assetManager,AssetManager,ImageAsset,Texture2D,SpriteFrame,resources} from 'cc';
import {PHOTO_BUNDLES} from './PhotoBundles';
type Entry={frame:SpriteFrame,texture:Texture2D,image:ImageAsset,refs:number,used:number};
export class PhotoLibrary{
 private static bundles=new Map<string,Promise<AssetManager.Bundle>>();private static pending=new Map<string,Promise<Entry>>();private static cache=new Map<string,Entry>();
 static async acquire(id:string,index=0,preview=false):Promise<{frame:SpriteFrame,release:()=>void}>{
  const path=preview?'previews/'+id:`${id}-${index}`,bundleName=preview?'resources':PHOTO_BUNDLES[id],key=bundleName+'/'+path;
  if(!bundleName)throw Error('没有照片来源');
  if(!this.pending.has(key)&&!this.cache.has(key)){
   const load=(async()=>{
    let bundle:AssetManager.Bundle=resources;
    if(!preview){if(!this.bundles.has(bundleName))this.bundles.set(bundleName,new Promise((resolve,reject)=>assetManager.loadBundle(bundleName,(err,b)=>err?reject(err):resolve(b))));try{bundle=await this.bundles.get(bundleName)!}catch(e){this.bundles.delete(bundleName);throw e}}
    const image=await new Promise<ImageAsset>((resolve,reject)=>bundle.load(path,ImageAsset,(err,a)=>err?reject(err):resolve(a)));
    image.addRef();const texture=new Texture2D();texture.image=image;const frame=new SpriteFrame();frame.texture=texture;
    const entry={frame,texture,image,refs:0,used:Date.now()};this.cache.set(key,entry);return entry;
   })();this.pending.set(key,load);load.then(()=>this.pending.delete(key),()=>this.pending.delete(key));
  }
  const entry=this.cache.get(key)||await this.pending.get(key)!;entry.refs++;entry.used=Date.now();let released=false;
  return {frame:entry.frame,release:()=>{if(released)return;released=true;entry.refs--;this.prune()}};
 }
 private static prune(){const idle=Array.from(this.cache.entries()).filter(([,v])=>v.refs===0).sort((a,b)=>a[1].used-b[1].used);while(this.cache.size>14&&idle.length){const [key,e]=idle.shift()!;this.cache.delete(key);e.frame.destroy();e.texture.destroy();e.image.decRef()}}
}
