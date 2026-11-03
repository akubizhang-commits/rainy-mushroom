import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
import {swordQiSegments,swordQiVisualLift} from '../js/xianxia/TowerSwordQi.js'
import {SHADOW_LIFT,shadowPreviewLine,shadowHitFeedback} from '../js/xianxia/TowerShadow.js'

const source=name=>stripTypeScriptTypes(readFileSync(new URL(`../cocos-pilot/assets/scripts/${name}.ts`,import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
class Color {constructor(r,g,b,a=255){Object.assign(this,{r,g,b,a})}}
class Graphics {
 calls=[]
 moveTo(...p){this.calls.push(['move',...p])} lineTo(...p){this.calls.push(['line',...p])}
 close(){this.calls.push(['close'])} circle(...p){this.calls.push(['circle',...p])}
 ellipse(...p){this.calls.push(['ellipse',...p])} arc(...p){this.calls.push(['arc',...p])}
 fill(){this.calls.push(['fill',this.fillColor.a])}
 stroke(){this.calls.push(['stroke',this.strokeColor.a,this.lineWidth])}
}
const WeaponQualityArt=runInNewContext(`(()=>{${source('WeaponQualityArt')};return WeaponQualityArt})()`,{Color})
function fixture(){
 const poses=[]
 const skillForm=(id,level,parent)=>({id,shape:'orbit',swords:id==='evo_wuwo'?(level===2?12:8):level>=10?8:level>=6?6:level>=3?5:4,
  radius:100,innerRadius:id==='evo_wuwo'?50:77,bladeLength:32,bladeWidth:8,interval:.6,angularSpeed:1})
 const orbitSwordPose=(form,time,index)=>{
  poses.push(index);const angle=time+Math.PI*2*index/form.swords;
  return {x:Math.cos(angle)*100,y:Math.sin(angle)*100,angle,baseX:Math.cos(angle)*84,baseY:Math.sin(angle)*84,
   tipX:Math.cos(angle)*116,tipY:Math.sin(angle)*116}
 }
 const Art=runInNewContext(`(()=>{${source('TowerSkillEffects')};return TowerSkillEffects})()`,{Color,Graphics,skillForm,orbitSwordPose,swordQiSegments,swordQiVisualLift,SHADOW_LIFT,shadowPreviewLine,shadowHitFeedback,Math,Number})
 const state={time:10,phase:'paused',player:{x:0,y:0,hp:100},loadout:{active:{},passive:{},evolutions:[],evolutionLevels:{}},zones:[],effects:[],enemies:[]}
 return {art:new Art(),g:new Graphics(),state,poses}
}
const camera={x:0,y:0}
test('orbit fallback stops drawing at expiry and still supports permanent wuwo',()=>{
 const {art,g,state,poses}=fixture()
 state.loadout.growthVersion=1;state.loadout.active.sj_wanjian=1;state.orbitUntil=10
 art.draw(g,state,camera);assert.equal(poses.length,0)
 state.orbitUntil=14
 art.draw(g,state,camera);assert.equal(poses.length,4)
 poses.length=0;state.orbitUntil=10;state.loadout.evolutions=['evo_wuwo']
 art.draw(g,state,camera);assert.equal(poses.length,8)
})
test('live orbit art waits for startup and matches the activated rank',()=>{
 const {art,g,state,poses}=fixture()
 state.loadout.growthVersion=1;state.loadout.active.sj_wanjian=6
 state.loadout.evolutions=['evo_wuwo'];state.loadout.evolutionLevels={evo_wuwo:1}
 state.actions={version:2,orbit:null}
 art.draw(g,state,camera);assert.equal(poses.length,0)
 state.actions.orbit={castContext:{loadout:structuredClone(state.loadout)}}
 art.draw(g,state,camera);assert.equal(poses.length,8)
 poses.length=0;state.loadout.evolutionLevels.evo_wuwo=2
 art.draw(g,state,camera);assert.equal(poses.length,0,'upgraded orbit waits for its new startup')
})
test('shadow feedback uses real positive damage and per-ID sprite fallback with the same body lift',()=>{
 const {art,g,state}=fixture()
 const hit={id:'hit',kind:'hit',source:'shadow',x:20,y:40,damage:3,startedAt:10,expiresAt:10.25}
 state.effects=[{...hit,damage:0}];art.drawShadowHits(g,state,camera);assert.equal(g.calls.length,0)
 state.effects=[hit];art.drawShadowHits(g,state,camera)
 assert.equal(g.calls[0][2],40+37)
 assert.ok(g.calls.some(c=>c[0]==='fill'),'positive hits get a brief solid impact core')
 const horizontal=g.calls.filter(c=>c[0]==='line')[0]
 g.calls=[];state.effects=[{...hit,shadowImpact:{dirX:0,dirY:1,pulseIndex:1,pulseCount:2}}]
 art.drawShadowHits(g,state,camera)
 assert.equal(g.calls[0][1],20);assert.notEqual(g.calls.filter(c=>c[0]==='line')[0][2],horizontal[2])
 g.calls=[];art.draw(g,state,camera);assert.equal(g.calls.length,0)
 const release={id:'slash',kind:'shadow',source:'sj_shadow',x:20,y:40,toX:200,toY:40,width:30,startedAt:10,expiresAt:10.25}
 state.effects=[release]
 art.draw(g,state,camera,undefined,undefined,undefined,undefined,false,undefined,null,new Set(['slash']))
 assert.equal(g.calls.length,0)
 art.draw(g,state,camera);assert.ok(g.calls.length>0)
})
test('wuwo foreground feedback requires positive real damage and expires after .18 seconds',()=>{
 const {art,g,state}=fixture()
 const hit={kind:'hit',source:'evo_wuwo',x:40,y:50,targetRadius:20,damage:4,startedAt:10,expiresAt:10.25}
 state.effects=[{...hit,damage:0},{...hit,kind:'wuwo'},{...hit,source:'sj_wanjian'}]
 art.drawWuwoHits(g,state,camera);assert.equal(g.calls.length,0)
 state.effects=[hit];art.drawWuwoHits(g,state,camera)
 assert.equal(g.calls.filter(c=>c[0]==='stroke').length,2)
 assert.equal(g.calls[0][1],23.8);assert.equal(g.calls[0][2],57.9)
 g.calls=[];art.draw(g,state,camera);assert.equal(g.calls.length,0,'no duplicate background flash')
 state.time=10.181;art.drawWuwoHits(g,state,camera);assert.equal(g.calls.length,0)
})
test('arc renders an open 90-degree crescent within its actual forward sector, never a ring',()=>{
 const {art,g,state}=fixture()
 state.effects=[{kind:'arc',source:'sj_arc',shape:'sector',x:20,y:30,radius:140,angle:90,dirX:1,dirY:0,startedAt:10,expiresAt:10.25,pulseIndex:1,pulseCount:3}]
 art.draw(g,state,camera)
 const first=JSON.stringify(g.calls)
 assert.equal(g.calls.filter(c=>c[0]==='circle').length,0)
 for(const time of [10,10.03,10.12,10.24]){
  state.time=time;g.calls=[];art.draw(g,state,camera)
  for(const c of g.calls.filter(c=>c[0]==='move'||c[0]==='line')){
   const x=c[1]-20,y=c[2]-30
   assert.ok(x>=-1e-6);assert.ok(Math.hypot(x,y)<=140.00001);assert.ok(Math.abs(Math.atan2(y,x))<=Math.PI/4+.00001)
  }
 }
 assert.ok(g.calls.some(c=>c[0]==='fill'))
 assert.notEqual(JSON.stringify(g.calls),first,'simulation time advances the visual stroke')
 state.time=10.25;g.calls=[];art.draw(g,state,camera);assert.equal(g.calls.length,0,'expired arc leaves no geometry')
})
test('only successfully rendered arc sprite IDs suppress the same procedural release',()=>{
 const {art,g,state}=fixture()
 const arc={id:'ready',kind:'arc',source:'sj_arc',shape:'sector',x:20,y:30,radius:140,
  angle:90,dirX:1,dirY:0,startedAt:10,expiresAt:10.25}
 state.effects=[arc]
 art.draw(g,state,camera,new Set())
 assert.ok(g.calls.length>0,'unloaded or failed art keeps the procedural arc')
 g.calls=[];art.draw(g,state,camera,new Set(['ready']))
 assert.equal(g.calls.length,0,'a loaded atlas never doubles with the same vector arc')
 state.effects=[arc,{...arc,id:'over-cap',x:300}]
 g.calls=[];art.draw(g,state,camera,new Set(['ready']))
 assert.ok(g.calls.length>0,'capacity-limited releases keep their own fallback')
 for(const command of g.calls.filter(c=>c[0]==='move'||c[0]==='line'))
  assert.ok(command[1]>=300,'only the unsupplied release produces procedural geometry')
})
test('straight sword sprite suppression is per release and cannot hide evolved or other line skills',()=>{
 const {art,g,state}=fixture()
 const line={id:'ready',kind:'line',source:'sj_line',shape:'line',x:20,y:30,toX:120,toY:30,width:20,startedAt:10,expiresAt:10.25}
 state.effects=[line]
 art.draw(g,state,camera,undefined,new Set())
 assert.equal(g.calls.length,0,'retired ground qi cannot return while the sword loads')
 g.calls=[];art.draw(g,state,camera,undefined,new Set(['ready']))
 assert.equal(g.calls.length,0,'a supplied line sprite does not double with vector geometry')
 state.effects=[line,{...line,id:'over-cap',x:300,toX:400}]
 g.calls=[];art.draw(g,state,camera,undefined,new Set(['ready']))
 assert.equal(g.calls.length,0,'capacity overflow cannot restore retired ground qi')
 for(const [kind,source] of [['tiandi','evo_tiandi'],['shadow','sj_shadow'],['line','other']]){
  state.effects=[{...line,kind,source}]
  g.calls=[];art.draw(g,state,camera,undefined,new Set(['ready']))
  assert.ok(g.calls.length>0,`${source} retains its own presentation`)
 }
})
test('heavy sword suppresses only its rendered release and keeps windup plus unavailable releases',()=>{
 const {art,g,state}=fixture()
 const heavy={id:'ready',kind:'tiandi',source:'evo_tiandi',shape:'line',x:20,y:30,toX:120,toY:30,width:80,startedAt:10,expiresAt:10.25}
 state.effects=[heavy]
 art.draw(g,state,camera,undefined,undefined,new Set())
 assert.ok(g.calls.length>0,'unavailable art keeps the heavy procedural strike')
 g.calls=[];art.draw(g,state,camera,undefined,undefined,new Set(['ready']))
 assert.equal(g.calls.length,0,'rendered heavy art does not overlap a vector duplicate')
 state.effects=[heavy,{...heavy,id:'over-cap',x:300,toX:400}]
 g.calls=[];art.draw(g,state,camera,undefined,undefined,new Set(['ready']))
 assert.ok(g.calls.length>0)
 for(const command of g.calls.filter(c=>c[0]==='move'||c[0]==='line'))
  assert.ok(command[1]>=300,'only the unsupported release keeps its fallback')
 for(const [kind,source] of [['tiandi_windup','evo_tiandi'],['tiandi','other']]){
  state.effects=[{...heavy,kind,source}]
  g.calls=[];art.draw(g,state,camera,undefined,undefined,new Set(['ready']))
  assert.ok(g.calls.length>0,`${kind}/${source} retains its own presentation`)
 }
})
test('orbit renders exactly the shared pose count and preserves the near-body gap',()=>{
 for(const [level,count] of [[1,4],[3,5],[6,6],[10,8]]){
  const {art,g,state,poses}=fixture();state.loadout.active.sj_wanjian=level
  art.draw(g,state,camera)
  assert.equal(poses.length,count)
  assert.equal(g.calls.filter(c=>c[0]==='circle').length,0,'base ring has no filled disk')
 }
 const {art,g,state,poses}=fixture();state.loadout.active.sj_wanjian=10;state.loadout.evolutions=['evo_wuwo'];state.loadout.evolutionLevels.evo_wuwo=2
 art.draw(g,state,camera);assert.equal(poses.length,12)
 assert.ok(g.calls.some(c=>c[0]==='circle'&&c[3]===50),'evolved inner field matches innerRadius')
})
test('loaded orbit sprites suppress only the outer fallback and retain the evolved inner field',()=>{
 for(const evolved of [false,true]){
  const {art,g,state,poses}=fixture();state.loadout.active.sj_wanjian=10
  if(evolved){state.loadout.evolutions=['evo_wuwo'];state.loadout.evolutionLevels.evo_wuwo=2}
  art.draw(g,state,camera,undefined,undefined,undefined,undefined,true)
  assert.equal(poses.length,0,'sprite swords cannot be doubled by procedural swords')
  assert.equal(g.calls.some(c=>c[0]==='circle'),evolved,'only evolved inner coverage remains')
  g.calls=[];art.draw(g,state,camera,undefined,undefined,undefined,undefined,false)
  assert.equal(poses.length,evolved?12:8,'resource failure still draws all outer swords')
 }
})
test('formation circle has two eyes; four-eye diamond vertices and interior share one pulse',()=>{
 const {art,g,state}=fixture()
 const z={id:'zone',kind:'formation',source:'evo_sixiang',shape:'diamond',x:30,y:40,radius:100,eyes:4,
  startedAt:9,nextAt:10.2,interval:.5,pulseIndex:2,pulseCount:7,ticks:5,expiresAt:13}
 state.zones=[z];art.draw(g,state,camera)
 const circles=g.calls.filter(c=>c[0]==='circle')
 assert.equal(circles.length,8,'each of four eyes has one outer and one core circle')
 for(const [x,y] of [[30,140],[130,40],[30,-60],[-70,40]])assert.ok(circles.some(c=>c[1]===x&&c[2]===y))
 assert.ok(g.calls.some(c=>c[0]==='move'&&c[1]===30&&c[2]===140))
 assert.ok(g.calls.some(c=>c[0]==='fill'))
 state.zones=[{...z,source:'sj_formation',shape:'circle',eyes:2}];g.calls=[];art.draw(g,state,camera)
 const base=g.calls.filter(c=>c[0]==='circle')
 assert.equal(base.filter(c=>c[3]===100).length,2,'circle body fill and outline share the actual radius')
 assert.equal(base.filter(c=>c[3]!==100).length,4,'base formation has only two eyes')
})
test('formation sprites suppress only their rendered array and pulse; unavailable arrays retain fallback',()=>{
 const {art,g,state}=fixture()
 const zone={id:'supplied',kind:'formation',source:'sj_formation',shape:'circle',x:30,y:40,radius:132,
  startedAt:9,nextAt:10.5,interval:.5,pulseIndex:2,pulseCount:6,ticks:4,expiresAt:12.2}
 const pulse={...zone,id:'pulse',startedAt:10,expiresAt:10.25}
 state.zones=[zone];state.effects=[pulse]
 art.draw(g,state,camera,undefined,undefined,undefined,undefined,false,new Set())
 assert.ok(g.calls.some(c=>c[0]==='circle'&&c[3]===132),'unavailable textures retain the actual range')
 g.calls=[]
 art.draw(g,state,camera,undefined,undefined,undefined,undefined,false,new Set(['supplied','pulse']))
 assert.equal(g.calls.length,0,'no geometric array is doubled with the supplied art')
 state.zones.push({...zone,id:'over-cap',x:500})
 g.calls=[]
 art.draw(g,state,camera,undefined,undefined,undefined,undefined,false,new Set(['supplied','pulse']))
 assert.ok(g.calls.length>0)
 assert.ok(g.calls.filter(c=>c[0]==='circle').every(c=>c[1]===500),'other arrays remain visible')
 state.zones=[];state.effects=[pulse];g.calls=[]
 art.draw(g,state,camera,undefined,undefined,undefined,undefined,false,new Set(['pulse']))
 assert.equal(g.calls.length,0,'the last short pulse cannot duplicate a fading sprite after its zone leaves')
})
test('fallback reserves the two-eye final flash for the seven-hit top rank',()=>{
 for(const count of [6,7]){
  const {art,g,state}=fixture()
  state.zones=[{id:'zone',kind:'formation',source:'sj_formation',shape:'circle',x:0,y:0,radius:132,
   startedAt:7,nextAt:10.5,interval:.5,pulseIndex:count,pulseCount:count,ticks:0,expiresAt:10.2}]
  art.draw(g,state,camera)
  const flashingEyes=g.calls.filter(c=>c[0]==='circle'&&c[3]===9)
  assert.equal(flashingEyes.length,count===7?2:1,'rank1–9 finish with one alternating eye')
 }
})
test('line uses actual locked endpoints and width while paused redraw is stable and read-only',()=>{
 const {art,g,state}=fixture()
 state.effects=[{kind:'tiandi',source:'evo_tiandi',shape:'line',x:10,y:20,toX:610,toY:20,width:80,startedAt:9.9,expiresAt:10.25}]
 const before=JSON.stringify(state);art.draw(g,state,camera)
 const first=JSON.stringify(g.calls);g.calls=[];art.draw(g,state,camera)
 assert.equal(JSON.stringify(g.calls),first);assert.equal(JSON.stringify(state),before)
 for(const c of g.calls.filter(c=>c[0]==='move'||c[0]==='line')){
  assert.ok(c[1]>=10&&c[1]<=610);assert.ok(c[2]>=-20&&c[2]<=60)
 }
 assert.equal(art.handles({...state.effects[0],hostile:true}),false)
})
test('passive feedback only follows real hit and enemy wound states, no passive ground rings',()=>{
 const {art,g,state}=fixture();state.loadout.passive={sj_heart:10,vajra:10,magnet:10,sj_mark:10,sj_bone:10,sj_gate:10}
 art.draw(g,state,camera);assert.equal(g.calls.length,0)
 state.effects=[{kind:'hit',x:40,y:50,critical:true,startedAt:10,expiresAt:10.25}]
 state.enemies=[{x:30,y:40,radius:18,hp:100,woundBudget:1,woundUntil:11}]
 art.draw(g,state,camera);assert.ok(g.calls.some(c=>c[0]==='line'));assert.equal(g.calls.filter(c=>c[0]==='circle').length,0)
})
test('all primary releases can trigger the existing character slash, with deterministic simultaneous priority',()=>{
 const Art=runInNewContext(`(()=>{${source('TowerCharacterArt')};return TowerCharacterArt})()`,{Color,WeaponQualityArt})
 for(const skill of ['sj_yujian','sj_arc','sj_cross','sj_line','sj_shadow','sj_formation','evo_wanjian','evo_tiandi','evo_sixiang']){
  const a=new Art();a.observeCast({skill,startedAt:1,releaseAt:1.2,dirX:-1,dirY:0})
  assert.ok(a.attack,skill);assert.equal(a.attack.face,-1)
 }
 const a=new Art();a.observeCast({skill:'evo_tiandi',startedAt:1,releaseAt:1.9,dirX:1,dirY:0})
 a.observeCast({skill:'sj_yujian',startedAt:1,releaseAt:1.12,dirX:-1,dirY:0})
 assert.equal(a.attack.face,1)
})

test('sword-line and crescent continuation hits cannot restart the committed character action',()=>{
 const Art=runInNewContext(`(()=>{${source('TowerCharacterArt')};return TowerCharacterArt})()`,{Color,WeaponQualityArt})
 const a=new Art()
 const event=(skill,pulseIndex,time)=>({skill,pulseIndex,pulseCount:3,startedAt:time,releaseAt:time,dirX:1,dirY:0})
 a.observeCast(event('sj_line',2,.3))
 assert.equal(a.attack,null,'restoring in the middle of a volley cannot invent a new windup')
 a.observeCast(event('sj_line',1,1))
 a.observeCast({...event('evo_tiandi',1,1.1),releaseAt:2})
 const committed=a.attack
 a.observeCast(event('sj_line',3,2.5))
 assert.strictEqual(a.attack,committed,'a continuation must not overwrite a newer committed action')
 a.reset()
 a.observeCast(event('sj_arc',2,3))
 assert.equal(a.attack,null,'a crescent continuation cannot restart the body action')
 a.observeCast(event('sj_arc',1,3))
 const crescentAction=a.attack
 a.observeCast(event('sj_arc',2,3.16))
 a.observeCast(event('sj_arc',3,3.32))
 assert.strictEqual(a.attack,crescentAction)
 a.observeCast(event('sj_cross',1,4))
 assert.equal(a.attack.start,4,'an independent cross cast still starts a new gesture')
})

test('saved body actions use their own release, recovery and locked attack facing',()=>{
 const Art=runInNewContext(`(()=>{${source('TowerCharacterArt')};return TowerCharacterArt})()`,{Color,WeaponQualityArt})
 const a=new Art()
 assert.equal(typeof a.syncAction,'function')
 a.syncAction({time:1.05,player:{faceX:-1},actions:{current:null,basic:{
  skill:'basic_attack',startedAt:1,releaseAt:1.1,endsAt:1.2,dirX:1,
 }}})
 assert.equal(a.attack.face,1,'walking left must not flip a right-facing swing')
 assert.equal(a.attack.end,1.2)
 a.syncAction({time:1.2,player:{faceX:-1},actions:{current:null,basic:null}})
 assert.equal(a.attack,null)
 a.observeCast({skill:'sj_formation',startedAt:2,releaseAt:2.85,bodyReleaseAt:2.35,endsAt:2.44,dirX:1,dirY:0})
 assert.equal(a.attack.release,2.35,'body release must not wait for the first zone tick')
})

test('missing sword-qi textures retain chest height and the true curved blade geometry',()=>{
 const {art,g,state}=fixture()
 for(const kind of ['crescent','cross']){
  g.calls=[]
  const shot={id:kind,source:kind==='crescent'?'sj_arc':'sj_cross',bladeKind:kind,
   shape:`${kind}-projectile`,x:200,y:100,width:180,bladeWidth:12,
   dirX:1,dirY:0,startedAt:9,expiresAt:12,dissolveAt:null}
  const before=JSON.stringify(shot)
  assert.equal(art.drawSwordQi(g,shot,state.time,camera),true)
  assert.equal(g.calls.some(c=>['circle','ellipse','fill','close'].includes(c[0])),false)
  const points=g.calls.filter(c=>c[0]==='move'||c[0]==='line')
  assert.equal(points.length,swordQiSegments(kind,180).length*4)
  // The diagonal painting projects slightly ahead of its reference anchor.
  for(const p of points){assert.ok(p[1]<=205);assert.ok(Math.abs(p[2]-164)<=90.00001)}
  assert.equal(JSON.stringify(shot),before)
 }
})

test('near cross fallback is suppressed only for its actually drawn sprite and fades without a new pulse',()=>{
 const {art,g,state}=fixture()
 const near={id:'cross-near',kind:'cross',source:'sj_cross',shape:'cross',
  x:200,y:100,width:180,bladeWidth:12,dirX:0,dirY:1,startedAt:9.9,expiresAt:10.15}
 state.effects=[near]
 art.draw(g,state,camera,undefined,undefined,undefined,new Set())
 assert.ok(g.calls.some(c=>c[0]==='line'))
 g.calls=[];art.draw(g,state,camera,undefined,undefined,undefined,new Set(['cross-near']))
 assert.equal(g.calls.length,0)
 const shot={...near,id:'flying',kind:undefined,bladeKind:'cross',shape:'cross-projectile',dissolveAt:10,expiresAt:10.36}
 art.drawSwordQi(g,shot,10.18,camera)
 const alpha=g.calls.find(c=>c[0]==='stroke')[1]
 g.calls=[];art.drawSwordQi(g,shot,10.3,camera)
 assert.ok(g.calls.find(c=>c[0]==='stroke')[1]<alpha)
 g.calls=[];art.drawSwordQi(g,shot,10.36,camera);assert.equal(g.calls.length,0)
})

test('fallback projects chest lift vertically for every firing direction and freezes the release hover height',()=>{
 const {art,g}=fixture()
 const startedAt=.5,expectedY=100+64+18+2*Math.sin(1.5)
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[Math.SQRT1_2,Math.SQRT1_2]]){
  g.calls=[]
  const shot={id:'moon',source:'sj_arc',bladeKind:'crescent',shape:'crescent-projectile',
   x:200,y:100,width:180,bladeWidth:12,dirX:dx,dirY:dy,startedAt,expiresAt:12,
   castContext:{loadout:{passive:{sj_flight:1}}}}
  art.drawSwordQi(g,shot,1,{x:0,y:0})
  const edge=swordQiSegments('crescent',180)[0].a,first=g.calls.find(c=>c[0]==='move')
  assert.ok(Math.abs(first[1]-(200+edge.x*dx-edge.y*dy))<1e-8)
  assert.ok(Math.abs(first[2]-(expectedY+edge.x*dy+edge.y*dx))<1e-8)
 }
})

test('kill aftershock stays bounded, survives the receipt tail, is stable while paused, and resets',()=>{
 const {art,g,state}=fixture()
 state.effects=[{id:'burst',kind:'gate',x:20,y:30,radius:65,startedAt:10,expiresAt:10.25}]
 state.time=10.1;art.draw(g,state,camera)
 const calls=JSON.stringify(g.calls),saved=JSON.stringify(state)
 assert.ok(g.calls.filter(c=>c[0]==='circle').length===2)
 assert.ok(g.calls.filter(c=>c[0]==='circle').every(c=>c[3]<=65))
 g.calls=[];art.draw(g,state,camera);assert.equal(JSON.stringify(g.calls),calls);assert.equal(JSON.stringify(state),saved)
 state.effects=[];state.time=10.3;g.calls=[];art.draw(g,state,camera);assert.ok(g.calls.length>0)
 state.time=10.46;g.calls=[];art.draw(g,state,camera);assert.equal(g.calls.length,0)
 state.time=10;state.effects=[{id:'next',kind:'gate',x:0,y:0,radius:100,startedAt:10}];art.draw(g,state,camera)
 art.resetAftershocks();assert.equal(art.gateTracks.size,0)
})
test('aftershock ignores hostile, future and invalid receipts; clean state never invents a burst',()=>{
 const {art,g,state}=fixture()
 state.effects=[{id:'future',kind:'gate',x:0,y:0,radius:65,startedAt:11},
  {id:'invalid',kind:'gate',x:NaN,y:0,radius:65,startedAt:10},
  {id:'hostile',kind:'gate',hostile:true,x:0,y:0,radius:65,startedAt:10}]
 // Isolate the dedicated renderer from generic legacy fallbacks.
 art.drawGateAftershocks(g,state);assert.equal(g.calls.length,0)
})

test('qingping scars follow living wounded bodies, are read-only and disappear with the wound',()=>{
 const {art,g,state}=fixture();state.time=10.7;
 state.enemies=[{id:'marked',hp:100,x:30,y:40,radius:24,woundBudget:8,woundUntil:12}];
 const before=JSON.stringify(state);art.drawQingpingMarks(g,state,camera);
 assert.equal(JSON.stringify(state),before);assert.equal(g.calls.filter(c=>c[0]==='fill').length,2);
 const first=g.calls.find(c=>c[0]==='move');g.calls=[];state.enemies[0].x+=50;art.drawQingpingMarks(g,state,camera);
 assert.ok(Math.abs(g.calls.find(c=>c[0]==='move')[1]-first[1]-50)<1e-8);
 g.calls=[];state.time=12;art.drawQingpingMarks(g,state,camera);assert.equal(g.calls.length,0);
 state.time=10;state.enemies[0].hp=0;art.drawQingpingMarks(g,state,camera);assert.equal(g.calls.length,0);
 state.enemies[0].hp=100;state.enemies[0].woundBudget=0;art.drawQingpingMarks(g,state,camera);assert.equal(g.calls.length,0);
});

test('qingping leaves only one scar after its slow cut and badge follows actual expiry',()=>{
 const {art,g,state}=fixture();const e={hp:100,x:0,y:0,radius:24,woundBudget:8,woundUntil:12};state.enemies=[e];state.time=10.7;
 art.drawQingpingMarks(g,state,camera);assert.equal(g.calls.filter(c=>c[0]==='fill').length,2);
 g.calls=[];art.drawQingpingBadge(g,e,10.7,0,0);assert.equal(g.calls.filter(c=>c[0]==='arc').length,1);
 g.calls=[];art.drawQingpingBadge(g,e,12,0,0);assert.equal(g.calls.length,0);
});

test('qingping refresh keeps one scar without replaying the opening cut',()=>{
 const {art,g,state}=fixture();const e={id:'one',hp:100,x:0,y:0,radius:24,woundBudget:8,woundUntil:12};state.enemies=[e];
 art.drawQingpingMarks(g,state,camera);state.time=10.8;e.woundUntil=12.8;g.calls=[];
 art.drawQingpingMarks(g,state,camera);assert.equal(g.calls.filter(c=>c[0]==='fill').length,2);
 art.resetAftershocks();assert.equal(art.markStarts.size,0);
});

test('qingping overhead sword starts above caster, holds its origin and clears with state',()=>{
 const {art,g,state}=fixture();state.player.x=-140;state.player.y=-80;state.time=10.1;
 state.enemies=[{id:'target',hp:100,x:0,y:-80,radius:24,woundBudget:9,woundUntil:12}];
 art.drawQingpingMarks(g,state,camera);
 const origin={...art.markOrigins.get('target')};assert.equal(origin.x,-140);assert.ok(origin.y>state.player.y+140);
 assert.ok(g.calls.filter(c=>c[0]==='fill').length>10,'bevels and tapered sword contours render during opening');
 state.player.x+=50;state.time=10.2;g.calls=[];art.drawQingpingMarks(g,state,camera);
 assert.deepEqual({...art.markOrigins.get('target')},origin,'caster movement cannot drag an airborne sword');
 state.time=12;art.drawQingpingMarks(g,state,camera);assert.equal(art.markOrigins.size,0);
});

test('qingping blood-drop badge has no background disk',()=>{
 const {art,g}=fixture();art.drawQingpingBadge(g,{hp:10,woundBudget:1,woundUntil:12},10,0,0);
 assert.equal(g.calls.filter(c=>c[0]==='circle').length,0);
 assert.equal(g.calls.filter(c=>c[0]==='fill').length,2,'only blood drop and highlight fill');
 assert.equal(g.calls.filter(c=>c[0]==='arc').length,1,'countdown remains');
});
