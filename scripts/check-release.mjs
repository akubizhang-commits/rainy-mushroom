import fs from 'node:fs'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {validatePhotoRights} from './check-photo-rights.mjs'
import {projectRoot as root,filesBelow,digestSource} from './release-integrity.mjs'
import {RELEASE_INFO} from '../js/config/releaseInfo.js'
import {AD_CONFIG} from '../js/config/adConfig.js'
export function configurationBlockers(config,ads=AD_CONFIG,stage='publication'){
 const blockers=[],v=config.verification||{}
 if(config.accountType!=='formal')blockers.push('当前AppID尚未核验为正式小游戏账号（当前为测试号或未核验），不能用于正式发布')
 if(!/^wx[0-9a-f]{16}$/i.test(config.appid))blockers.push('正式小游戏 AppID 尚未配置')
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.supportContact||''))blockers.push('正式开发者反馈联系方式尚未配置')
 if(!v.privacyConfigured)blockers.push('微信后台隐私指引与官方授权弹窗尚未核验')
 if(!v.ageRatingApproved||!['8+','12+','16+'].includes(config.ageRating))blockers.push('适龄提示尚未核验通过或正式等级未配置')
 if(stage==='publication'&&!v.contentFilingApproved)blockers.push('小游戏内容备案尚未核验通过')
 if(stage==='publication'&&!v.miitFilingNumber?.trim())blockers.push('小程序工信备案号尚未配置')
 if(!v.androidDevicePassed||!v.iosDevicePassed)blockers.push('正式 AppID 下安卓与 iOS 真机验收尚未完成')
 if(ads.enabled){if(!/^adunit-[a-z0-9]+$/i.test(ads.adUnitIds?.rewardedVideo||''))blockers.push('激励视频广告位尚未配置');if(!v.advertisingDevicePassed)blockers.push('广告真机验收尚未完成')}
 if(ads.adUnitIds?.interstitial)blockers.push('当前版本不支持插屏广告，请清空插屏广告位')
 return blockers
}
export function checkRelease(stage='publication'){
 const config=JSON.parse(fs.readFileSync(resolve(root,'release/settings.json'))),blockers=configurationBlockers(config,AD_CONFIG,stage),warnings=[]
 if(stage==='submission'&&!config.verification?.miitFilingNumber?.trim())warnings.push('小程序工信备案可与版本审核并行，但正式发布前必须完成')
 if(stage==='submission'&&!config.verification?.contentFilingApproved)warnings.push('小游戏内容备案仍待核验；另需按实际类目确认资质先后条件，文化互动类须先完成资质审核')
 if(config.plannedMonetization==='advertising'&&!AD_CONFIG.enabled)warnings.push('计划广告变现，但当前候选版无广告。广告流程已接入，填入真实广告位并完成真机联调后才能作为广告版发布。')
 if(RELEASE_INFO.ageRating!==(['8+','12+','16+'].includes(config.ageRating)?config.ageRating:null))blockers.push('适龄展示与发布配置不一致，请重新构建')
 if(RELEASE_INFO.version!==config.version||RELEASE_INFO.supportContact!==config.supportContact||AD_CONFIG.enabled!==(config.advertising?.enabled===true)||AD_CONFIG.adUnitIds.rewardedVideo!==(config.advertising?.rewardedVideoAdUnitId||''))blockers.push('发布配置与运行时配置不一致，请重新构建')
 let photos=[];try{photos=validatePhotoRights()}catch(e){blockers.push('照片许可检查失败：'+e.message)}
 const folder=resolve(root,'cocos-pilot/build/wechatgame');let mainBytes=0,totalBytes=0
 if(!fs.existsSync(folder))blockers.push('缺少微信构建产物')
 else{
  const files=filesBelow(folder),hashes=new Set(files.map(file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex')))
  const missing=photos.filter(p=>!hashes.has(p.sha256));if(missing.length)blockers.push('发布包缺少已核验照片：'+missing.length+'张')
  const legacy=JSON.parse(fs.readFileSync(resolve(root,'assets/exploration/ATTRIBUTION.json'))).filter(p=>p.license==='cc-by-nc')
  if(legacy.some(p=>hashes.has(createHash('sha256').update(fs.readFileSync(resolve(root,p.localPath))).digest('hex'))))blockers.push('发布包混入旧非商业照片')
  try{const stamp=JSON.parse(fs.readFileSync(resolve(folder,'release-build.json')));if(stamp.version!==config.version||stamp.appid!==config.appid||stamp.sourceDigest!==digestSource())blockers.push('构建产物已过期，需要重新构建')}catch{blockers.push('缺少构建版本与源码校验记录')}
  try{const project=JSON.parse(fs.readFileSync(resolve(folder,'project.config.json')));if(project.appid!==config.appid)blockers.push('构建产物AppID与发布配置不一致')}catch{blockers.push('微信项目配置缺失')}
  for(const file of files){const size=fs.statSync(file).size;totalBytes+=size;if(!file.startsWith(resolve(folder,'subpackages')+'/'))mainBytes+=size}
  if(mainBytes>4*1024*1024||totalBytes>20*1024*1024)blockers.push('主包或总包超过项目设定预算')
  const sub=resolve(folder,'subpackages');if(fs.existsSync(sub))for(const e of fs.readdirSync(sub)){const size=filesBelow(resolve(sub,e)).reduce((n,f)=>n+fs.statSync(f).size,0);if(size>4*1024*1024)blockers.push('分包超过项目预算：'+e)}
 }
 const report={stage,checkedAt:new Date().toISOString(),version:config.version,status:blockers.length?(stage==='submission'?'not-ready-for-submission':'not-ready-for-publication'):'local-checks-passed',blockers,warnings,photoSlots:photos.length,mainBytes,totalBytes,note:'本地检查不能代替微信后台审核、账号资格核验和真机验收。'}
 fs.writeFileSync(resolve(root,stage==='submission'?'docs/release/submission-preflight-report.json':'docs/release/preflight-report.json'),JSON.stringify(report,null,2)+'\n');return report
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const report=checkRelease(process.argv.includes('--submission')?'submission':'publication');console.log(JSON.stringify(report,null,2));if(process.argv.includes('--strict')&&report.blockers.length)process.exitCode=1}
