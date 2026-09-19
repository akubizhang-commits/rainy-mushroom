import { FORAGING_RULES } from '../data/foragingScenes.js'
import { EXPLORATION_SCREEN as S } from '../core/ExplorationState.js'

// Schedule texture work from visible changes, rather than repainting every menu at 30 Hz.
export class UiScheduler {
  constructor(){this.previous=null;this.renders=0}
  needsUpdate(game,now=Date.now()){
    const run=game.state.currentRun,p=game.player,notice=game.pickupNotice
    const locks=[]
    if(game.screen===S.COLLECTION_DETAIL||game.screen===S.COLLECTION){
      const entries=Object.entries(game.state.profile.collection)
      for(const [id,entry] of entries)if(entry.identificationLockedUntil>now)locks.push(id,Math.ceil((entry.identificationLockedUntil-now)/1000))
    }
    const key=JSON.stringify([
      game.screen,game.feedback,game.images.revision,game.ads.rewardedBusy,
      game.active&&[Math.ceil((run.timeRemainingMs||0)/1000),run.basketSpawnIds.length,run.eatenSpawnIds.length,run.revealedSpawnIds.length,
        run.predatorStatus,run.predatorActive,run.predatorMessage,run.predatorNoticeUntil>run.elapsedMs,
        run.animalNotice,run.animalNoticeUntil>run.elapsedMs,run.huntMode==='timed'&&Math.ceil(Math.max(0,FORAGING_RULES.predatorMs-run.elapsedMs)/1000)],
      p&&[p.crouched,p.grounded,p.speed>3],game.aim?.id,game.aim?.covered,game.controls.stick,
      notice&&[notice.until,notice.until-now<450?Math.floor(now/50):0],locks
    ])
    const changed=game.uiDirty||key!==this.previous
    this.previous=key
    if(changed)this.renders++
    return changed
  }
}
