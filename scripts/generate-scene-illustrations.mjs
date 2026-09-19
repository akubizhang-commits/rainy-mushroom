import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { SCENES } from '../js/data/explorationData.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = path.join(projectRoot, 'assets/exploration/illustrations')
const sceneRoot = path.join(outputRoot, 'scenes')
const cardRoot = path.join(outputRoot, 'cards')
const targetRoot = path.join(outputRoot, 'targets')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rainy-scene-art-'))
const W = 1035
const H = 1230

const styles = {
  pine: { sky: '#d9ded2', far: '#789081', mid: '#486854', ground: '#405b3d', light: '#d7b66b', kind: 'pine' },
  alpine: { sky: '#b9d4df', far: '#718c96', mid: '#91aa87', ground: '#6f8e54', light: '#e5d7a3', kind: 'alpine' },
  birch: { sky: '#d8ddd5', far: '#708477', mid: '#55715c', ground: '#43563d', light: '#d8c489', kind: 'birch' },
  meadow: { sky: '#b8d5e5', far: '#789c7a', mid: '#6f985b', ground: '#5e8648', light: '#e4cf8d', kind: 'meadow' },
  mixed: { sky: '#cbd6cc', far: '#607969', mid: '#3e624d', ground: '#344b37', light: '#c8b77e', kind: 'mixed' },
  river: { sky: '#c7d9dc', far: '#667f70', mid: '#6f8760', ground: '#806f4d', light: '#d8bd7e', kind: 'river' },
  oak: { sky: '#d7d7c3', far: '#718267', mid: '#556746', ground: '#66543b', light: '#d3a75f', kind: 'oak' },
  edge: { sky: '#d8dfda', far: '#7d9184', mid: '#62755b', ground: '#536b49', light: '#cbb67f', kind: 'edge' }
}

const referenceSceneIds = Object.freeze({
  'jl-mixed': 'yn-pine',
  'ln-oak': 'hl-mixed'
})
const referenceSceneId = (scene) => referenceSceneIds[scene.id] || scene.id

function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

