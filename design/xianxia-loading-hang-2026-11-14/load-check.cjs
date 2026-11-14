const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 const p=await b.newPage({viewport:{width:1280,height:720}});const logs=[];
 p.on('console',m=>{if(['error','warning'].includes(m.type()))logs.push(m.type()+': '+m.text().slice(0,300))});
 p.on('pageerror',e=>logs.push('pageerror: '+String(e).slice(0,400)));
 p.on('requestfailed',r=>logs.push('reqfail: '+r.url().slice(-120)));
 p.on('response',r=>{if(r.status()>=400)logs.push('http '+r.status()+': '+r.url().slice(-120))});
 await p.goto('http://localhost:8741/');
 await p.waitForTimeout(15000);
 const host=await p.evaluate(()=>!!window.__towerTest?.host);
 await p.screenshot({path:'/tmp/load-check.png'});
 console.log('host',host);console.log(logs.slice(0,30).join('\n'));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
