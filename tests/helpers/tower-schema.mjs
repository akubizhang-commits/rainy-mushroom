// Encode a fresh, in-memory campaign so current-state fixtures survive schema
// changes. Migration cases should continue to name their explicit old version.
import {TowerCampaignStore} from '../../js/xianxia/TowerCampaign.js'
let raw=null
const store=new TowerCampaignStore({getItem:()=>raw,setItem:(_key,value)=>{raw=value}},0)
if(!store.act({type:'sync'},0).ok)throw Error('Unable to encode fresh campaign schema')
export const currentCampaignSchema=JSON.parse(raw).schema
