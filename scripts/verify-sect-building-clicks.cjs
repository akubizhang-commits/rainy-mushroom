// Real pointer/touch input; sample points are read from the painted buildings,
// not from the hit regions under test. Browser storage is isolated.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const url=process.env.PREVIEW_URL||'http://127.0.0.1:8769/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1';
const out=process.env.REPORT_DIR||'reports/sect-building-clicks';
const samples=[
 ['霁云主峰',.50,.13,'home'],['凌霄剑峰',.245,.215,'library'],
 ['炼器峰',.10,.435,'forge'],['丹霞峰',.305,.48,'pills'],
 ['万法峰',.725,.175,''],['云篆符峰',.815,.325,''],
 ['御兽峰',.90,.52,''],['锁妖塔',.65,.455,'tower'],
 ['锁妖塔',.65,.59,'tower'],['山门',.50,.60,'gate'],
 ['山门',.40,.75,'gate'],
];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const viewport of [{width:1280,height:720},{width:844,height:390},{width:1280,height:800}]){
   const context=await browser.newContext({viewport,hasTouch:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const load=async()=>{
    await page.goto(url);
    await page.waitForFunction(()=>{
     const pilot=window.cc?.director.getScene()?.children.find(n=>n.name==='PinePilot');
     window.sectQA=pilot?.components.find(c=>c.constructor.name==='PinePilot')?.survivor;
     return window.sectQA?.menu?.sectScene?.frame;
    });
   };
   const point=async(name,x,y,label)=>page.evaluate(({name,x,y,label})=>{
    const walk=n=>[n,...n.children.flatMap(walk)];
    const nodes=walk(sectQA.root);
    const painting=nodes.find(n=>n.name==='霁云宗已确认母稿');
    const size=painting.getComponent('cc.UITransform').contentSize;
    const camera=walk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);
    const p=label?nodes.find(n=>n.name===name).worldPosition:
     new cc.Vec3(painting.worldPosition.x+(x-.5)*size.width*painting.worldScale.x,
      painting.worldPosition.y+(.5-y)*size.height*painting.worldScale.y,0);
    const screen=camera.worldToScreen(p),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
    return{x:r.x+screen.x/canvas.width*r.width,y:r.y+(1-screen.y/canvas.height)*r.height};
   },{name,x,y,label});
   for(const label of [false,true]){
    for(const [name,x,y,target] of samples){
     console.log(`Checking ${viewport.width} ${label?'label':'building'} ${name}`);
     await load();
     const p=await point(name,x,y,label);
     assert.ok(p.x>=0&&p.x<viewport.width&&p.y>=0&&p.y<viewport.height,`${name} visible`);
     if(label)await page.mouse.click(p.x,p.y);
     else await page.touchscreen.tap(p.x,p.y);
     await page.waitForTimeout(120);
     const result=await page.evaluate(()=>({page:sectQA.page,status:sectQA.menu?.sectScene?.status?.string}));
     if(target)assert.equal(result.page,target,`${viewport.width}: ${name} ${label?'label':'building'}`);
     else assert.ok(result.status?.includes('将在后续开放'),`${name}: unavailable feedback`);
    }
   }
   await load();
   await page.screenshot({path:`${out}/${viewport.width}x${viewport.height}.png`});
   assert.deepEqual(errors,[]);
   console.log(`PASS ${viewport.width}x${viewport.height}: ${samples.length} building taps + ${samples.length} label clicks`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
