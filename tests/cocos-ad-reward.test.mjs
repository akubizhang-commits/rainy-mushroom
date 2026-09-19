import test from 'node:test'
import assert from 'node:assert/strict'
import {GameSession} from '../js/cocos/GameSession.js'
import {AdService} from '../js/services/AdService.js'
function fixture(){
 const s=new GameSession({getStorageSync(){return null},setStorageSync(){}})
 let close,shown=0
 const api={createRewardedVideoAd(){return {show(){shown++;return Promise.resolve()},onClose(fn){close=fn},onError(){},offClose(){},offError(){},destroy(){}}}}
 s.ads=new AdService(api,{enabled:true,adUnitIds:{rewardedVideo:'adunit-test'}})
 s.start('timed');s.pause()
 return {s,close:r=>close(r),shown:()=>shown}
}
test('Cocos rewarded time pauses the world and grants once for completed video',async()=>{
 const {s,close,shown}=fixture(),run=s.state.currentRun
 s.state.tickHunt(0);s.state.tickHunt(1000);s.stopInput()
 const before=run.timeRemainingMs,pending=s.watchTimeAd()
 assert.equal(s.screen,'advertisement');assert.equal(s.active,false)
 s.tick(10000);s.tick(30000);assert.equal(run.timeRemainingMs,before)
 assert.equal((await s.watchTimeAd()).status,'unavailable');assert.equal(shown(),1)
 close({isEnded:true});close({isEnded:true});assert.equal((await pending).granted,true)
 assert.equal(run.timeRemainingMs,before+60000);assert.equal(s.screen,'pause');assert.equal(s.canWatchTimeAd,false)
 s.resume();s.state.tickHunt(40000);s.state.tickHunt(41000)
 assert.equal(run.timeRemainingMs,before+59000);assert.equal(s.state.grantRewardTime(run),false)
 s.destroy()
})
test('early close does not consume the time reward or change existing collection',async()=>{
 const {s,close}=fixture(),before=JSON.stringify(s.state.profile),time=s.state.currentRun.timeRemainingMs
 const p=s.watchTimeAd();close({isEnded:false});assert.equal((await p).granted,false)
 assert.equal(s.state.currentRun.timeRemainingMs,time);assert.equal(JSON.stringify(s.state.profile),before);assert.equal(s.canWatchTimeAd,true)
 s.destroy()
})
test('late reward never applies to a different run',async()=>{
 const {s,close}=fixture(),p=s.watchTimeAd();s.start('timed');const next=s.state.currentRun
 close({isEnded:true});assert.equal((await p).status,'stale');assert.equal(next.adTimeBonusMs,undefined)
 s.destroy()
})
test('relaxed, completed and successful bonus runs cannot request time reward',()=>{
 const {s}=fixture();s.state.currentRun.huntMode='relaxed';assert.equal(s.canWatchTimeAd,false)
 s.state.currentRun.huntMode='timed';s.state.currentRun.completed=true;assert.equal(s.canWatchTimeAd,false)
 s.state.currentRun.completed=false;s.state.currentRun.bonusStarted=true;assert.equal(s.canWatchTimeAd,false);s.destroy()
})
test('destroying controller cancels pending ad without granting',async()=>{
 const {s,close}=fixture(),run=s.state.currentRun,p=s.watchTimeAd();s.destroy();close({isEnded:true})
 assert.equal((await p).status,'cancelled');assert.equal(run.adTimeBonusMs,undefined)
})
test('no fill preserves pause screen and permits retry without a reward',async()=>{
 const {s}=fixture();s.ads.showRewardedVideo=async()=>({status:'error'})
 assert.equal((await s.watchTimeAd()).granted,false);assert.equal(s.screen,'pause');assert.equal(s.canWatchTimeAd,true);s.destroy()
})
