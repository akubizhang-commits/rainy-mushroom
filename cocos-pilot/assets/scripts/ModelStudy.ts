import {Vec3} from 'cc';
import {EXPLORATION_SPECIES} from './shared/js/cocos/GameSession';
import {makeMushroom} from './shared/js/voxel/mushrooms';
import {BotanicalMesh} from './shared/js/cocos/BotanicalGeometry';
import {speciesSculpture} from './shared/js/cocos/SpeciesSculptures';
import {forestAnimal} from './shared/js/cocos/ForestAnimals';
import {MeshBuilder} from './shared/js/voxel/geometry';
import {ForestMeshes} from './ForestMeshes';
// Local review fixture: static stage, no exploration start and no profile writes.
export function showModelStudy(controller:any,id:string){
 const species=EXPLORATION_SPECIES.find(s=>s.id===id),animal=!species?forestAnimal(id):null;
 if(!species&&!animal)return;
 controller.captureMode=true;controller.canvas.active=false;
 const ground=new MeshBuilder();ground.box(0,-.05,0,12,.1,12,'#a5aa90');
 const target=species?makeMushroom({id:'study',count:1},species,{x:0,y:0,z:0},null,{mesh:new BotanicalMesh(),sculpt:speciesSculpture}):null;
 const world={surfaces:[{kind:'ground',data:ground.data()}],targets:target?[target]:[],covers:[],wildlife:{actors:animal?[{kind:id,x:0,y:0,z:0,yaw:0,phase:0,moving:false,mode:'idle'}]:[],modelData:animal?{[id]:animal}:{}}};
 controller.forest=new ForestMeshes(controller.node,world,controller.materials.items);controller.forest.update({basketSpawnIds:[],eatenSpawnIds:[],revealedSpawnIds:[]});
 controller.session.world={lighting:{ambient:17000,illuminance:35000,sun:'#fff3df',fogStart:12,fogEnd:35},biome:{fog:'#d2d8c2',sky:'#d2d8c2'}};controller.applyLighting();
 controller.camera.fov=42;controller.camera.node.setPosition(animal?2.6:1.0,animal?1.9:.85,animal?3.4:1.35);controller.camera.node.lookAt(new Vec3(0,animal?.75:.28,0));
}
