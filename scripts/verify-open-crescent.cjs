// Frozen-build verification for the approved 220-degree flying crescent.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sha=b=>createHash('sha256').update(b).digest('hex');
const cases=[
 {name:'single-right',rank:4,angle:0,origin:{x:-250,y:-60},distance:420,expectedHits:1},
 {name:'triple-right',rank:7,angle:0,origin:{x:-250,y:-60},distance:420,expectedHits:3},
 {name:'single-left',rank:4,angle:180,origin:{x:300,y:-60},distance:420,expectedHits:1},
 {name:'single-up',rank:4,angle:90,origin:{x:-500,y:-400},distance:420,expectedHits:1},
 {name:'single-down',rank:4,angle:-90,origin:{x:-500,y:100},distance:420,expectedHits:1},
 {name:'triple-diagonal',rank:7,angle:45,origin:{x:-500,y:-60},distance:320,expectedHits:3},
 {name:'floating-right',rank:4,angle:0,origin:{x:-250,y:-60},distance:420,expectedHits:1,floating:true},
 {name:'near-original',rank:1,angle:0,origin:{x:-250,y:-60},distance:90,expectedHits:1},
].map(f=>({...f,skill:'sj_arc'}));

async function installQi(page) {
  await page.evaluate(() => {
    const h = window.__towerTest.host;
    const q = window.__qiQA = {
      events: [], shots: new Map(), effects: new Map(), hits: [], history: [],
      fallback: 0, nearFallback: 0, fixture: null, fallbackRecords: [], captureFallback: false, allowRepeat: false, moved: false,
      pack(e) { return { ...e, castContext: { loadout: { passive: { sj_flight: e.castContext?.loadout?.passive?.sj_flight || 0 } } } }; },
      read() {
        const s = h.run?.state, body = h.characterArt, index = body.frames.indexOf(body.body?.spriteFrame);
        const item = e => q.pack(e);
        return { time: s?.time, camera: { ...h.camera },
          player: s ? { x: s.player.x, y: s.player.y, floating: (s.loadout.passive.sj_flight || 0) > 0 } : null,
          view: { xmin: h.camera.x - h.width / 2, xmax: h.camera.x + h.width / 2 },
          actors: Array.from(h.qiArt.actors, ([id, a]) => ({ id, x: a.node.position.x, y: a.node.position.y,
            angle: a.node.angle, width: a.parts[0].ui.width, height: a.parts[0].ui.height,
            anchorX: a.parts[0].ui.anchorX, anchorY: a.parts[0].ui.anchorY,
            alpha: a.parts[0].sprite.color.a,
            image: a.parts[0].sprite.spriteFrame?.texture?.image?.url })),
          shots: (s?.projectiles || []).filter(e => e.bladeKind).map(item),
          effects: (s?.effects || []).filter(e => ['arc', 'cross'].includes(e.kind) && ['sj_arc', 'sj_cross'].includes(e.source)).map(item),
          character: { index, ordinal: body.atlas?.clips.slash.frames.indexOf(index),
            root: body.root ? { x: body.root.position.x, y: body.root.position.y,
              scale: { x: body.root.scale.x, y: body.root.scale.y }, angle: body.root.angle } : null,
            attack: body.attack ? { ...body.attack } : null },
          enemies: (s?.enemies || []).map(e => ({ id: e.id, x: e.x, y: e.y, hp: e.hp, radius: e.radius })) };
      },
    };
    const observe = h.characterArt.observeCast;
    h.characterArt.observeCast = function (event) {
      const before = this.attack ? { ...this.attack } : null;
      observe.call(this, event);
      q.events.push({ event: { ...event }, before, after: this.attack ? { ...this.attack } : null });
    };
    window.__prepareQi = f => {
      window.__prepareLine({ rank: f.rank, angle: f.angle, reach: 640, origin: f.origin || { x: -250, y: -60 } });
      // Battle reconstruction creates a new effects object. Observe that actual
      // renderer instead of keeping a wrapper attached to the previous scene.
      const effects = h.skillEffects, drawQi = effects.drawSwordQi, item = effects.item;
      effects.drawSwordQi = function (...args) {
        q.fallback++;
        if (!q.captureFallback) return drawQi.apply(this, args);
        const g = args[0], move = g.moveTo, line = g.lineTo, commands = [];
        g.moveTo = function (x, y) { commands.push(['move', x, y]); return move.call(this, x, y); };
        g.lineTo = function (x, y) { commands.push(['line', x, y]); return line.call(this, x, y); };
        try { return drawQi.apply(this, args); }
        finally {
          g.moveTo = move; g.lineTo = line;
          q.fallbackRecords.push({ item: q.pack(args[1]), time: args[2], camera: { ...args[3] }, commands });
        }
      };
      effects.item = function (...args) {
        if (args[1]?.kind === 'cross') q.nearFallback++;
        return item.apply(this, args);
      };
      const run = h.run, s = run.state, p = s.player, template = s.enemies[0];
      s.loadout.active = { [f.skill]: f.rank }; s.cooldowns = { [f.skill]: 0 };
      s.loadout.passive = f.floating ? { sj_flight: 1 } : {};
      const a = f.angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
      template.id = 'qi-main'; template.x = p.x + dx * f.distance; template.y = p.y + dy * f.distance;
      if (f.targetRadius) template.radius = f.targetRadius;
      s.enemies = [template];
      if (f.extraEnemy) s.enemies.push({ ...template, id: 'qi-extra', ai: { ...template.ai },
        x: p.x + f.extraEnemy.x, y: p.y + f.extraEnemy.y, radius: f.extraEnemy.radius || template.radius });
      s.wavePlanned = s.enemies.length; p.hp = p.maxHp; p.mp = p.maxMp = 1e6;
      q.fixture = f; q.events = []; q.shots.clear(); q.effects.clear(); q.hits = []; q.history = [];
      q.fallback = q.nearFallback = 0; q.fallbackRecords = []; q.captureFallback = false;
      q.allowRepeat = false; q.moved = false;
      const advance = run.advance;
      run.advance = function (...args) {
        const before = new Map(this.state.enemies.map(e => [e.id, e.hp]));
        const result = advance.apply(this, args);
        for (const e of this.state.projectiles) if (e.bladeKind) q.shots.set(e.id, q.pack(e));
        for (const e of this.state.effects) if (['arc', 'cross'].includes(e.kind) && ['sj_arc', 'sj_cross'].includes(e.source))
          q.effects.set(e.id, q.pack(e));
        for (const e of this.state.enemies) if (e.hp < before.get(e.id))
          q.hits.push({ id: e.id, time: this.state.time, oldHp: before.get(e.id), hp: e.hp });
        // Isolate one production cast. Scheduled waves still run normally.
        if (!q.allowRepeat && (this.state.casts.length || q.shots.size || q.effects.size))
          this.state.cooldowns[f.skill] = 1e8;
        if (f.moving && !q.moved && this.state.time > .38) {
          this.state.player.x += 90; this.state.player.y += 40; q.moved = true;
        }
        return result;
      };
      h.draw();
    };
    window.__stepQi = () => {
      const run = h.run, s = run.state, before = h.characterArt.sample(s);
      run.resume(); run.advance(1 / 60, event => h.characterArt.observeCast(event)); run.pause();
      h.characterArt.observe(before, s); h.draw(); const view = q.read(); q.history.push(view); return view;
    };
  });
}

