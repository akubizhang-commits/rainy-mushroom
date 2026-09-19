import fs from 'node:fs'
import { SCENES, ECO_REGION_BY_ID } from '../js/data/explorationData.js'

const root = new URL('../output/imagegen/', import.meta.url)
fs.mkdirSync(root, { recursive: true })
const prompts = SCENES.map((scene) => ({
  out: `${scene.id}.jpg`,
  size: '1536x1024',
  quality: 'high',
  output_format: 'jpeg',
  prompt: [
    'Use case: photorealistic-natural.',
    'Asset: a seamless-looking single 3:2 panoramic habitat for a portrait hidden-object nature game. The phone pans horizontally across this complete landscape.',
    `Ecological path: ${ECO_REGION_BY_ID[scene.regionId].name} / ${scene.name}.`,
    `Scene: ${scene.habitat.terrain}`,
    'Camera: close observer perspective, looking slightly down. Rich readable foreground and middle ground, deep focus, physically plausible natural light and plant scale. At most 15 percent empty sky.',
    'Build these exact textured receiving surfaces for collectible mushrooms. Coordinates are percentages measured from the left and TOP of the complete image:',
    ...scene.spawns.map((spawn) => `At (${Math.round(spawn.x * 100)}%, ${Math.round(spawn.y * 100)}%): ${spawn.hidingPlace} / ${spawn.cover}, with detailed natural foreground edges, partially occluding grass, needles, leaves or bark as appropriate. Keep that small surface unobstructed enough to receive a mushroom sprite.`),
    'Do NOT draw any mushrooms, people, animals, paths, architecture, baskets, interface, lettering, logos or watermark. Mushrooms and foreground occlusion are added as independent game layers.',
    'Photographic realism, natural colour, convincing bark and leaf microtexture. No illustration outlines, painted wash, artificial tilt-shift, fantasy glow or oversaturation.',
    'This is a fictional representative ecology, not a real mapped site.'
  ].join('\n')
}))
fs.writeFileSync(new URL('habitat-prompts.jsonl', root), prompts.map((prompt) => JSON.stringify(prompt)).join('\n') + '\n')
console.log('Prepared eight prompts in output/imagegen/habitat-prompts.jsonl. No image API was called.')
