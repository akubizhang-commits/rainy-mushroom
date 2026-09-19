import { SpatialIndex } from './SpatialIndex.js'
import { movePlayer,jumpPlayer,canRise } from './PlayerMotion.js'
import { makeLitterCover, makeTracks } from './EcologyClues.js'
import { routesForScene, distanceToRoute } from '../data/fieldJournal.js'
import { SeededRandom } from '../core/Random.js'
import { SPECIES_BY_ID } from '../data/explorationData.js'
import { MeshBuilder, rgb } from './geometry.js'
import { VOXEL_BIOMES } from './biomes.js'
import { makeMushroom } from './mushrooms.js'
import { Wildlife } from './Wildlife.js'
import { clamp, rayGeometry } from './math.js'
import { shadowPatch,fern,riverDetails,detailedLog } from './RiverArt.js'

const LIMIT = 16
const TREE_SPECIES = new Set(['hericium-erinaceus','pleurotus-citrinopileatus','trametes-versicolor'])

export class VoxelWorld {
  constructor(scene) {
    this.scene=scene
    this.biome={...VOXEL_BIOMES[scene.environment],...scene.biomeOverrides}
    if(scene.weather?.sky){this.biome.sky=scene.weather.sky;this.biome.fog=scene.weather.fog}
    this.mesh=new MeshBuilder()
    this.shadowMesh=new MeshBuilder()
    this.solids=[]
    this.occluders=[]
    this.targets=[]
    this.covers=[]
    this.supports=[]
    this.random=new SeededRandom(`voxel:${scene.id}:v1`)
    this.routes=routesForScene(scene)
    this._terrain()
    this._targets()
    this._forest()
    this._understory()
    this._biomeDetails()
    this._sceneFeatures()
    this._routeMarkers()
    this._horizon()
    this.tracks=makeTracks(this)
    this.solidIndex=new SpatialIndex(this.solids)
    this.occluderIndex=new SpatialIndex(this.occluders)
    this.wildlife=new Wildlife(this)
    this.vertices=this.mesh.data()
    this.shadows=this.shadowMesh.data()
    // GPU rebuilds use the typed arrays; discard redundant builder storage.
    this.mesh.vertices=[];this.mesh.boxes=[]
    this.shadowMesh.vertices=[];this.shadowMesh.boxes=[]
    const startX=scene.environment==='river'?2:0
    this.start={x:startX,y:this.heightAt(startX,8)+1.58,z:8,yaw:scene.environment==='river'?.52:-.18,pitch:-.15}
  }

  _height(x,z) {
    const feature=this.scene.feature
    const relief=feature==='ridge'?Math.exp(-x*x/28)*.75:feature==='glade'?Math.sin(z*.14)*.55:0
    const rolling=Math.sin(x*.19)*.31+Math.cos(z*.23)*.29+Math.sin(x*.7+z*.38)*.055+relief
    if(this.scene.environment==='river'){const distance=Math.abs(x-(6+Math.sin(z*.22)*1.4));return rolling-Math.exp(-distance*distance/3)*.9+Math.max(0,distance-5)*.13}
    return rolling+(this.scene.environment==='alpine'?Math.max(0,Math.abs(x)-5)*.22:this.scene.environment==='oak'?Math.sin(x*.21)*.3:0)
  }

