// Static server for the WeChat remote asset folder, for DevTools and LAN phone tests.
// Usage: node scripts/cocos/serve-remote.mjs [--root <dir>] [--port 8091]
import {createServer} from 'node:http'
import {createReadStream,statSync} from 'node:fs'
import {networkInterfaces} from 'node:os'
import {extname,resolve,sep} from 'node:path'
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i>0&&process.argv[i+1]?process.argv[i+1]:fallback}
const root=resolve(arg('--root',resolve(import.meta.dirname,'../../cocos-pilot/build/wechatgame-remote'))),port=Number(arg('--port',8091))
const TYPES={'.json':'application/json','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg','.bin':'application/octet-stream','.cconb':'application/octet-stream'}
const server=createServer((req,res)=>{
 const done=status=>console.log(status,req.method,req.url,req.headers['user-agent']||'')
 res.setHeader('Access-Control-Allow-Origin','*')
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, HEAD','Access-Control-Allow-Headers':'*'}).end();return done(204)}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return done(405)}
 let file;try{file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname))}catch{res.writeHead(400).end();return done(400)}
 if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return done(403)}
 let stat;try{stat=statSync(file)}catch{}
 if(!stat?.isFile()){res.writeHead(404).end();return done(404)}
 res.writeHead(200,{'Content-Type':TYPES[extname(file).toLowerCase()]||'application/octet-stream','Content-Length':stat.size})
 if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res)
 done(200)
})
server.listen(port,'0.0.0.0',()=>{
 console.log('Serving',root)
 const hosts=['127.0.0.1',...Object.values(networkInterfaces()).flat().filter(a=>a&&a.family==='IPv4'&&!a.internal).map(a=>a.address)]
 for(const host of hosts)console.log(`  http://${host}:${port}/`)
})
