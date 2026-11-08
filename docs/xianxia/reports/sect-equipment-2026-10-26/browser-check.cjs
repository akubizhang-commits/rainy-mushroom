const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'); const fs=require('node:fs');
(async()=>{
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});const errors=[];p.on('pageerror',e=>errors.push(e.message));
const out='docs/xianxia/reports/sect-equipment-2026-10-26/';
const load=async()=>{await p.goto('http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&equipment=1');await p.waitForTimeout(2400);await p.evaluate(()=>{window.v=cc.director.getScene().children.find(n=>n.name==='PinePilot').components.find(c=>c.constructor.name==='PinePilot').survivor;});await p.waitForFunction(()=>v.art.ready);};
await load();console.log('loaded',await p.evaluate(()=>({view:!!v,art:v.art.ready,state:v.equipmentStore.state})));
const original=await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='xianxia.equipment-test.v1')));
await p.mouse.click(194,395);await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>v.sectPage),'forge');
await p.screenshot({path:out+'forge.png'});
// Real pointer click: locate draw button in Cocos world coordinates, transform to browser coordinates.
const click=async(prefix)=>{const q=await p.evaluate(prefix=>{const walk=n=>[n,...n.children.flatMap(walk)];const n=walk(v.hud.root).find(n=>n.name.startsWith(prefix)&&n.getComponent(cc.Button));if(!n)throw Error('button '+prefix);let ui=n.getComponent(cc.UITransform);let camera=cc.director.getScene().getComponentsInChildren(cc.Camera).find(c=>c.node.name==='Camera');return {pos:n.worldPosition,width:v.width,height:v.height,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),enabled:n.getComponent(cc.Button).interactable};},prefix);console.log('CLICK',prefix,q);if(!q.enabled)throw Error('disabled '+prefix);await p.mouse.click(q.canvas.x+(.5+q.pos.x/q.width)*q.canvas.width,q.canvas.y+(.5-q.pos.y/q.height)*q.canvas.height);await p.waitForTimeout(120);};
await click('寻器一次');let state=await p.evaluate(()=>v.equipmentStore.state);assert.equal(state.sand,200);assert.equal(state.marks,1);console.log('draw1',state.lastResult);
await click('寻器一次');await click('寻器一次');state=await p.evaluate(()=>v.equipmentStore.state);assert.equal(state.sand,0);assert.equal(state.marks,3);await p.screenshot({path:out+'draw.png'});
await click('返回宗门大厅');await click('整备阁');await p.screenshot({path:out+'gear.png'});
const owned=Object.keys(state.collection).find(id=>id.startsWith('eq_sword_')&&id!=='eq_sword_suwen');assert.ok(owned);
// Gear lower down: controlled host action, separate from actual pointer coverage above.
await p.evaluate(id=>v.sectAction({type:'equip',id},'已更换，下一局生效'),owned);
await p.evaluate(()=>{v.sectPage='hall';v.render();});await click('出山历练');await p.waitForTimeout(300);
assert.equal(await p.evaluate(()=>v.screen),'battle');console.log('combat',await p.evaluate(()=>({equipment:v.run.equipment,stats:v.run.stats,player:v.run.player})));assert.equal(await p.evaluate(()=>v.run.equipment.weaponId),owned);
await p.screenshot({path:out+'battle.png'});
await p.evaluate(()=>{v.run.pause();v.run.abandon();});await p.waitForTimeout(1300);console.log('SETTLE',await p.evaluate(()=>({settled:v.settled,result:v.result,state:v.run.state,summary:v.run.summary()})));assert.equal(await p.evaluate(()=>v.settled),true);let result=await p.evaluate(()=>v.result);assert.equal(result.seekingSand,100);await p.screenshot({path:out+'result.png'});await click('返回宗门');assert.equal(await p.evaluate(()=>v.screen),'camp');
state=await p.evaluate(()=>v.equipmentStore.state);assert.equal(state.sand,100);assert.equal(state.activeRun,null);
await load();assert.equal(await p.evaluate(()=>v.equipmentStore.state.equipped.weapon),owned);assert.equal(await p.evaluate(()=>v.equipmentStore.state.sand),100);
await click('出山历练');await load();assert.ok(await p.evaluate(()=>v.equipmentStore.needsRecovery));await p.screenshot({path:out+'recovery.png'});await click('结束中断历练');assert.equal(await p.evaluate(()=>v.equipmentStore.state.activeRun),null);assert.equal(await p.evaluate(()=>v.equipmentStore.state.sand),100);
assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='xianxia.equipment-test.v1'))),original);
// Controlled milestone fixture verifies real Run.summary -> store -> HUD settlement and refinements.
await p.evaluate(()=>{v.startRun();v.run.time=360;v.run.pause();v.run.abandon();});await p.waitForTimeout(1200);
assert.equal(await p.evaluate(()=>v.result.seekingSand),90);await click('返回宗门');
const beforeRefine=await p.evaluate(()=>v.equipmentStore.state.profile.crystals);assert.ok(beforeRefine>=30);
await p.evaluate(()=>v.sectAction({type:'refine',slot:'weapon'},'淬炼完成'));
assert.equal(await p.evaluate(()=>v.equipmentStore.state.levels.weapon),1);
assert.equal(await p.evaluate(()=>v.equipmentStore.state.profile.crystals),beforeRefine-30);
// Inject one storage write failure: no per-frame retry and explicit result button retries once.
await p.evaluate(()=>{v.startRun();const store=v.equipmentStore;window.realStorage=store.storage;window.failWrites=0;store.storage={getItem:k=>realStorage.getItem(k),setItem:()=>{failWrites++;throw Error('fixture-write-failure')}};v.run.pause();v.run.abandon();});
await p.waitForTimeout(1400);assert.equal(await p.evaluate(()=>v.settled),false);assert.equal(await p.evaluate(()=>failWrites),1);
await p.evaluate(()=>{v.equipmentStore.storage=realStorage;});await click('返回宗门');assert.equal(await p.evaluate(()=>v.screen),'camp');assert.equal(await p.evaluate(()=>v.equipmentStore.state.activeRun),null);
// Review regressions: reload must render even when artwork is already ready.
await p.evaluate(()=>{v.sectError='save-failed';v.render();});await click('重新读取 / 重试');assert.equal(await p.evaluate(()=>v.sectError),'');
assert.equal(await p.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(v.hud.root).find(n=>n.name==='出山历练'&&n.getComponent(cc.Button)).getComponent(cc.Button).interactable;}),true);
// Controlled art-failure state verifies player-visible error and retry entry.
await p.evaluate(()=>{v.failed=true;v.art.ready=false;v.render();});
assert.ok(await p.evaluate(()=>{const walk=n=>[n,...n.children.flatMap(walk)];return walk(v.hud.root).some(n=>n.name==='重新读取 / 重试');}));
await p.screenshot({path:out+'asset-error.png'});await p.evaluate(()=>{v.failed=false;v.art.ready=true;v.render();});
assert.deepEqual(errors,[]);fs.writeFileSync(out+'browser.json',JSON.stringify({passed:true,viewport:'390x844',draws:3,equipped:owned,result,reload:true,recovery:true,formalStorageUnchanged:true,milestoneFixture:true,refine:true,failedWriteExplicitRetry:true,retryUIRefresh:true,assetErrorEntry:true,errors},null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