  heightAt(x,z) {
    const gx=Math.floor(x*2)/2,gz=Math.floor(z*2)/2,u=(x-gx)*2,v=(z-gz)*2
    const a=this._height(gx,gz),b=this._height(gx+.5,gz),c=this._height(gx,gz+.5),d=this._height(gx+.5,gz+.5)
    return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v)
  }

  _shape(method,args,{solid=false,occlude=true}={}) {
    const shape=this.mesh[method](...args)
    if(solid)this.solids.push(shape)
    if(occlude)this.occluders.push(shape)
    return shape
  }

  isWater(x,z) {
    return this.scene.environment==='river' && Math.abs(x-(6+Math.sin(z*.22)*1.4))<1.25
  }

  _box(x,y,z,w,h,d,color,{solid=false,occlude=true,faces}={}) {
    const box=this.mesh.box(x,y,z,w,h,d,color,{faces})
    if(solid) this.solids.push(box)
    if(occlude) this.occluders.push(box)
    return box
  }

  _terrain() {
    const grass=rgb(this.biome.grass),soil=rgb(this.biome.soil)
    for(let x=-LIMIT;x<LIMIT;x+=.5)for(let z=-LIMIT;z<LIMIT;z+=.5){
      const trail=Math.exp(-Math.pow((x-Math.sin(z*.28)*.7)/.85,2))*.40
      const mottling=(Math.sin(x*1.8+z*.9)+Math.sin(x*.6-z*1.3))*.055
      const bank=this.scene.environment==='river'?Math.exp(-Math.pow((Math.abs(x-(6+Math.sin(z*.22)*1.4))-1.25)/.62,2))*.65:0
      const groundMix=Math.max(trail,bank)
      const color=this.isWater(x+.25,z+.25)?rgb('#597b75'):grass.map((v,i)=>(v*(1-groundMix)+soil[i]*groundMix)*(1+mottling))
      const a=[x,this.heightAt(x,z),z],b=[x+.5,this.heightAt(x+.5,z),z],c=[x,this.heightAt(x,z+.5),z+.5],d=[x+.5,this.heightAt(x+.5,z+.5),z+.5]
      this._shape('surface',[[[a,c,b],[b,c,d]],color])
    }
  }

  _tree(x,z,kind=this.biome.tree,scale=1) {
    if(kind==='none')return
    const ground=this.heightAt(x,z),height=(4.2+this.random.next()*1.7)*scale,trunkWidth=.48*scale
    const bark=kind==='birch'?'#d4d2bc':this.biome.bark
    const river=this.scene.environment==='river'
    const nearRiver=river&&Math.hypot(x-2,z-8)<13
    if(river)shadowPatch(this.shadowMesh,x,z,1.5*scale,1.2*scale,.23,(px,pz)=>this.heightAt(px,pz))
    this._shape('lathe',[x,ground,z,[[0,.34*scale],[.22,.27*scale],[height*.45,.20*scale],[height,.08*scale]],bark,10],{solid:true})
    for(let i=0;i<5;i++){
      const angle=i*2.4,ex=x+Math.cos(angle)*.8*scale,ez=z+Math.sin(angle)*.8*scale
      this._shape('branch',[[x,ground+.18,z],[ex,this.heightAt(ex,ez)+.025,ez],.13*scale,.018,bark,6])
    }
    if(kind==='birch')for(let i=0;i<9;i++){
      const angle=i*2.4,r=.20*scale,py=ground+.35+i*.48*scale
      this._shape('ellipsoid',[x+Math.cos(angle)*r,py,z+Math.sin(angle)*r,.08,.025,.07,'#68685b',6,4])
    }
    const greens=kind==='oak'?['#66744a','#81915b','#9c9f66']:[this.biome.leaf,'#66835f','#7a956c']
    if(kind==='pine'){
      for(let layer=0;layer<7;layer++){
        const cy=ground+height*.43+layer*.46*scale,r=(1.35-layer*.15)*scale
        this._shape('lathe',[x+Math.sin(layer*2)*.12,cy,z,[[0,r*.35],[.10*scale,r],[.34*scale,r*.84],[.80*scale,r*.14],[.86*scale,0]],greens[layer%3],11,1,layer*.6])
        if(layer<5)for(let j=0;j<3;j++){
          const angle=j*2.1+layer,ex=x+Math.cos(angle)*r*.84,ez=z+Math.sin(angle)*r*.84
          this._shape('branch',[[x,cy+.13,z],[ex,cy+.22,ez],.065,.015,bark,6])
        }
      }
    }else{
      for(let i=0;i<9;i++){
        const variant=river?Math.sin(x*2.7+z+i*1.3):0
        const angle=i*2.4+variant*.3,r=i===0?0:.65+(i%3)*.22+variant*.24,cx=x+Math.cos(angle)*r*scale,cz=z+Math.sin(angle)*r*scale,cy=ground+height+(i%3-.7)*.52*scale+variant*.36
        this._shape('branch',[[x,ground+height*.64,z],[cx,cy,cz],.10*scale,.035,bark,7])
        this._shape('ellipsoid',[cx,cy,cz,(.85+(i%2)*.2+variant*.18)*scale,(.70+variant*.13)*scale,(.87-variant*.15)*scale,greens[i%3],nearRiver?10:9,nearRiver?6:5,angle])
        if(nearRiver&&i%3===1){
          const ex=cx+Math.cos(angle)*.7*scale,ez=cz+Math.sin(angle)*.7*scale,ey=cy-.26*scale
          this._shape('branch',[[cx,cy-.25,cz],[ex,ey,ez],.035*scale,.012,bark,6],{occlude:false})
          this._shape('ellipsoid',[ex,ey,ez,.46*scale,.32*scale,.42*scale,greens[(i+1)%3],10,6,angle])
        }
      }
    }
    return {x,z,ground,height,trunkWidth}
  }

  _log(x,z) {
    if(this.scene.environment==='river')return detailedLog(this,x,z)
    const ground=this.heightAt(x,z),cy=ground+.27
    this._shape('branch',[[x-1.25,cy,z],[x+1.25,cy+.025,z],.27,.25,this.biome.bark,12],{solid:true})
    this._shape('branch',[[x+1.251,cy+.025,z],[x+1.26,cy+.025,z],.225,.225,'#ad9470',12])
    this._shape('branch',[[x+1.262,cy+.025,z],[x+1.27,cy+.025,z],.13,.13,'#887454',12])
    for(let i=0;i<6;i++)this._shape('ellipsoid',[x-1+i*.36,cy+.25,z,.25,.045,.17,'#5f7549',8,4],{occlude:false})
    return ground+.55
  }

  _targets() {
    // A small, walkable clearing with different search directions and heights.
    // Positions belong to the 3D world; old photo coordinates are never used.
    const positions=[[-1.65,2.8],[3.6,-1.8],[-4.1,-5.3],[1.0,-8.4]]
    this.scene.spawns.forEach((spawn,index)=>{
      let [x,z]=spawn.position||positions[index]
      const species=SPECIES_BY_ID[spawn.speciesId]
      if(spawn.substrate==='wood'||TREE_SPECIES.has(species.id))[x,z]=this._supportSite(x,z,1.85)
      let y=this.heightAt(x,z), attached=false, support='ground'
      if(spawn.substrate==='wood'||TREE_SPECIES.has(species.id)) {
        attached=true
        if(species.style.shape==='tooth' || species.style.shape==='hoof' || (index===1 && this.biome.tree!=='none')) {
          const tree=this._tree(x,z,spawn.host==='birch'?'birch':spawn.host==='oak'?'oak':spawn.host==='pine'?'pine':'broadleaf',1.1)
          y=tree.ground+1.25+(index===1 ? .25 : 0)
          z+=tree.trunkWidth*.45
          support='trunk'
        } else {
          y=this._log(x,z)
          x-=.25
          support='log'
        }
      } else if(spawn.host && spawn.host!=='none' && this.biome.tree!=='none'){
        const [tx,tz]=this._supportSite(x+1.1,z-.8,.85)
        this._tree(tx,tz,spawn.host==='pine'?'pine':spawn.host==='birch'?'birch':spawn.host==='oak'?'oak':'broadleaf',.8)
        support='root'
      } else if(spawn.cover==='tree-behind' && this.biome.tree!=='none') {
        this._tree(x+.58,z-.45,this.biome.tree,.9)
        support='root'
      }
      if(spawn.substrate==='buriedWood')this.mesh.branch([x-.3,y-.025,z+.10],[x+.35,y+.015,z+.24],.055,.035,this.biome.bark,8)
      const entity=makeMushroom(spawn,species,{x,y:y+.003,z,attached,support},(px,pz)=>this.heightAt(px,pz))
      if(!attached){
        const shadow=new MeshBuilder()
        shadowPatch(shadow,x,z,.33,.28,.24,(px,pz)=>this.heightAt(px,pz))
        entity.shadow=shadow.data()
      }
      entity.clue=attached?(support==='trunk'?'树干伤口旁的菌物':'潮湿腐木上的菌物'):spawn.host==='pine'?'松根与针叶层':spawn.host==='birch'?'桦木根际':spawn.substrate==='buriedWood'?'土中露出一截腐木':'苔藓与落叶之间'
      entity.brushable=Boolean(spawn.brushable&&!attached)
      if(entity.brushable)this.covers.push(makeLitterCover(spawn,entity.anchor))
      if(attached)for(let m=0;m<6;m++)this.mesh.ellipsoid(x-.35+m*.12,y-.025,z+.10,.08,.018,.055,m%2?'#6c8049':'#526b3e',7,4)
      this.targets.push(entity)
      this.supports.push({spawnId:spawn.id,type:support,x,y,z})
      // Partial foreground concealment, rather than invisibility or fake overlays.
      if(!attached) for(let i=0;i<(spawn.visibility==='veryHidden' ? 4 : 2);i++) {
        const gx=x-.32+i*.19, gz=z+.23+(i%2)*.06, gy=this.heightAt(gx,gz)
        this._grass(gx,gz,.24,i%2 ? '#8a9b54' : '#577747')
      }
    })
  }

  _forest() {
    let placed=0
    for(let attempt=0;attempt<500 && placed<this.biome.density;attempt++) {
      const x=(this.random.next()-.5)*28, z=(this.random.next()-.5)*28
      if(this.isWater(x,z) || Math.hypot(x,z-8)<3.3) continue
      if(this.targets.some(target=>Math.hypot(x-target.anchor.x,z-target.anchor.z)<2.1)) continue
      if(this.routes.some(route=>distanceToRoute(x,z,route)<.95))continue
      // Leave the central trail open, but allow walking off it into the forest.
      if(Math.abs(x)<2.2 && z>-11 && z<9) continue
      if(['meadow','edge'].includes(this.scene.environment) && x<1.5 && z>-5) continue
      const kind=this.biome.tree==='birch'&&placed%3===0?'pine':['pine','mixed'].includes(this.scene.environment)&&placed%4===0?'broadleaf':this.biome.tree
      this._tree(x,z,kind,.8+this.random.next()*.4)
      placed++
    }
    if(this.biome.tree!=='none') {
      for(let i=0;i<12;i++)this._tree(-14+i*2.5,-13+(i%3)*.45,this.biome.tree,.85+(i%3)*.1)
      this._log(-7,3)
      this._log(6,-10)
    }
  }

  _supportSite(x,z,clearance){
    const open=(px,pz)=>Math.abs(px)<13&&Math.abs(pz)<13&&
      (this.scene.environment!=='river'||px<6+Math.sin(pz*.22)*1.4-2.6)&&
      !this.isWater(px,pz)&&!this.isWater(px-1.3,pz)&&!this.isWater(px+1.3,pz)&&
      this.routes.every(route=>distanceToRoute(px,pz,route)>clearance)&&
      this.targets.every(target=>Math.hypot(px-target.anchor.x,pz-target.anchor.z)>1.45)
    if(open(x,z))return [x,z]
    for(const radius of [1.5,2.5,3.5,4.5])for(let i=0;i<12;i++){
      const angle=i*Math.PI/6,px=x+Math.cos(angle)*radius,pz=z+Math.sin(angle)*radius
      if(open(px,pz))return [px,pz]
    }
    return [x,z]
  }

  _routeMarkers(){
    for(const [index,route] of this.routes.entries()){
      for(let i=1;i<route.points.length;i++){
        const [ax,az]=route.points[i-1],[bx,bz]=route.points[i],length=Math.hypot(bx-ax,bz-az)
        for(let d=1;d<length;d+=1.5){
          const x=ax+(bx-ax)*d/length,z=az+(bz-az)*d/length
          if(this.isWater(x,z)||this.targets.some(t=>Math.hypot(x-t.anchor.x,z-t.anchor.z)<.7))continue
          this.mesh.ellipsoid(x,this.heightAt(x,z)+.035,z,.09,.05,.13,route.color,7,4)
        }
      }
      const [x,z]=route.points.at(-1),y=this.heightAt(x,z)
      if(index===1){
        this.mesh.branch([x-.35,y,z],[x-.35,y+.95,z],.07,.045,this.biome.bark,8)
        this.mesh.branch([x-.35,y+.7,z],[x+.1,y+.9,z],.045,.025,route.color,7)
        this.mesh.branch([x-.35,y+.5,z],[x-.75,y+.7,z],.045,.025,route.color,7)
      }else for(let j=0;j<3;j++)this.mesh.ellipsoid(x+(j-1)*.32,y+.16,z+(j%2)*.2,.22,.18,.24,route.color,8,5)
    }
  }

  _grass(x,z,height,color) {
    const y=this.heightAt(x,z),triangles=[]
    if(Math.hypot(x-(this.scene.environment==='river'?2:0),z-8)<13){
      const phase=x*3.2+z*1.7
      for(let j=0;j<5;j++){
        const a=j*2.4+phase,dx=Math.cos(a),dz=Math.sin(a),h=height*(.65+(j%3)*.19),bend=h*.45,w=.017
        const base=[x+dx*.08,y,z+dz*.08],mid=[base[0]+dx*bend*.25,y+h*.62,base[2]+dz*bend*.25],tip=[base[0]+dx*bend,y+h,base[2]+dz*bend]
        triangles.push([[base[0]-dz*w,base[1],base[2]+dx*w],[mid[0]-dz*w*.65,mid[1],mid[2]+dx*w*.65],[mid[0]+dz*w*.65,mid[1],mid[2]-dx*w*.65]],
          [[base[0]-dz*w,base[1],base[2]+dx*w],[mid[0]+dz*w*.65,mid[1],mid[2]-dx*w*.65],[base[0]+dz*w,base[1],base[2]-dx*w]],
          [[mid[0]-dz*w*.65,mid[1],mid[2]+dx*w*.65],tip,[mid[0]+dz*w*.65,mid[1],mid[2]-dx*w*.65]])
      }
      this._shape('surface',[triangles,color],{occlude:false})
      return
    }
    for(let j=0;j<5;j++){
      const angle=j*2.4,dx=Math.cos(angle)*.1,dz=Math.sin(angle)*.1,h=height*(.65+j*.09)
      triangles.push([[x+dx-.024,y,z+dz],[x+dx+Math.cos(angle)*.11,y+h,z+dz+Math.sin(angle)*.11],[x+dx+.024,y,z+dz]])
    }
    this._shape('surface',[triangles,color],{occlude:false})
  }

  _understory() {
    for(let i=0;i<850;i++){
      const x=(this.random.next()-.5)*29,z=(this.random.next()-.5)*29
      if(Math.hypot(x-(this.scene.environment==='river'?2:0),z-8)<1.2||this.isWater(x,z)||this.targets.some(t=>Math.hypot(x-t.anchor.x,z-t.anchor.z)<.65))continue
      if(this.scene.environment==='river'){
        const patch=Math.sin(x*.9+Math.cos(z*.5))*Math.cos(z*.7-x*.25)
        if(patch<-.15||this.routes.some(r=>distanceToRoute(x,z,r)<.55))continue
        if(i%11===0){fern(this,x,z,.7+(i%3)*.2,i);continue}
      }
      if(['mixed','oak','birch'].includes(this.scene.environment)&&i%29===0){fern(this,x,z,.45+(i%3)*.15,i);continue}
      const y=this.heightAt(x,z)
      if(i%37===0){
        const size=.25+this.random.next()*.28
        this._shape('ellipsoid',[x,y+size*.38,z,size,size*.63,size*.82,i%2?'#8c9280':'#a2a392',7,4,i],{solid:true})
        this._shape('ellipsoid',[x-.06,y+size*.88,z,size*.66,.03,size*.50,'#758064',7,4],{occlude:false})
      }else this._grass(x,z,(this.scene.environment==='alpine'?.15:.18)+this.random.next()*.14,i%3?'#829466':'#a1a675')
    }
    if(this.biome.tree!=='none')for(let i=0;i<360;i++){
      const x=(this.random.next()-.5)*27,z=(this.random.next()-.5)*27
      if(this.isWater(x,z))continue
      const y=this.heightAt(x,z)+.008,angle=i*2.4,dx=Math.cos(angle)*.09,dz=Math.sin(angle)*.09
      this._shape('surface',[[[[x-dx,y,z-dz],[x+dz*.4,y+.012,z-dx*.4],[x+dx,y,z+dz]],[[x-dx,y,z-dz],[x+dx,y,z+dz],[x-dz*.4,y+.012,z+dx*.4]]],i%2?'#988363':'#796c4d'],{occlude:false})
    }
  }

  _biomeDetails() {
    const env=this.scene.environment
    if(env==='river'){
      riverDetails(this)
      for(const [x,z,scale] of [[10,2,.48],[11,-5,.57],[9,8,.42]])this._tree(x,z,'broadleaf',scale)
    }
    for(let i=0;i<95;i++){
      const x=(this.random.next()-.5)*27,z=(this.random.next()-.5)*27,y=this.heightAt(x,z)
      if(this.isWater(x,z))continue
      if(['pine','mixed','birch'].includes(env)){
        if(i%4===0)this._shape('ellipsoid',[x,y+.012,z,.5,.023,.32,env==='mixed'?'#547454':'#73744d',9,4],{occlude:false})
        for(let j=0;j<5;j++){const dx=Math.sin(i+j)*.13,dz=Math.cos(i*2+j)*.13;this._shape('branch',[[x+dx,y+.015,z+dz],[x+dx+.07,y+.017,z+dz+.12],.004,.003,'#a58a60',4],{occlude:false})}
      }else if(env==='oak'||env==='edge'){
        for(let j=0;j<3;j++)this._shape('ellipsoid',[x+j*.09,y+.012,z,.12,.015,.07,i%2?'#aa8450':'#b39b62',6,4,j],{occlude:false})
      }else if(env==='alpine'||env==='meadow'){
        this._shape('branch',[[x,y,z],[x,y+.12,z],.008,.004,'#798954',5],{occlude:false})
        this._shape('ellipsoid',[x,y+.13,z,.035,.023,.035,env==='alpine'?'#b8abcf':'#d8cf97',6,4],{occlude:false})
      }
    }
  }

  _horizon() {
    for(let i=0;i<14;i++){
      const angle=i/14*Math.PI*2,x=Math.sin(angle)*25,z=Math.cos(angle)*25,h=3+(i%4)*1.1
      this._shape('ellipsoid',[x,-.7,z,7,h*.58,6,this.scene.environment==='alpine'?'#adbeb6':'#90aa9a',9,5,i],{occlude:false})
    }
  }

  _sceneFeatures(){
    const feature=this.scene.feature
    if(!feature)return
    // Keep landmarks outside entry, routes and fungus interaction space.
    const positions=[[-10,2],[-10,-6],[10,-8],[11,4]]
    for(const [x,z] of positions){
      if(this.isWater(x,z)||this.targets.some(t=>Math.hypot(x-t.anchor.x,z-t.anchor.z)<3))continue
      if(feature==='deadwood'||feature==='backwater'){
        this._log(x,z)
        for(let k=0;k<5;k++)this.mesh.ellipsoid(x-.8+k*.4,this.heightAt(x,z)+.57,z,.24,.06,.20,'#678959',8,4)
      }else if(feature==='ridge'){
        this._shape('ellipsoid',[x,this.heightAt(x,z)+.42,z,1.35,.65,.9,'#999b88',9,6],{solid:true})
      }else if(feature==='glade'){
        this._tree(x,z,'oak',.65)
        this.mesh.ellipsoid(x,this.heightAt(x,z)+.015,z,1.2,.018,.8,'#b7a478',12,4)
      }
    }
  }

  solidsNear(x,z,radius=.25) {
    if(this.solidIndex&&(this.solidIndex.count!==this.solids.length||this.solidIndex.shapes!==this.solids))this.solidIndex=new SpatialIndex(this.solids)
    return this.solidIndex?this.solidIndex.query(x-radius,z-radius,x+radius,z+radius):this.solids
  }

  canStand(x,z,radius=.25) {
    if(Math.abs(x)>LIMIT-.65 || Math.abs(z)>LIMIT-.65 || this.isWater(x,z)) return false
    const feet=this.heightAt(x,z)
    return !this.solidsNear(x,z,radius).some(box=>
      box.max[1]>feet+.25 && box.min[1]<feet+1.65 &&
      x+radius>box.min[0] && x-radius<box.max[0] &&
      z+radius>box.min[2] && z-radius<box.max[2])
  }

  jump(player) { return jumpPlayer(this,player) }
  canRise(player) { return canRise(this,player) }
  move(player,side,forward,seconds) { movePlayer(this,player,side,forward,seconds) }

  occludersBetween(from,to){
    if(!this.occluderIndex||this.occluderIndex.count!==this.occluders.length||this.occluderIndex.shapes!==this.occluders)this.occluderIndex=new SpatialIndex(this.occluders)
    return this.occluderIndex.segment(from,to)
  }

  lineOfSight(from,to){
    const delta=to.map((v,i)=>v-from[i]),distance=Math.hypot(...delta)
    if(distance<.01)return true
    const direction=delta.map(v=>v/distance)
    return !this.occludersBetween(from,to).some(box=>rayGeometry(from,direction,box,distance-.03)!==null)
  }
  pick(origin,direction,unavailable=[],maxDistance=4.8,revealed=null) {
    let nearest=null, distance=maxDistance
    const entities=this.targets.map(t=>revealed!==null&&t.brushable&&!revealed.includes(t.id)?this.covers.find(c=>c.id===t.id):t)
    for(const entity of entities) {
      if(unavailable.includes(entity.id)) continue
      for(const box of entity.boxes) {
        const hit=rayGeometry(origin,direction,box,distance)
        if(hit!==null && hit<distance) { nearest=entity; distance=hit }
      }
    }
    if(!nearest) return null
    // The same boxes are used for visual depth and line-of-sight rejection.
    const end=origin.map((v,i)=>v+direction[i]*distance)
    for(const box of this.occludersBetween(origin,end)) {
      const hit=rayGeometry(origin,direction,box,distance-.015)
      if(hit!==null && hit<distance-.015) return null
    }
    if(this.wildlife?.blocksRay(origin,direction,distance))return null
    return {id:nearest.id,distance,covered:Boolean(nearest.covered),clue:nearest.clue}
  }
}
