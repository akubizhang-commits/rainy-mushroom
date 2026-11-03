// Fresh browser context plus in-memory store: never reads/writes the user's saves.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/skill-swimlanes-2026-11-03/ui-large-realm-headings');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(b)});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;const report={cases:[],errors:[],console:[]};
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')report.console.push(m.text())});
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning,undefined,{timeout:60000});
   await page.evaluate(()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000;
    let record=null;const disk={getItem:()=>record,setItem:(_,v)=>{record=v}};
    h.store=new h.store.constructor(disk,0);
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    window.qaFind=name=>window.qaWalk(h.menu.root).find(n=>n.name===name);
    h.screen='camp';h.menu.libraryArea='skills';h.goto('library');
   });
   await page.waitForFunction(()=>window.qaFind('功法泳道-lianqi-early'));
   await page.waitForTimeout(500);
   const snapshot=()=>page.evaluate(()=>{
    const m=window.__towerTest.host.menu,nodes=window.qaWalk(m.root);
    return {rows:nodes.filter(n=>n.name.startsWith('功法行-')).map(n=>({id:n.name.slice(4),x:n.position.x,y:n.position.y})),
     lanes:nodes.filter(n=>n.name.startsWith('功法泳道-')).map(n=>n.name),offset:{...m.scroll.getScrollOffset()},selected:m.detailId,
     labels:nodes.filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.Label')?.string||'').filter(Boolean),
     treeLabels:window.qaWalk(window.qaFind('境界功法树内容')).filter(n=>n.activeInHierarchy).map(n=>n.getComponent('cc.Label')?.string||'').filter(Boolean)};
   });
   const initial=await snapshot();assert.equal(initial.rows.length,18);assert.equal(initial.lanes.length,9);
   assert.ok(!initial.rows.some(n=>n.id.startsWith('future_')));
   for(const text of ['通用','剑气','御剑','剑阵','当前','已修习','待修习'])assert.ok(!initial.treeLabels.includes(text),text);
   assert.ok(initial.treeLabels.some(text=>/^弦月斩\([\d.]+秒\)$/.test(text)));
   assert.ok(initial.treeLabels.includes('周天剑域(常驻)'));
   for(const realm of ['炼气','筑基','金丹']){
    assert.ok(initial.treeLabels.includes(`${realm} * 初期`));
    assert.ok(!initial.treeLabels.includes(realm));
   }
   assert.ok(initial.treeLabels.includes('中期'));
   assert.ok(initial.treeLabels.includes('巅峰'));
   const laneTitles=await page.evaluate(()=>window.qaWalk(window.qaFind('境界功法树内容'))
    .filter(n=>n.name.startsWith('功法泳道-')).map(n=>{
     const title=n.children.find(c=>c.getComponent('cc.Label'))?.getComponent('cc.Label');
     const ui=title.node.getComponent('cc.UITransform');
     return {left:title.node.worldPosition.x-ui.width*title.node.worldScale.x/2,alignment:title.horizontalAlign,
      text:title.string,fontSize:title.fontSize};
    }));
   assert.equal(laneTitles.length,9);
   for(const title of laneTitles){assert.equal(title.alignment,0);assert.ok(Math.abs(title.left-laneTitles[0].left)<.01);}
   for(const title of laneTitles)assert.equal(title.fontSize,title.text.includes(' * ')?20:14);
   const unlockSections=await page.evaluate(()=>{
    const m=window.__towerTest.host.menu,old=m.detailId;
    const ids=window.qaWalk(m.root).filter(n=>n.name.startsWith('功法行-')).map(n=>n.name.slice(4));
    const results=ids.map(id=>{
     m.openDetails(id);
     return {id,visible:window.qaWalk(m.root).some(n=>n.getComponent('cc.Label')?.string==='解锁节点')};
    });
    m.openDetails(old);return results;
   });
   const requiresSkill=new Set(['sj_yujian','evo_wanjian','evo_wuwo','evo_tiandi','evo_sixiang']);
   for(const section of unlockSections)assert.equal(section.visible,requiresSkill.has(section.id),section.id);
   assert.ok(!initial.labels.includes('修习起点'));
   assert.ok(!initial.labels.includes('境界未达'));
   const geometry=await page.evaluate(()=>{
    const tree=window.qaFind('境界功法树内容').getComponent('cc.UITransform');
    const viewport=window.qaFind('功法树二维卷轴').getComponent('cc.UITransform');
    const icon=window.qaFind('功法图标-sj_arc');
    const badge=window.qaFind('功法等级-sj_arc'),caption=window.qaFind('功法节点-sj_arc');
    return {width:tree.width,available:viewport.width,iconSize:icon.getComponent('cc.UITransform').width*icon.scale.x*icon.parent.scale.x,
     badgeX:badge.position.x,badgeY:badge.position.y,
     badgeBottom:badge.worldPosition.y-badge.getComponent('cc.UITransform').height*badge.worldScale.y/2,
     captionTop:caption.worldPosition.y+caption.getComponent('cc.UITransform').height*caption.worldScale.y/2};
   });
   assert.ok(geometry.width<=geometry.available+1);
   assert.ok(geometry.iconSize<=68.1);
   assert.equal(geometry.badgeX,0);
   assert.ok(geometry.badgeY<-48);
   assert.ok(geometry.badgeBottom>geometry.captionTop,'level badge must sit above caption without overlap');

   await page.screenshot({path:path.join(out,`initial-${viewport.width}.png`)});
   // Scroll a real node into view, then click through the canvas and Cocos Button.
   const click=async name=>{
    await page.evaluate(async name=>{
     const m=window.__towerTest.host.menu,cc=window.cc||await window.System.import('cc');
     const n=window.qaFind(name),tree=window.qaFind('境界功法树内容'),vp=window.qaFind('功法树二维卷轴');
     if(!n)throw Error('Missing node '+name);
     let p=n,pos={x:0,y:0};while(p!==tree){pos.x+=p.position.x;pos.y+=p.position.y;p=p.parent;if(!p)throw Error('Not in tree '+name)}
     const size=vp.getComponent('cc.UITransform');
     const content=tree.getComponent('cc.UITransform');
     m.scroll.scrollToOffset(new cc.Vec2(Math.max(0,Math.min(content.width-size.width,pos.x-size.width/2)),Math.max(0,Math.min(content.height-size.height,-pos.y-size.height/2))),0);
    },name);
    await page.waitForTimeout(100);
    const xy=await page.evaluate(async name=>{
     const cc=window.cc||await window.System.import('cc');
     const camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);
     const n=window.qaFind(name),p=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
     return {x:r.x+p.x/canvas.width*r.width,y:r.y+(1-p.y/canvas.height)*r.height};
    },name);
    await page.mouse.click(xy.x,xy.y);await page.waitForTimeout(200);
   };
   await click('功法节点-sj_wanjian');
   assert.equal((await snapshot()).selected,'sj_wanjian');
   assert.ok(await page.evaluate(()=>window.qaFind('功法行-evo_wuwo').getComponent('cc.Graphics')));
   await page.screenshot({path:path.join(out,`selected-chain-${viewport.width}.png`)});
   await click('功法图标-sj_line');assert.equal((await snapshot()).selected,'sj_line');
   await page.waitForFunction(()=>window.qaFind('功法素材-sj_line')?.getComponent('cc.Sprite')?.spriteFrame);
   await page.screenshot({path:path.join(out,`new-icon-${viewport.width}.png`)});
   const stableBefore=await snapshot();
   await page.evaluate(()=>{const m=window.__towerTest.host.menu;m.render(window.__towerTest.host.store.state,'library','')});
   const stableAfter=await snapshot();assert.deepEqual(stableAfter.rows,stableBefore.rows);assert.deepEqual(stableAfter.offset,stableBefore.offset);
   await click('功法境界展开-元婴');
   const expanded=await snapshot();assert.equal(expanded.rows.length,21);assert.equal(expanded.lanes.length,12);
   await page.screenshot({path:path.join(out,`expanded-${viewport.width}.png`)});
   const saved=await page.evaluate(()=>JSON.stringify(window.__towerTest.host.store.state));
   await click('功法节点-future_taixu');assert.equal((await snapshot()).selected,'future_taixu');
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__towerTest.host.store.state)),saved);
   await click('功法境界展开-元婴');assert.equal((await snapshot()).rows.length,18);
   // Simulate a valid later cultivation state, then exercise the unchanged learn transaction.
   const learned=await page.evaluate(async()=>{
    const h=window.__towerTest.host,{cultivationLevelXp}=await import('/js/xianxia/TowerProfile.js');
    h.store._state={...JSON.parse(JSON.stringify(h.store.state)),xp:cultivationLevelXp(4),spiritStones:1000};
    h.menu.libraryArea='skills';h.goto('library');
    const m=h.menu,positions=()=>window.qaWalk(m.root).filter(n=>n.name.startsWith('功法行-')).map(n=>[n.name,n.position.x,n.position.y]);
    m.openDetails('sj_yujian');const before=positions(),offset={...m.scroll.getScrollOffset()};
    m.changeSkill({id:'sj_yujian'},'learnSkill');
    return {before,after:positions(),rank:h.store.state.skills.sj_yujian,offset,afterOffset:{...m.scroll.getScrollOffset()},selected:m.detailId};
   });
   assert.equal(learned.rank,1);assert.deepEqual(learned.before,learned.after);assert.deepEqual(learned.offset,learned.afterOffset);assert.equal(learned.selected,'sj_yujian');
   report.cases.push({viewport,initial,expanded,learned});
   await context.close();
  }
  assert.deepEqual(report.errors,[]);console.log('PASS: both landscapes; 18 fixed skills, nine lanes, canvas selection, evolution highlight, folding, icon load, learning and scroll preservation');
 }finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
