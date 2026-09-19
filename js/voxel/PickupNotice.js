import { SPECIES_BY_ID } from '../data/explorationData.js'

export const PICKUP_NOTICE_MS=4000
export function makePickupNotice(state,spawnId,result,now=Date.now()){
  if(!result.added)return null
  const spawn=state.sceneData.spawns.find(s=>s.id===spawnId),species=SPECIES_BY_ID[spawn.speciesId]
  const known=Boolean(state.getCollectionEntry(species.id)?.identified)
  return {
    name:known?species.name:'未知菌物',known,count:result.count,
    photo:known?species.photos[0]:null,
    imageLabel:known?(species.imageKind==='原创形态示意'?'示意图':'实拍'):'待鉴别',
    isNew:result.isNew,progress:state.goalProgress,target:state.goalTarget,
    bonus:Boolean(state.currentRun.bonusStarted),until:now+PICKUP_NOTICE_MS
  }
}

export function drawPickupNotice(r,notice,now=Date.now(),resultPage=false){
  if(!notice||notice.until<=now)return false
  const {ctx}=r,w=resultPage?335:190,h=resultPage?76:88
  const x=resultPage?20:121,y=resultPage?r.top+150:r.logicalHeight-172
  const size=h-20,tx=x+size+18,textWidth=w-size-28
  const opacity=Math.min(1,(notice.until-now)/450)
  ctx.save();ctx.globalAlpha=opacity
  r._panel(x,y,w,h,'rgba(18,43,32,.94)',14)
  r._panel(x+8,y+10,size,size,'#dce4d4',9)
  const record=notice.photo?r.imageStore.get(notice.photo):null
  if(record?.status==='ready'&&record.image){
    r._photo(notice.photo,x+8,y+10,size,size,9)
  }else{
    r._unknownFungus(x+8+size/2,y+10+size*.52)
    ctx.globalAlpha=opacity
  }
  r._panel(x+8,y+h-26,size,16,'rgba(18,43,32,.82)',4)
  const imageLabel=notice.photo&&record?.status!=='ready'?(record?.status==='error'?'暂无图片':'加载中'):notice.imageLabel
  r._label(imageLabel,x+8+size/2,y+h-15,8.5,'#fff8e7',500,'center')
  r._label(`已采集 ${notice.count} 朵`,tx,y+20,10,'#d4e1c1',600)
  r._wrappedText(notice.name,tx,y+38,textWidth,15,13,'#fff8e7',2)
  r._label(notice.known?(notice.bonus?`本局收获 ${notice.progress} 朵`:`本局 ${notice.progress}/${notice.target} 朵`):notice.isNew?'首次发现 · 待鉴别':'已收藏 · 待鉴别',tx,y+h-11,9,'#d4e1c1',500)
  ctx.restore()
  return true
}
