// 简易可复现 PRNG（mulberry32）
function mulberry32(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TYPE_WEIGHTS = [
  ['mushroom', 0.50],
  ['campfire', 0.25],
  ['animal',   0.15],
  ['danger',   0.10]
]

function pickType(rng) {
  const r = rng()
  let acc = 0
  for (const [t, w] of TYPE_WEIGHTS) {
    acc += w
    if (r <= acc) return t
  }
  return 'mushroom'
}

/**
 * @typedef {Object} RouteNode
 * @property {string} id
 * @property {number} layer
 * @property {number} col
 * @property {'mushroom'|'animal'|'campfire'|'danger'} type
 * @property {string[]} nextIds
 */

/**
 * @typedef {Object} Route
 * @property {RouteNode[]} nodes
 * @property {string} startId
 */

/**
 * Generate a deterministic route based on seed.
 * @param {number} seed - Random seed for reproducibility
 * @returns {Route} Route with 4 layers, 2-3 nodes per layer
 */
export function generateRoute(seed) {
  const rng = mulberry32(seed)
  const nodes = []
  const layerNodes = { 0: [] }

  const startId = 'n0'
  nodes.push({ id: startId, layer: 0, col: 0, type: 'campfire', nextIds: [] })
  layerNodes[0].push(startId)

  let idCounter = 1
  for (let layer = 1; layer <= 4; layer++) {
    const count = 2 + Math.floor(rng() * 2) // 2 or 3
    layerNodes[layer] = []
    for (let c = 0; c < count; c++) {
      const id = `n${idCounter++}`
      // 强制 layer=1 首节点为 mushroom，让首个节点体验一致
      const type = layer === 1 && c === 0 ? 'mushroom' : pickType(rng)
      nodes.push({ id, layer, col: c, type, nextIds: [] })
      layerNodes[layer].push(id)
    }
  }

  // 起点连所有 layer 1
  const startNode = nodes[0]
  startNode.nextIds = [...layerNodes[1]]

  // 每层节点连到下层邻近 1-2 个
  for (let layer = 1; layer <= 3; layer++) {
    for (const nodeId of layerNodes[layer]) {
      const node = nodes.find(n => n.id === nodeId)
      const next = layerNodes[layer + 1]
      const idx = Math.min(node.col, next.length - 1)
      const targets = [next[idx]]
      if (idx + 1 < next.length && rng() < 0.6) targets.push(next[idx + 1])
      node.nextIds = targets
    }
  }

  return { nodes, startId }
}
