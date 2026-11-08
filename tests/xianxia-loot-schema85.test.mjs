import {currentCampaignSchema} from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js'
import {checksum} from '../js/xianxia/Checksum.js'

// The floor-nine probability calibration changes saved seed plans. Existing
// schema84 profiles must use the authorized development reset, not be loaded
// under a different loot contract or rejected as a corrupt current profile.
test('schema84 loot profiles reset atomically to schema85 only in this mode',()=>{
 const values=new Map([['other-game','keep'],['account-settings','keep-settings']])
 let blocked=false,writes=0
 const disk={getItem:k=>values.get(k)??null,setItem(k,v){if(blocked)throw Error('full');values.set(k,v);writes++}}
 const fresh=new TowerCampaignStore(disk,0)
 const data=JSON.stringify({...fresh.state,xp:14400,clearedFloor:9,spiritStones:12345})
 const old=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:84,data,checksum:checksum(data)})
 values.set(TOWER_CAMPAIGN_KEY,old);blocked=true
 const failed=new TowerCampaignStore(disk,0)
 assert.equal(failed.readOnly,true)
 assert.equal(failed.error,'save-failed')
 assert.equal(values.get(TOWER_CAMPAIGN_KEY),old)
 assert.equal(writes,0)
 blocked=false
 const reset=new TowerCampaignStore(disk,0)
 assert.equal(reset.readOnly,false)
 assert.deepEqual(reset.migrationReport,{reset:true,fromSchema:84})
 assert.equal(reset.state.xp,0)
 assert.equal(reset.state.clearedFloor,0)
 assert.equal(reset.state.spiritStones,500)
 assert.equal(reset.state.activeRun,null)
 assert.deepEqual(reset.state.skills,{sj_arc:1})
 assert.equal(JSON.parse(values.get(TOWER_CAMPAIGN_KEY)).schema,currentCampaignSchema)
 assert.equal(values.get('other-game'),'keep')
 assert.equal(values.get('account-settings'),'keep-settings')
 assert.equal(writes,1)
 const raw=values.get(TOWER_CAMPAIGN_KEY),loaded=new TowerCampaignStore(disk,0)
 assert.deepEqual(loaded.state,reset.state)
 assert.equal(loaded.migrationReport,null)
 assert.equal(writes,1)
 assert.equal(values.get(TOWER_CAMPAIGN_KEY),raw)
})
