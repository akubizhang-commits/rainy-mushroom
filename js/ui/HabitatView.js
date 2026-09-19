import { SPECIES_BY_ID, ECO_REGION_BY_ID } from '../data/explorationData.js'

export function habitatGeometry(width, height, cameraX = .12, cropTop = 0) {
  const worldWidth = Math.max(width, height * 1.5 / (1 - cropTop))
  const travel = worldWidth - width
  return { width, height, worldWidth, travel, cropTop, left: -travel * Math.max(0, Math.min(1, cameraX)) }
}

export function targetGeometry(spawn, view) {
  const size = view.height * spawn.size
  const x = view.left + (view.photographicFallback ? spawn.photoX : spawn.x) * view.worldWidth
  const baseY = (view.photographicFallback ? (spawn.photoY - view.cropTop) / (1 - view.cropTop) : spawn.y) * view.height
  return { x, baseY, y: baseY - size * .40, size, radius: Math.max(22 / (view.pixelScale || 1), size * .6) }
}

function isAvailable(spawn, run) {
  return !run.basketSpawnIds.includes(spawn.id) && !run.eatenSpawnIds.includes(spawn.id)
}

function spriteVisible(renderer, spawn) {
  const natural = renderer.imageStore.get(spawn.naturalSprite)
  if (natural.status === 'ready') return true
  if (natural.status !== 'error') return false
  // A failed illustration has a programmatic fallback. A loading one has not.
  return renderer.imageStore.get(spawn.illustration).status !== 'loading'
}

function photoRecord(renderer, scene) {
  if (scene.habitat.hasGeneratedArt) {
    const natural = renderer.imageStore.get(scene.habitat.panorama)
    if (natural.status === 'ready') return natural
  }
  return renderer.imageStore.get(scene.habitat.fallbackPhoto)
}

function drawBackground(ctx, record, view) {
  const image = record.image
  const iw = image.width || 861
  const ih = image.height || 574
  ctx.drawImage(image, 0, ih * view.cropTop, iw, ih * (1 - view.cropTop), view.left, 0, view.worldWidth, view.height)
}

// Repaint a small irregular part of the actual habitat OVER the sprite.
// The foreground and background therefore retain exactly the same texture,
// light and camera transform; nothing is baked into the collectible layer.
function foreground(renderer, spawn, target, view, record) {
  if (record?.status !== 'ready') return
  const ctx = renderer.ctx
  const { x, baseY: y, size: s } = target
  ctx.save()
  ctx.beginPath()
  if (spawn.cover === 'tree-behind' || spawn.cover === 'bark') {
    ctx.moveTo(x + s * .18, y - s * 1.1)
    ctx.lineTo(x + s * .48, y - s * 1.1)
    ctx.lineTo(x + s * .48, y + s * .12)
    ctx.lineTo(x + s * .12, y + s * .12)
  } else {
    ctx.moveTo(x - s * .65, y + s * .15)
    for (let i = 0; i <= 12; i += 1) {
      const depth = spawn.visibility === 'veryHidden' ? .34 : .20
      const tooth = ((i * 7 + spawn.id.length) % 5) / 5
      ctx.lineTo(x + (i / 12 - .5) * s * 1.3, y - s * (depth + tooth * .13))
    }
    ctx.lineTo(x + s * .65, y + s * .15)
  }
  ctx.closePath()
  ctx.clip()
  drawBackground(ctx, record, view)
  ctx.restore()
}

