// Isolated legal loadout fixture; not a natural acquisition sample.
import fs from 'node:fs'
import {TowerCampaignStore,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {createFixedEquipment} from '../js/xianxia/TowerEquipment.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {steerMechanics} from './verify-monster-mechanics-balance.mjs'
let raw=null;const disk={getItem:()=>raw,setItem:(_k,v)=>raw=v},fresh=new TowerCampaignStore(disk,0);fresh.act({type:'sync'},0)
const envelope=JSON.parse(raw),state=JSON.parse(envelope.data);state.xp=cultivationLevelXp(21);state.equipmentSequence=1;state.equipment['gear-1']=createFixedEquipment('eq_armor_chengxiao','gear-1');state.loadouts[0].armorId='gear-1';state.hp=stats(state.xp,combatLoadout(state)).maxHp*.3
const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)})
const store=new TowerCampaignStore(disk,0),start=store.act({type:'startFloor',floor:1,seed:101},0);if(!start.ok)throw Error(JSON.stringify(start))
const run=TowerRun.restore(start.snapshot);while(run.state.time<6.1){const p=run.state.player;run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315});steerMechanics(run);run.advance(1/60)}run.pause()
const result={method:'Legal level-21 injured character with Chengxiao armor, actual 6.1 seconds, movement only; no HP changes during battle.',validRunSnapshot:validateTowerSnapshot(run.snapshot()),armorState:run.state.armorState,hp:run.state.player.hp,maxHp:run.state.player.maxHp,checkpoint:store.act({type:'checkpoint',snapshot:run.snapshot()},6200)}
fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));console.log(result)
