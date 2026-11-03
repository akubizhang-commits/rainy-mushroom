// Preview-only renderer injection; game files and character animation stay unchanged.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createServer}=require('node:http'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const {installFixture}=require('./verify-sword-line.cjs');
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sha=b=>createHash('sha256').update(b).digest('hex');
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
  // Let the paused scene reach the canvas before captureStream observes it.
  // Otherwise the first recorded frame can still be the loading/camp screen.
  await page.waitForTimeout(180);
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
  if(f.rank>=4) assert.equal(r.hits.filter(h => h.id === 'qi-main').length, f.expectedHits);
  else {assert.equal(r.shots.length,0);assert.equal(r.effects.length,1);assert.ok(r.hits.length>=1);}
  assert.equal(r.history.at(-1).actors.length, 0);
  const filename = `${f.name}-${viewport.width}-realtime`;
  fs.writeFileSync(path.join(out, filename + '.webm'), Buffer.from(r.dataUrl.split(',')[1], 'base64'));
  delete r.dataUrl;
  execFileSync('/opt/homebrew/bin/ffmpeg', ['-v', 'error', '-i', path.join(out, filename + '.webm'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(out, filename + '.mp4')]);
  return { fixture: f.name, viewport, characterLevel, file: filename + '.mp4', ...r,
    method: 'Native GameCanvas.captureStream(30), unmodified production TowerView.update(dt); no stepping or speed change.' };
}
async function installPreview(page){
 await page.evaluate(async()=>{
  const h=window.__towerTest.host,art=h.qiArt,template=art.assets.crescent;
  const specs=[{name:'rising',front:425}];
  const sets=[];
  for(const spec of specs){
   const dom=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='/preview-art/'+spec.name+'-atlas.png'});
   const image=new template.image.constructor(dom),texture=new template.texture.constructor();texture.image=image;
   const frames=[];
   for(let i=0;i<16;i++){
    const frame=new template.frame.constructor();frame.texture=texture;
    frame.rect=new template.frame.rect.constructor(i%4*512,Math.floor(i/4)*512,512,512);
    frame.originalSize=new template.frame.originalSize.constructor(512,512);frames.push(frame);
   }
   sets.push({...spec,image,texture,frames});
  }
  window.__jinqingPreview={sets,draws:[],description:'Temporary VFX-only overrides in frozen Cocos build; real TowerRun and character animation.'};
  const original=art.draw;
  art.draw=function(parent,item,time,camera,near){
   original.call(this,parent,item,time,camera,near);
   if(near||item?.source!=='sj_arc'||item?.bladeKind!=='crescent')return;
   const actor=this.actors.get(item.id);if(!actor)return;
   const set=sets[0];
   const phase=Math.min(15,Math.max(0,Math.floor((time-item.startedAt)/.12*16)));
   for(const [partIndex,part] of actor.parts.entries()){
    part.sprite.spriteFrame=set.frames[phase];
    part.ui.setContentSize(item.width*640/440,item.width*640/440);
    part.ui.setAnchorPoint(set.front/640,.5);
    if(partIndex>0)part.sprite.color=new part.sprite.color.constructor(255,255,255,0);
   }
   window.__jinqingPreview.draws.push({id:item.id,variant:set.name,phase,time});
  };
  const arc=h.arcArt,oldArc=arc.draw;
  arc.draw=function(parent,id,x,y,dx,dy,radius,progress,reduced){
   const drawn=oldArc.call(this,parent,id,x,y,dx,dy,radius,progress,reduced);
   const actor=this.actors.get(id);if(!drawn||!actor)return drawn;
   const set=sets[0],phase=Math.min(15,Math.floor(progress*2.1*16));
   actor.sprite.spriteFrame=set.frames[phase];
   actor.ui.setContentSize(radius*1.7,radius*1.7);actor.ui.setAnchorPoint(425/640,.5);
   const d=Math.hypot(dx,dy);
   actor.node.setPosition(x+dx/d*radius*.85,y+dy/d*radius*.85+64);
   const alpha=Math.min(1,progress/.08)*Math.min(1,(1-progress)/.38);
   actor.sprite.color=new actor.sprite.color.constructor(255,255,255,Math.round(255*alpha));
   window.__jinqingPreview.draws.push({id,variant:set.name,phase,near:true,progress});
   return drawn;
  };
 });
}
async function main(){
 const base=path.join(ROOT,'design/xianxia-jinqing-sharp-preview-2026-11-02');
 const build=JSON.parse(fs.readFileSync(path.join(ROOT,'design/xianxia-crescent-220-2026-11-02/build-snapshot.json'))).path;
 let i=1,out;do{out=path.join(base,`runtime-${String(i++).padStart(2,'0')}`)}while(fs.existsSync(out));fs.mkdirSync(out);fs.copyFileSync(__filename,path.join(out,'preview-script.cjs'));
 const report={status:'RUNNING',kind:'temporary in-engine visual prototype, not integrated',recordings:[],checks:[],errors:[]};
 const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.wasm':'application/wasm'};
 const server=createServer((req,res)=>{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),isArt=p.startsWith('/preview-art/');
  const dir=isArt?base:build,file=path.resolve(dir,'.'+(isArt?p.slice('/preview-art'.length):p));
  if(!file.startsWith(dir+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(b)});
 });
 let browser;
 try{
  await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});
  const url=`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`;
  browser=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   await installFixture(page,url,report.errors);await page.evaluate(()=>window.__prepareLine({rank:7,angle:0,reach:640}));
   await page.waitForFunction(()=>{const h=window.__towerTest.host;return h.qiArt.ready&&h.characterArt.body?.spriteFrame&&h.environmentArt.nodes.get('floor')?.active});
   await installQi(page);await installPreview(page);
   const cases=[{name:'near-rank1',rank:1,angle:0,origin:{x:-250,y:-60},distance:90,expectedHits:1},{name:'flight-rank4',rank:4,angle:0,origin:{x:-250,y:-60},distance:420,expectedHits:1}];
   for(const raw of cases){
    const f={...raw,skill:'sj_arc'};console.log('RECORD',viewport.width,f.name);
    await page.evaluate(()=>{window.__jinqingPreview.draws=[]});
    const recording=await record(page,f,viewport,out);
    const poses=[...new Set(recording.history.filter(v=>v.character.attack&&v.character.ordinal>=0).map(v=>v.character.index))];
    assert.ok(poses.length>=4,`Need visible real slash animation, got ${poses.length} poses`);
    const variants=await page.evaluate(()=>[...new Set(window.__jinqingPreview.draws.map(d=>d.variant))]);
    assert.equal(variants.length,1);
    report.recordings.push(recording);report.checks.push({viewport,name:f.name,slashPoseIndices:poses,variants,passed:true});
   }
   await page.evaluate(f=>window.__prepareQi(f),{skill:'sj_arc',rank:4,angle:0,origin:{x:-250,y:-60},distance:420,expectedHits:3});
   for(const frame of [8,14,20,28,37]){
    await page.evaluate(frame=>{const q=window.__qiQA;while(q.read().time<frame/60-1e-6)window.__stepQi()},frame);
    await page.screenshot({path:path.join(out,`pose-${frame}-${viewport.width}.png`)});
   }
   await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='PASSED';
 }catch(e){report.status='FAILED';report.failure=e.stack;throw e}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));console.log('Saved',out)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
