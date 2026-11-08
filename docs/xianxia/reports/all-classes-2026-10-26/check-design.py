from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parents[2];folder=root/'classes';out=Path(__file__).parent
source=Path('/Users/zhangnu/Downloads/修仙割草生存游戏设计文档.docx')
groups={
'01-sword.md':'御剑术 剑气斩 剑心通明 青萍剑意 万剑诀 一线天 剑影分光 两仪微尘剑阵 剑骨 万剑归宗 诛仙剑阵 天地一剑 剑开天门 无我剑境'.split(),
'02-elementalist.md':'火弹术 烈焰环 焚天火雨 水箭术 水龙卷 海啸领域 藤鞭 荆棘阵 万木森罗 岩刺 地裂斩 山岳镇域 引雷针 雷链 天劫雷罚 冰锥术 寒冰新星 绝对零度 风刃 旋风步 九天风暴 金锥术 金盾阵 万金归宗'.split(),
'03-talisman.md':'火符 引雷符 追踪符 护身符 爆炎连环符 雷符连锁 符箓陷阱 封魔阵符 万火符阵 天雷符海 九幽封界 万符归一'.split(),
'04-beastmaster.md':'妖狼召唤 灵鹰召唤 毒蛇召唤 兽语通 狼群奔袭 鹰隼风暴 蛇群缠绕 兽王号令 天狼兽潮 万鹰凌空 万蛇噬界 真龙降世'.split(),
'05-formation.md':'小剑阵 炎阵 困妖阵 灵眼 两仪剑阵 燎原火阵 锁灵阵 阵灵共鸣 诛仙剑域 焚世火域 九幽困界 天地灵域'.split(),
'06-body.md':'崩拳 铁肤 震脚 气血术 裂地拳 金钟罩 风影连击 铁骨铮铮 开山碎岳 不灭金身 风神百裂 万法不侵'.split(),
'07-occultist.md':'摄魂 毒雾 血刺 暗咒 万魂噬心 毒瘴领域 血池 控尸 魂海降临 万毒灭世 血海魔域 万咒归一'.split()}
report={'source':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceSkillEntries':sum(map(len,groups.values())),'coverage':{},'brokenLinks':[],'scope':'Static document coverage and local-link check, NOT balance/playtest'}
for name,names in groups.items():
 text=(folder/name).read_text()
 if name=='01-sword.md':text+='\n'+(root/'17-sword-skill-redesign.md').read_text()
 report['coverage'][name]={'expected':len(names),'missing':[n for n in names if n not in text]}
files=list(folder.glob('*.md'))+[root/'18-all-class-skills-review.md']
for f in files:
 for dest in re.findall(r'\[[^\]]+\]\(([^)]+)\)',f.read_text()):
  if not dest.startswith(('http','#')) and not (f.parent/dest.split('#')[0]).exists():report['brokenLinks'].append([str(f),dest])
report['allPassed']=not report['brokenLinks'] and not any(v['missing'] for v in report['coverage'].values())
(out/'coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2));assert report['allPassed']
