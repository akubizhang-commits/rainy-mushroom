import {enemyDebuffs} from '../js/xianxia/TowerEnemyStatuses.js'
import {NORMAL_SKILL_NAMES} from '../js/xianxia/TowerEnemyAttacks.js'
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const path=new URL('../cocos-pilot/assets/scripts/TowerMonsterMechanicsView.ts',import.meta.url);
const layoutSource=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerCaptionLayout.ts',import.meta.url),'utf8'),{mode:'transform'}).replace(/^export /gm,'');
const layoutTowerCaptions=runInNewContext(layoutSource+';layoutTowerCaptions');
class Graphics {
 commands=[];clear(){this.commands=[];}
}
for(const name of ['circle','arc','rect','moveTo','lineTo','close','fill','stroke'])Graphics.prototype[name]=function(...args){this.commands.push([name,...args]);};
class Node {static created=0;children=[];active=true;layer=1;components=new Map();constructor(name){this.name=name;Node.created++;}addChild(n){this.children.push(n);}addComponent(Type){const c=new Type();c.node=this;this.components.set(Type,c);return c;}getComponent(Type){return this.components.get(Type);}setPosition(x,y){this.position={x,y};}}
class UITransform {setContentSize(width,height){Object.assign(this,{width,height});}}
class Label {}
class Color {constructor(...args){this.args=args;}}
function setup(){assert.ok(existsSync(path),'monster mechanic renderer must exist');const source=stripTypeScriptTypes(readFileSync(path,'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');const ctx={enemyDebuffs,NORMAL_SKILL_NAMES,layoutTowerCaptions,TowerArmorArt:class {draw(){} destroy(){}},TowerSlamArt:class {draw(){} destroy(){}},TowerSpiritFlowArt:class {draw(){} destroy(){}},TowerClawSwipeArt:class {draw(){} destroy(){}},TowerEarthWaveArt:class {draw(){} destroy(){}},TowerWindbladeArt:class {draw(){} destroy(){}},TowerCrystalArt:class {draw(){} destroy(){} has(){return false;}},TowerCoreArt:class {draw(){} destroy(){} has(){return false;}},TowerChainArt:class {draw(){} destroy(){} has(){return false;}},TowerFallingRockArt:class {draw(){} destroy(){}},TowerSafeSealArt:class {draw(){} destroy(){}},TowerPillarArt:class {draw(){} destroy(){} has(){return false;}},TowerShockwaveArt:class {draw(){} destroy(){} has(){return false;}},TowerBreathArt:class {draw(){} destroy(){} has(){return false;}},TowerLightningArt:class {draw(){} destroy(){}},TowerEggArt:class {draw(){} destroy(){} has(){return false;}},TowerMiasmaArt:class {draw(){} destroy(){} has(){return false;}},TowerSpiderWebArt:class {draw(){} destroy(){} has(){return false;}},Graphics,Node,UITransform,Label,Color,Sprite:class {}};runInNewContext(source+'\nglobalThis.View=TowerMonsterMechanicsView',ctx);const root=new Node('root');root.layer=33554432;return new ctx.View(root);}
const zone=(shape,extra={})=>({id:'z',shape,x:100,y:100,radius:600,phase:'windup',startedAt:0,activatesAt:2,expiresAt:3,name:'重踏',...extra});
test('warning preserves full circle range and camera transform',()=>{const v=setup();v.draw({time:1,enemies:[],monsterMechanics:{zones:[zone('circle')]}},{x:20,y:30});assert.ok(v.ranges.commands.some(c=>c[0]==='circle'&&c[1]===80&&c[2]===70&&c[3]===600));});

test('safe gates retain crosshatching and labels without circumference outlines; pool is reused and cleared',()=>{const v=setup();const state={time:1,enemies:[{id:1,x:0,y:0,hp:10,maxHp:10,radius:20,temporary:{kind:'core'}}],monsterMechanics:{zones:[zone('safe-gates',{safeZones:[{x:200,y:100,radius:70}]})]}};v.draw(state,{x:0,y:0});const count=Node.created;const texts=v.labels.filter(l=>l.node.active).map(l=>l.string);assert.ok(texts.some(s=>s.includes('安全')));assert.ok(texts.some(s=>s.includes('灵核')));assert.ok(v.ranges.commands.filter(c=>c[0]==='circle'&&c[1]===200).length===1);assert.ok(v.ranges.commands.filter(c=>c[0]==='lineTo').length>=3);v.draw(state,{x:0,y:0});assert.equal(Node.created,count);v.draw({time:2,enemies:[],monsterMechanics:{zones:[]}},{x:0,y:0});assert.ok(v.labels.every(l=>!l.node.active));});
test('boss feedback omits true-body tag, shows active phase timer and vulnerability without wall-clock drift',()=>{const v=setup();const state={time:5,enemies:[{id:1,role:'boss',x:0,y:0,hp:90,maxHp:100,radius:20,mechanic:{phase:'active',label:'护甲减伤80%',startedAt:4,until:8,enraged:false,vulnerableUntil:0}}],monsterMechanics:{zones:[]}};v.draw(state,{x:0,y:0});let strings=v.labels.filter(l=>l.node.active).map(l=>l.string);assert.ok(!strings.some(s=>s.includes('真身')));assert.ok(strings.some(s=>s.includes('护甲减伤80%')&&s.includes('3.0秒')));const snapshot=JSON.stringify(v.ranges.commands);v.draw(state,{x:0,y:0});assert.equal(JSON.stringify(v.ranges.commands),snapshot);state.enemies[0].mechanic.vulnerableUntil=10;v.draw(state,{x:0,y:0});strings=v.labels.filter(l=>l.node.active).map(l=>l.string);assert.ok(v.debuffAnchors.has(1));assert.ok(!strings.some(s=>s.includes('破绽 ·')));});
test('runtime nodes inherit their parent render layer',()=>{const v=setup();assert.ok(v.labels.every(l=>l.node.layer===v.ranges.node.layer));assert.equal(v.ranges.node.layer,33554432);});
test('clone art is translucent and blood rage scales visible bodies without changing simulation radius',()=>{const v=setup();const sprite={color:null};const body={scale:{x:-1,y:1},getComponent:()=>sprite,setScale(x,y,z){this.scale={x,y,z};}};const e={radius:25,temporary:{kind:'clone'},mechanic:{enraged:false}};assert.equal(typeof v.styleActor,'function');v.styleActor(e,body);assert.equal(sprite.color.args[3],150);assert.equal(e.radius,25);e.temporary=null;e.mechanic.enraged=true;v.styleActor(e,body);assert.equal(body.scale.x,-1.2);assert.equal(body.scale.y,1.2);assert.equal(e.radius,25);});
// Installed Cocos Graphics.arc starts a new path, unlike a Canvas line continuation.
// These point-containment assertions catch both the complementary sweep and disconnected caps.
function filledPolygons(commands){const polygons=[];let current=[];for(const [op,...p] of commands){if(op==='moveTo')current=[[p[0],p[1]]];else if(op==='lineTo')current.push([p[0],p[1]]);else if(op==='fill'&&current.length>2){polygons.push(current);current=[];}}return polygons;}
function covers(commands,x,y){return filledPolygons(commands).some(points=>{let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;});}
test('filled hazard regions preserve sector direction, ring gap and convex capsule endcaps',()=>{
 const v=setup(),render=z=>{v.draw({time:1,enemies:[],monsterMechanics:{zones:[z]}},{x:0,y:0});return v.ranges.commands;};
 let commands=render(zone('sector',{x:0,y:0,radius:100,faceX:0,faceY:-1,angle:Math.PI*1.2}));
 assert.ok(covers(commands,0,-50));assert.ok(!covers(commands,0,50));
 commands=render(zone('ring',{x:0,y:0,radius:100,innerRadius:70,faceX:1,faceY:0,angle:Math.PI*1.5}));
 assert.ok(covers(commands,85,0));assert.ok(covers(commands,0,85));assert.ok(!covers(commands,-85,0));assert.ok(!covers(commands,0,0));
 commands=render(zone('capsule',{x:0,y:0,toX:200,toY:0,width:60}));
 for(const [x,y] of [[-20,0],[100,20],[220,0]])assert.ok(covers(commands,x,y),`capsule ${x},${y}`);
 assert.ok(!covers(commands,-31,0));assert.ok(!covers(commands,100,31));
});
test('small-screen captions stay below HUD and tall temporary labels move below their bodies',()=>{
 const v=setup();v.draw({time:1,enemies:[{x:0,y:20,hp:10,maxHp:10,radius:26,temporary:{kind:'clone'}}],monsterMechanics:{zones:[zone('circle',{x:350,y:10,radius:110})]}},{x:0,y:0},{width:1280,height:591});
 const active=v.labels.filter(l=>l.node.active),caption=active.find(l=>l.string.includes('重踏')),clone=active.find(l=>l.string==='镜魄');
 assert.ok(caption.node.position.y<=60,'caption must clear the minimap and wave HUD');
 assert.ok(clone.node.position.y<20-26,'clone identity must remain visible below its body when top overlaps HUD');
});
test('enlarged boar boss caption clears the body and HUD',()=>{
 const v=setup();v.draw({time:1,enemies:[{id:1,family:'boar',role:'boss',x:0,y:0,hp:10,maxHp:10,radius:42,mechanic:{enraged:true,phase:'idle'}}],monsterMechanics:{zones:[]}},{x:0,y:0},{width:1280,height:720});
 const rage=v.labels.find(l=>l.node.active&&l.string.includes('血怒'));
 assert.ok(rage.node.position.y<0,'caption moves below a tall boss when its top would overlap HUD');
});
test('bear recovery caption clears minimap HUD in both landscape layouts',()=>{
 for(const height of [720,591]){
  const v=setup(),y=-12,radius=42;
  v.draw({time:1,enemies:[{id:1,family:'bear',role:'boss',x:475,y,hp:10,maxHp:10,radius,
   mechanic:{phase:'recovery',skillId:'M07',vulnerableUntil:6,vulnerability:.2}}],
   monsterMechanics:{zones:[]}},{x:0,y:0},{width:1280,height});
  const anchor=v.debuffAnchors.get(1);
  assert.ok(anchor,'recovery opening has an icon anchor');
  assert.ok(anchor.y+12<=height/2-238,'opening icon clears minimap and wave HUD');
  assert.ok(!v.labels.some(l=>l.node.active&&l.string.includes('破绽 ·')),'opening uses an icon instead of duplicate text');
 }
});
test('hazard captions clear the wave badge below the minimap',()=>{
 for(const height of [720,591]){
  const v=setup();
  v.draw({time:1,enemies:[],monsterMechanics:{zones:[zone('circle',{x:475,y:-12,radius:110})]}},
   {x:0,y:0},{width:1280,height});
  const caption=v.labels.find(l=>l.node.active&&l.string.includes('重踏'));
  const waveBottom=height/2-118-102-8-32;
  assert.ok(caption.node.position.y+16<=waveBottom-8,'32px caption must leave 8px below the wave badge');
 }
});

test('M10 gains a borderless windup fill and retains skill labels',()=>{
 const v=setup();v.draw({time:1,enemies:[],monsterMechanics:{zones:[zone('circle',{skillId:'M10',name:'缚足蛛网'})]}},{x:0,y:0});
 assert.equal(v.ranges.commands.filter(c=>c[0]==='circle').length,2);assert.ok(!v.ranges.commands.some(c=>c[0]==='stroke'));
 assert.ok(v.labels.some(l=>l.node.active&&l.string.includes('缚足蛛网')));
 v.draw({time:1,enemies:[],monsterMechanics:{zones:[zone('circle',{skillId:'M07'})]}},{x:0,y:0});assert.ok(v.ranges.commands.some(c=>c[0]==='circle'));
});

test('M11 retains windup fill, then removes redundant geometry with loaded ground art',()=>{
 const v=setup(),s={time:1,enemies:[],monsterMechanics:{zones:[zone('circle',{skillId:'M11'})]}};
 v.draw(s,{x:0,y:0});assert.ok(v.ranges.commands.some(c=>c[0]==='fill'));
 s.time=2;s.monsterMechanics.zones[0].phase='active';v.miasmaArt.has=()=>true;
 v.draw(s,{x:0,y:0});assert.equal(v.ranges.commands.length,0);
});


test('pillar label clears the nearby owner identity in a small landscape viewport',()=>{
 const v=setup();v.draw({time:1,enemies:[{id:'boss',x:180,y:0,hp:100,maxHp:100,radius:42,role:'boss'},{id:'p',x:110,y:0,hp:20,maxHp:20,radius:26,temporary:{kind:'pillar',ownerId:'boss'}}],monsterMechanics:{zones:[]}},{x:0,y:0},{width:1280,height:591});
 const label=v.labels.find(l=>l.node.active&&l.string==='破阵机关柱');assert.equal(label.node.position.x,50);assert.ok(label.node.position.y<0);
});

test('safe-gates skill caption stays below safety labels',()=>{const v=setup();v.draw({time:1,enemies:[],monsterMechanics:{zones:[zone('safe-gates',{name:'六门避劫',x:0,y:0,radius:2400,safeZones:[{x:100,y:0,radius:55},{x:50,y:86,radius:55}]})]}},{x:0,y:0});const caption=v.labels.find(l=>l.node.active&&l.string.includes('六门避劫'));assert.equal(caption.node.position.y,-87);});

test('M14 caption clears the falling rock landing column',()=>{const v=setup();v.draw({time:1,enemies:[],monsterMechanics:{zones:[zone('circle',{skillId:'M14',name:'连环落石',x:0,y:0,radius:55})]}},{x:0,y:0});const label=v.labels.find(l=>l.node.active&&l.string.includes('连环落石'));assert.equal(label.node.position.y,-87);});

test('overlapping M14 pulses retain one readable earliest caption',()=>{const v=setup();const a=zone('circle',{id:'a',skillId:'M14',name:'连环落石',x:0,y:0,radius:55}),b={...a,id:'b',activatesAt:3,expiresAt:4};v.draw({time:1,enemies:[],monsterMechanics:{zones:[a,b]}},{x:0,y:0});assert.equal(v.labels.filter(l=>l.node.active&&l.string.includes('连环落石')).length,1);});

test('M21 explains cumulative charge and lure readiness without claiming safety',()=>{
 const v=setup(),e={id:'owner',hp:100,mechanic:{pulses:45}},z=zone('circle',{skillId:'M21',ownerId:'owner',name:'镇妖破甲阵',phase:'active',radius:55});
 const s={time:2.1,enemies:[e],monsterMechanics:{zones:[z]}};
 v.draw(s,{x:0,y:0});assert.ok(v.labels.some(l=>l.node.active&&l.string.includes('入阵蓄能 50%')));assert.ok(!v.labels.some(l=>l.node.active&&l.string.includes('安全')));assert.ok(v.labels.find(l=>l.node.active&&l.string.includes('入阵蓄能')).node.position.y<z.y-z.radius);
 e.mechanic.pulses=90;v.draw(s,{x:0,y:0});assert.ok(v.labels.some(l=>l.node.active&&l.string.includes('引妖入阵')));
});

test('dense M04 names keep all objectives and summons readable without covering live or broken crystals',()=>{
 const v=setup(),boss={id:'boss',family:'bear',role:'boss',x:200,y:0,hp:100,maxHp:100,radius:42,mechanic:{phase:'active',label:'岩甲减伤80% · 击碎结晶',startedAt:0,until:8}};
 const temp=(id,kind,x,y)=>({id,x,y,hp:10,maxHp:10,radius:26,temporary:{kind,ownerId:'boss',expiresAt:8}});
 const s={time:1,player:{x:0,y:0},enemies:[boss,temp('c1','crystal',55,35),temp('c2','crystal',95,-30),
  temp('m1','minion',60,10),temp('m2','minion',90,20),temp('m3','minion',100,-35),temp('m4','minion',130,-15)],
  effects:[{kind:'monster_crystal_break',x:140,y:50,radius:26,startedAt:0,expiresAt:2}],monsterMechanics:{zones:[]}};
 v.draw(s,{x:0,y:0},{width:1280,height:591});
 const active=v.labels.filter(l=>l.node.active);
 assert.equal(active.filter(l=>l.string==='召唤兽').length,4);assert.equal(active.filter(l=>l.string==='护甲结晶').length,2);
 const boxes=active.map(l=>({left:l.node.position.x-l.node.getComponent(UITransform).width/2,right:l.node.position.x+l.node.getComponent(UITransform).width/2,bottom:l.node.position.y-16,top:l.node.position.y+16}));
 const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.bottom<b.top&&a.top>b.bottom;
 const crystalBodies=[{left:31,right:79,bottom:29,top:97},{left:71,right:119,bottom:-36,top:32},{left:116,right:164,bottom:44,top:112}];
 for(let i=0;i<boxes.length;i++){
  assert.ok(crystalBodies.every(b=>!overlaps(b,boxes[i])),active[i].string);
  for(let j=0;j<i;j++)assert.ok(!overlaps(boxes[i],boxes[j]),`${active[i].string}/${active[j].string}`);
 }
 const before=JSON.stringify(s),pose=JSON.stringify(active.map(l=>[l.string,l.node.position]));
 v.draw(s,{x:0,y:0},{width:1280,height:591});assert.equal(JSON.stringify(s),before);
 assert.equal(JSON.stringify(v.labels.filter(l=>l.node.active).map(l=>[l.string,l.node.position])),pose);
});

test('charge warning is a borderless strip filling from origin on the real windup clock',()=>{
 const v=setup(),z=zone('capsule',{skillId:'M06',x:0,y:0,toX:200,toY:0,width:60,radius:30,startedAt:10,activatesAt:12,expiresAt:13});
 const render=time=>{v.draw({time,enemies:[],monsterMechanics:{zones:[z]}},{x:0,y:0});return v.ranges.commands;};
 for(const [time,end] of [[10.5,35],[11,100],[11.5,165]]){
  const commands=render(time);
  assert.ok(!commands.some(c=>['stroke','circle','arc'].includes(c[0])),'charge must not draw circular caps or outlines');
  const polygons=filledPolygons(commands);
  assert.equal(polygons.length,2);
  assert.equal(Math.max(...polygons[1].map(p=>p[0])),end);
  assert.ok(covers(commands,-29,0)&&covers(commands,229,0),'full danger extent remains visible before activation');
  assert.equal(JSON.stringify(render(time)),JSON.stringify(commands),'paused clock freezes fill');
 }
 assert.equal(filledPolygons(render(10)).length,1);
 assert.equal(Math.max(...filledPolygons(render(12))[1].map(p=>p[0])),230);
 assert.equal(render(13).length,0);
});

test('charge fill rotates with camera and does not mutate the combat zone',()=>{
 const v=setup(),z=zone('capsule',{x:10,y:20,toX:10,toY:220,width:40,radius:20,startedAt:0,activatesAt:2});
 const before=JSON.stringify(z);v.drawCharge(v.ranges,z,1,{x:5,y:10});
 const p=filledPolygons(v.ranges.commands);
 assert.equal(p.length,2);assert.equal(Math.max(...p[1].map(v=>v[1])),110);
 assert.ok(covers(v.ranges.commands,5,-9));assert.ok(covers(v.ranges.commands,5,229));
 assert.equal(JSON.stringify(z),before);
});

test('all area shapes fill from inside outward with a light borderless tint',()=>{
 const v=setup();
 for(const shape of ['circle','sector','ring','capsule']){
  const z=zone(shape,{x:0,y:0,toX:200,toY:0,width:40,radius:100,innerRadius:40,faceX:1,faceY:0,angle:Math.PI/2});
  const snapshots=[];
  for(const time of [0,.5,1,2]){
   const g=new Graphics();const colors=[];Object.defineProperty(g,'fillColor',{set(c){colors.push(c.args);}});
   v.drawAreaWarning(g,z,time,{x:0,y:0});
   assert.ok(!g.commands.some(c=>c[0]==='stroke'));
   assert.ok(colors.every(c=>c[3]<=45),'base and fill must remain translucent');
   snapshots.push(g.commands);
  }
  assert.notDeepEqual(snapshots[1],snapshots[2]);
  if(shape==='circle'){
   assert.equal(snapshots[0].filter(c=>c[0]==='circle').length,1);
   assert.equal(snapshots[2].filter(c=>c[0]==='circle').at(-1)[3],50);
   assert.equal(snapshots[3].filter(c=>c[0]==='circle').at(-1)[3],100);
  }
  if(shape==='ring')assert.ok(!covers(snapshots[3],20,0),'inner safe hole stays empty');
 }
});

test('coincident pulses do not stack the same warning tint',()=>{
 const v=setup(),a=zone('circle',{skillId:'M14',ownerId:'one',radius:55});
 v.draw({time:1,enemies:[],monsterMechanics:{zones:[a,{...a,id:'next',activatesAt:2.5}]}},{x:0,y:0});
 assert.equal(v.ranges.commands.filter(c=>c[0]==='circle').length,2);
 assert.ok(!v.ranges.commands.some(c=>c[0]==='stroke'));
});

test('every hostile mechanic shape has no boundary stroke throughout windup',()=>{
 for(const [skillId,shape] of [['M06','capsule'],['M07','circle'],['M08','sector'],['M09','capsule'],['M10','circle'],['M11','circle'],['M12','circle'],['M13','circle'],['M14','circle'],['M15','ring'],['M16','sector'],['M17','capsule'],['M18','ring'],['M20','capsule'],['M21','circle']]){
  const v=setup(),z=zone(shape,{skillId,radius:100,width:40,innerRadius:60,x:0,y:0,toX:200,toY:0,faceX:1,faceY:0,angle:Math.PI});
  for(const time of [0,.5,1.9]){
   v.draw({time,enemies:[],monsterMechanics:{zones:[z]}},{x:0,y:0});
   assert.ok(!v.ranges.commands.some(c=>c[0]==='stroke'),skillId);
   assert.ok(v.ranges.commands.some(c=>c[0]==='fill'),skillId);
  }
 }
});
