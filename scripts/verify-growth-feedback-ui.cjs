const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {chromium} = require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/xianxia/reports/growth-feedback-2026-10-30');
(async () => {
  fs.mkdirSync(out, {recursive:true});
  const server=createServer((req,res)=>{
    const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
    fs.readFile(file,(error,body)=>{
      if(error){res.writeHead(404).end();return}
      res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
      res.end(body);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  const result={cases:[],errors:[]};
  try {
    browser=await chromium.launch({headless:true,channel:'chrome'});
    for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
      const context=await browser.newContext({viewport});
      const page=await context.newPage();
      page.on('pageerror',e=>result.errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
      await page.waitForFunction(()=>window.__towerTest?.host?.menu);
      const evidence=await page.evaluate(async()=>{
        const h=window.__towerTest.host;
        h.campElapsed=-100000;
        const {rollWeapon}=await import('/js/xianxia/TowerWeapons.js');
        const {skillPresentation}=await import('/js/xianxia/TowerSkillPresentation.js');
        const before=skillPresentation(h.store.state,'sj_yujian');
        const state=JSON.parse(JSON.stringify(h.store.state));
        const w=rollWeapon('huang',4,()=>.999999,'weapon-1');
        w.affixes.forEach(a=>a.value=2);
        state.weapons[w.id]=w;state.weaponSequence=1;state.weaponCounters[w.id]=0;
        state.loadouts[0].weaponId=w.id;
        h.store._state=state;
        const saved=h.store.act({type:'sync'},Date.now());
        if(!saved.ok)throw Error(JSON.stringify(saved));
        h.goto('skills');h.menu.openDetails('sj_yujian');
        window.growthWalk=n=>[n,...n.children.flatMap(window.growthWalk)];
        return {
          before:before.stats.find(s=>s.key==='roundDamage').value,
          after:skillPresentation(h.store.state,'sj_yujian').stats.find(s=>s.key==='roundDamage').value,
          text:window.growthWalk(h.root).map(n=>n.getComponent('cc.Label')?.string||'').join('\n'),
        };
      });
      assert.equal(evidence.before,126);
      assert.equal(evidence.after,210);
      assert.match(evidence.text,/主剑伤害/);
      assert.match(evidence.text,/210/);
      await page.screenshot({path:path.join(out,`skill-after-${viewport.width}.png`)});
      await page.evaluate(()=>{
        const scroll=window.__towerTest.host.menu.skillPaneScroll;
        scroll?.scrollToOffset(new cc.Vec2(0,240),0);
      });
      await page.screenshot({path:path.join(out,`skill-values-${viewport.width}.png`)});
      await page.evaluate(()=>window.__towerTest.host.goto('inventory'));
      const position=await page.evaluate(()=>{
        const h=window.__towerTest.host;
        const n=window.growthWalk(h.root).find(n=>n.name==='装备槽-weapon'&&n.activeInHierarchy);
        if(!n)throw Error('Missing weapon slot');
        const camera=window.growthWalk(cc.director.getScene()).map(n=>n.getComponent('cc.Camera')).find(Boolean);
        const p=camera.worldToScreen(n.worldPosition),c=document.querySelector('canvas'),r=c.getBoundingClientRect();
        return {x:r.x+p.x/c.width*r.width,y:r.y+(1-p.y/c.height)*r.height};
      });
      await page.mouse.click(position.x,position.y);
      await page.waitForFunction(()=>window.growthWalk(window.__towerTest.host.root).some(n=>
        n.activeInHierarchy&&n.getComponent('cc.Label')?.string.includes('基础攻击＋75')));
      await page.screenshot({path:path.join(out,`weapon-after-${viewport.width}.png`)});
      await page.evaluate(()=>window.__towerTest.enter(1));
      await page.waitForFunction(()=>window.__towerTest.host.run?.state.enemies.length>0);
      const frameSample=await page.evaluate(()=>new Promise(resolve=>{
        const times=[];let previous=performance.now(),peakEnemies=0;
        function tick(now){
          times.push(now-previous);previous=now;
          peakEnemies=Math.max(peakEnemies,window.__towerTest.host.run.state.enemies.length);
          if(times.length<180){requestAnimationFrame(tick);return}
          times.sort((a,b)=>a-b);
          resolve({kind:'early battle RAF sample; not a mobile stress test',frames:times.length,
            medianMs:times[90],p95Ms:times[171],maxMs:times.at(-1),peakEnemies});
        }
        requestAnimationFrame(tick);
      }));
      await page.screenshot({path:path.join(out,`battle-after-${viewport.width}.png`)});
      result.cases.push({viewport,...evidence,frameSample});
      await context.close();
    }
    assert.deepEqual(result.errors,[]);
    result.status='passed';
  } finally {
    if(browser)await browser.close();
    server.close();
    fs.writeFileSync(path.join(out,'ui-after.json'),JSON.stringify(result,null,2));
  }
})().catch(error=>{console.error(error);process.exitCode=1});
