import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const dir=new URL('../reports/equipment-integer-v2-2026-11-03/',import.meta.url)
const read=name=>JSON.parse(readFileSync(new URL(name,dir),'utf8'))
const standard=read('after-standard.json'),before=read('before-standard.json'),expanded=read('after-expanded.json'),expandedBefore=read('before-expanded.json'),edge=read('after-edge.json'),edgeBefore=read('before-edge.json')
for(const d of [standard,before,expanded,expandedBefore,edge,edgeBefore])assert.equal(d.complete,true,`${d.version}/${d.phase}`)
for(const d of [standard,expanded,edge])for(const [name,hash] of Object.entries(d.sources))assert.equal(createHash('sha256').update(readFileSync(new URL(`../js/xianxia/${name}.js`,import.meta.url))).digest('hex'),hash,`Stale ${d.phase}/${name}`)
const dilution=read('after-dilution.json');assert.equal(dilution.complete,true)
const catalog=read('catalog-audit.json'),survival=read('survival.json'),ui=read('ui.json'),delta=read('test-delta-final.json')
assert.equal(catalog.rangeStatus,'PASSED');assert.equal(ui.errors.length,0)
const targets={fan:[0,1.3],fa:[0,1.8,2.2,2.7,3.3],bao:[0,2.1,2.7,3.3,4],ling:[0,2.6,3.3,4.1,5]},names={fan:'凡器',fa:'法器',bao:'宝器',ling:'灵器'},quality=['初始','下品','中品','上品','极品']
const mean=a=>a.reduce((s,n)=>s+n,0)/a.length
const groups=new Map()
for(const r of standard.rows){const k=`${r.tier}/${r.quality}/${r.route}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}
const standardRows=[...groups].map(([key,rows])=>{const r=rows[0],old=before.rows.filter(o=>`${o.tier}/${o.quality}/${o.route}`===key);const ratio=mean(rows.map(r=>r.ratio)),target=targets[r.tier][r.quality];return{key,tier:r.tier,quality:r.quality,route:r.route,ids:r.ids,ratio,target,relativeDeviation:ratio/target-1,beforeRatio:mean(old.map(r=>r.ratio)),withinTarget:Math.abs(ratio/target-1)<=.1}})
const outliers=standardRows.filter(r=>!r.withinTarget)
const monotonic=[]
for(const r of standardRows.filter(r=>r.quality>1)){const previous=standardRows.find(p=>p.tier===r.tier&&p.route===r.route&&p.quality===r.quality-1);if(previous&&r.ratio<previous.ratio)monotonic.push({previous,current:r})}
const natural=[]
for(const route of ['qi','array','mixed'])for(const seed of [101,211,307]){
 const versions={}
 for(const version of ['before','after']){
  const d=read(`${version}-natural-${route}-${seed}.json`)
  assert.equal(d.completed,true,`${version}/${route}/${seed}`);assert.equal(d.sourceStable,true,`${version}/${route}/${seed} source changed`)
  const firstBosses=d.attempts.filter(a=>!a.postClear).flatMap(a=>a.encounters.filter(e=>e.role==='boss').map(e=>({floor:a.floor,seconds:e.damageToDeathSeconds,level:e.playerLevelAtSpawn})))
  const won=d.attempts.filter(a=>a.outcome==='won'),firstClear=won.find(a=>a.floor===9&&!a.postClear)
  versions[version]={cleared:d.clearedFloor,attempts:d.attempts.length,firstClearAttempt:firstClear?.attempt??null,firstClearSeconds:firstClear?d.attempts.filter(a=>a.attempt<=firstClear.attempt).reduce((s,a)=>s+a.seconds,0):null,finalLevel:d.final.level,failures:d.attempts.filter(a=>a.outcome!=='won').length,bosses:firstBosses,finalBosses:d.attempts.filter(a=>a.postClear).flatMap(a=>a.encounters.filter(e=>e.role==='boss').map(e=>e.damageToDeathSeconds)).filter(Number.isFinite)}
 }
 natural.push({route,seed,...versions})
}
const clearChanges=natural.map(r=>100*(r.after.firstClearSeconds/r.before.firstClearSeconds-1))
const bossTimes=natural.flatMap(r=>r.after.bosses.map(b=>b.seconds)).filter(Number.isFinite)
const report={status:outliers.length||catalog.limitStatus==='CONCERNS'?'CONCERNS':'HEALTHY',standardRows,outliers,monotonic,dilution:{rows:dilution.rows.length,minRatio:Math.min(...dilution.rows.map(r=>r.ratio)),maxRatio:Math.max(...dilution.rows.map(r=>r.ratio))},expanded:{rows:expanded.rows.length,maxRatio:Math.max(...expanded.rows.map(r=>r.ratio)),beforeMaxRatio:Math.max(...expandedBefore.rows.map(r=>r.ratio))},edge:{rows:edge.rows.length,beforeRows:edgeBefore.rows.length,maxRatio:Math.max(...edge.rows.map(r=>r.ratio)),beforeMaxRatio:Math.max(...edgeBefore.rows.map(r=>r.ratio))},natural,tests:delta,uiCases:ui.cases.length}
writeFileSync(new URL('summary.json',dir),JSON.stringify(report,null,2)+'\n')
const rows=[]
for(const [tier,ts]of Object.entries(targets))for(let q=1;q<ts.length;q++){
 const rs=standardRows.filter(r=>r.tier===tier&&r.quality===q)
 rows.push(`|${names[tier]}·${quality[q]}|${ts[q].toFixed(2)}|${Math.min(...rs.map(r=>r.ratio)).toFixed(3)}–${Math.max(...rs.map(r=>r.ratio)).toFixed(3)}|${Math.min(...rs.map(r=>r.beforeRatio)).toFixed(3)}–${Math.max(...rs.map(r=>r.beforeRatio)).toFixed(3)}|`)
}
const text=`# 装备整数第二版：实施与实战验证\n\n状态：**${report.status}**。87件固定身份已接入；数值设计范围全部通过，实际采样结果和边缘偏差如下。没有为抵消装备收益统一提高怪物血量或削减技能。\n\n## 数据与实现\n\n- FOUND：批准方案、before源码快照、生成范围、最终固定目录、真实TowerRun采样、新旧自然路线、测试日志、Cocos构建日志和UI截图。\n- 固定身份不随机属性；全部基础属性整数；体力只在防具，1体力=10气血；武器与戒指不加体力。\n- 武器伤害区间端点整数；普通/特殊效果均读同一目录；暴击与冷却戒指分工，移除武器零点几暴击词条和护甲HP%重复预算。\n- 无垢14%护盾触发、快照与暂停换装均统一。澄霄额外回复0.2%/3秒，脱战4秒后另加0.6%；全局回复上限仍为2.5%/3秒。\n- schema57→58，旧档按项目约定重置本模式。当前存读档、失败原子性与重复结算由回归测试覆盖。\n- 逐件新旧值：[fixed-catalog.md](fixed-catalog.md)；取值配置：design/balance/equipment-integer-values.json。\n\n## 标准真实输出\n\n同等级、同训练、同种子，相对初始三件套。真实60Hz调度、正常灵力/CD/暴击/攻击波动；180秒舍弃前30秒，种子101/211/307取均值。目标不攻击，固定距玩家100；这是调参靶场，不能当作真人胜率。御剑无被动夹具训练等级修订为3，满足当前前置；所有夹具校验等级与可用点数。\n\n|品阶|新目标中心|新版本各路线均值范围|旧版本同夹具范围|\n|---|---:|---:|---:|\n${rows.join('\n')}\n\n${standardRows.length-outliers.length}/${standardRows.length}组在±10%内；品质递增倒退${monotonic.length}组。保留以下边界偏差，不放宽原阈值：\n\n|组合|实测倍率|目标允许范围|偏差|\n|---|---:|---:|---:|\n${outliers.map(r=>`|${names[r.tier]}·${quality[r.quality]} / ${r.route}|${r.ratio.toFixed(5)}|${(r.target*.9).toFixed(3)}–${(r.target*1.1).toFixed(3)}|${(r.relativeDeviation*100).toFixed(3)}%|`).join('\n')}\n\n所有50组所选ID与具体结果见summary.json，原始150个采样见after-standard.json。\n\n## 边界、扩展场景与防御\n\n- 静态遍历${catalog.combinations}套装备/等级组合、${catalog.channels}通道/暴击折点；范围错误0。保守普通效果估算最大${catalog.worstOrdinaryEnvelope.ratio.toFixed(3)}倍，技能+1启发式最大${catalog.worstWithRankEstimate.ratio.toFixed(3)}倍。**不能证明全构筑6倍上限**。该估算将持续伤害增益按全伤害计入、用完整施法加速上界，不是DPS。\n- 高风险混搭/技能等级边界实测${report.edge.rows}项，覆盖训练1–10级在选定等级的合法组合、照胆/太衡+1、持续伤害/剑阵戒指、有无合法被动；最高${report.edge.maxRatio.toFixed(3)}倍（旧同类采样最高${report.edge.beforeMaxRatio.toFixed(3)}倍）。这仍非所有技能/进阶/几何位置的穷举证明。\n- 扩展${report.expanded.rows}项：30/600秒单体、180秒5个稀疏/20个密集目标；最高${report.expanded.maxRatio.toFixed(3)}倍。这些场景不套用单体目标中心。\n- 同训练与固定装备另测阶段末（凡器Lv3、法器Lv10、宝器Lv20、灵器Lv30）150项，见after-dilution.json，确认升级后固定点数收益自然稀释；未随人物等级重算装备。\n- 12项防具下品→极品EHP增长全部在批准区间内，分别计算物防与体力带来的收益。压力实验24项；不把低压下存活600秒称为无敌，详见survival.json。暂停、读档、换装不额外补给由真实事务回归覆盖。\n\n## 自然成长对照\n\n三条路线×3种子；每次从新档开始，仅起始/赚取资源、正常制作/交易/学习、移动机器人，最多18次尝试，后期复刷也计入。无免费装备、无XP/HP注入；新旧同一策略，策略按当前实际属性选装备，故最终配装可不同。表中时间仅合计战斗模拟秒，不包含营地操作或本机运行耗时。所有报告completed/sourceStable均为true。共享工作区的并行存档交易改动曾令早期样本指纹失效，已保留为superseded-natural-concurrent并排除；最终9条使用after/不可变快照（after-hashes.json），与当前装备版本一致。\n\n|路线/种子|旧首次九层通关尝试/战斗秒|新首次九层通关尝试/战斗秒|新完成层数|\n|---|---:|---:|---:|\n${natural.map(r=>`|${r.route}/${r.seed}|${r.before.firstClearAttempt??'未通关'} / ${r.before.firstClearSeconds?.toFixed(1)??'—'}|${r.after.firstClearAttempt??'未通关'} / ${r.after.firstClearSeconds?.toFixed(1)??'—'}|${r.after.cleared}|`).join('\n')}\n\n新版本9条路线均无失败，首通战斗时间缩短${(-Math.max(...clearChanges)).toFixed(1)}%–${(-Math.min(...clearChanges)).toFixed(1)}%。首通Boss击杀时间${Math.min(...bossTimes).toFixed(1)}–${Math.max(...bossTimes).toFixed(1)}秒，部分低于100–140秒参照；本轮保留装备带来的提速，不据此统一抬血。\n\n逐Boss首次受伤到死亡、玩家等级、后期复刷TTK及失败次数在summary.json；完整装备、资源和事务在before/after-natural-*.json。机器人结果不等于真人通关率。\n\n## 工程验证与审查\n\n- 新测试先失败再通过；审查复现并修复换装将14%护盾裁剪为12%的遗漏。最终冻结快照的相关回归37/37通过（focused-frozen-tests.log）。\n- 全量：改前1959项/1535通过/424失败；最终1970项/1551通过/419失败。没有新增失败名称，5项旧失败转为通过；**全测试并未全部通过**。逐项历史失败见test-delta-final.json。共享工作区存在其他并行修改，测试总数变化不能全部归因于本任务。\n- Cocos web-mobile从空输出重建通过，旧MD5缓存失败产物已保留；当前共享源码清单与根源码核对。\n- 844×390与1280×720横屏UI共${report.uiCases}项通过、无页面错误；已人工检查小屏武器详情和大屏角色面板截图。\n- 单次新鲜上下文代码审查完成，确定问题已修复；不提交或清理用户其他工作。\n\n## 限制与后续调参依据\n\n实测支持数值增大后仍可正常战斗、成长和存读档，但全构筑6倍上限尚未证明，3项标准边界偏差保留为CONCERNS。技能/怪物未统一补偿；后续应依据真人操作和具体Boss瓶颈局部调整，避免用极品满配统一抬怪物血量。\n`
writeFileSync(new URL('README.md',dir),text)
console.log('Wrote final report',report.status,'natural clears',natural.filter(r=>r.after.cleared===9).length,'/9')
