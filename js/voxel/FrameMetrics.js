export const cpuNow=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now()

export class FrameMetrics {
  constructor(size=180){this.samples=new Float32Array(size);this.count=0;this.cursor=0;this.last=null;this.frameMs=0}
  record(timestamp,cpuMs){
    this.samples[this.cursor]=Math.max(0,cpuMs);this.cursor=(this.cursor+1)%this.samples.length
    this.count=Math.min(this.count+1,this.samples.length)
    if(this.last!==null)this.frameMs=Math.max(0,timestamp-this.last)
    this.last=timestamp
  }
  snapshot(){
    const sorted=Array.from(this.samples.subarray(0,this.count)).sort((a,b)=>a-b)
    const percentile=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]||0
    return {cpuP50Ms:percentile(.5),cpuP95Ms:percentile(.95),lastFrameMs:this.frameMs,samples:this.count}
  }
}
