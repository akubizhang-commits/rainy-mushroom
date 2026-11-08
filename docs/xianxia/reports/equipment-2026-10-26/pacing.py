"""Proposal-only exact probability and reward arithmetic; not a battle/retention test."""
import json
from pathlib import Path

p = .05
limit = 20
distribution = [((1-p)**(i-1)*p if i < limit else (1-p)**(limit-1)) for i in range(1,limit+1)]
mean = sum((i+1)*v for i,v in enumerate(distribution))
def quantile(q):
    acc=0
    for i,v in enumerate(distribution,1):
        acc+=v
        if acc>=q:return i
assert abs(sum(distribution)-1)<1e-12
assert quantile(.95)==20
# A requested slot has four equally likely identities. Every pull yields one forge mark.
# Choice costs 40 marks for gold; targeted path bound holds only if marks are saved.
rows=[]
for minutes,reward,label in [(2,30,'early defeat'),(4,60,'mid defeat'),(6,90,'late defeat'),(7,120,'seven-minute victory')]:
    pulls_per_hour=60/minutes*reward/100
    rows.append(dict(profile=label,minutes=minutes,sandPerRun=reward,
                     pullsPerCombatHour=pulls_per_hour,
                     meanMinutesToGold=mean/pulls_per_hour*60,
                     maxMinutesToGold=20/pulls_per_hour*60,
                     maxMinutesToChosenGoldSavingMarks=40/pulls_per_hour*60))
out={
 'scope':'exact proposed reward arithmetic; no observed player time or game balance claim',
 'baseRates':{'blue':.65,'purple':.30,'gold':.05},
 'goldHardPity':20,'goldMeanPulls':mean,'longRunGoldShareIncludingPity':1/mean,
 'goldPullQuantiles':{str(q):quantile(q) for q in [.5,.9,.95]},
 'chanceReachGuaranteedPull':distribution[-1],
 'normalSlotIdentityChance':.25,'normalSpecificGoldChance':.05/4,
 'pitySpecificGoldChance':.25,'chosenGoldMarkCost':40,
 'pace':rows,'excluded':['starter/first-clear grants','daily activity supplement','menus/loading','variable Boss duration','abandon farming','retention'],
 'checks':{'distributionSumsToOne':True,'95PercentileWithin20':True,'slotProbabilitiesSumToOne':4*.25==1,
           'existingAndNewAttackAdditiveCap':abs((1+.25+.20)-1.45)<1e-12},
}
Path(__file__).with_name('pacing.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps(out,ensure_ascii=False,indent=2))
