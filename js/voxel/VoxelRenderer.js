import { buildSceneChunks,frustumPlanes,boundsVisible } from './SceneChunks.js'
import { cameraMatrix } from './math.js'
import { rgb,MeshBuilder } from './geometry.js'
import { animalParts,animalMatrix } from './animalPose.js'
import { shadowPatch } from './RiverArt.js'

const worldVertex = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
uniform mat4 uViewProjection;
uniform mat4 uModel;
uniform vec3 uEye;
varying vec3 vColor;
varying vec3 vWorld;
varying float vDistance;
void main() {
  float light = 0.58 + 0.42 * max(0.0, dot(mat3(uModel)*aNormal, normalize(vec3(-0.45,0.85,0.35))));
  vColor = aColor * light;
  vec4 world = uModel * vec4(aPosition,1.0);
  vWorld = world.xyz;
  vDistance = distance(world.xyz, uEye);
  gl_Position = uViewProjection * world;
}`
const worldFragment = `
precision mediump float;
uniform vec3 uFog;
uniform float uTime;
uniform float uWater;
varying vec3 vColor;
varying vec3 vWorld;
varying float vDistance;
void main() {
  if(uWater>0.5){
    float ripple=sin(vWorld.z*12.0+vWorld.x*4.0+sin(vWorld.x*5.0+vWorld.z*2.8)*1.5-uTime*1.7)*0.5+0.5;
    float streak=smoothstep(0.91,1.0,ripple)*smoothstep(0.1,0.85,sin(vWorld.x*16.0+sin(vWorld.z*3.0)+uTime*0.4)*0.5+0.5);
    vec3 water=mix(vec3(0.29,0.47,0.43),vec3(0.54,0.68,0.61),0.38+streak*0.42);
    float fog=smoothstep(10.0,42.0,vDistance)*0.86;
    gl_FragColor=vec4(mix(water,uFog,fog),1.0);
    return;
  }
  vec3 cell = floor(vWorld * 38.0);
  float grain = fract(sin(dot(cell, vec3(12.9898,78.233,39.425))) * 43758.5453);
  float mottling = sin(vWorld.x*2.1 + sin(vWorld.z*1.4))*sin(vWorld.z*1.7-vWorld.x*.8);
  float canopyLight = mix(0.92,1.05,smoothstep(-0.35,0.6,mottling));
  vec3 color = vColor * (0.975 + grain * 0.05);
  color *= mix(canopyLight,1.0,smoothstep(0.2,2.3,vWorld.y));
  float fog = smoothstep(10.0,42.0,vDistance) * 0.86;
  gl_FragColor = vec4(mix(color,uFog,fog),1.0);
}`
const flatVertex = `
attribute vec2 aPosition;
varying vec2 vUV;
void main() { vUV = vec2((aPosition.x+1.0)*0.5, (1.0-aPosition.y)*0.5); gl_Position=vec4(aPosition,0.0,1.0); }`
const uiFragment = `
precision mediump float;
uniform sampler2D uTexture;
varying vec2 vUV;
void main() { gl_FragColor=texture2D(uTexture,vUV); }`
const skyFragment = `
precision mediump float;
uniform vec3 uSky;
uniform vec3 uFog;
varying vec2 vUV;
void main() { gl_FragColor=vec4(mix(uSky,uFog,smoothstep(0.0,0.8,vUV.y)),1.0); }`
const shadowVertex=`
attribute vec3 aPosition;
attribute vec3 aColor;
uniform mat4 uViewProjection;
uniform mat4 uModel;
uniform vec3 uEye;
varying float vAlpha;
void main(){
  vec4 p=uModel*vec4(aPosition,1.0);
  vAlpha=aColor.r*(1.0-smoothstep(14.0,28.0,distance(p.xyz,uEye)));
  gl_Position=uViewProjection*p;
}`
const shadowFragment=`
precision mediump float;
varying float vAlpha;
void main(){gl_FragColor=vec4(0.12,0.18,0.12,vAlpha);}
`
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])

export class VoxelRenderer {
  constructor(canvas) {
    this.canvas=canvas
    this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,premultipliedAlpha:false})
      || canvas.getContext('experimental-webgl',{alpha:false,antialias:true,depth:true})
    if(!this.gl) throw new Error('当前环境未提供 WebGL，无法启动 3D 场景')
    this.resources=[]
    this.world=null
    this.cullingEnabled=true
    this.stats={uiUploads:0,uiBytes:0,drawCalls:0,vertices:0}
    this.lost=false
    if(typeof canvas.addEventListener==='function') {
      canvas.addEventListener('webglcontextlost',event=>{ event.preventDefault(); this.lost=true })
      canvas.addEventListener('webglcontextrestored',()=>{
        this.resources=[]
        this._initialize()
        if(this.world) this.setWorld(this.world)
        this.lost=false
      })
    }
    this._initialize()
  }

  _program(vertex,fragment) {
    const gl=this.gl
    const compile=(type,source)=>{
      const shader=gl.createShader(type)
      gl.shaderSource(shader,source); gl.compileShader(shader)
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(`3D 着色器编译失败：${gl.getShaderInfoLog(shader)}`)
      return shader
    }
    const vs=compile(gl.VERTEX_SHADER,vertex), fs=compile(gl.FRAGMENT_SHADER,fragment)
    const program=gl.createProgram()
    gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program)
    gl.deleteShader(vs); gl.deleteShader(fs)
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(`3D 着色器连接失败：${gl.getProgramInfoLog(program)}`)
    return program
  }

  _initialize() {
    const gl=this.gl
    this.worldProgram=this._program(worldVertex,worldFragment)
    this.uiProgram=this._program(flatVertex,uiFragment)
    this.skyProgram=this._program(flatVertex,skyFragment)
    this.shadowProgram=this._program(shadowVertex,shadowFragment)
    this.locations={}
    for(const [key,program] of [['world',this.worldProgram],['shadow',this.shadowProgram],['ui',this.uiProgram],['sky',this.skyProgram]]) {
      this.locations[key]={}
      for(const name of (['world','shadow'].includes(key) ? ['aPosition','aNormal','aColor'] : ['aPosition']))
        this.locations[key][name]=gl.getAttribLocation(program,name)
      for(const name of (key==='world' ? ['uViewProjection','uModel','uEye','uFog','uTime','uWater'] : key==='shadow'?['uViewProjection','uModel','uEye']:key==='ui' ? ['uTexture'] : ['uSky','uFog']))
        this.locations[key][name]=gl.getUniformLocation(program,name)
    }
    this.quad=gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER,this.quad)
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW)
    this.uiTexture=gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D,this.uiTexture)
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE)
    this.uiPixels=false
    this.uiUploadVerified=false
    this.uiSize=null;this.uiSubUploadVerified=false
    gl.disable(gl.CULL_FACE)
  }

  _buffer(data) {
    const gl=this.gl, buffer=gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW)
    this.resources.push(buffer)
    return {buffer,count:data.length/9}
  }

  setWorld(world) {
    const gl=this.gl
    this.releaseWorld()
    this.world=world
    this.staticChunks=buildSceneChunks(world.vertices).map(chunk=>({...this._buffer(chunk.data),min:chunk.min,max:chunk.max}))
    this.animalMeshes=Object.fromEntries(Object.entries(world.wildlife?.modelData||{}).map(([kind,data])=>[kind,{body:this._buffer(data.body),leg:this._buffer(data.leg),head:data.head?this._buffer(data.head):null}]))
    this.targetMeshes=world.targets.map(entity=>({id:entity.id,brushable:entity.brushable,shadow:entity.shadow?this._buffer(entity.shadow):null,...this._buffer(entity.data)}))
    this.coverMeshes=(world.covers||[]).map(entity=>({id:entity.id,...this._buffer(entity.data)}))
    this.trackMesh=world.tracks?this._buffer(world.tracks):null
    this.waterMesh=world.water?this._buffer(world.water):null
    this.staticShadows=world.shadows?.length?this._buffer(world.shadows):null
    const animalShadow=new MeshBuilder()
    shadowPatch(animalShadow,0,0,.48,.80,.26,()=>0)
    this.animalShadow=this._buffer(animalShadow.data())
  }

  releaseWorld(){
    if(!this.lost)this.resources.forEach(buffer=>this.gl.deleteBuffer(buffer))
    this.resources=[];this.world=null;this.staticChunks=[]
    this.animalMeshes={};this.targetMeshes=[];this.coverMeshes=[]
    this.trackMesh=null;this.waterMesh=null;this.staticShadows=null;this.animalShadow=null
  }

  _flat(program,locations) {
    const gl=this.gl
    gl.useProgram(program)
    // Attribute locations are program-specific. Disable stale world attributes.
    for(let i=0;i<3;i++) gl.disableVertexAttribArray(i)
    gl.bindBuffer(gl.ARRAY_BUFFER,this.quad)
    gl.enableVertexAttribArray(locations.aPosition)
    gl.vertexAttribPointer(locations.aPosition,2,gl.FLOAT,false,8,0)
  }

  _drawMesh(mesh,loc=this.locations.world) {
    const gl=this.gl
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer)
    for(const [name,offset] of [['aPosition',0],['aNormal',12],['aColor',24]]) {
      if(loc[name]<0)continue
      gl.enableVertexAttribArray(loc[name])
      gl.vertexAttribPointer(loc[name],3,gl.FLOAT,false,36,offset)
    }
    gl.drawArrays(gl.TRIANGLES,0,mesh.count)
    this.stats.drawCalls++;this.stats.vertices+=mesh.count
  }

  _drawAnimals() {
    const gl=this.gl
    for(const actor of this.world.wildlife.actors){
      const meshes=this.animalMeshes[actor.kind]
      for(const part of animalParts(actor,this.world.wildlife.modelData[actor.kind])){
        gl.uniformMatrix4fv(this.locations.world.uModel,false,animalMatrix(actor,part.offset,part.pitch))
        this._drawMesh(meshes[part.key])
      }
    }
  }

  _drawShadows(player,run,width,height){
    const gl=this.gl,loc=this.locations.shadow
    gl.useProgram(this.shadowProgram)
    for(let i=0;i<3;i++)gl.disableVertexAttribArray(i)
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false)
    gl.uniformMatrix4fv(loc.uViewProjection,false,this.viewProjection)
    gl.uniform3fv(loc.uEye,[player.x,player.y,player.z])
    gl.uniformMatrix4fv(loc.uModel,false,identity())
    if(this.staticShadows)this._drawMesh(this.staticShadows,loc)
    if(run?.huntStarted){
      const removed=new Set([...run.basketSpawnIds,...run.eatenSpawnIds])
      for(const mesh of this.targetMeshes)if(mesh.shadow&&!removed.has(mesh.id))this._drawMesh(mesh.shadow,loc)
    }
    for(const actor of this.world.wildlife.actors){
      const h=(x,z)=>this.world.heightAt(x,z),gx=(h(actor.x+.4,actor.z)-h(actor.x-.4,actor.z))/.8,gz=(h(actor.x,actor.z+.4)-h(actor.x,actor.z-.4))/.8
      const scale=actor.kind==='squirrel'?.35:actor.kind==='yak'?1.2:1,c=Math.cos(actor.yaw)*scale,s=Math.sin(actor.yaw)*scale
      const m=new Float32Array([c,gx*c-gz*s,-s,0,0,1,0,0,s,gx*s+gz*c,c,0,actor.x,h(actor.x,actor.z),actor.z,1])
      gl.uniformMatrix4fv(loc.uModel,false,m);this._drawMesh(this.animalShadow,loc)
    }
    gl.depthMask(true);gl.disable(gl.BLEND)
  }

  render(player,run,uiCanvas,showWorld,uiDirty=true) {
    if(this.lost) return
    uiDirty=uiDirty||!this.uiUploadVerified
    Object.assign(this.stats,{drawCalls:0,vertices:0,staticSubmitted:0,staticTotal:this.world?.vertices.length/9||0,visibleChunks:0,chunks:this.staticChunks?.length||0})
    if(!showWorld&&!uiDirty)return
    const gl=this.gl, width=this.canvas.width, height=this.canvas.height
    gl.viewport(0,0,width,height)
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST)
    gl.clearColor(.08,.15,.10,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)
    if(showWorld && this.world && player) {
      const fog=rgb(this.world.biome.fog)
      this.viewProjection=cameraMatrix(player,width/height,run?.lensEnabled ? .58 : Math.PI/3)
      const planes=frustumPlanes(this.viewProjection)
      this._flat(this.skyProgram,this.locations.sky)
      gl.uniform3fv(this.locations.sky.uSky,rgb(this.world.biome.sky))
      gl.uniform3fv(this.locations.sky.uFog,fog)
      gl.drawArrays(gl.TRIANGLES,0,6);this.stats.drawCalls++
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL)
      gl.useProgram(this.worldProgram)
      gl.uniformMatrix4fv(this.locations.world.uViewProjection,false,this.viewProjection)
      gl.uniform3fv(this.locations.world.uEye,[player.x,player.y,player.z])
      gl.uniform3fv(this.locations.world.uFog,fog)
      gl.uniform1f(this.locations.world.uTime,(run?.elapsedMs||0)/1000)
      gl.uniform1f(this.locations.world.uWater,0)
      gl.uniformMatrix4fv(this.locations.world.uModel,false,identity())
      for(const chunk of this.staticChunks)if(!this.cullingEnabled||boundsVisible(chunk,planes)){
        this._drawMesh(chunk);this.stats.staticSubmitted+=chunk.count;this.stats.visibleChunks++
      }
      if(this.waterMesh){gl.uniform1f(this.locations.world.uWater,1);this._drawMesh(this.waterMesh);gl.uniform1f(this.locations.world.uWater,0)}
      if(run?.huntStarted) {
        const removed=new Set([...run.basketSpawnIds,...run.eatenSpawnIds])
        const revealed=new Set(run.revealedSpawnIds||[])
        this.targetMeshes.forEach(mesh=>{if(!removed.has(mesh.id)&&(!mesh.brushable||revealed.has(mesh.id)))this._drawMesh(mesh)})
        this.coverMeshes.forEach(mesh=>{if(!removed.has(mesh.id)&&!revealed.has(mesh.id))this._drawMesh(mesh)})
        if(this.trackMesh&&run.huntMode==='timed'&&run.predatorWarned)this._drawMesh(this.trackMesh)
      }
    }
    if(showWorld && this.world?.wildlife && player){this._drawAnimals();this._drawShadows(player,run,width,height)}
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)
    this._flat(this.uiProgram,this.locations.ui)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D,this.uiTexture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false)
    if(uiDirty){
      const allocated=this.uiSize?.[0]===width&&this.uiSize?.[1]===height
      if(!this.uiPixels){
        try {
          if(allocated)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,uiCanvas)
          else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,uiCanvas)
          if((!this.uiUploadVerified||(allocated&&!this.uiSubUploadVerified))&&gl.getError()!==gl.NO_ERROR)this.uiPixels=true
          if(allocated)this.uiSubUploadVerified=true
        }catch{this.uiPixels=true}
      }
      if(this.uiPixels){
        const data=uiCanvas.getContext('2d').getImageData(0,0,width,height).data
        const pixels=new Uint8Array(data.buffer,data.byteOffset,data.byteLength)
        if(allocated)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels)
        else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels)
      }
      this.uiSize=[width,height];this.uiUploadVerified=true
      this.stats.uiUploads++;this.stats.uiBytes+=width*height*4
    }
    gl.uniform1i(this.locations.ui.uTexture,0)
    gl.drawArrays(gl.TRIANGLES,0,6);this.stats.drawCalls++
  }
}
