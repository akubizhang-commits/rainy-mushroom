import test from 'node:test'
import assert from 'node:assert/strict'
import { InputManager } from '../js/ui/InputManager.js'
import { ForagingApplication } from '../js/voxel/ForagingApplication.js'
import { installForagingScreens } from '../js/voxel/ForagingScreens.js'
import { EXPLORATION_SCREEN as S } from '../js/core/ExplorationState.js'
import { EXPLORATION_SPECIES } from '../js/data/explorationData.js'
import { collectionItems } from '../js/ui/collectionItems.js'

function appAt(width=320,height=568,safeTop=36){
  const ctx=new Proxy({
    font:'12px sans-serif',
    createLinearGradient:()=>({addColorStop(){}}),
    measureText(text){const size=Number(this.font.match(/([\d.]+)px/)?.[1]||12);return {width:Array.from(String(text)).reduce((n,c)=>n+(/[^\x00-\xff]/.test(c)?size:size*.55),0)}}
  },{get:(o,k)=>k in o?o[k]:()=>{}})
  const app=new ForagingApplication({width,height,getContext:()=>ctx},safeTop,{getStorageSync(){return null},onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){},createImage(){return {}}})
  installForagingScreens(app.renderer,app)
  return app
}
const render=app=>app.renderer.render({screen:app.screen,state:app.state,collectionPage:app.collectionPage},0)

test('menu taps stay on their starting target, cancel drags, and accept quick different actions',t=>{
  let now=1000;t.mock.method(Date,'now',()=>now)
  const areas=[{x:0,y:0,w:40,h:40,action:'first'},{x:45,y:0,w:40,h:40,action:'second'}]
  const actions=[],pressed=[]
  const input=new InputManager({},()=>areas,a=>actions.push(a),{onTouchStart(){},onTouchEnd(){}})
  input.onPressChange=a=>pressed.push(a)
  const point=(x,y=20)=>({touches:[{x,y}],changedTouches:[{x,y}]})
  input._onStart(point(38));input._onEnd(point(46))
  assert.deepEqual(actions,[],'crossing the small gap must not activate the next button')
  input._onStart(point(20));input._onMove(point(60));input._onMove(point(20));input._onEnd(point(20))
  assert.deepEqual(actions,[],'a drag returning to its start is still not a tap')
  input._onStart(point(20));input._onEnd(point(20))
  now+=10;input._onStart(point(60));input._onEnd(point(60))
  assert.deepEqual(actions,['first','second'])
  input._onStart(point(60));input._onCancel()
  assert.equal(input.pressedAction,null);assert.equal(pressed.at(-1),null)
})

test('small buttons have forgiving touch envelopes without stealing direct hits',()=>{
  const areas=[{x:30,y:30,w:30,h:24,touchTarget:true,action:'small'},
    {x:62,y:30,w:30,h:24,touchTarget:true,action:'next'}]
  const input=new InputManager({},()=>areas,()=>{},{onTouchStart(){},onTouchEnd(){}})
  assert.equal(input._findHit({x:45,y:22})?.action,'small')
  assert.equal(input._findHit({x:63,y:42})?.action,'next')
  assert.equal(input._findHit({x:61,y:42})?.action,'next')
  assert.equal(input._findHit({x:45,y:10}),undefined)
})

test('collection filters preserve separate pages and safely clamp after identification',()=>{
  const app=appAt()
  EXPLORATION_SPECIES.slice(0,8).forEach(s=>Object.assign(app.state._entry(s.id),{seen:true,sampled:1}))
  Object.assign(app.state._entry(EXPLORATION_SPECIES[8].id),{seen:true,sampled:1,identified:true})
  Object.assign(app.state._entry(EXPLORATION_SPECIES[9].id),{seen:true,sampled:0})
  app.handleAction('nav:collection')
  app.handleAction('collectionPage:next');app.handleAction('collectionPage:next')
  app.handleAction('collectionFilter:pending')
  assert.equal(app.collectionPage,0);assert.equal(collectionItems(app.state,'pending').length,8)
  app.handleAction('collectionPage:next')
  const id=collectionItems(app.state,'pending')[6].id
  app.handleAction(`collection:${id}`);app.handleAction('nav:collection')
  assert.equal(app.collectionPage,1)
  app.handleAction('collectionFilter:all');assert.equal(app.collectionPage,2)
  app.handleAction('collectionFilter:pending');assert.equal(app.collectionPage,1)
  for(const s of collectionItems(app.state,'pending').slice(6))app.state._entry(s.id).identified=true
  app.handleAction('nav:collection');assert.equal(app.collectionPage,0)
  app.handleAction('collectionFilter:identified');assert.equal(collectionItems(app.state,'identified').length,3)
  app.handleAction('collectionFilter:invalid');assert.equal(app.collectionFilter,'identified')
})

