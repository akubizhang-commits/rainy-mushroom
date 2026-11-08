// Compiled Cocos smoke test, isolated browser and in-memory save.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const {createServer}=require('node:http')
const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/class-attributes-2026-11-04')
;(async()=>{
 fs.mkdirSync(out,{recursive:true})
 const server=createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname))
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end()
  fs.readFile(file,(err,data)=>{
   if(err)return res.writeHead(404).end()
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[path.extname(file)]||'application/octet-stream')
   res.end(data)
  })
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const report={cases:[],errors:[]};let browser
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'})
  for(const viewport of [{width:844,height:390},{width:1280,height:720}]){
   const context=await browser.newContext({viewport}),page=await context.newPage()
   page.on('pageerror',e=>report.errors.push(e.message))
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`)
   await page.waitForFunction(()=>window.__towerTest?.host?.menu&&!window.__towerTest.host.transitioning)
   await page.evaluate(()=>{
    const h=window.__towerTest.host;h.campElapsed=-100000
    let raw=null;const disk={getItem:()=>raw,setItem:(_,v)=>{raw=v}}
    h.store=new h.store.constructor(disk,0)
    h.goto('hall');h.menu.render(h.store.state,'hall','');h.menu.showCharacterInfo()
    window.qaWalk=n=>[n,...n.children.flatMap(window.qaWalk)]
   })
   await page.waitForFunction(()=>{
    const portrait=window.qaWalk(window.__towerTest.host.root).find(n=>n.name==='角色全身形象')
    return portrait&&window.qaWalk(portrait).some(n=>n.getComponent('cc.Sprite')?.spriteFrame)
   })
   const values=await page.evaluate(()=>{
    const h=window.__towerTest.host,nodes=window.qaWalk(h.root)
    const text=name=>nodes.find(n=>n.name===name)?.getComponent('cc.Label')?.string
    return {classId:h.store.state.classId,hp:h.store.state.hp,identity:text('角色境界'),
     strength:text('角色数值-力量'),intelligence:text('角色数值-智力'),
     awareness:text('角色数值-神识'),vitality:text('角色数值-体力'),
     physical:text('角色攻击力'),magic:text('角色数值-法术攻击力')}
   })
   assert.deepEqual({...values,identity:undefined},{classId:'sword',hp:100,identity:undefined,strength:'110',intelligence:'90',awareness:'100',vitality:'10',physical:'115',magic:'95'})
   assert.match(values.identity,/剑修/)
   await page.waitForFunction(()=>{
    let root=window.__towerTest.host.root;while(root.parent)root=root.parent
    return !window.qaWalk(root).some(n=>n.name==='游戏加载界面'&&n.activeInHierarchy)
   })
   await page.screenshot({path:path.join(out,`character-${viewport.width}.png`)})
   report.cases.push({viewport,values});await context.close()
  }
  assert.deepEqual(report.errors,[])
 }finally{
  fs.writeFileSync(path.join(out,'ui.json'),JSON.stringify(report,null,2)+'\n')
  await browser?.close();await new Promise(resolve=>server.close(resolve))
 }
 console.log(`Verified ${report.cases.length} compiled character sheets`)
})().catch(e=>{console.error(e);process.exitCode=1})
