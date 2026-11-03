import {profileFromArgs} from '../build-profile.mjs'
import {assertSafeBuildOutput,captureBuildFingerprint,stampBuild} from '../release-integrity.mjs'
import {packageWechat} from './package-wechat.mjs'
import {spawnSync} from 'node:child_process'
import {copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {resolve} from 'node:path'
const root=resolve(import.meta.dirname,'../..'),platform=process.argv[2]||'web-mobile'
if(!['web-mobile','wechatgame','taptap-minigame'].includes(platform))throw Error('Unsupported pilot build platform')
const profile=profileFromArgs(process.argv.slice(3))
const assetFlags=process.argv.slice(3).filter(arg=>arg.startsWith('--staged-assets'))
if(assetFlags.length>1||assetFlags.some(arg=>arg!=='--staged-assets'))throw Error('Invalid staged assets flag')
const stagedAssets=assetFlags.length===1
if(process.argv.includes('--release')&&profile!=='production')throw Error('QA build profile cannot be released')
const creator=process.env.COCOS_CREATOR_PATH||'/Applications/CocosCreator.app/Contents/MacOS/CocosCreator'
if(!existsSync(creator))throw Error('Set COCOS_CREATOR_PATH to the Creator 3.8.8 executable')
if(platform==='taptap-minigame'){
 if(process.argv.includes('--release'))throw Error('Tap publication is unavailable: account, platform/device and package limits remain unverified')
 const {buildTap}=await import('./build-tap.mjs')
 await buildTap({root,creator,profile,stagedAssets})
}else{
const output=resolve(root,'cocos-pilot/build',platform),fingerprintOptions={root,platform,creator,resourcePolicy:stagedAssets?'reviewed':'all'}
assertSafeBuildOutput(output)
// A failed rebuild must never retain a previous candidate's validity record.
rmSync(resolve(output,'release-build.json'),{force:true})
const config=spawnSync(process.execPath,[resolve(root,'scripts/prepare-release-config.mjs'),'--profile='+profile],{stdio:'inherit'});if(config.status!==0)process.exit(config.status||1)
const sync=spawnSync(process.execPath,[resolve(root,'scripts/cocos/sync-shared.mjs')],{stdio:'inherit'})
if(sync.status!==0)process.exit(sync.status||1)
// Preparation writes generated inputs; freeze them only after both steps succeed.
const before=captureBuildFingerprint(fingerprintOptions)
if(before.profile!==profile)throw Error('Prepared build profile mismatch')
let project=resolve(root,'cocos-pilot'),configPath=resolve(root,'cocos-pilot/build-configs',platform+'.json'),stage=null,assetTools=null,effectiveConfigText=null
if(stagedAssets){
 assetTools=await import('./release-assets.mjs')
 stage=assetTools.createReleaseStage({root});project=stage.project
 const effective={...JSON.parse(readFileSync(configPath,'utf8')),platform,buildPath:resolve(root,'cocos-pilot/build'),outputName:platform}
 configPath=resolve(stage.stageRoot,'build-config.json');effectiveConfigText=JSON.stringify(effective,null,2)+'\n';writeFileSync(configPath,effectiveConfigText)
 assetTools.assertSafeBuildOutput(output);rmSync(output,{recursive:true,force:true})
}
const result=spawnSync(creator,['--project',project,'--build',`configPath=${configPath}`],{encoding:'utf8',maxBuffer:32*1024*1024})
const log=(result.stdout||'')+(result.stderr||'');const logDir=resolve(root,'cocos-pilot/temp/pilot-builds');mkdirSync(logDir,{recursive:true});writeFileSync(resolve(logDir,platform+'.log'),log)
// Creator's successful command-line build exits with 36. Also require its completion marker.
if(![0,36].includes(result.status)||!log.includes(`build Task (${platform}) Finished`)||/\b(error TS\d+|Build failed|Can not find class)/i.test(log)){
 console.error(log.slice(-10000));throw result.error||Error(`Creator failed (${result.status}); see ${logDir}`)
}
if(stage){
 if(readFileSync(configPath,'utf8')!==effectiveConfigText)throw Error('Effective Creator config changed during build')
 assetTools.verifyAndWriteAssetManifest(stage,output)
}
if(platform==='web-mobile')copyFileSync(resolve(root,'cocos-pilot/assets/resources/loading/keyart.jpg'),resolve(root,'cocos-pilot/build/web-mobile/loading-keyart.jpg'))
if(platform==='wechatgame'){const report=packageWechat(resolve(root,'cocos-pilot/build/wechatgame'));writeFileSync(resolve(root,'cocos-pilot/package-report.json'),JSON.stringify(report,null,2)+'\n');console.log('WeChat main package:',(report.mainBytes/1024/1024).toFixed(2)+' MiB')}
// Re-read inputs and the actual toolchain after all packaging and file writes.
if(stage&&readFileSync(configPath,'utf8')!==effectiveConfigText)throw Error('Effective Creator config changed during packaging')
stampBuild(output,before,fingerprintOptions)
console.log(`Built ${platform}: ${root}/cocos-pilot/build/${platform}; log: ${logDir}/${platform}.log`)

if(process.argv.includes('--release')){const check=spawnSync(process.execPath,[resolve(root,'scripts/check-release.mjs'),'--strict'],{stdio:'inherit'});if(check.status!==0)process.exit(check.status||1)}

}
