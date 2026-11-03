import fs from 'node:fs'
import {buildCapabilities} from '../build-profile.mjs'
import {join,relative} from 'node:path'
import {spawnSync} from 'node:child_process'
import {captureBuildFingerprint,verifyBuildStamp} from '../release-integrity.mjs'
import {assertNoSymlinkPath,convertTapBuild,verifyPinnedPlugin} from './tap-convert.mjs'

export async function buildTap({root,creator,profile='production'}){
 buildCapabilities(profile)
 const outputRoot=join(root,'cocos-pilot/build/taptap-minigame'),latest=join(outputRoot,'latest.json'),raw=join(root,'cocos-pilot/build/tap-wechat-intermediate')
 assertNoSymlinkPath(outputRoot);assertNoSymlinkPath(raw)
 // Older immutable runs remain as evidence; a failed new build has no current candidate.
 fs.rmSync(latest,{force:true})
 const pluginDir=process.env.TAP_PLUGIN_DIR,archivePath=process.env.TAP_PLUGIN_ARCHIVE
 verifyPinnedPlugin({pluginDir,archivePath})
 if(Number(process.versions.node.split('.')[0])<22)throw Error('Tap offline builds require Node 22+ permission support')
 for(const script of ['scripts/prepare-release-config.mjs','scripts/cocos/sync-shared.mjs']){
  const prepared=spawnSync(process.execPath,[join(root,script),...(script==='scripts/prepare-release-config.mjs'?['--profile='+profile]:[])],{stdio:'inherit'})
  if(prepared.status!==0)throw prepared.error||Error('Tap build preparation failed: '+script)
 }
 const tap=JSON.parse(fs.readFileSync(join(root,'cocos-pilot/build-configs/taptap-minigame.json')))
 if(tap.distribution!=='ordinary-minigame'||tap.identity?.tapGameId!==null||tap.identity?.tapAppId!==null||tap.identity?.accountVerified!==false)throw Error('This offline build route requires explicitly unverified Tap identity')
 const config=JSON.parse(fs.readFileSync(join(root,'cocos-pilot/build-configs/wechatgame.json')))
 config.platform='wechatgame';config.buildPath=join(root,'cocos-pilot/build');config.outputName='tap-wechat-intermediate'
 config.packages={...config.packages,'taptap-minigame-tools':{enableTapConvert:false,deleteWechatBuild:false,usePythonScript:false}}
 const logDir=join(root,'cocos-pilot/temp/pilot-builds');fs.mkdirSync(logDir,{recursive:true})
 const configPath=join(logDir,'tap-wechat.config.json');fs.writeFileSync(configPath,JSON.stringify(config,null,2)+'\n')
 const options={root,platform:'taptap-minigame',creator},before=captureBuildFingerprint(options)
 if(before.profile!==profile)throw Error('Prepared Tap build profile mismatch')
 if(before.toolchain.creator.version!==tap.creatorVersion)throw Error('Tap Creator version differs from the audited build configuration')
 fs.rmSync(raw,{recursive:true,force:true})
 const result=spawnSync(creator,['--project',join(root,'cocos-pilot'),'--build',`configPath=${configPath}`],{encoding:'utf8',maxBuffer:32*1024*1024})
 const log=(result.stdout||'')+(result.stderr||'');fs.writeFileSync(join(logDir,'taptap-minigame.log'),log)
 // Creator labels completion with outputName, which differs from the source platform.
 if(![0,36].includes(result.status)||!log.includes(`build Task (${config.outputName}) Finished`)||/\b(error TS\d+|Build failed|Can not find class)/i.test(log))throw result.error||Error(`Creator Tap intermediate build failed (${result.status}); see ${logDir}/taptap-minigame.log`)
 // An early check avoids converting a known stale intermediate. The final check is still mandatory.
 verifyBuildStamp(before,options)
 const converted=await convertTapBuild({source:raw,outputRoot,pluginDir,archivePath,gameVersion:tap.gameVersion,fingerprint:before,effectiveConfig:config,creatorLog:log,verifyInputs:()=>{
  if(fs.readFileSync(configPath,'utf8')!==JSON.stringify(config,null,2)+'\n')throw Error('Effective Creator config changed during Tap conversion')
  verifyBuildStamp(before,options)
 }})
 fs.writeFileSync(latest,JSON.stringify({manifest:relative(outputRoot,converted.manifestPath),releaseEligible:false},null,2)+'\n')
 console.log('Built offline Tap candidate: '+converted.gameDir)
 console.log('Tap manifest: '+converted.manifestPath)
 console.log('Tap platform/device validation: not-run; package limits: unverified; releaseEligible=false')
 return converted
}
