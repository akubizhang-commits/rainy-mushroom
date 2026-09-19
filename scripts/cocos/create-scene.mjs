import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
const engine='/Applications/CocosCreator.app/Contents/Resources/resources/3d/engine'
const objects=JSON.parse(readFileSync(engine+'/editor/assets/default_file_content/scene/default.scene','utf8'))
const script='56708b41-0a87-4ae3-b8fa-d6e526d8276e',sceneId='a04bbf6c-cc50-49b8-9be9-f937d6693528'
const short=script.replaceAll('-','');let type=short.slice(0,5);const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';for(let i=5;i<32;i+=3){const n=parseInt(short.slice(i,i+3),16);type+=alphabet[n>>6]+alphabet[n&63]}
objects[0]._name='PinePilot';objects[1]._name='PinePilot';objects[1]._id=sceneId
const n=objects.length;objects[1]._children.push({__id__:n})
objects.push({__type__:'cc.Node',_name:'PinePilot',_objFlags:0,_parent:{__id__:1},_children:[],_active:true,_components:[{__id__:n+1}],_prefab:null,_lpos:{__type__:'cc.Vec3',x:0,y:0,z:0},_lrot:{__type__:'cc.Quat',x:0,y:0,z:0,w:1},_lscale:{__type__:'cc.Vec3',x:1,y:1,z:1},_layer:1073741824,_id:'pilot-root'})
objects.push({__type__:type,_name:'',_objFlags:0,node:{__id__:n},_enabled:true,__prefab:null,_id:'pilot-controller'})
for(const o of objects){if(o.__type__==='cc.AmbientInfo'){o._skyIllum=12000;o._skyIllumHDR=12000}if(o.__type__==='cc.FogInfo'){o._enabled=true;o._type=0;o._fogStart=14;o._fogEnd=55;o._fogColor={__type__:'cc.Color',r:190,g:209,b:191,a:255}}}
mkdirSync('cocos-pilot/assets/scenes',{recursive:true})
writeFileSync('cocos-pilot/assets/scenes/PinePilot.scene',JSON.stringify(objects,null,2))
const meta=(uuid,importer,ver)=>JSON.stringify({ver,importer,imported:true,uuid,files:importer==='typescript'?[]:['.json'],subMetas:{},userData:{}},null,2)
writeFileSync('cocos-pilot/assets/scenes/PinePilot.scene.meta',meta(sceneId,'scene','1.1.50'))
writeFileSync('cocos-pilot/assets/scripts/PinePilot.ts.meta',meta(script,'typescript','4.0.24'))
writeFileSync('cocos-pilot/assets/resources/forest.mtl',JSON.stringify({__type__:'cc.Material',_name:'Forest',_objFlags:0,_native:'',_effectAsset:{__uuid__:'c8f66d17-351a-48da-a12c-0212d28575c4'},_techIdx:0,_defines:[{USE_VERTEX_COLOR:true}],_props:[{roughness:.9,metallic:0}]},null,2))
console.log('Created scene from official Creator 3.8.8 template')
