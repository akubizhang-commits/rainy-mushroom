import {captureBuildFingerprint,stampBuild} from '../release-integrity.mjs'
import {packageWechat} from './package-wechat.mjs'
import {spawnSync} from 'node:child_process'
import {copyFileSync,existsSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {resolve} from 'node:path'
const root=resolve(import.meta.dirname,'../..'),platform=process.argv[2]||'web-mobile'
if(!['web-mobile','wechatgame'].includes(platform))throw Error('Unsupported pilot build platform')
const creator=process.env.COCOS_CREATOR_PATH||'/Applications/CocosCreator.app/Contents/MacOS/CocosCreator'
if(!existsSync(creator))throw Error('Set COCOS_CREATOR_PATH to the Creator 3.8.8 executable')
const output=resolve(root,'cocos-pilot/build',platform),fingerprintOptions={root,platform,creator}
// A failed rebuild must never retain a previous candidate's validity record.
rmSync(resolve(output,'release-build.json'),{force:true})
const config=spawnSync(process.execPath,[resolve(root,'scripts/prepare-release-config.mjs')],{stdio:'inherit'});if(config.status!==0)process.exit(config.status||1)
const sync=spawnSync(process.execPath,[resolve(root,'scripts/cocos/sync-shared.mjs')],{stdio:'inherit'})
if(sync.status!==0)process.exit(sync.status||1)
// Preparation writes generated inputs; freeze them only after both steps succeed.
const before=captureBuildFingerprint(fingerprintOptions)
const result=spawnSync(creator,['--project',resolve(root,'cocos-pilot'),'--build',`configPath=${resolve(root,'cocos-pilot/build-configs',platform+'.json')}`],{encoding:'utf8',maxBuffer:32*1024*1024})
const log=(result.stdout||'')+(result.stderr||'');const logDir=resolve(root,'cocos-pilot/temp/pilot-builds');mkdirSync(logDir,{recursive:true});writeFileSync(resolve(logDir,platform+'.log'),log)
// Creator's successful command-line build exits with 36. Also require its completion marker.
if(![0,36].includes(result.status)||!log.includes(`build Task (${platform}) Finished`)||/\b(error TS\d+|Build failed|Can not find class)/i.test(log)){
 console.error(log.slice(-10000));throw result.error||Error(`Creator failed (${result.status}); see ${logDir}`)
}
if(platform==='web-mobile')copyFileSync(resolve(root,'cocos-pilot/assets/resources/loading/keyart.jpg'),resolve(root,'cocos-pilot/build/web-mobile/loading-keyart.jpg'))
if(platform==='wechatgame'){const report=packageWechat(resolve(root,'cocos-pilot/build/wechatgame'));writeFileSync(resolve(root,'cocos-pilot/package-report.json'),JSON.stringify(report,null,2)+'\n');console.log('WeChat main package:',(report.mainBytes/1024/1024).toFixed(2)+' MiB')}
// Re-read inputs and the actual toolchain after all packaging and file writes.
stampBuild(output,before,fingerprintOptions)
console.log(`Built ${platform}: ${root}/cocos-pilot/build/${platform}; log: ${logDir}/${platform}.log`)

if(process.argv.includes('--release')){const check=spawnSync(process.execPath,[resolve(root,'scripts/check-release.mjs'),'--strict'],{stdio:'inherit'});if(check.status!==0)process.exit(check.status||1)}
