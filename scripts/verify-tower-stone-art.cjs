// Real Cocos rendering, in a fresh browser context and loopback origin only.
// Synthetic denominations are display fixtures; they never enter player storage.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.REPORT_DIR || path.join(ROOT,'docs/xianxia/reports/stone-art-2026-10-30');
const FILES=['stone_low','stone_mid','stone_high','stone_top'];
const VALUES=[1,100,10000,1000000];
const TYPES={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'};

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const server=createServer((req,res)=>{
  const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',TYPES[path.extname(file)]||'application/octet-stream');res.end(data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const report={status:'RUNNING',scope:'four spirit-stone images plus contribution, cultivation, skill points, permanent books, both pills, healing pickup and backpack/skill/settings buttons',layouts:[],errors:[]};
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'})});
  const url=`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`;
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport});
   const page=await context.newPage();
   page.on('pageerror',error=>report.errors.push(error.message));
   await page.goto(url);
   await page.waitForFunction(()=>window.__towerTest?.host?.menu);
   await page.evaluate(()=>{
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)];
    window.qaFind=name=>window.qaWalk(window.__towerTest.host.root).find(n=>n.name===name&&n.activeInHierarchy);
    window.__towerTest.host.campElapsed=-100000;
   });
   const layout={viewport,wallet:[]};
   const click=async name=>{
    const point=await page.evaluate(name=>{
     const n=window.qaFind(name);if(!n)throw Error('Missing '+name);
     const camera=window.qaWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);
     const v=camera.worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
     return {x:r.x+v.x/canvas.width*r.width,y:r.y+(1-v.y/canvas.height)*r.height};
    },name);
    await page.mouse.click(point.x,point.y);
   };
   await page.waitForFunction(()=>!!window.qaFind('灵石素材-ui_bag-sect-bag')?.getComponent('cc.Sprite')?.spriteFrame);
   layout.homeBag=await page.evaluate(()=>{
    const n=window.qaFind('灵石素材-ui_bag-sect-bag'),hit=n.parent.getComponent('cc.UITransform');
    return {sourceWidth:n.getComponent('cc.Sprite').spriteFrame.originalSize.width,hitWidth:hit.width,hitHeight:hit.height};
   });
   assert.deepEqual(layout.homeBag,{sourceWidth:128,hitWidth:80,hitHeight:80});
   await page.screenshot({path:path.join(OUT,`home-backpack-${viewport.width}x${viewport.height}.png`)});
   await click('背包');await page.waitForFunction(()=>window.__towerTest.host.menu.currentPage==='inventory');
   layout.homeBag.opensInventory=true;
   await page.evaluate(()=>window.__towerTest.host.goto('hall'));
   await page.waitForFunction(()=>!!window.qaFind('灵石素材-ui_skills-sect-book')?.getComponent('cc.Sprite')?.spriteFrame);
   layout.homeSkills=await page.evaluate(()=>{
    const n=window.qaFind('灵石素材-ui_skills-sect-book'),hit=n.parent.getComponent('cc.UITransform');
    return {sourceWidth:n.getComponent('cc.Sprite').spriteFrame.originalSize.width,hitWidth:hit.width,hitHeight:hit.height};
   });
   assert.deepEqual(layout.homeSkills,{sourceWidth:128,hitWidth:80,hitHeight:80});
   await page.screenshot({path:path.join(OUT,`home-skills-${viewport.width}x${viewport.height}.png`)});
   await click('技能');await page.waitForFunction(()=>window.__towerTest.host.menu.currentPage==='library');
   layout.homeSkills.opensLibrary=true;
   await page.evaluate(()=>window.__towerTest.host.goto('hall'));
   await page.waitForFunction(()=>!!window.qaFind('灵石素材-ui_settings-sect-gear')?.getComponent('cc.Sprite')?.spriteFrame);
   await click('设置');await page.waitForFunction(()=>!!window.qaFind('宗门设置遮罩'));
   await page.screenshot({path:path.join(OUT,`home-settings-${viewport.width}x${viewport.height}.png`)});
   await click('关闭设置');layout.homeSettingsOpens=true;



   for(let grade=0;grade<4;grade++){
    await page.evaluate(value=>{
     const h=window.__towerTest.host;
     h.goto('inventory');
     const fixture=JSON.parse(JSON.stringify(h.store.state));fixture.spiritStones=value;
     window.stoneCampaignBefore=JSON.stringify(h.store.state);
     h.menu.render(fixture,'inventory');
    },VALUES[grade]);
    await page.waitForFunction(()=>!!window.qaFind('灵石素材-resource_contribution-wallet-contribution')?.getComponent('cc.Sprite')?.spriteFrame);
    const name=`灵石素材-${FILES[grade]}-wallet`;
    await page.waitForFunction(name=>!!window.qaFind(name)?.getComponent('cc.Sprite')?.spriteFrame,name);
    const data=await page.evaluate(name=>{
     const h=window.__towerTest.host,n=window.qaFind(name),sprite=n.getComponent('cc.Sprite');
     const frame=sprite.spriteFrame;
     const box=n.getComponent('cc.UITransform').getBoundingBoxToWorld();
     return {name,sourceWidth:frame.originalSize.width,sourceHeight:frame.originalSize.height,trim:sprite.trim,
      active:n.activeInHierarchy,box:{x:box.x,y:box.y,width:box.width,height:box.height},
      text:window.qaFind('货币信息').getComponent('cc.Label').string,
      unchanged:window.stoneCampaignBefore===JSON.stringify(h.store.state)};
    },name);
    assert.equal(data.sourceWidth,128);assert.equal(data.sourceHeight,128);
    assert.equal(data.trim,false);assert.equal(data.active,true);assert.equal(data.unchanged,true);
    assert.ok(data.text.includes(['下品','中品','上品','极品'][grade]));
    await page.waitForTimeout(100);
    await page.screenshot({path:path.join(OUT,`wallet-${FILES[grade]}-${viewport.width}x${viewport.height}.png`)});
    layout.wallet.push(data);
   }
   // Verify the same resource is also wired in the other two spending menus.
   for(const menuPage of ['forge','pills']){
    await page.evaluate(menuPage=>{
     const h=window.__towerTest.host;h.goto(menuPage);
     const fixture=JSON.parse(JSON.stringify(h.store.state));fixture.spiritStones=1000000;
     h.menu.render(fixture,menuPage);
    },menuPage);
    await page.waitForFunction(()=>!!window.qaFind('灵石素材-stone_top-wallet')?.getComponent('cc.Sprite')?.spriteFrame);
    if(menuPage==='pills')await page.waitForFunction(()=>['huichun','peiyuan'].every(id=>!!window.qaFind(`灵石素材-pill_${id}-apothecary-${id}`)?.getComponent('cc.Sprite')?.spriteFrame));
    await page.waitForTimeout(100);
    await page.screenshot({path:path.join(OUT,`${menuPage}-${viewport.width}x${viewport.height}.png`)});
   }
   await page.evaluate(()=>{
    const h=window.__towerTest.host;h.goto('inventory');
    window.stoneCampaignBefore=JSON.stringify(h.store.state);
    const fixture=JSON.parse(JSON.stringify(h.store.state));
    fixture.pills={...fixture.pills,huichun:3,peiyuan:2};
    h.menu.render(fixture,'inventory');
   });
   await page.waitForFunction(()=>['huichun','peiyuan'].every(id=>!!window.qaFind(`灵石素材-pill_${id}-pill-背包图标-${id}`)?.getComponent('cc.Sprite')?.spriteFrame));
   await page.waitForTimeout(100);
   await page.screenshot({path:path.join(OUT,`huichun-inventory-${viewport.width}x${viewport.height}.png`)});
   await page.evaluate(()=>{
    const h=window.__towerTest.host;h.menu.backpack.select('huichun');h.menu.render(h.menu.state,'inventory');
   });
   await page.waitForFunction(()=>!!window.qaFind('灵石素材-pill_huichun-pill-背包详情图标-huichun')?.getComponent('cc.Sprite')?.spriteFrame);
   const pillState=await page.evaluate(()=>{
    const h=window.__towerTest.host;
    const grid=window.qaFind('灵石素材-pill_huichun-pill-背包图标-huichun');
    const details=window.qaFind('灵石素材-pill_huichun-pill-背包详情图标-huichun');
    return {gridAndDetails:!!(grid&&details),sameFrame:grid.getComponent('cc.Sprite').spriteFrame===details.getComponent('cc.Sprite').spriteFrame,
     noPeiyuanSubstitution:!window.qaWalk(h.menu.root).some(n=>n.name.includes('pill_huichun')&&n.parent?.name.includes('peiyuan')),
     unchanged:window.stoneCampaignBefore===JSON.stringify(h.store.state)};
   });
   assert.ok(pillState.gridAndDetails&&pillState.sameFrame&&pillState.noPeiyuanSubstitution&&pillState.unchanged);
   layout.huichun=pillState;
   await page.waitForTimeout(100);
   await page.screenshot({path:path.join(OUT,`huichun-details-${viewport.width}x${viewport.height}.png`)});
   await page.evaluate(()=>{
    const h=window.__towerTest.host;h.menu.backpack.select('peiyuan');h.menu.render(h.menu.state,'inventory');
   });
   await page.waitForFunction(()=>!!window.qaFind('灵石素材-pill_peiyuan-pill-背包详情图标-peiyuan')?.getComponent('cc.Sprite')?.spriteFrame);
   const peiyuan=await page.evaluate(()=>{
    const h=window.__towerTest.host;
    const frame=name=>window.qaFind(name).getComponent('cc.Sprite').spriteFrame;
    const grid=frame('灵石素材-pill_peiyuan-pill-背包图标-peiyuan');
    return {sameFrame:grid===frame('灵石素材-pill_peiyuan-pill-背包详情图标-peiyuan'),
     distinctFromHuichun:grid!==frame('灵石素材-pill_huichun-pill-背包图标-huichun'),
     unchanged:window.stoneCampaignBefore===JSON.stringify(h.store.state)};
   });
   assert.ok(peiyuan.sameFrame&&peiyuan.distinctFromHuichun&&peiyuan.unchanged);layout.peiyuan=peiyuan;
   await page.waitForTimeout(100);
   await page.screenshot({path:path.join(OUT,`peiyuan-details-${viewport.width}x${viewport.height}.png`)});
   await page.evaluate(()=>window.__towerTest.host.goto('library'));
   await page.waitForFunction(()=>!!window.qaFind('灵石素材-resource_skill_point-skill-points')?.getComponent('cc.Sprite')?.spriteFrame);
   await page.waitForTimeout(100);
   await page.screenshot({path:path.join(OUT,`skill-points-${viewport.width}x${viewport.height}.png`)});
   layout.contributionAndSkillPointLoaded=true;
   await page.evaluate(()=>{
    const h=window.__towerTest.host;
    window.stoneCampaignBefore=JSON.stringify(h.store.state);
    h.menu.openDetails('sj_line');
   });
   await page.waitForFunction(()=>!!window.qaFind('灵石素材-resource_skill_book-skill-book-sj_line')?.getComponent('cc.Sprite')?.spriteFrame);
   await page.evaluate(()=>window.__towerTest.host.menu.skillPaneScroll.scrollToBottom(0));
   await page.waitForTimeout(100);
   await page.screenshot({path:path.join(OUT,`permanent-book-cost-${viewport.width}x${viewport.height}.png`)});
   const bookState=await page.evaluate(()=>{
    const h=window.__towerTest.host;
    const n=window.qaFind('灵石素材-resource_skill_book-skill-book-sj_line');
    const size=n.getComponent('cc.Sprite').spriteFrame.originalSize.width;
    const fixture=JSON.parse(JSON.stringify(h.store.state));
    if(!fixture.books.includes('sj_line'))fixture.books.push('sj_line');
    h.menu.render(fixture,'library');
    h.menu.skillPaneScroll.scrollToBottom(0);
    const owned=window.qaWalk(h.menu.root).some(n=>n.getComponent('cc.Label')?.string.includes('永久经卷：已拥有'));
    return {sourceWidth:size,owned,unchanged:window.stoneCampaignBefore===JSON.stringify(h.store.state)};
   });
   assert.equal(bookState.sourceWidth,128);assert.ok(bookState.owned&&bookState.unchanged);
   layout.permanentBook=bookState;
   await page.waitForTimeout(100);
   await page.screenshot({path:path.join(OUT,`permanent-book-owned-${viewport.width}x${viewport.height}.png`)});
   await page.evaluate(()=>{
    const h=window.__towerTest.host;h.enterFloor(1);h.run.pause();
    const s=h.run.state,p=s.player;
    window.stoneOriginalDrops=s.drops;
    window.stoneCampaignBefore=JSON.stringify(h.store.state);
    window.stoneEarnedBefore=JSON.stringify(s.earned);
    s.drops=[1,10,1000,100000].map((amount,i)=>({id:`stone-visual-${i}`,kind:'core',rank:7,amount,
     x:p.x-200+i*100,y:p.y+100,radius:10,expiresAt:s.time+100}));
    s.drops.push({id:'stone-visual-xp',kind:'resource',role:'boss',x:p.x+200,y:p.y+100,radius:10,expiresAt:s.time+100});
    s.drops.push({id:'stone-visual-heal',kind:'heal',x:p.x+300,y:p.y+100,radius:9,amount:p.maxHp*.1,expiresAt:s.time+100});
    h.draw();
   });
   await page.waitForFunction(()=>{
    const h=window.__towerTest.host;h.draw();
    return h.stoneLayer?.children.length===6&&h.stoneLayer.children.every(n=>n.activeInHierarchy&&n.getComponent('cc.Sprite')?.spriteFrame);
   });
   await page.waitForFunction(()=>!!window.qaFind('灵石素材-ui_bag-battle-bag')?.getComponent('cc.Sprite')?.spriteFrame);
   await page.waitForFunction(()=>!!window.qaFind('灵石素材-ui_skills-battle-book')?.getComponent('cc.Sprite')?.spriteFrame);
   await page.waitForFunction(()=>!!window.qaFind('灵石素材-ui_settings-battle-gear')?.getComponent('cc.Sprite')?.spriteFrame);
   layout.battle=await page.evaluate(()=>{
    const h=window.__towerTest.host;
    const nodes=h.stoneLayer.children;
    window.stoneOriginalNodes=[...nodes];
    for(let i=0;i<30;i++)h.draw();
    return {nodes:nodes.map(n=>({name:n.name,width:n.getComponent('cc.Sprite').spriteFrame.originalSize.width,
      height:n.getComponent('cc.Sprite').spriteFrame.originalSize.height,size:n.getComponent('cc.UITransform').width})),
     settingsLoaded:!!window.qaFind('灵石素材-ui_settings-battle-gear')?.getComponent('cc.Sprite')?.spriteFrame,
     skillsLoaded:!!window.qaFind('灵石素材-ui_skills-battle-book')?.getComponent('cc.Sprite')?.spriteFrame,
     backpackLoaded:!!window.qaFind('灵石素材-ui_bag-battle-bag')?.getComponent('cc.Sprite')?.spriteFrame,
     sameNodes:h.stoneLayer.children.every((n,i)=>n===window.stoneOriginalNodes[i]),
     sameWallet:JSON.stringify(h.store.state)===window.stoneCampaignBefore,
     sameEarnings:JSON.stringify(h.run.state.earned)===window.stoneEarnedBefore};
   });
   assert.equal(layout.battle.nodes.length,6);
   assert.ok(layout.battle.nodes[5].name.includes('drop_heal'));
   assert.equal(layout.battle.nodes[5].width,128);assert.equal(layout.battle.nodes[5].height,128);
   assert.ok(layout.battle.nodes[4].name.includes('resource_xp_essence'));
   assert.equal(layout.battle.nodes[4].width,128);assert.equal(layout.battle.nodes[4].height,128);
   for(let grade=0;grade<4;grade++){
    assert.ok(layout.battle.nodes[grade].name.includes(FILES[grade]));
    assert.equal(layout.battle.nodes[grade].width,128);assert.equal(layout.battle.nodes[grade].height,128);
   }
   assert.ok(layout.battle.settingsLoaded&&layout.battle.skillsLoaded&&layout.battle.backpackLoaded&&layout.battle.sameNodes&&layout.battle.sameWallet&&layout.battle.sameEarnings);
   await page.waitForTimeout(100);
   await page.screenshot({path:path.join(OUT,`battle-four-grades-${viewport.width}x${viewport.height}.png`)});
   const cleaned=await page.evaluate(()=>{
    const h=window.__towerTest.host;
    h.run.state.drops=window.stoneOriginalDrops;h.draw();
    const gone=h.stoneLayer.children.every(n=>!n.name.includes('stone-visual-'));
    delete window.stoneOriginalDrops;delete window.stoneOriginalNodes;
    return gone;
   });
   assert.ok(cleaned);layout.syntheticDropsCleaned=true;
   await click('HUD.Inventory');await page.waitForFunction(()=>window.__towerTest.host.menu.currentPage==='inventory');
   layout.battle.backpackOpensInventory=true;
   await page.evaluate(()=>window.__towerTest.host.resume());
   await click('HUD.Skills');await page.waitForFunction(()=>window.__towerTest.host.menu.currentPage==='library');
   layout.battle.skillsOpenLibrary=true;
   await page.evaluate(()=>window.__towerTest.host.resume());
   await click('HUD.Pause');
   await page.waitForFunction(()=>window.qaWalk(window.__towerTest.host.overlay).some(n=>n.getComponent('cc.Label')?.string==='塔内暂停'));
   layout.battle.settingsOpensPause=true;
   await page.screenshot({path:path.join(OUT,`battle-settings-${viewport.width}x${viewport.height}.png`)});

   await page.evaluate(()=>window.__towerTest.host.destroy());
   report.layouts.push(layout);await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
 }catch(error){report.status='FAIL';report.error=error.stack;process.exitCode=1;}
 finally{
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log(report.status,report.error||`${report.layouts.length} landscape layouts`);
 }
})();
