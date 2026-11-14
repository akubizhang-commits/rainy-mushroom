const {chromium}=require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');const {key,saves}=JSON.parse(fs.readFileSync('/tmp/saves.json','utf8'));
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 for(const [name,raw] of Object.entries(saves)){
  if(raw.length<50){console.log(name,raw);continue}
  const ctx=await b.newContext({viewport:{width:1280,height:720}});
  await ctx.addInitScript(([k,v])=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(k,v);sessionStorage.setItem('seeded','1')}},[key,raw]);
  const p=await ctx.newPage();const bad=[];
  p.on('pageerror',e=>bad.push('pageerror: '+String(e.stack||e).slice(0,500)));
  p.on('console',m=>{if(m.type()==='error')bad.push('console: '+m.text().slice(0,300))});
  await p.goto('http://localhost:8741/');
  const ok=await p.waitForFunction(()=>!document.getElementById('tower-boot-loading'),null,{timeout:40000}).then(()=>true).catch(()=>false);
  await p.waitForTimeout(3000);
  await p.screenshot({path:`/tmp/save-${name}.png`});
  console.log(name,'boot-cover-removed:',ok,bad.slice(0,4).join(' || '));
  await ctx.close();
 }
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
