export class SimulationClock {
  constructor({stepMs=1000/60,maxFrameMs=250}={}){
    this.stepMs=stepMs;this.maxFrameMs=maxFrameMs;this.discardedMs=0;this.reset()
  }
  reset(){this.last=null;this.accumulator=0}
  advance(now,step){
    if(!Number.isFinite(now)){this.reset();return 0}
    if(this.last===null){this.last=now;return 0}
    const elapsed=Math.max(0,now-this.last);this.last=now
    this.discardedMs+=Math.max(0,elapsed-this.maxFrameMs)
    this.accumulator+=Math.min(elapsed,this.maxFrameMs)
    let count=0
    while(this.accumulator+1e-7>=this.stepMs){
      this.accumulator=Math.max(0,this.accumulator-this.stepMs);count++
      if(step(this.stepMs/1000,this.stepMs)===false){this.accumulator=0;break}
    }
    return count
  }
}
