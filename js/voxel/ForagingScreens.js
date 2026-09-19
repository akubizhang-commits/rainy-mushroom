import { drawSpeciesKnowledge } from './SpeciesKnowledgeScreen.js'
import { drawPickupNotice } from './PickupNotice.js'
import { FORAGING_SCENE_BY_ID, FORAGING_REGIONS as ECO_REGIONS } from '../data/foragingScenes.js'
import { ECO_REGION_BY_ID, EXPLORATION_SPECIES, SPECIES_BY_ID, RARITY_LABELS } from '../data/explorationData.js'
import { VOXEL_BIOMES } from './biomes.js'
import { drawFieldJournal } from './FieldJournalScreen.js'
import { UI_THEME } from '../ui/theme.js'
import { collectionItems } from '../ui/collectionItems.js'
const {ink,muted,paper,green}=UI_THEME
export const countdown=ms=>`${Math.floor(Math.ceil(ms/1000)/60)}:${String(Math.ceil(ms/1000)%60).padStart(2,'0')}`

export function installForagingScreens(r,game){
  r.menuMinHeight=720
  r.menuContentHeight=660
  r._home=({state})=>{
    const identified=EXPLORATION_SPECIES.filter(species=>state.profile.collection[species.id]?.identified).length
    r._label('雨后菌语',22,r.top+29,29,ink,800)
    r._label('选一片林子，开始寻找',23,r.top+55,12,muted,550)
    r._panel(20,r.top+72,335,48,'rgba(250,246,236,.92)',14)
    r._label(`已鉴别 ${identified}/${EXPLORATION_SPECIES.length} 种`,34,r.top+102,12,green,650)
    r._label(`已通关 ${state.profile.successfulChallenges} 次`,340,r.top+102,12,green,650,'right')
    r._label('今天想去哪里？',22,r.top+143,14,ink,750)
    ECO_REGIONS.forEach((region,index)=>{
      const x=18+(index%2)*171,y=r.top+155+Math.floor(index/2)*190
      r._regionCard(region,state,x,y,164,176)
      // The whole card opens its scenes, including the illustrated/title area.
      r._hit(x,y,164,176,`region:${region.id}`)
    })
    r._button(20,r.top+540,161,43,'菌物收藏','nav:collection',{tone:'paper'})
    r._button(194,r.top+540,161,43,'玩法手册','nav:guide',{tone:'paper'})
    r._button(20,r.top+595,335,34,'资料与图片来源','nav:sources',{tone:'ghost',small:true})
    r._label('游戏中可采集，不代表现实中可食用',187.5,r.logicalHeight-16,8.5,'#99483f',650,'center')
  }
  // Keep older map links compatible while presenting one shared landing page.
  r._map=r._home
  r._scenes=({state})=>{
    const region=state.regionData,pages=Math.ceil(region.sceneIds.length/2)
    const page=Math.max(0,Math.min(pages-1,game.scenePage||0))
    r._topBar(region.name,'nav:home',`${region.sceneIds.length} 处探索场景`)
    r._wrappedText(region.climate,24,r.top+61,327,18,11,muted,2)
    region.sceneIds.slice(page*2,page*2+2).forEach((id,i)=>r._sceneCard(FORAGING_SCENE_BY_ID[id],state,20,r.top+104+i*247,335,226))
    r._pagination(page,pages,'scenePage')
    r._label('生境为游戏设计，不代表现实采集地点',187.5,r.logicalHeight-12,8.5,muted,500,'center')
  }
  r._fieldJournal=model=>drawFieldJournal(r,model,game)
  r._sceneCard=(legacy,state,x,y,w,h)=>{
    const scene=FORAGING_SCENE_BY_ID[legacy.id],biome=VOXEL_BIOMES[scene.environment]
    r._panel(x,y,w,h,paper,19)
    const preview=`assets/scene-previews/${scene.id}.jpg`
    const record=r.imageStore.get(preview)
    if(record?.status==='ready')r._photo(preview,x+8,y+8,w-16,104,14)
    else{
      r._panel(x+8,y+8,w-16,104,biome.fog,14)
      r._label(biome.name,x+22,y+46,18,ink,750)
      r._label(record?.status==='error'?'预览暂不可用': '正在加载场景预览',x+22,y+72,10,green)
    }
    r._hit(x+8,y+8,w-16,104,`scene:${scene.id}`)
    r._label(scene.name,x+18,y+137,18,ink,750)
    const progress=state.sceneSpeciesProgress(scene.id)
    r._label(progress.historyIncomplete
      ?`${progress.found?`已补录 ${progress.found}/${progress.total} 种`:'历史记录待补录'} · 名录 ›`
      :`已采集 ${progress.found}/${progress.total} 种 · 名录 ›`,x+18,y+159,11,green,650)
    r._hit(x+12,y+143,210,29,`pool:${scene.id}`)
    r._label([...new Set(scene.animals.map(a=>a.name))].join(' · '),x+18,y+176,10,green,600)
    r._label('每局10朵，采满8朵即通关',x+18,y+191,9,muted)
    r._label(state.profile.completedScenes[scene.id]?'已完成 · 可再次探索':'可选悠闲采集或限时挑战',x+18,y+206,9,green)
    r._button(x+226,y+177,94,34,'进入场景',`scene:${scene.id}`,{tone:'green',small:true})
  }
  r._sceneSpecies=({state})=>{
    const scene=FORAGING_SCENE_BY_ID[game.poolSceneId],progress=state.sceneSpeciesProgress(scene.id),page=game.poolPage||0
    r._topBar('场景菌物名录','nav:scenes',progress.historyIncomplete?'历史记录不全':`${progress.found}/${progress.total} 种已采集`)
    r._label(VOXEL_BIOMES[scene.environment].name,20,r.top+60,19,ink,750)
    r._label(`累计鉴别 ${progress.identified} 种 · 此处可发现 ${progress.unlocked}/${progress.total} 种`,20,r.top+83,10,green)
    const total=progress.pool.filter(e=>e.unlockAt<=progress.identified).reduce((n,e)=>n+e.weight,0)
    const displayed=[...progress.pool].sort((a,b)=>a.unlockAt-b.unlockAt)
    displayed.slice(page*6,page*6+6).forEach((entry,i)=>{
      const species=SPECIES_BY_ID[entry.speciesId],known=state.profile.collection[species.id]?.identified,found=state.profile.sceneDiscoveries[scene.id].includes(species.id),open=entry.unlockAt<=progress.identified,y=r.top+100+i*65
      r._panel(20,y,335,58,paper,11)
      r._label(known?species.name:found?'已采集 · 待鉴别':progress.historyIncomplete?'此处采集记录待补录':open?'尚未采集 · 可以寻找':'尚未解锁',32,y+22,14,ink,700)
      r._label(`${RARITY_LABELS[species.rarity]}${open?` · 抽取参考 ${(entry.weight/total*100).toFixed(1)}%`:` · 累计鉴别 ${entry.unlockAt} 种解锁`}`,32,y+43,10.5,muted)
      if(found)r._label('已采',338,y+22,9,green,600,'right')
    })
    r._wrappedText(progress.historyIncomplete
      ?`旧存档保留了通关记录，但缺少此处的种类明细。目前已记录 ${progress.found}/${progress.total} 种，再次采集可补录；原有收藏和通关记录保留。百分比为普通抽取参考，并非单局遇见率。`
      :'进度统计你在此处采过的不同种类。还有未采集的已解锁菌物时，每局至少出现1种。百分比是普通抽取的参考占比，不是单局遇见率。',22,r.top+510,330,16,11,muted,4)
    r._label('游戏稀有度与场景分布不代表野外实际情况',22,r.top+585,9,muted)
    r._pagination(page,Math.ceil(progress.total/6),'poolPage')
  }
  r._collectionDetail=({state})=>{
    const species=state.selectedCollectionSpecies,entry=state.getCollectionEntry(species.id)
    if(entry.identified){
      drawSpeciesKnowledge(r,state,game)
      return
    }
    if(!(entry.sampled>0)){
      r._topBar('收藏鉴别','nav:collection','待采集')
      r._panel(20,r.top+65,335,210,paper,18)
      r._unknownFungus(187.5,r.top+128)
      r._label('已有目击记录，尚未采集',187.5,r.top+185,16,ink,750,'center')
      r._wrappedText('先在探索中采集这类菌物，再回到收藏查看线索、鉴别名称。',40,r.top+218,295,20,12,muted,2)
      r._button(20,r.top+298,335,42,'去选择探索场景','nav:home',{tone:'green'})
      return
    }
    const remaining=state.collectionLockRemaining(),y=r.top+54
    r._topBar('收藏鉴别','nav:collection',remaining>0?'等待重试':'待鉴别')
    const photoIndex=state.collectionPhotoIndex%species.photos.length
    r._photo(species.photos[photoIndex],20,y,335,species.expanded?132:153,15,{fit:'contain'})
    r._hit(20,y,335,species.expanded?132:153,'collectionPhoto:next')
    if(species.photoCredits)r._wrappedText(species.photoCredits[state.collectionPhotoIndex%species.photos.length],24,y+147,327,11,8,muted,1)
    r._label(`已采集 ${entry.sampled} 朵 · 已查看 ${entry.studiedClues||0}/3 条线索`,25,y+174,10,muted,600)
    r._button(254,y+156,101,32,`换一张 ${photoIndex+1}/${species.photos.length}`,'collectionPhoto:next',{tone:'paper',small:true})
    state.collectionClues.forEach((clue,i)=>{
      const cy=y+190+i*66
      r._panel(20,cy,335,60,entry.lastMistakeId&&i===2?'#e3ecd9':paper,12)
      r._label(`${i+1} · ${clue.label}${entry.lastMistakeId&&i===2?' · 对比一下':''}`,31,cy+18,11.5,green,750)
      r._wrappedText(i<(entry.studiedClues||0)?clue.text:'点击下方按钮，查看这条线索。',31,cy+36,313,15,12,muted,2)
    })
    const by=y+398
    if((entry.studiedClues||0)<3){
      r._button(20,by,335,42,'查看下一条线索','collectionStudy:next',{tone:'green',small:true})
      r._label('先比较三条线索，再选择名称',187.5,by+65,11,muted,500,'center')
    }else if(remaining>0&&state.correctionHint){
      const hint=state.correctionHint
      r._label(`还没答对 · ${countdown(remaining)} 后可重试`,187.5,by+14,12,'#90662e',600,'center')
      r._panel(20,by+26,335,125,'#e8eddf',12)
      r._label(`上次选择：${hint.chosenName}`,31,by+46,11,green,700)
      r._wrappedText(hint.chosen,31,by+65,311,15,10.5,muted,2)
      r._label('这份标本的关键特征',31,by+103,11,green,700)
      r._wrappedText(hint.actual,31,by+121,311,15,10.5,ink,2)
    }else{
      r._label('对照照片和线索，选择名称',187.5,by+14,12,ink,600,'center')
      state.collectionCandidates.forEach((candidate,i)=>r._button(20,by+26+i*44,335,38,candidate.name,remaining>0?'none':`collectionIdentify:${candidate.id}`,{tone:remaining>0?'disabled':'paper',small:true}))
    }
    r._label('答错等待45秒，再错等待2分钟；期间可继续探索',187.5,r.logicalHeight-24,8.5,muted,500,'center')
  }
  r._basket=({state})=>{
    r._topBar('本局采集','nav:explore',`${state.goalProgress}/${state.goalTarget} 朵`)
    r._label('收获已保存，到“菌物收藏”鉴别名称',20,r.top+60,10,muted)
    state.basketItems.forEach(({spawn,species},i)=>{
      const y=r.top+81+i*48
      r._panel(20,y,335,41,paper,10)
      r._label(state.getCollectionEntry(species.id)?.identified?species.name:'未知菌物',33,y+26,12,ink,650)
      r._label(`${spawn.count} 朵`,339,y+26,11,green,600,'right')
    })
    r._button(20,r.logicalHeight-67,335,43,'继续探索','nav:explore',{tone:'green',small:true})
  }
  r._result=({state,ads={}})=>{
    const result=state.lastResult,scene=FORAGING_SCENE_BY_ID[result.sceneId],success=result.status==='success'
    r._topBar('探索收获','nav:home',ECO_REGION_BY_ID[result.regionId].name)
    const y=r.top+52,b=r.logicalHeight-157
    r._panel(20,y,335,94,success?'#dce9d7':'#efe2c9',20)
    r._label(result.bonusEndReason?'探索结束 · 已通关':success?'采集达标！':result.status==='predator-contact'?'遇到猛兽 · 挑战失败':result.status==='time-expired'?'时间到 · 未达标':'探索结束 · 未达标',187.5,y+33,23,ink,750,'center')
    r._label(result.bonusEndReason?`目标收获 ${result.targetCollectCount} 朵 · 额外收获 ${result.bonusCollectedCount} 朵`:`采集 ${result.collectedMushroomCount}/${result.targetCollectCount} 朵 · 动物吃掉 ${result.eatenCount} 朵`,187.5,y+59,13,green,650,'center')
    const reason=result.bonusEndReason==='predator-contact'?`碰到了${result.predatorName}，通关记录与收获均已保留`:result.bonusEndReason==='time-expired'?'时间到，通关记录与收获均已保留':result.status==='predator-contact'?`碰到了${result.predatorName}，已采集的菌物仍保留`:'已采集的菌物与新发现已保存'
    r._label(reason,187.5,y+80,10.5,muted,500,'center')
    if(!drawPickupNotice(r,game.pickupNotice,Date.now(),true)){
      r._panel(20,y+107,335,59,paper,13)
      r._label(`${scene.name} · 发现进度`,33,y+129,12,ink,650)
      r._label(`${result.discoveriesBefore} → ${result.discoveriesAfter} / ${result.discoveriesTotal} 种`,33,y+151,16,green,750)
    }
    const ids=result.newSceneSpeciesIds||[],page=game.resultPage||0,pages=Math.max(1,Math.ceil(ids.length/3))
    r._label(`此处新增 ${ids.length} 种 · 首次发现 ${result.newSpeciesIds?.length||0} 种`,22,y+193,13,ink,700)
    ids.slice(page*3,page*3+3).forEach((id,i)=>{
      const species=SPECIES_BY_ID[id],known=state.getCollectionEntry(id)?.identified,x=20+i*114
      r._panel(x,y+205,107,92,paper,12)
      r._photo(species.photos[0],x+5,y+210,97,49,8)
      r._label(known?species.name:'新菌物 · 待鉴别',x+7,y+275,10,ink,650)
      r._label(result.newSpeciesIds.includes(id)?'首次发现':'此处首次采集',x+7,y+291,9,green)
    })
    if(!ids.length)r._wrappedText('这次没有新增种类。到收藏中鉴别菌物，或换个场景继续寻找。',27,y+237,321,20,12,muted,3)
    if(pages>1)r._pagination(page,pages,'resultPage',{y:y+304,height:36})
    const next=state.nextUnlock()
    r._label(next?`再鉴别 ${next.remaining} 种，解锁更多菌物`:'全部种类已解锁，继续补齐场景名录',22,y+355,12,green,650)
    const badges=result.badges||[]
    r._wrappedText(badges.length?'收藏纪念：'+badges.join(' · '):`本局摆脱追踪 ${result.escapes||0} 次 · 累计收藏纪念 ${Object.keys(state.profile.discoveryBadges).length} 枚`,22,Math.min(y+381,b-96),330,16,11,green,2)
    r._label(result.commission?.completed?`观察完成：${result.commission.reward}`:'观察委托可选，不影响采集结果',22,b-57,11,green)
    if(success&&ads.rewardedAvailable)r._button(20,b-49,335,37,ads.rainBadgeClaimed?'雨滴支持章已领取':ads.rewardedBusy?'视频加载中…':'自愿看广告 · 领装饰性雨滴支持章',ads.rainBadgeClaimed||ads.rewardedBusy?'none':'ad:rainBadge',{tone:ads.rainBadgeClaimed||ads.rewardedBusy?'disabled':'blue',small:true})
    r._button(20,b,335,44,'前往菌物收藏','nav:collection',{tone:'green',small:true})
    r._button(20,b+53,335,40,state.canContinueExploring?'留在林间 · 继续探索':'再探索一次',state.canContinueExploring?'bonus:continue':`scene:${scene.id}`,{tone:'paper',small:true})
    r._button(20,b+102,335,40,'换个场景','nav:scenes',{tone:'paper',small:true})
  }
  r._guide=()=>{
    r._topBar('玩法手册','nav:home')
    const steps=[['移动、蹲下与跳跃','摇杆移动，右侧滑动环顾；轻推慢行，推满快跑。蹲下看草丛，边移动边跳可越过矮障碍。'],['采满8朵，即可通关','走近菌物，轻点采集；被松针或落叶盖住时，先拨开再采集。达标后可继续探索，收获始终保留。'],['观察动物，跟随线索','快速靠近会惊动动物。30秒后食菌动物开始嗅闻、觅食；悠闲最多吃掉1朵，挑战最多2朵。'],['挑战中，小心猛兽','限时3分钟：50秒出现预警，1分钟后猛兽入场，碰到即失败。躲到树石后，隐蔽6秒可脱险。'],['到收藏中认识菌物','所有游戏菌物都可采集。到“菌物收藏”看完三条线索，再选择名称；答对即可解锁寻找笔记。'],['没答对，再比较一下','答错后等45秒，再错等2分钟。期间可查看特征对比，也可继续探索或鉴别其他菌物。']]
    steps.forEach(([title,text],i)=>{const y=r.top+65+i*87;r._panel(20,y,335,77,paper,13);r._label(title,35,y+25,14,ink,700);r._wrappedText(text,35,y+41,305,15,11.5,muted,3)})
    r._label('游戏内可采集不代表现实中可食用',187.5,r.logicalHeight-20,10,muted,500,'center')
  }
  const oldCollection=r._collection.bind(r)
  r._collection=model=>{
    const filter=game.collectionFilter||'all'
    oldCollection({...model,journalAction:'journal:notes',collectionFilter:filter,collectionSpecies:collectionItems(model.state,filter)})
    r._label(`收藏纪念 ${Object.keys(model.state.profile.discoveryBadges||{}).length} 枚 · ${model.state.nextUnlock()?`再鉴别${model.state.nextUnlock().remaining}种可解锁`:'全部种类已解锁'}`,187.5,r.logicalHeight-73,10.5,green,600,'center')
  }
  const oldCard=r._collectionCard.bind(r)
  r._collectionCard=(species,entry,x,y,w,h)=>{
    oldCard(species,entry,x,y,w,h)
    if(entry?.seen&&!entry.identified&&stateRemaining(game.state,species.id)>0){
      r._panel(x+8,y+118,w-16,18,paper,4)
      r._label(`可重试倒计时 ${countdown(stateRemaining(game.state,species.id))}`,x+12,y+131,8.5,'#9b743b',650)
    }
  }
}
const stateRemaining=(state,id)=>state.collectionLockRemaining(Date.now(),id)
