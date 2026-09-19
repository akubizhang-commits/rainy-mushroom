import {Material,ImageAsset,Texture2D,resources,gfx,Vec4} from 'cc';
export class HabitatMaterials{
 items:Record<string,Material>={};private textures:Texture2D[]=[];private waterOffset=new Vec4(1,1,0,0);private pending:Promise<this>|null=null;private disposed=false;
 load():Promise<this>{
  if(this.disposed)return Promise.reject(Error('Material owner destroyed'));
  if(this.items.water)return Promise.resolve(this);
  if(!this.pending)this.pending=this.prepare().finally(()=>{this.pending=null});return this.pending;
 }
 private async prepare():Promise<this>{
  const base=await new Promise<Material>((resolve,reject)=>resources.load('forest',Material,(err,a)=>err?reject(err):resolve(a)));
  const staged:Record<string,Material>={},textures:Texture2D[]=[];
  // Await every request before cleanup so a late completion cannot leak a texture.
  const errors=await Promise.all(['forest','ground','bark','leaves','stone','fungus','water'].map(async kind=>{
   try{
    const mat=new Material();staged[kind]=mat;mat.initialize({effectAsset:base.effectAsset,defines:{USE_VERTEX_COLOR:true,USE_ALBEDO_MAP:kind!=='forest'},states:kind==='leaves'?{rasterizerState:{cullMode:gfx.CullMode.NONE}}:undefined});mat.setProperty('roughness',kind==='water'?.24:kind==='fungus'?.63:.94);mat.setProperty('metallic',kind==='water'?.12:0);
    if(kind!=='forest'){
     const image=await new Promise<ImageAsset>((resolve,reject)=>resources.load('materials/'+kind,ImageAsset,(err,a)=>err?reject(err):resolve(a)));
     const texture=new Texture2D();textures.push(texture);texture.image=image;texture.setWrapMode(Texture2D.WrapMode.REPEAT,Texture2D.WrapMode.REPEAT);texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);mat.setProperty('mainTexture',texture);
    }
    return null;
   }catch(error){return error||Error('Material load failed')}
  }));
  if(this.disposed||errors.some(Boolean)){for(const m of Object.values(staged))m.destroy();for(const t of textures)t.destroy();throw errors.find(Boolean)||Error('Material owner destroyed')}
  this.items=staged;this.textures=textures;return this;
 }
 update(time:number){this.waterOffset.set(1,1,time*.011,time*.019);this.items.water?.setProperty('tilingOffset',this.waterOffset)}
 destroy(){this.disposed=true;for(const m of Object.values(this.items))m.destroy();for(const t of this.textures)t.destroy();this.items={};this.textures=[]}
}