function drawWorld(renderer, scene, run, view, record, interactive = true) {
  const ctx = renderer.ctx
  if (record?.status === 'ready') {
    drawBackground(ctx, record, view)
  } else {
    ctx.fillStyle = '#263f31'
    ctx.fillRect(0, 0, view.width, view.height)
  }
  if (!run.huntStarted) return
  scene.spawns.forEach((spawn) => {
    if (!isAvailable(spawn, run)) return
    const target = targetGeometry(spawn, view)
    const { x, baseY, size, y, radius } = target
    if (x + size < 0 || x - size > view.width) return
    const sprite = renderer.imageStore.get(spawn.naturalSprite)
    ctx.save()
    ctx.globalAlpha = .22
    ctx.fillStyle = '#10190e'
    ctx.beginPath()
    ctx.ellipse(x, baseY - size * .06, size * .38, size * .09, -.12, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    if (sprite.status === 'ready') {
      const image = sprite.image
      const aspect = (image.width || 256) / (image.height || 256)
      ctx.save()
      ctx.globalAlpha = spawn.visibility === 'veryHidden' ? .85 : .94
      ctx.drawImage(image, x - size * aspect / 2, baseY - size, size * aspect, size)
      ctx.restore()
    } else if (sprite.status === 'error') {
      renderer._drawSceneFungusIllustration(spawn, SPECIES_BY_ID[spawn.speciesId], x, baseY - size * .25, size * .62)
    }
    foreground(renderer, spawn, target, view, record)
    // Found markers communicate progress, never reveal names or risk answers.
    if (run.foundSpawnIds.includes(spawn.id)) {
      ctx.strokeStyle = run.markedRiskSpawnIds.includes(spawn.id) ? '#edbd80' : '#efe9d2'
      ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.arc(x, y, size * .62, 0, Math.PI * 2); ctx.stroke()
    }
    if (interactive && record?.status === 'ready' && spriteVisible(renderer, spawn) && x >= radius && x <= view.width - radius) {
      renderer._hitCircle(x, y, radius, `fungus:${spawn.id}`)
    }
  })
}

export function fungusAt(renderer, point, scene, run) {
  if (!run?.huntStarted || run.completed || !renderer.sceneBounds) return null
  const x = (point.x - renderer.offsetX) / renderer.scale
  const y = point.y / renderer.scale
  if (x < 0 || x > 375 || y < 0 || y > renderer.logicalHeight) return null
  if (renderer.habitatControls?.some((area) =>
    x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h)) return null
  const view = habitatGeometry(375, renderer.logicalHeight, run.cameraX, renderer.habitatView?.cropTop || 0)
  view.pixelScale = renderer.scale
  view.photographicFallback = renderer.habitatView?.photographicFallback
  if (photoRecord(renderer, scene)?.status !== 'ready') return null
  const hit = scene.spawns.filter((spawn) => isAvailable(spawn, run) && spriteVisible(renderer, spawn))
    .map((spawn) => {
      const target = targetGeometry(spawn, view)
      return { spawn, distance: Math.hypot(x - target.x, y - target.y), radius: target.radius }
    })
    .filter((hit) => hit.distance <= hit.radius)
    .sort((a, b) => a.distance - b.distance)[0]
  return hit ? `fungus:${hit.spawn.id}` : null
}

export function drawHabitat(renderer, { state }) {
  const scene = state.sceneData
  const run = state.currentRun
  const ctx = renderer.ctx
  const width = 375
  const height = renderer.logicalHeight
  const record = photoRecord(renderer, scene)
  const photographicFallback = !scene.habitat.hasGeneratedArt || renderer.imageStore.get(scene.habitat.panorama).status !== 'ready'
  const view = habitatGeometry(width, height, run.cameraX, photographicFallback ? scene.habitat.fallbackCropTop : 0)
  view.pixelScale = renderer.scale
  renderer.sceneBounds = { x: 0, y: 0, w: renderer.canvas.width, h: renderer.canvas.height }
  renderer.habitatView = view
  renderer.habitatControls = []
  view.photographicFallback = photographicFallback
  drawWorld(renderer, scene, run, view, record)

  // Zoom is optional and shows the same world layers, including occlusion.
  // Its centre sits above the finger so a finger never conceals the detail.
  if (run.lensEnabled && run.lensActive) {
    const fx = run.lensFocus.x * width
    const fy = run.lensFocus.y * height
    const radius = 68
    const cx = Math.max(radius + 8, Math.min(width - radius - 8, fx))
    const cy = Math.max(renderer.top + 118, Math.min(height - 144, fy - 104))
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip()
    ctx.translate(cx - fx * 2, cy - fy * 2)
    // setTransform would discard the phone scale, so keep zoom local.
    ctx.transform(2, 0, 0, 2, 0, 0)
    drawWorld(renderer, scene, run, view, record, false)
    ctx.restore()
    ctx.strokeStyle = '#efe9d2'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke()
    renderer.lensBounds = { cx: cx * renderer.scale, cy: cy * renderer.scale, r: radius * renderer.scale }
  }

  // A light scrim preserves the photograph; no opaque header/footer bands.
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, 'rgba(9,24,17,.52)')
  gradient.addColorStop(.23, 'rgba(9,24,17,0)')
  gradient.addColorStop(.78, 'rgba(9,24,17,0)')
  gradient.addColorStop(1, run.huntStarted && run.hasPanned ? 'rgba(9,24,17,.18)' : 'rgba(9,24,17,.40)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  const hud = (x, y, w, label, action, selected = false) => {
    const fill = selected ? 'rgba(218,232,190,.96)' : 'rgba(17,35,25,.78)'
    renderer._roundedPath(x, y, w, 44, 16); ctx.fillStyle = fill; ctx.fill()
    renderer._label(label, x + w / 2, y + 27, 11, selected ? '#213e28' : '#fff8e7', 650, 'center')
    const minimum = 44 / renderer.scale
    const hitWidth = Math.max(w, minimum)
    const hitHeight = Math.max(44, minimum)
    const hitX = x - (hitWidth - w) / 2
    const hitY = y - (hitHeight - 44) / 2
    renderer._hit(hitX, hitY, hitWidth, hitHeight, action)
    renderer.habitatControls.push({ x: hitX, y: hitY, w: hitWidth, h: hitHeight })
  }
  const top = renderer.top + 6
  hud(12, top, 44, '返回', 'nav:scenes')
  renderer._roundedPath(62, top, 207, 44, 14); ctx.fillStyle = 'rgba(17,35,25,.64)'; ctx.fill()
  renderer._label(ECO_REGION_BY_ID[scene.regionId].name, 70, top + 15, 9, '#e4e6d6', 550)
  renderer._label(scene.name, 70, top + 35, 16, '#fff8e7', 750)
  // Reserve the title too: dragging it should not accidentally move the world.
  renderer.habitatControls.push({ x: 62, y: top, w: 207, h: 44 })
  if (!run.huntStarted) {
    ctx.fillStyle = 'rgba(9,24,17,.20)'; ctx.fillRect(0, 0, width, height)
    const y = Math.max(top + 100, height * .42)
    renderer._label(scene.habitat.title, 26, y, 30, '#fff8e7', 750)
    renderer._wrappedText(scene.habitat.atmosphere, 28, y + 32, 314, 22, 13, '#f2efdc', 2)
    renderer._label('左右拖动探索 · 发现菌物直接轻点', 28, y + 91, 12, '#f2efdc', 600)
    renderer._label('放大镜可辅助观察，无需开镜也能找到', 28, y + 115, 10, '#dfdfcf', 500)
    const bottom = height - 142
    hud(20, bottom, 335, '悠闲观察 · 慢慢寻找', 'hunt:relaxed', true)
    hud(20, bottom + 54, 335, '90秒挑战 · 与动物争夺时间', 'hunt:timed')
    renderer._label('仅为游戏场景，不作现实采食依据', 187.5, height - 16, 8, '#f2eada', 500, 'center')
    return
  }
  const goal = scene.goalType === 'observe' ? '记录' : '入篮'
  renderer._roundedPath(282, top, 81, 44, 14); ctx.fillStyle = 'rgba(17,35,25,.64)'; ctx.fill()
  const goalReached = state.canFinish()
  renderer._label(goalReached ? '提交调查 ›' : `${goal} ${state.goalProgress}/${state.goalTarget} ›`, 358, top + 16, 11, '#fff8e7', 750, 'right')
  renderer._label(run.huntMode === 'relaxed' ? '悠闲' : `${Math.ceil(run.timeRemainingMs / 1000)}秒`, 358, top + 35, 12,
    run.huntMode === 'timed' && run.timeRemainingMs <= 20000 ? '#ffd28c' : '#f2efdc', 650, 'right')
  renderer.habitatControls.push({ x: 282, y: top, w: 81, h: 44 })
  // Keep the existing progress indicator useful after removing bottom actions.
  renderer._hit(282, top, 81, 44, goalReached ? 'finish:scene' : 'nav:basket')

  const iconX = 341
  const iconY = top + 78
  ctx.save()
  ctx.fillStyle = run.lensEnabled ? 'rgba(218,232,190,.96)' : 'rgba(17,35,25,.64)'
  ctx.beginPath(); ctx.arc(iconX, iconY, 22, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = run.lensEnabled ? '#213e28' : '#fff8e7'
  ctx.lineWidth = 2.3
  ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(iconX - 3, iconY - 3, 8.5, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(iconX + 3, iconY + 3); ctx.lineTo(iconX + 11, iconY + 11); ctx.stroke()
  ctx.restore()
  const hitRadius = Math.max(22, 22 / renderer.scale)
  renderer._hitCircle(iconX, iconY, hitRadius, 'lens:toggle')
  renderer.habitatControls.push({ x: iconX - hitRadius, y: iconY - hitRadius, w: hitRadius * 2, h: hitRadius * 2 })

  // The first horizontal exploration gesture dismisses the whole hint, including
  // its track, for this run. Opening a specimen or toggling the lens won't reset it.
  if (!run.hasPanned) {
    const trackY = height - 57
    ctx.fillStyle = 'rgba(255,248,226,.25)'; ctx.fillRect(125, trackY, 125, 2)
    const thumb = Math.max(16, 125 * width / view.worldWidth)
    ctx.fillStyle = '#f0e9cd'; ctx.fillRect(125 + run.cameraX * (125 - thumb), trackY - 1, thumb, 4)
    renderer._label('左右拖动寻觅，轻点菌物观察', 187.5, height - 33, 10, '#fff3db', 550, 'center')
  }
  renderer._label('不作现实采食依据', 187.5, height - 9, 7.5, '#eee5cf', 500, 'center')
}
