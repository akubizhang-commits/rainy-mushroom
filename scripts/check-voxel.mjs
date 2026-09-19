import { readdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
for(const file of readdirSync('js/voxel').filter(file=>file.endsWith('.js')))
  execFileSync(process.execPath,['--check',`js/voxel/${file}`],{stdio:'inherit'})

for(const file of ['js/core/ForagingState.js','js/data/foragingScenes.js','js/data/speciesExpansion.js','js/data/speciesKnowledge.js','js/data/speciesPools.js','js/data/expeditionVariations.js','js/data/fieldJournal.js'])execFileSync(process.execPath,['--check',file],{stdio:'inherit'})

for(const file of ['js/ui/theme.js','js/ui/collectionItems.js'])execFileSync(process.execPath,['--check',file],{stdio:'inherit'})
for(const file of ['scripts/preview.html','scripts/voxel-smoke.html','scripts/ui-review.html','scripts/scene-preview-capture.html']){
  for(const match of readFileSync(file,'utf8').matchAll(/<script\b[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/g)){
    execFileSync(process.execPath,['--input-type=module','--check'],{input:match[1],stdio:['pipe','inherit','inherit']})
  }
}