function rng(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function pine(x, base, height, color, opacity = 1) {
  const top = base - height
  const half = height * .23
  return `<g opacity="${opacity}"><path d="M${x} ${base} L${x + 6} ${top + 54}" stroke="#4a392d" stroke-width="13" stroke-linecap="round"/><path d="M${x} ${top} C${x - half * .18} ${top + height * .16},${x - half} ${top + height * .32},${x - half * .58} ${top + height * .39} C${x - half * 1.2} ${top + height * .52},${x - half * .95} ${top + height * .61},${x - half * .62} ${top + height * .65} C${x - half * 1.35} ${top + height * .77},${x - half * 1.03} ${top + height * .9},${x} ${base - 18} C${x + half * 1.03} ${top + height * .9},${x + half * 1.35} ${top + height * .77},${x + half * .62} ${top + height * .65} C${x + half * .95} ${top + height * .61},${x + half * 1.2} ${top + height * .52},${x + half * .58} ${top + height * .39} C${x + half} ${top + height * .32},${x + half * .18} ${top + height * .16},${x} ${top}Z" fill="${color}" stroke="#31483b" stroke-width="7" stroke-linejoin="round"/></g>`
}

function birch(x, base, height, canopy, opacity = 1) {
  const top = base - height
  return `<g opacity="${opacity}"><path d="M${x - 15} ${base} Q${x - 5} ${top + height * .45},${x + 2} ${top} Q${x + 16} ${top + height * .5},${x + 20} ${base}Z" fill="#e7e2cf" stroke="#5d6156" stroke-width="7"/><path d="M${x - 7} ${top + height * .28} l25 8 M${x - 10} ${top + height * .47} l23 9 M${x - 13} ${top + height * .7} l30 10" stroke="#5a564d" stroke-width="8"/><g fill="${canopy}" stroke="#4f6b50" stroke-width="5"><ellipse cx="${x - 36}" cy="${top + 35}" rx="62" ry="48"/><ellipse cx="${x + 30}" cy="${top + 20}" rx="69" ry="55"/><ellipse cx="${x + 2}" cy="${top - 14}" rx="59" ry="44"/></g></g>`
}

function broadleaf(x, base, height, canopy, opacity = 1) {
  const top = base - height
  return `<g opacity="${opacity}"><path d="M${x - 18} ${base} Q${x - 7} ${top + height * .45},${x} ${top + 70} M${x} ${top + 95} Q${x - 70} ${top + 42},${x - 88} ${top + 8} M${x + 2} ${top + 94} Q${x + 70} ${top + 45},${x + 96} ${top + 12}" fill="none" stroke="#594735" stroke-width="22" stroke-linecap="round"/><g fill="${canopy}" stroke="#455b43" stroke-width="7"><ellipse cx="${x - 75}" cy="${top + 14}" rx="92" ry="70"/><ellipse cx="${x + 4}" cy="${top - 22}" rx="112" ry="83"/><ellipse cx="${x + 90}" cy="${top + 20}" rx="94" ry="72"/><ellipse cx="${x + 10}" cy="${top + 45}" rx="132" ry="73"/></g></g>`
}

function anchorProp(spawn) {
  const x = Math.round(spawn.x * W)
  const y = Math.round(spawn.y * H)
  if (spawn.anchor === 'tree' || spawn.anchor === 'birch') return ''
  if (spawn.anchor === 'log') {
    return `<g transform="rotate(-8 ${x} ${y + 34})" opacity=".1" filter="url(#hintSoft)"><path d="M${x - 112} ${y + 18} Q${x - 98} ${y - 1},${x - 73} ${y + 2} L${x + 98} ${y + 11} Q${x + 118} ${y + 31},${x + 96} ${y + 56} L${x - 93} ${y + 61} Q${x - 121} ${y + 45},${x - 112} ${y + 18}Z" fill="#5e5140"/><path d="M${x - 76} ${y + 22} q58 18 119 2" fill="none" stroke="#9a8968" stroke-width="6"/></g>`
  }
  if (spawn.anchor === 'stump' || spawn.anchor === 'roots') {
    return `<g opacity=".09" filter="url(#hintSoft)"><path d="M${x - 68} ${y + 78} Q${x - 39} ${y + 28},${x - 44} ${y - 45} Q${x} ${y - 68},${x + 50} ${y - 42} Q${x + 37} ${y + 27},${x + 76} ${y + 79}Z" fill="#655743"/><ellipse cx="${x + 2}" cy="${y - 43}" rx="48" ry="18" fill="#a08d69"/></g>`
  }
  if (spawn.anchor === 'mound' || spawn.anchor === 'soil') {
    return `<path d="M${x - 91} ${y + 53} Q${x - 46} ${y + 14},${x + 4} ${y + 23} Q${x + 55} ${y + 15},${x + 91} ${y + 55} Q${x} ${y + 72},${x - 91} ${y + 53}Z" fill="#74684f" opacity=".08" filter="url(#hintSoft)"/>`
  }
  const stroke = spawn.anchor === 'needles' ? '#53634b' : '#70805b'
  return `<g opacity=".08" stroke="${stroke}" stroke-width="4" stroke-linecap="round" filter="url(#hintSoft)"><path d="M${x - 58} ${y + 61} q18 -49 31 -78 M${x - 24} ${y + 65} q4 -55 12 -87 M${x + 12} ${y + 62} q-3 -54 17 -82 M${x + 43} ${y + 65} q-8 -42 21 -70"/></g>`
}

function backgroundMarkup(scene) {
  const s = styles[scene.environment]
  const random = rng(Array.from(scene.id).reduce((sum, char) => sum + char.charCodeAt(0), 0))
  const habitatPath = path.join(projectRoot, 'assets/exploration/habitats', `${referenceSceneId(scene)}.jpg`)
  const habitatSource = `data:image/jpeg;base64,${fs.readFileSync(habitatPath).toString('base64')}`
  let distantTrees = ''
  for (let i = 0; i < 11; i += 1) {
    const x = Math.round(-30 + i * 106 + random() * 44)
    const h = Math.round(280 + random() * 210)
    distantTrees += pine(x, 760 + Math.round(random() * 70), h, i % 2 ? s.far : s.mid, .52 + random() * .22)
  }
  let signature = ''
  if (s.kind === 'alpine') {
    signature = `<path d="M0 525 L170 190 L310 480 L505 105 L690 455 L860 235 L1035 520 L1035 760 L0 760Z" fill="#6d7f83" stroke="#52666a" stroke-width="10"/><path d="M420 250 L505 105 L584 260 L520 225 L480 278Z" fill="#e6e4d8" opacity=".9"/><path d="M0 620 Q250 515 510 675 T1035 610 L1035 1230 L0 1230Z" fill="#78975e"/>`
  } else if (s.kind === 'river') {
    signature = `${distantTrees}<path d="M430 610 C620 735 345 865 520 1230 L800 1230 C610 865 865 715 610 584Z" fill="#7395a0" stroke="#d8e3df" stroke-width="18" opacity=".92"/><path d="M0 770 Q220 690 440 760 L500 1230 L0 1230Z M1035 720 Q800 665 625 760 L780 1230 L1035 1230Z" fill="#8a7853"/>`
  } else if (s.kind === 'meadow' || s.kind === 'edge') {
    signature = `<path d="M0 600 Q240 510 500 625 T1035 570 L1035 1230 L0 1230Z" fill="${s.ground}"/>${s.kind === 'edge' ? broadleaf(690, 920, 720, '#60735a', .94) : `${birch(170, 760, 480, '#6e8d67', .72)}${broadleaf(820, 760, 460, '#6b805c', .72)}`}`
  } else if (s.kind === 'oak') {
    signature = `<path d="M0 595 Q250 510 520 620 T1035 560 L1035 1230 L0 1230Z" fill="${s.ground}"/>${broadleaf(140, 855, 650, '#67754e', .95)}${broadleaf(525, 790, 600, '#536747', .82)}${broadleaf(910, 850, 690, '#68764e', .95)}`
  } else if (s.kind === 'birch') {
    signature = `${distantTrees}${birch(150, 970, 810, '#637b59', .95)}${birch(840, 940, 780, '#59704f', .92)}<path d="M380 1230 Q500 780 625 1230Z" fill="#857762" opacity=".85"/>`
  } else {
    signature = `${distantTrees}${pine(85, 1020, 890, s.mid, .94)}${pine(930, 1040, 930, s.mid, .96)}<path d="M0 750 Q260 670 520 765 T1035 710 L1035 1230 L0 1230Z" fill="${s.ground}" opacity=".93"/>`
  }
  const anchors = scene.spawns.map((spawn) => anchorProp(spawn)).join('')
  let grass = ''
  for (let i = 0; i < 95; i += 1) {
    const x = Math.round(random() * W)
    const y = Math.round(760 + random() * 460)
    const len = Math.round(20 + random() * 76)
    const color = i % 3 === 0 ? s.light : i % 2 ? '#6f8351' : '#4d6844'
    grass += `<path d="M${x} ${y} q${Math.round((random() - .5) * 24)} -${len} ${Math.round((random() - .5) * 38)} -${len + 8}" stroke="${color}" stroke-width="${3 + Math.round(random() * 4)}" opacity="${(.25 + random() * .45).toFixed(2)}"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${s.sky}"/><stop offset="1" stop-color="${s.far}"/></linearGradient>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4ebd8" stop-opacity=".44"/><stop offset=".52" stop-color="${s.mid}" stop-opacity=".08"/><stop offset="1" stop-color="#183a31" stop-opacity=".3"/></linearGradient>
    <filter id="photoPaint"><feGaussianBlur stdDeviation="1.35"/><feColorMatrix type="saturate" values=".62"/><feComponentTransfer><feFuncR type="gamma" amplitude="1.05" exponent=".93" offset=".01"/><feFuncG type="gamma" amplitude="1.03" exponent=".95"/><feFuncB type="gamma" amplitude=".98" exponent="1.01"/></feComponentTransfer></filter>
    <filter id="hintSoft"><feGaussianBlur stdDeviation="3.4"/></filter>
    <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="3" seed="8"/><feColorMatrix values=".22 0 0 0 .72  0 .2 0 0 .68  0 0 .15 0 .58  0 0 0 .18 0"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <image href="${habitatSource}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" opacity=".94" filter="url(#photoPaint)"/>
  <rect width="${W}" height="${H}" fill="url(#wash)" opacity=".32"/>
  <path d="M0 590 Q210 470 430 575 T790 530 T1035 565 L1035 790 L0 790Z" fill="${s.far}" opacity=".055" filter="url(#hintSoft)"/>
  <g>${anchors}</g>
  <g fill="none" stroke-linecap="round" opacity=".16">${grass}</g>
  <rect width="${W}" height="${H}" filter="url(#paper)" opacity=".15"/>
</svg>`
}


function cardMarkup(scene) {
  const s = styles[scene.environment]
  const habitatPath = path.join(projectRoot, 'assets/exploration/habitats', `${referenceSceneId(scene)}.jpg`)
  const source = `data:image/jpeg;base64,${fs.readFileSync(habitatPath).toString('base64')}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1035" height="338" viewBox="0 0 1035 338">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f1ead8" stop-opacity=".18"/><stop offset="1" stop-color="${s.mid}" stop-opacity=".45"/></linearGradient>
    <filter id="paint"><feGaussianBlur stdDeviation="1.1"/><feColorMatrix type="saturate" values=".76"/><feComponentTransfer><feFuncR type="gamma" amplitude="1.03" exponent=".94"/><feFuncG type="gamma" amplitude="1.02" exponent=".96"/></feComponentTransfer></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="2" seed="11"/><feColorMatrix values=".2 0 0 0 .68  0 .18 0 0 .62  0 0 .14 0 .52  0 0 0 .12 0"/></filter>
  </defs>
  <rect width="1035" height="338" fill="${s.sky}"/>
  <image href="${source}" width="1035" height="338" preserveAspectRatio="xMidYMid slice" filter="url(#paint)"/>
  <rect width="1035" height="338" fill="url(#shade)"/>
  <rect width="1035" height="338" filter="url(#grain)" opacity=".2"/>
</svg>`
}
const speciesPalettes = {
  'amanita-caesareoides': ['#c7653f', '#9b573d', '#d6ad62'],
  'amanita-exitialis': ['#e9e5d8', '#bcbdb4', '#f5f1e6'],
  'amanita-muscaria': ['#b84d40', '#913d36', '#e8dfc9'],
  'amanita-pallidorosea': ['#ddcbc7', '#ad918d', '#ebe4d9'],
  'armillaria-gallica': ['#a98758', '#6f5b43', '#cbb382'],
  'coprinus-comatus': ['#ddd9ce', '#88857f', '#514b48'],
  'hericium-erinaceus': ['#e5dfcd', '#baaF91', '#f3ecd7'],
  'lepiota-brunneoincarnata': ['#a67e67', '#684d40', '#d8c8ae'],
  'ophiocordyceps-sinensis': ['#624b3c', '#343430', '#936f48'],
  'pleurotus-citrinopileatus': ['#c49b3f', '#ddc469', '#806a38'],
  'thelephora-ganbajun': ['#5b514a', '#7d6e64', '#ad9985'],
  'trametes-versicolor': ['#8d877d', '#58615c', '#c2b89f'],
  'tricholoma-matsutake': ['#8e7058', '#5b493e', '#cdbfa6']
}

function capMushrooms(id, count, colors) {
  const total = Math.max(1, Math.min(4, count || 1))
  let shapes = ''
  for (let i = 0; i < total; i += 1) {
    const x = 128 + (i - (total - 1) / 2) * 39
    const y = 115 + (i % 2) * 24 + Math.abs(i - (total - 1) / 2) * 5
    const scale = 1 - i * .06
    shapes += `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-10 92 Q-13 35 -7 2 Q0 -13 9 2 Q15 42 12 92Z" fill="${colors[2]}" stroke="${colors[1]}" stroke-width="7"/><path d="M-62 12 Q-43 -48 0 -55 Q45 -49 64 12 Q30 27 0 24 Q-32 28 -62 12Z" fill="${colors[0]}" stroke="${colors[1]}" stroke-width="8"/><path d="M-48 7 Q0 -8 50 8" fill="none" stroke="#f5e6c8" stroke-width="5" opacity=".45"/></g>`
  }
  if (id === 'amanita-muscaria') shapes += `<g fill="#f5edda">${[-45,-19,8,36].map((x, i) => `<circle cx="${128 + x}" cy="${61 + (i % 2) * 13}" r="${5 + i % 3}"/>`).join('')}</g>`
  if (id === 'amanita-exitialis' || id === 'amanita-pallidorosea' || id === 'amanita-caesareoides') shapes += `<path d="M94 219 Q128 197 164 219 Q151 242 128 244 Q105 241 94 219Z" fill="#eee8d7" stroke="${colors[1]}" stroke-width="6"/>`
  return shapes
}

function shelfFans(colors, count, hanging = false) {
  const total = Math.max(2, Math.min(6, count || 3))
  let shapes = ''
  for (let i = 0; i < total; i += 1) {
    const row = Math.floor(i / 3)
    const x = 75 + (i % 3) * 54 + row * 20
    const y = 91 + row * 52
    shapes += `<path d="M${x - 38} ${y + 15} Q${x} ${y - 34} ${x + 42} ${y + 14} Q${x + 5} ${y + 46} ${x - 38} ${y + 15}Z" fill="${i % 2 ? colors[1] : colors[0]}" stroke="${colors[2]}" stroke-width="7"/><path d="M${x - 25} ${y + 14} Q${x} ${y - 12} ${x + 29} ${y + 14}" fill="none" stroke="#f3e4bd" stroke-width="5" opacity=".65"/>`
  }
  return shapes
}

function speciesShapes(id, count) {
  const colors = speciesPalettes[id] || ['#a98b63', '#66513f', '#dec9a0']
  if (id === 'armillaria-gallica') return capMushrooms(id, count || 3, colors)
  if (id.startsWith('amanita-') || id === 'tricholoma-matsutake') return capMushrooms(id, count, colors)
  if (id === 'pleurotus-citrinopileatus') return shelfFans(colors, count || 4, true)
  if (id === 'trametes-versicolor') return shelfFans(colors, count || 4, true)
  if (id === 'coprinus-comatus') {
    const total = Math.max(2, Math.min(4, count || 2)); let shapes = ''
    for (let i = 0; i < total; i += 1) { const x = 85 + i * 39; const h = 82 + (i % 2) * 30; shapes += `<path d="M${x - 7} 222 L${x - 4} ${188 - h / 4} L${x + 7} ${188 - h / 4} L${x + 9} 222Z" fill="#ece7d8" stroke="#706b64" stroke-width="5"/><path d="M${x - 27} ${183 - h} Q${x} ${123 - h} ${x + 28} ${183 - h} L${x + 22} ${193 - h / 3} Q${x} ${210 - h / 3} ${x - 21} ${193 - h / 3}Z" fill="${colors[0]}" stroke="${colors[2]}" stroke-width="7"/><path d="M${x - 17} ${174 - h} l11 13 m8 -20 l9 16 m8 -4 l8 13" stroke="#fff8e7" stroke-width="5"/>` }
    return shapes
  }
  if (id === 'hericium-erinaceus') return `<path d="M55 90 Q70 46 112 55 Q145 30 172 65 Q217 67 213 112 Q229 151 191 173 Q170 213 126 194 Q86 217 61 179 Q23 151 49 119Z" fill="${colors[0]}" stroke="${colors[1]}" stroke-width="9"/>${Array.from({ length: 22 }, (_, i) => { const x = 63 + (i % 7) * 22; const y = 100 + Math.floor(i / 7) * 28; return `<path d="M${x} ${y} q${i % 2 ? 5 : -5} 31 0 52" stroke="${colors[2]}" stroke-width="7" stroke-linecap="round"/>` }).join('')}`
  if (id === 'lepiota-brunneoincarnata') return `${capMushrooms(id, count, colors)}<g fill="${colors[1]}" opacity=".8">${Array.from({ length: 14 }, (_, i) => `<circle cx="${78 + (i % 7) * 17}" cy="${62 + Math.floor(i / 7) * 17}" r="4"/>`).join('')}</g>`
  if (id === 'ophiocordyceps-sinensis') return `${[92,126,163].map((x, i) => `<path d="M${x} 216 Q${x - 18 + i * 8} ${146 - i * 12},${x + (i - 1) * 8} ${56 + i * 8}" fill="none" stroke="${i === 1 ? colors[0] : colors[1]}" stroke-width="${11 - i}" stroke-linecap="round"/><ellipse cx="${x + (i - 1) * 8}" cy="${55 + i * 8}" rx="8" ry="16" fill="${colors[1]}"/>`).join('')}`
  if (id === 'thelephora-ganbajun') return `<g fill="none" stroke-linecap="round">${Array.from({ length: 18 }, (_, i) => { const x = 58 + (i % 7) * 24; const top = 43 + (i % 4) * 17; return `<path d="M128 221 Q${x + (i % 2 ? 28 : -20)} 150 ${x} ${top} M${x} ${top + 45} l${i % 2 ? 20 : -18} -28" stroke="${colors[i % 3]}" stroke-width="${9 + i % 4}"/>` }).join('')}</g>`
  return capMushrooms(id, count, colors)
}

function targetMarkup(spawn) {
  const hash = Array.from(spawn.id).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0)
  const angle = (hash % 13) - 6
  const scale = (.92 + (hash % 9) * .015).toFixed(3)
  const flip = hash % 2 ? -1 : 1
  const dx = (hash % 11) - 5
  const dy = (Math.floor(hash / 7) % 7) - 3
  const shapes = speciesShapes(spawn.speciesId, spawn.count)
    .replace(/stroke-width="(\d+)"/g, (_, width) => `stroke-width="${Math.max(2, Math.round(Number(width) * .55))}"`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <filter id="soft" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="3" seed="${hash % 97}" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" result="wobbled"/>
      <feGaussianBlur in="wobbled" stdDeviation=".38" result="painted"/>
      <feColorMatrix in="painted" type="saturate" values=".78"/>
      <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#263c32" flood-opacity=".16"/>
    </filter>
  </defs>
  <g transform="translate(${128 + dx} ${138 + dy}) rotate(${angle}) scale(${flip * Number(scale)} ${scale}) translate(-128 -138)" filter="url(#soft)" stroke-linejoin="round" opacity=".88">${shapes}</g>
</svg>`
}

function renderSvg(svg, outputPath, format, width, height) {
  const tempPath = path.join(tempRoot, `${path.basename(outputPath)}.svg`)
  fs.writeFileSync(tempPath, svg)
  const args = ['-z', String(height), String(width), '-s', 'format', format]
  if (format === 'jpeg') args.push('-s', 'formatOptions', '88')
  args.push(tempPath, '--out', outputPath)
  execFileSync('sips', args, { stdio: 'ignore' })
}

fs.mkdirSync(sceneRoot, { recursive: true })
fs.mkdirSync(cardRoot, { recursive: true })
fs.mkdirSync(targetRoot, { recursive: true })
for (const scene of SCENES) {
  const sceneOutput = path.join(sceneRoot, `${scene.id}.jpg`)
  const cardOutput = path.join(cardRoot, `${scene.id}.jpg`)
  renderSvg(backgroundMarkup(scene), sceneOutput, 'jpeg', W, H)
  renderSvg(cardMarkup(scene), cardOutput, 'jpeg', 1035, 338)
  for (const spawn of scene.spawns) {
    renderSvg(targetMarkup(spawn), path.join(targetRoot, `${spawn.id}.png`), 'png', 256, 256)
  }
  console.log(`generated ${path.relative(projectRoot, sceneOutput)}, card + ${scene.spawns.length} targets`)
}
fs.rmSync(tempRoot, { recursive: true, force: true })

const habitatAttribution = JSON.parse(fs.readFileSync(path.join(projectRoot, 'assets/exploration/HABITAT_ATTRIBUTION.json'), 'utf8'))
const habitatByScene = Object.fromEntries(habitatAttribution.map((item) => [item.sceneId, item]))
const manifest = {
  generatedBy: 'scripts/generate-scene-illustrations.mjs',
  generationMethod: 'Local SVG naturalist-wash treatment using a CC0 habitat-photo underpainting, soft-focus desaturation, paper grain and subtle local substrate washes; rasterized by macOS sips.',
  sceneIllustrations: SCENES.map((scene) => {
    const reference = habitatByScene[referenceSceneId(scene)]
    return {
      sceneId: scene.id,
      localPath: path.relative(projectRoot, path.join(sceneRoot, `${scene.id}.jpg`)),
      cardPath: path.relative(projectRoot, path.join(cardRoot, `${scene.id}.jpg`)),
      referencePhoto: reference?.localPath || scene.background,
      referenceSource: reference?.source || '',
      referenceCreator: reference?.creator || '',
      referenceLicense: reference?.license || '',
      usageBoundary: 'Stylized representative habitat; not a photographed mushroom site or collection location.'
    }
  }),
  targetIllustrations: SCENES.flatMap((scene) => scene.spawns.map((spawn) => ({
    sceneId: scene.id,
    spawnId: spawn.id,
    speciesId: spawn.speciesId,
    localPath: path.relative(projectRoot, path.join(targetRoot, `${spawn.id}.png`)),
    method: 'Project-generated schematic morphology illustration; no pixels copied from species reference photos.',
    usageBoundary: 'Game target only; not sufficient for real-world identification, toxicity or edibility decisions.'
  })))
}
fs.writeFileSync(path.join(outputRoot, 'MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`)
