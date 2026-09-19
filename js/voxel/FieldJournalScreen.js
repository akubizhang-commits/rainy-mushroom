import { findingNotes, COMMISSIONS } from '../data/fieldJournal.js'
import { EXPLORATION_SCREEN } from '../core/ExplorationState.js'
import { UI_THEME } from '../ui/theme.js'
const {ink,muted,paper,green}=UI_THEME

export function drawFieldJournal(r,{state},game){
  const run=state.currentRun,y=r.top+106,tab=game.journalTab||'routes',ctx=r.ctx
  r._topBar('林间手记','journal:back',run&&!run.completed?'阅读时暂停探索':'寻找 · 观察 · 记录')
  ;[['routes','路线'],['notes','寻找笔记'],['commission','观察委托']].forEach(([id,label],i)=>r._button(20+i*114,r.top+51,107,38,label,`journalTab:${id}`,{tone:tab===id?'green':'paper',small:true}))
  if(tab==='routes'){
    if(!run){r._wrappedText('进入一处生境后，可以查看三条探索路线。',24,y+30,327,22,14,ink,3);return}
    r._label(state.sceneData.name,24,y+15,18,ink,700)
    r._label('沿路标探索，留意沿途的菌物',24,y+36,10,muted)
    r._panel(20,y+51,335,162,'#e4eadc',14)
    const px=x=>187.5+x*16,pz=z=>y+68+(8-z)*8
    run.routes.forEach(route=>{
      ctx.beginPath();route.points.forEach(([x,z],i)=>i?ctx.lineTo(px(x),pz(z)):ctx.moveTo(px(x),pz(z)))
      ctx.lineWidth=run.selectedRouteId===route.id?5:3;ctx.strokeStyle=route.color;ctx.stroke()
      const [x,z]=route.points.at(-1),visited=run.visitedRouteIds.includes(route.id)
      ctx.fillStyle=visited?green:route.color;ctx.beginPath();ctx.arc(px(x),pz(z),6,0,Math.PI*2);ctx.fill()
      r._label(route.landmark,px(x),pz(z)-11,9,ink,600,'center')
    })
    if(game.player&&Math.abs(game.player.x)<9&&game.player.z>=-8&&game.player.z<=8&&game.journalReturn===EXPLORATION_SCREEN.EXPLORE){
      ctx.fillStyle=ink;ctx.beginPath();ctx.arc(px(game.player.x),pz(game.player.z),4,0,Math.PI*2);ctx.fill()
    }
    run.routes.forEach((route,i)=>{
      const cy=y+224+i*92
      r._panel(20,cy,335,84,paper,12)
      r._label(`${i+1} · ${route.name}${run.visitedRouteIds.includes(route.id)?' · 已到达':''}`,32,cy+24,13,ink,700)
      r._wrappedText(route.hint,32,cy+46,218,15,10.5,muted,2)
      r._button(266,cy+32,77,36,run.selectedRouteId===route.id?'已选':'沿此路线',run.completed?'none':`route:${route.id}`,{tone:run.completed?'disabled':run.selectedRouteId===route.id?'green':'paper',small:true})
    })
  }else if(tab==='notes'){
    const notes=findingNotes(state.profile),page=Math.max(0,Math.min(notes.length-1,game.notePage||0)),note=notes[page]
    r._label(`已解锁 ${notes.length} 篇寻找笔记`,24,y+18,18,ink,700)
    if(!note){
      r._panel(20,y+42,335,164,paper,16)
      r._wrappedText('采集后，到“菌物收藏”比较线索、鉴别名称。答对后，这里会解锁它的寻找笔记。',36,y+74,303,24,14,ink,5)
      r._button(20,y+229,335,44,'前往菌物收藏','nav:collection',{tone:'green',small:true})
      return
    }
    r._panel(20,y+43,335,265,paper,16)
    r._label(note.name,36,y+77,23,ink,750)
    r._label('去林间时，试着这样找',36,y+104,11,green,650)
    r._wrappedText(note.text,36,y+134,299,23,14,ink,5)
    r._wrappedText('留意这些线索，具体位置还要自己找。',36,y+278,299,16,10,muted,2)
    r._panel(20,y+323,335,139,'#e3eadc',14)
    r._label('收藏中的生境记录',36,y+350,13,green,700)
    r._wrappedText(note.ecology,36,y+375,299,20,12,ink,4)
    r._pagination(page,notes.length,'notePage',{y:y+477})
  }else{
    const task=state.commission
    r._label('顺路观察，完成可收藏手记',24,y+18,17,ink,700)
    if(task){
      r._panel(20,y+44,335,186,paper,16)
      r._label(task.title,36,y+78,20,ink,750)
      r._wrappedText(task.description,36,y+108,299,22,13,muted,3)
      r._label(task.completed?'已完成 · 手记已保存':task.skipped?'本局已跳过':`进度 ${task.progress}/${task.target}`,36,y+184,16,green,700)
      r._label(`手记奖励：${task.reward}`,36,y+208,11,muted)
      if(!run.completed&&!task.completed){
        r._button(20,y+245,162,40,task.skipped?'重新选择':'换一个委托','commission:change',{tone:'green',small:true})
        if(!task.skipped)r._button(193,y+245,162,40,'本局跳过','commission:skip',{tone:'paper',small:true})
      }
    }else r._wrappedText('开始探索后会出现观察委托。不想做也可以跳过，不影响通关。',24,y+60,327,23,14,muted,3)
    r._label('已收藏的观察手记',24,y+330,15,ink,700)
    Object.entries(COMMISSIONS).forEach(([id,c],i)=>{
      r._panel(20,y+349+i*44,335,36,paper,9)
      r._label(`${state.profile.observationRewards[id]?'已收藏':'待观察'} · ${c.reward}`,33,y+373+i*44,12,state.profile.observationRewards[id]?green:muted,600)
    })
  }
}
