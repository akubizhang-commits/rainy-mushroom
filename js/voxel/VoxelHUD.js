import { drawPickupNotice } from './PickupNotice.js'
import { ECO_REGION_BY_ID } from '../data/explorationData.js'

export function drawVoxelHUD(r,model,game) {
  const {state}=model,run=state.currentRun,scene=state.sceneData,ctx=r.ctx,h=r.logicalHeight,t=r.top+6
  ctx.clearRect(0,0,375,h)
  const pill=(x,y,w,text,action)=>{
    r._panel(x,y,w,44,'rgba(18,38,29,.72)',14)
    r._label(text,x+w/2,y+27,11,'#fff8e7',600,'center')
    if(action) r._hit(x,y,w,44,action,{touchTarget:true})
  }
  pill(12,t,44,run.bonusStarted?'结束':run.huntStarted?'暂停':'返回',run.bonusStarted?'finish:scene':run.huntStarted?'nav:pause':'nav:scenes')
  r._panel(62,t,207,44,'rgba(18,38,29,.55)',14)
  const diversity=state.sceneSpeciesProgress(scene.id)
  r._label(`${ECO_REGION_BY_ID[scene.regionId].name} · 已采集 ${diversity.found}/${diversity.total}种`,73,t+15,9,'#e4e6d6',500)
  r._label(scene.name,73,t+35,16,'#fff8e7',700)
  pill(319,t+127,44,'手记','journal:routes')
  if(!run.huntStarted) {
    r._panel(16,h*.45-34,343,183,'rgba(18,38,29,.72)',18)
    r._label('走进林间，寻找菌物',25,h*.45,25,'#fff8e7',700)
    r._label('左侧摇杆行走 · 右侧滑动环顾',25,h*.45+34,12,'#fff8e7')
    r._label('采满8朵即通关，还可继续探索',25,h*.45+58,12,'#fff8e7')
    r._label(scene.animals.some(a=>a.forager)?'30秒后动物觅食：悠闲最多1朵，挑战2朵':'牦牛在草甸吃草，不会吃掉菌物',25,h*.45+82,11,'#fff8e7')
    r._label(`挑战：1分钟后${scene.predator.name}出现，碰到即失败`,25,h*.45+104,11,'#ffe0bd')
    pill(20,h-142,335,'悠闲采集 · 不限时，无猛兽','hunt:relaxed')
    pill(20,h-88,335,'限时挑战 · 3分钟，躲避猛兽','hunt:timed')
    r._label(`${scene.weather?.name||'雨后微光'} · 走近菌物，轻点采集`,25,h*.45+126,11,'#fff8e7')
    return
  }
  const ready=state.canFinish()
  pill(282,t,81,run.bonusStarted?`收获 ${state.goalProgress} ›`:ready?'收获 ›':`${state.goalProgress}/${state.goalTarget} ›`,'nav:basket')
  r._label(run.huntMode==='relaxed'?'悠闲':`${Math.ceil(run.timeRemainingMs/1000)}秒`,323,t+58,10,'#fff8e7',600,'center')
  r._label(run.bonusStarted?`已达标 · 林中 ${state.remainingCount} · 额外 ${state.goalProgress-run.baseResult.collectedMushroomCount} 朵`:`剩余 ${state.remainingCount} 朵 · 动物吃掉 ${state.eatenMushroomCount} 朵`,18,t+65,10,'#fff8e7',600)
  const status={patrol:'附近巡游 · 尚未发现你',alert:'发现你了 · 立即寻找遮挡',chase:'正在追踪 · 绕到树干或岩石后',search:'正在搜寻 · 保持隐蔽6秒'}
  const warning=run.huntMode==='timed'?(run.predatorActive?status[run.predatorStatus]||'保持距离':`猛兽 ${Math.max(0,Math.ceil((60000-run.elapsedMs)/1000))} 秒后出现`):'悠闲采集 · 慢慢找，不限时'
  r._label(warning,18,t+88,11,'#ffe0bd',600)
  const route=run.routes.find(r=>r.id===run.selectedRouteId)
  if(route&&!run.hasPanned)r._label(`${route.name} · ${route.landmark}`,18,t+185,11,'#fff8e7',600)
  if(run.huntMode==='timed'&&run.predatorNoticeUntil>run.elapsedMs){r._panel(18,t+113,292,47,'rgba(75,38,27,.88)',12);r._wrappedText(run.predatorMessage,29,t+131,270,15,11,'#fff1c3',2)}
  else if(run.animalNoticeUntil>run.elapsedMs){r._panel(18,t+113,292,40,'rgba(18,38,29,.78)',12);r._wrappedText(run.animalNotice,29,t+130,270,14,10.5,'#fff1c3',2)}
  const x=341,y=t+92
  ctx.fillStyle=run.lensEnabled?'#dce8be':'rgba(18,38,29,.6)'
  ctx.beginPath();ctx.arc(x,y,22,0,Math.PI*2);ctx.fill()
  ctx.strokeStyle=run.lensEnabled?'#213e28':'#fff8e7';ctx.lineWidth=2.3
  ctx.beginPath();ctx.arc(x-3,y-3,8,0,Math.PI*2);ctx.moveTo(x+3,y+3);ctx.lineTo(x+11,y+11);ctx.stroke()
  r._hitCircle(x,y,Math.max(22,22/r.scale),'lens:toggle')
  const stick=game.controls.stick,sx=stick?stick.x/r.scale:71,sy=stick?stick.y/r.scale:h*.83
  pill(319,h*.83-76,44,game.player.grounded===false?'腾空':'跳起','jump:up')
  pill(319,h*.83-22,44,game.player.crouched?'站起':'蹲下','posture:toggle')
  r._label(game.player.crouched?'蹲行':game.player.speed>3?'快跑 · 易被察觉':'轻推慢行 · 推满快跑',71,h*.83-55,9.5,'#fff8e7',600,'center')
  ctx.strokeStyle='rgba(255,250,223,.38)';ctx.fillStyle='rgba(18,38,29,.12)';ctx.lineWidth=1.5
  ctx.beginPath();ctx.arc(sx,sy,45,0,Math.PI*2);ctx.fill();ctx.stroke()
  ctx.fillStyle='rgba(255,250,223,.45)';ctx.beginPath();ctx.arc(sx+(stick?.dx||0)*28,sy+(stick?.dy||0)*28,17,0,Math.PI*2);ctx.fill()
  ctx.strokeStyle=game.aim?'#fff1b5':'rgba(255,255,238,.55)';ctx.lineWidth=1
  ctx.beginPath();ctx.arc(187.5,h/2,game.aim?6:2.5,0,Math.PI*2);ctx.stroke()
  if(game.aim){
    r._label(game.aim.covered?'轻点拨开松针或落叶':'轻点采集',187.5,h/2+27,13,'#fff8e7',600,'center')
    r._label(game.aim.clue||'',187.5,h/2+46,10.5,'#fff1c3',500,'center')
  }
  drawPickupNotice(r,game.pickupNotice)
  if(!run.hasPanned) {
    r._panel(102,h-68,260,38,'rgba(18,38,29,.65)',12)
    r._label('摇杆行走 · 滑动环顾 · 轻点采集',232,h-44,11,'#fff8e7',500,'center')
  }
}
