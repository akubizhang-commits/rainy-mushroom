import test from 'node:test'
import assert from 'node:assert/strict'
import {GameSession} from '../js/cocos/GameSession.js'
test('first-run introduction remembers completion without losing collection progress',()=>{
 const data=new Map(),api={getStorageSync:k=>data.get(k),setStorageSync:(k,v)=>data.set(k,v)},s=new GameSession(api)
 s.preview('yn-pine');assert.equal(s.requestIntro('timed'),true);assert.equal(s.screen,'onboarding');assert.equal(s.introMode,'timed')
 s.open('safety');s.back();assert.equal(s.screen,'onboarding');s.completeIntro();assert.equal(s.requestIntro('timed'),false)
 const loaded=new GameSession(api);assert.equal(loaded.requestIntro('relaxed'),false);assert.equal(loaded.state.profile.tutorialSeen,true)
 s.destroy();loaded.destroy()
})
test('backing out of the introduction does not silently mark it completed',()=>{
 const s=new GameSession({getStorageSync(){return null},setStorageSync(){}});s.preview('yn-pine');s.requestIntro('relaxed');s.back();assert.equal(s.screen,'brief');assert.equal(s.state.profile.tutorialSeen,false);s.destroy()
})
