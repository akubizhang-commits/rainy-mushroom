import fs from 'node:fs'
import { SCENES, ECO_REGION_BY_ID } from '../js/data/explorationData.js'

const masks = JSON.parse(fs.readFileSync(new URL('./natural-sprite-masks.json', import.meta.url), 'utf8'))
const attribution = JSON.parse(fs.readFileSync(new URL('../assets/exploration/ATTRIBUTION.json', import.meta.url), 'utf8'))
const habitats = JSON.parse(fs.readFileSync(new URL('../assets/exploration/HABITAT_ATTRIBUTION.json', import.meta.url), 'utf8'))
const manifest = {
  version: 1,
  status: 'internal-photographic-prototype',
  generatedWithImageApi: false,
  note: 'No OPENAI_API_KEY was available. Backgrounds reuse existing photographs; the eight new image-generation compositions are prepared but have not been generated.',
  sprites: masks.map(mask => {
    const sourcePath = `assets/exploration/${mask.id}/detail-${mask.photo}.jpg`
    return {
      speciesId: mask.id,
      localPath: `assets/exploration/natural/targets/${mask.id}.png`,
      modifications: 'Polygon cutout, transparent background, resized. Runtime adds contact shadow and partial foreground occlusion.',
      source: attribution.find(item => item.localPath === sourcePath),
      usage: 'Internal prototype; original source license applies, including NC where present.'
    }
  }),
  scenes: SCENES.map(scene => ({
    sceneId: scene.id,
    path: `${ECO_REGION_BY_ID[scene.regionId].name} / ${scene.name}`,
    background: scene.habitat.fallbackPhoto,
    cropTop: scene.habitat.fallbackCropTop,
    source: habitats.find(item => item.localPath === scene.habitat.fallbackPhoto),
    sourceScope: 'Representative atmosphere only, not a locality or validated vegetation reconstruction. Alpine and some forest variants still require new habitat-specific art.',
    targets: scene.spawns.map(spawn => ({
      spawnId: spawn.id,
      position: [spawn.photoX, spawn.photoY],
      proposedArtPosition: [spawn.x, spawn.y],
      foreground: spawn.cover,
      hidingPlace: spawn.hidingPlace
    }))
  }))
}
fs.mkdirSync(new URL('../assets/exploration/natural/', import.meta.url), { recursive: true })
fs.writeFileSync(new URL('../assets/exploration/natural/MANIFEST.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n')
console.log('Updated natural sprite and habitat provenance.')