test('menu controls remain inside short and notched screens, including empty collection states',()=>{
  for(const [w,h,top] of [[320,568,36],[320,568,78],[375,812,54],[430,932,64],[390,844,78]]){
    const app=appAt(w,h,top),r=app.renderer
    app.state.startScene('yn-pine');app.state.startHunt('timed')
    app.poolSceneId='yn-pine'
    for(const species of EXPLORATION_SPECIES)Object.assign(app.state._entry(species.id),{seen:true,sampled:1,identified:true})
    for(const screen of [S.HOME,S.SCENES,S.SCENE_SPECIES,S.COLLECTION,S.GUIDE,S.SOURCES,S.BASKET,S.PAUSE,S.FIELD_JOURNAL,S.COLLECTION_DETAIL]){
      app.screen=screen
      if(screen===S.COLLECTION_DETAIL)app.state.selectCollectionSpecies('amanita-exitialis')
      if(screen===S.FIELD_JOURNAL)app.journalTab='routes'
      render(app)
      assert.ok(r.top*r.scale>=top-.01,`${screen}: status area must be respected`)
      assert.ok(r.hitAreas.every(a=>a.x>=0&&a.y>=top-.01&&a.x+a.w<=w+.01&&a.y+a.h<=h),`${screen}: buttons fit ${w}×${h}`)
      for(const b of r.buttonDraws)for(const text of r.textDraws){
        if(text.button===b)continue
        const x=text.x-(text.align==='center'?text.width/2:text.align==='right'?text.width:0)
        const overlapX=Math.min(x+text.width,b.x+b.w)-Math.max(x,b.x)
        const overlapY=Math.min(text.y+2,b.y+b.h)-Math.max(text.y-text.size,b.y)
        assert.ok(overlapX<=2||overlapY<=2,`${screen}: ${b.label} overlaps ${text.text}`)
      }
    }
    app.screen=S.COLLECTION;app.collectionFilter='pending';render(app)
    assert.ok(r.textDraws.some(t=>t.text==='暂无待鉴别标本'))
    assert.ok(r.hitAreas.some(a=>a.action==='nav:home'))
    assert.ok(!r.hitAreas.some(a=>a.action==='collectionPage:next'))
  }
})

test('photo failures are explicit and specimen fitting keeps the entire image',()=>{
  const app=appAt(),r=app.renderer
  r.imageStore={get:()=>({status:'error'})}
  r._photo('example.jpg',0,0,100,100)
  assert.ok(r.textDraws.some(t=>t.text==='图片暂不可用'))
  const draws=[];r.ctx.drawImage=(...args)=>draws.push(args)
  r.imageStore={get:()=>({status:'ready',image:{width:200,height:400}})}
  r._photo('example.jpg',0,0,100,100,12,{fit:'contain'})
  assert.equal(draws[0].length,5)
  assert.deepEqual(draws[0].slice(1),[25,0,50,100])
})

test('long feedback wraps inside its panel instead of crossing screen edges',()=>{
  const app=appAt(),r=app.renderer
  render(app)
  r._toast('收藏记录暂未保存，请检查本地存储空间；你仍可继续探索，系统会自动重试保存。')
  const b=r.toastBounds
  const lines=r.textDraws.filter(t=>t.y>=b.y&&t.y<=b.y+b.h&&t.align==='center')
  assert.ok(lines.length>=2)
  assert.ok(lines.every(t=>t.width<=b.w-20))
})