async function record(page, f, viewport, out) {
  await page.evaluate(f => window.__prepareQi(f), f);
  const characterLevel = f.skill === 'sj_cross' ? ({ 1: 7, 4: 10, 7: 13, 10: 16 })[f.rank]
    : ({ 1: 1, 4: 7, 7: 10 })[f.rank];
  await page.evaluate(level => {
    const h = window.__towerTest.host;
    h.run.state.player.xp = 30 * (level - 1) + 15 * (level - 1) ** 2; h.draw();
  }, characterLevel);
  const r = await page.evaluate(async () => {
    const h = window.__towerTest.host, q = window.__qiQA, run = h.run;
    const stream = document.querySelector('#GameCanvas').captureStream(30), chunks = [];
    const mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) throw Error('VP9 unavailable');
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
    const stopped = new Promise(resolve => {
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); }; recorder.onstop = resolve;
    });
    const history = [], started = performance.now(), initial = run.state.time;
    const timer = setInterval(() => history.push(q.read()), 16);
    recorder.start(); run.resume(); await new Promise(resolve => setTimeout(resolve, 2800));
    run.pause(); h.draw(); history.push(q.read()); recorder.stop(); clearInterval(timer);
    await stopped; stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(chunks, { type: mimeType }), reader = new FileReader();
    const dataUrl = await new Promise(resolve => { reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
    return { dataUrl, wallSeconds: (performance.now() - started) / 1000, simSeconds: run.state.time - initial,
      history, hits: q.hits, shots: Array.from(q.shots.values()), effects: Array.from(q.effects.values()), events: q.events };
  });
  assert.ok(r.simSeconds > 2.3 && r.simSeconds < 3.3, 'Native update runs at real-time pace');
  assert.equal(r.hits.filter(h => h.id === 'qi-main').length, f.expectedHits);
  assert.equal(r.history.at(-1).actors.length, 0);
  const filename = `${f.name}-${viewport.width}-realtime`;
  fs.writeFileSync(path.join(out, filename + '.webm'), Buffer.from(r.dataUrl.split(',')[1], 'base64'));
  delete r.dataUrl;
  execFileSync('/opt/homebrew/bin/ffmpeg', ['-v', 'error', '-i', path.join(out, filename + '.webm'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(out, filename + '.mp4')]);
  return { fixture: f.name, viewport, characterLevel, file: filename + '.mp4', ...r,
    method: 'Native GameCanvas.captureStream(30), unmodified production TowerView.update(dt); no stepping or speed change.' };
}
async function main(){
 const build=process.env.QI_BUILD_ROOT;assert.ok(build,'Supply frozen QI_BUILD_ROOT');
 const base=path.join(ROOT,'design/xianxia-crescent-220-2026-11-02');
 let n=1,out;do{out=path.join(base,`browser-${String(n++).padStart(2,'0')}`)}while(fs.existsSync(out));
 fs.mkdirSync(out);fs.copyFileSync(__filename,path.join(out,'verification.cjs'));
 const report={status:'RUNNING',build,cases:[],recordings:[],lifecycle:[],fallback:[],errors:[]};
 const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'};
 const server=createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(build,'.'+pathname);
  if(!file.startsWith(build+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,bytes)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes)});
 });
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const url=`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`;
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  let nativeUrl;
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   await installFixture(page,url,report.errors);
   await page.evaluate(()=>window.__prepareLine({rank:1,angle:0,reach:640}));
   await page.waitForFunction(()=>{const h=window.__towerTest.host;return h.qiArt.ready&&h.arcArt.ready&&h.characterArt.body?.spriteFrame&&h.environmentArt.nodes.get('floor')?.active});
   await installQi(page);
   const asset=await page.evaluate(()=>{const a=window.__towerTest.host.qiArt.assets.crescent;return{width:a.image.width,height:a.image.height,url:a.image.url}});
   assert.equal(asset.width,384);assert.equal(asset.height,512);
   nativeUrl=new URL(asset.url,url).href;
   assert.equal(sha(await (await context.request.get(nativeUrl)).body()),sha(fs.readFileSync(path.join(ROOT,'cocos-pilot/assets/resources/tower-skill-fx/sword-qi-crescent-220-v2.png'))));
   for(const f of cases){
    console.log('CASE',viewport.width,f.name);
    await page.evaluate(f=>window.__prepareQi(f),f);
    const sample=await page.evaluate(()=>{let v;for(let i=0;i<40;i++)v=window.__stepQi();return v});
    await page.screenshot({path:path.join(out,`${f.name}-${viewport.width}.png`)});
    const result=await page.evaluate(()=>{for(let i=0;i<150;i++)window.__stepQi();const q=window.__qiQA;return{shots:[...q.shots.values()],effects:[...q.effects.values()],hits:q.hits,last:q.read(),fallback:q.fallback,history:q.history}});
    fs.writeFileSync(path.join(out,`${f.name}-${viewport.width}.json`),JSON.stringify({f,sample,...result},null,2));
    if(f.rank>=4)assert.equal(result.hits.filter(h=>h.id==='qi-main').length,f.expectedHits,`${f.name} hits`);
    else {
     // The unchanged melee case is also in range of normal weapon attacks.
     // HP deltas cannot be attributed to this skill; inspect its releases.
     assert.equal(result.effects.filter(e=>e.source==='sj_arc').length,1);
     assert.ok(result.hits.length>=1);
    }
    assert.equal(result.shots.length,f.rank>=4?f.expectedHits:0,`${f.name} releases`);
    assert.equal(result.fallback,0);assert.equal(result.last.actors.length,0);
    if(f.rank>=4){
     const visible=result.history.flatMap(v=>v.actors.map(a=>({a,v}))).filter(({a})=>a.alpha>40);
     assert.ok(visible.length>0,'real sprites visible');
     for(const {a,v}of visible){
      assert.ok(Math.abs(a.anchorX-350/384)<1e-6);
      assert.ok(Math.abs(a.angle-f.angle)<1e-4);
      const shot=v.shots.find(s=>s.id===a.id);assert.ok(shot);
      assert.ok(Math.abs(a.width-shot.width*384/440)<1e-4);
     }
    }
    report.cases.push({viewport,name:f.name,hits:result.hits.length,releases:result.shots.length,passed:true});
   }
   for(const f of [cases[0],cases[1],cases[2],cases[6]]){
    console.log('RECORD',viewport.width,f.name);
    report.recordings.push(await record(page,f,viewport,out));
   }
   await page.evaluate(f=>window.__prepareQi(f),cases[1]);
   const paused=await page.evaluate(()=>{for(let i=0;i<26;i++)window.__stepQi();const h=window.__towerTest.host;h.run.pause();return{state:JSON.stringify(h.run.state),view:window.__qiQA.read()}});
   await page.waitForTimeout(180);
   const after=await page.evaluate(()=>{const h=window.__towerTest.host;h.draw();return{state:JSON.stringify(h.run.state),view:window.__qiQA.read()}});
   assert.equal(after.state,paused.state);assert.deepEqual(after.view.actors,paused.view.actors);
   const death=await page.evaluate(()=>{const h=window.__towerTest.host;h.run.state.player.hp=0;h.draw();return h.qiArt.actors.size});assert.equal(death,0);
   const cleanup=await page.evaluate(()=>{const h=window.__towerTest.host;h.withdraw();return{actors:h.qiArt.actors.size,pool:h.qiArt.pool.length,layer:h.qiLayer,run:h.run}});
   assert.deepEqual(cleanup,{actors:0,pool:0,layer:null,run:null});
   report.lifecycle.push({viewport,pause:true,death:true,exit:true});
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:844,height:390}}),page=await context.newPage();
  let blocked=0;await page.route(nativeUrl,route=>{blocked++;return route.fulfill({status:404,body:'intentional resource fallback test'})});
  await installFixture(page,url,report.errors);await page.evaluate(()=>window.__prepareLine({rank:1,angle:0,reach:640}));
  await page.waitForTimeout(500);await installQi(page);await page.evaluate(f=>window.__prepareQi(f),cases[0]);
  const fallback=await page.evaluate(()=>{for(let i=0;i<40;i++)window.__stepQi();const q=window.__qiQA;return{count:q.fallback,actors:q.read().actors.length}});
  await page.screenshot({path:path.join(out,'fallback-844.png')});
  assert.ok(blocked>0&&fallback.count>0);assert.equal(fallback.actors,0);
  report.fallback.push({...fallback,blocked});await context.close();
  assert.deepEqual(report.errors,[]);report.status='PASSED';
 }catch(error){report.status='FAILED';report.failure=error.stack;throw error}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));console.log('Report',out)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
