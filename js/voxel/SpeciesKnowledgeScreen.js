import { SPECIES_KNOWLEDGE, KNOWLEDGE_TABS } from '../data/speciesKnowledge.js'
import { UI_THEME as T } from '../ui/theme.js'

export function drawSpeciesKnowledge(r,state,game){
 const s=state.selectedCollectionSpecies,k=SPECIES_KNOWLEDGE[s.id],e=state.getCollectionEntry(s.id)
 const tab=Math.max(0,Math.min(3,game.knowledgeTab||0)),t=r.top
 r._topBar('图鉴详情','nav:collection','已鉴别')
 r._label(s.name,22,t+72,22,T.ink,750)
 r._label(s.scientificName,22,t+94,11,T.muted)
 s.photos.slice(0,2).forEach((path,i)=>r._photo(path,20+i*173,t+108,162,133,15,{fit:'contain'}))
 r._label(`累计采集 ${e.sampled||0} 朵 · 发现 ${e.encounters||0} 次`,22,t+261,10,T.muted)
 KNOWLEDGE_TABS.forEach((label,i)=>r._button(20+i*85,t+276,80,38,label,`knowledgeTab:${i}`,{tone:tab===i?'green':'paper',small:true}))
 r._panel(20,t+326,335,238,T.paper,18)
 const paragraph=(title,body,y,max=4)=>{
  r._label(title,34,t+y,13,T.green,750)
  r._wrappedText(body,34,t+y+25,307,21,12,T.ink,max)
 }
 if(tab===0){
  paragraph(k.formTitle,k.form,353)
  paragraph('生长环境',s.ecology,469,3)
 }else if(tab===1){
  paragraph(k.storyTitle,k.story,353,5)
  r._wrappedText('观察小任务：下次探索时，留意它周围的树木、落叶和木材，试着联系本页知识。',34,t+503,307,19,11,T.muted,3)
 }else if(tab===2){
  paragraph('哪些细节容易认错？',k.comparison,353,5)
  r._wrappedText('这里的特征帮助理解物种，不构成野外鉴定检索表。游戏中可采集，不代表现实中可食用。',34,t+503,307,19,11,T.danger,3)
 }else{
  r._label('知识来源',34,t+353,13,T.green,750)
  r._wrappedText(k.source.publisher,34,t+379,307,19,11,T.ink,2)
  r._wrappedText(k.source.title,34,t+418,307,19,11,T.muted,2)
  r._button(34,t+448,145,36,'复制资料链接','knowledgeSource:copy',{tone:'paper',small:true})
  r._label(`整理日期 ${k.reviewed}`,34,t+509,10,T.muted)
  r._wrappedText('依据原文概述；国外生境记录不等于本地分布。照片署名见“资料与图片来源”。',34,t+530,307,16,10,T.muted,2)
 }
 r._button(20,t+585,335,42,'查看寻找笔记',`note:${s.id}`,{tone:'green'})
 r._label('照片与文字用于学习，不作为现实采食依据',187.5,r.logicalHeight-16,8.5,T.muted,500,'center')
}
