import {Node,Mesh,MeshRenderer,Material,utils,Mat4,Vec3,Quat} from 'cc';
import {indexedGeometry,buildSceneChunks,animalParts,animalMatrix} from './shared/js/cocos/GameSession';

// One mesh per spatial chunk, not one node/draw-call for every blade of grass.
export class ForestMeshes {
  root:Node; meshes:Mesh[]=[]; targets=new Map<string,Node>();covers=new Map<string,Node>();actors=new Map<any,Node[]>();
  animalMeshes=new Map<string,Mesh>();world:any;
  private visibilityKey='';private matrix=new Mat4(); private pos=new Vec3();private rot=new Quat();private scale=new Vec3();
  constructor(parent:Node,world:any,private material:Material|Record<string,Material>){
    this.world=world;this.root=new Node('Habitat forest');parent.addChild(this.root);
    for(const surface of world.surfaces||[{kind:'forest',data:world.vertices}])for(const [i,chunk]of buildSceneChunks(surface.data).entries())this.addMesh(surface.kind+' '+i,chunk.data,this.root,surface.kind);
    if(world.water?.length)this.addMesh('Stream',world.water,this.root,'water');
    if(world.tracks?.length)this.addMesh('Animal tracks',world.tracks,this.root,'ground');
    for(const target of world.targets)this.targets.set(target.id,this.addMesh(target.id,target.data,this.root,'fungus'));
    for(const cover of world.covers)this.covers.set(cover.id,this.addMesh('Cover '+cover.id,cover.data,this.root,'ground'));
  }
  makeMesh(data:Float32Array,kind='forest'):Mesh{
    const mesh=utils.createMesh(indexedGeometry(data,kind),undefined,{calculateBounds:true});this.meshes.push(mesh);return mesh;
  }
  addMesh(name:string,data:Float32Array,parent:Node,kind='forest'):Node{
    const group=new Node(name);parent.addChild(group);
    // Stay below 16-bit indices even when the scene grows.
    for(let offset=0;offset<data.length;offset+=540000){
      const n=new Node(name+' mesh');group.addChild(n);const r=n.addComponent(MeshRenderer);
      r.mesh=this.makeMesh(data.subarray(offset,Math.min(data.length,offset+540000)),kind);r.setSharedMaterial(this.getMaterial(kind),0);r.shadowCastingMode=['bark','forest','leaves','fungus'].includes(kind)?MeshRenderer.ShadowCastingMode.ON:MeshRenderer.ShadowCastingMode.OFF;r.receiveShadow=kind==='water'?0:1;
    }
    return group;
  }
  private getMaterial(kind:string){return this.material instanceof Material?this.material:this.material[kind]||this.material.forest}
  update(run:any){
    const key=run.basketSpawnIds.length+':'+run.eatenSpawnIds.length+':'+run.revealedSpawnIds.length;
    if(key!==this.visibilityKey){this.visibilityKey=key;const unavailable=new Set([...run.basketSpawnIds,...run.eatenSpawnIds]);
    for(const [id,node]of this.targets)node.active=!unavailable.has(id);
    for(const [id,node]of this.covers)node.active=!unavailable.has(id)&&!run.revealedSpawnIds.includes(id);}
    for(const actor of this.world.wildlife.actors){
      const model=this.world.wildlife.modelData[actor.kind],parts=animalParts(actor,model);
      if(!this.actors.has(actor)){
        const nodes=parts.map(part=>{
          const n=new Node(actor.kind+' '+part.key);this.root.addChild(n);const r=n.addComponent(MeshRenderer),key=actor.kind+':'+part.key;
          if(!this.animalMeshes.has(key))this.animalMeshes.set(key,this.makeMesh(model[part.key]));
          r.mesh=this.animalMeshes.get(key)!;r.setSharedMaterial(this.getMaterial('forest'),0);r.shadowCastingMode=MeshRenderer.ShadowCastingMode.ON;r.receiveShadow=1;return n;
        });this.actors.set(actor,nodes);
      }
      parts.forEach((part,i)=>{
        Mat4.fromArray(this.matrix,animalMatrix(actor,part.offset,part.pitch));Mat4.toRTS(this.matrix,this.rot,this.pos,this.scale);
        this.actors.get(actor)![i].setRTS(this.rot,this.pos,this.scale);
      });
    }
  }
  destroy(){this.root.destroy();for(const mesh of this.meshes)mesh.destroy();this.meshes=[];this.actors.clear();this.animalMeshes.clear()}
}
