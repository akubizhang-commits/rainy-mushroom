'use strict';
// Run only as a child with Node's permission model. This file does not edit the vendor plugin.
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const {syncBuiltinESMExports} = require('node:module');
const [plugin, source, target, metricsPath, gameVersion] = process.argv.slice(2);
const metrics = {nodeVersion:process.version,childProcessAttempts:[],networkAttempts:[],externalLoadedModules:[],resolvedDependencies:{},success:false};
for (const method of ['exec','execFile','spawn','fork','execSync','execFileSync','spawnSync']) {
 childProcess[method] = (...args) => {
  metrics.childProcessAttempts.push({method,command:String(args[0]).slice(0,200)});
  throw Error(`Offline converter blocked child_process.${method}`);
 };
}
function blockNetwork(name, methods) {
 const module = require(name);
 for (const method of methods) if (typeof module[method] === 'function') module[method] = () => {
  metrics.networkAttempts.push({module:name,method});
  throw Error(`Offline converter blocked ${name}.${method}`);
 };
}
blockNetwork('node:http',['request','get','createServer']);
blockNetwork('node:https',['request','get','createServer']);
blockNetwork('node:http2',['connect','createServer','createSecureServer']);
blockNetwork('node:net',['connect','createConnection','createServer']);
blockNetwork('node:tls',['connect','createServer']);
blockNetwork('node:dgram',['createSocket']);
for (const module of ['node:dns','node:dns/promises']) blockNetwork(module,['lookup','lookupService','resolve','resolve4','resolve6','resolveAny','resolveCname','resolveMx','resolveNaptr','resolveNs','resolvePtr','resolveSoa','resolveSrv','resolveTxt','reverse']);
globalThis.fetch = () => {metrics.networkAttempts.push({module:'globalThis',method:'fetch'});throw Error('Offline converter blocked fetch');};
syncBuiltinESMExports();
(async () => {
 try {
  if (!process.permission) throw Error('Node permission model is required');
  metrics.writePermissions = {plugin:process.permission.has('fs.write',plugin),source:process.permission.has('fs.write',source),target:process.permission.has('fs.write',target),childProcess:process.permission.has('child')};
  if (metrics.writePermissions.plugin || metrics.writePermissions.source || !metrics.writePermissions.target || metrics.writePermissions.childProcess) throw Error('Unexpected converter permissions');
  for (const [name, root] of [['fs-extra',plugin],['archiver',plugin],['@babel/core',path.join(plugin,'converter')],['@babel/preset-env',path.join(plugin,'converter')]]) {
   const resolved = require.resolve(name,{paths:[root]});
   if (!resolved.startsWith(plugin+path.sep)) throw Error(`Dependency escaped fixed plugin: ${name}`);
   metrics.resolvedDependencies[name] = resolved;
  }
  const {convertWechatToTap} = require(path.join(plugin,'dist/converter-ts.js'));
  if (typeof convertWechatToTap !== 'function') throw Error('Missing fixed conversion export');
  await convertWechatToTap({source,target,useSubpackage:false,gameVersion});
  metrics.externalLoadedModules = Object.keys(require.cache).filter(file => file !== __filename && !file.startsWith(plugin+path.sep));
  if (metrics.childProcessAttempts.length || metrics.networkAttempts.length || metrics.externalLoadedModules.length) throw Error('Unexpected converter side effect or unbundled dependency');
  metrics.success = true;
 } catch (error) {
  metrics.error = error.stack || String(error);
  console.error(metrics.error);
  process.exitCode = 1;
 } finally {
  fs.writeFileSync(metricsPath,JSON.stringify(metrics,null,2)+'\n');
 }
})();
