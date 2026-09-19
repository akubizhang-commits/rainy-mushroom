export class InputManager {
  constructor(canvas, getHitAreas, onAction, platformApi = null, onPointer = null) {
    this.canvas = canvas
    this.getHitAreas = getHitAreas
    this.onAction = onAction
    this.onPointer = typeof onPointer === 'function' ? onPointer : null
    this.start = null
    this.lastPoint = null
    this.lastActionAt = 0
    this.lastAction = null
    this.pressedAction = null

    if (platformApi && typeof platformApi.onTouchStart === 'function') {
      platformApi.onTouchStart((event) => this._onStart(event))
      if (typeof platformApi.onTouchMove === 'function') platformApi.onTouchMove((event) => this._onMove(event))
      platformApi.onTouchEnd((event) => this._onEnd(event))
      if (typeof platformApi.onTouchCancel === 'function') platformApi.onTouchCancel((event) => this._onCancel(event))
    } else if (canvas && typeof canvas.addEventListener === 'function') {
      canvas.addEventListener('touchstart', (event) => this._onStart(event))
      canvas.addEventListener('touchmove', (event) => this._onMove(event))
      canvas.addEventListener('touchend', (event) => this._onEnd(event))
      canvas.addEventListener('touchcancel', (event) => this._onCancel(event))
    } else {
      throw new Error('No supported touch input API is available')
    }
  }

  _onStart(event) {
    const point = this._point(event?.touches?.[0])
    if (!point) return
    this.start = { ...point, time: Date.now(), action: this._findHit(point)?.action, moved: false }
    this.lastPoint = point
    this._setPressed(this.start.action)
    this._emitPointer('start', point)
  }

  _onMove(event) {
    if (!this.start) return
    const point = this._point(event?.touches?.[0])
    if (!point) return
    this.lastPoint = point
    if (Math.hypot(point.x-this.start.x,point.y-this.start.y)>18) this.start.moved=true
    this._setPressed(!this.start.moved&&this._findHit(point)?.action===this.start.action?this.start.action:null)
    this._emitPointer('move', point)
    if (typeof event?.preventDefault === 'function') event.preventDefault()
  }

  _onEnd(event) {
    if (!this.start) return
    const point = this._point(event?.changedTouches?.[0]) || this.lastPoint || this.start
    const start = this.start
    const distance = Math.hypot(point.x - start.x, point.y - start.y)
    const duration = Date.now() - start.time
    const hit = this._findHit(point)
    const fungusRelease = Boolean(hit?.action?.startsWith('fungus:'))
    const validTap = !start.moved && distance <= 18 && duration <= 900 && hit?.action === start.action
    const pointerResult = this._emitPointer('end', point)
    const fungusHandled = fungusRelease && pointerResult?.consumeFungus === true
    this._setPressed(null)
    if (!pointerResult?.consumeAction && !fungusHandled && (validTap || fungusRelease) && hit && (hit.action!==this.lastAction || Date.now() - this.lastActionAt >= 120)) {
      this.lastActionAt = Date.now()
      this.lastAction = hit.action
      this.onAction(hit.action)
    }
    this.start = null
    this.lastPoint = null
  }

  _onCancel(event) {
    this._setPressed(null)
    if (!this.start) return
    const point = this._point(event?.changedTouches?.[0]) || this.lastPoint || this.start
    this._emitPointer('cancel', point)
    this.start = null
    this.lastPoint = null
  }

  _findHit(point) {
    const areas = this.getHitAreas()
      .slice()
      .reverse()
    const direct = areas.find((area) => {
        const width = area.w ?? area.width
        const height = area.h ?? area.height
        const insideBounds = Number.isFinite(width) && Number.isFinite(height)
          && point.x >= area.x && point.x <= area.x + width
          && point.y >= area.y && point.y <= area.y + height
        if (!insideBounds) return false
        if (area.shape !== 'circle') return true
        const centerX = Number.isFinite(area.cx) ? area.cx : area.x + width / 2
        const centerY = Number.isFinite(area.cy) ? area.cy : area.y + height / 2
        const radius = Number.isFinite(area.r) ? area.r : Math.min(width, height) / 2
        return Math.hypot(point.x - centerX, point.y - centerY) <= radius
      })
    if (direct) return direct
    // A visual target always wins. In the gaps, use the nearest small button,
    // with a 44px touch envelope, without making one button swallow another.
    return areas.filter(area=>area.touchTarget).map(area=>{
      const w=area.w??area.width,h=area.h??area.height,cx=area.x+w/2,cy=area.y+h/2
      return {area,cx,cy,w:Math.max(44,w),h:Math.max(44,h),distance:Math.hypot(point.x-cx,point.y-cy)}
    }).filter(a=>Math.abs(point.x-a.cx)<=a.w/2&&Math.abs(point.y-a.cy)<=a.h/2)
      .sort((a,b)=>a.distance-b.distance)[0]?.area
  }

  _setPressed(action) {
    action=action||null
    if(this.pressedAction===action)return
    this.pressedAction=action
    this.onPressChange?.(action)
  }

  _emitPointer(type, point) {
    return this.onPointer ? this.onPointer({ type, x: point.x, y: point.y }) : null
  }

  _point(touch) {
    if (!touch) return null
    const x = touch.clientX ?? touch.pageX ?? touch.x
    const y = touch.clientY ?? touch.pageY ?? touch.y
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  }
}
