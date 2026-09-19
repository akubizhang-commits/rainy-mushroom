import { clamp } from './math.js'

export class VoxelInput {
  constructor(game) { this.game=game; this.reset() }
  reset() { this.touches=new Map(); this.keys=new Set(); this.stick=null;this.game.input?._setPressed?.(null) }
  setKey(key,pressed) { if(pressed) this.keys.add(key.toLowerCase()); else this.keys.delete(key.toLowerCase()) }
  wantsSprint(){return this.keys.has('shift')||Math.hypot(this.stick?.dx||0,this.stick?.dy||0)>.88}
  axes() {
    const dead=Math.hypot(this.stick?.dx||0,this.stick?.dy||0)<.12
    return [(dead?0:this.stick?.dx || 0)+(this.keys.has('d')?1:0)-(this.keys.has('a')?1:0),
      -(dead?0:this.stick?.dy || 0)+(this.keys.has('w')?1:0)-(this.keys.has('s')?1:0)]
  }
  event(type,event) {
    if(type==='cancel') { this.reset(); return }
    const game=this.game, width=game.visibleCanvas.width, height=game.visibleCanvas.height
    const points=event.changedTouches || event.touches || []
    for(const touch of points) {
      const id=touch.identifier ?? 0, x=touch.clientX ?? touch.x, y=touch.clientY ?? touch.y
      if(!Number.isFinite(x) || !Number.isFinite(y)) continue
      if(type==='start') {
        if(this.touches.has(id)) continue
        const hit=game.input._findHit({x,y})
        const joystick=!hit && !this.stick && Math.hypot(x-width*71/375,y-height*.83)<width*62/375
        const item={x,y,startX:x,startY:y,moved:false,hit,joystick}
        this.touches.set(id,item)
        if(hit)game.input._setPressed?.(hit.action)
        if(joystick) this.stick={id,dx:0,dy:0,x,y}
      } else {
        const item=this.touches.get(id)
        if(!item) continue
        if(Math.hypot(x-item.startX,y-item.startY)>8) item.moved=true
        if(item.hit&&item.moved)game.input._setPressed?.(null)
        if(type==='move') {
          if(item.joystick) {
            const radius=width/375*45, dx=(x-item.startX)/radius,dy=(y-item.startY)/radius
            const length=Math.max(1,Math.hypot(dx,dy))
            this.stick={id,dx:dx/length,dy:dy/length,x:item.startX,y:item.startY}
          } else if(!item.hit && item.moved) {
            game.player.yaw+=(x-item.x)/width*2.5
            game.player.pitch=clamp(game.player.pitch-(y-item.y)/width*2,-1.15,.65)
          }
          if(item.moved && !item.hit) game.dismissHint()
          item.x=x; item.y=y
        } else if(type==='end') {
          this.touches.delete(id)
          if(item.hit)game.input._setPressed?.(null)
          if(item.joystick) this.stick=null
          else if(!item.moved) {
            if(item.hit && game.input._findHit({x,y})?.action===item.hit.action) game.handleAction(item.hit.action)
            else if(!item.hit) game.inspectAt(x,y)
          }
        }
      }
    }
  }
}
