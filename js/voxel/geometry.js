export function rgb(hex) {
  const number = Number.parseInt(hex.replace('#',''),16)
  return [(number >> 16 & 255)/255, (number >> 8 & 255)/255, (number & 255)/255]
}

const faces = [
  { n:[1,0,0], v:[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]] },
  { n:[-1,0,0], v:[[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]] },
  { n:[0,1,0], v:[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]] },
  { n:[0,-1,0], v:[[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]] },
  { n:[0,0,1], v:[[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,1]] },
  { n:[0,0,-1], v:[[-1,-1,-1],[-1,1,-1],[1,1,-1],[1,-1,-1]] }
]

export class MeshBuilder {
  constructor() { this.vertices = []; this.boxes = [] }

  surface(triangles,color) {
    const c=typeof color==='string'?rgb(color):color
    const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity],triangles}
    for(const [a,b,d] of triangles) {
      const u=b.map((v,i)=>v-a[i]),v=d.map((value,i)=>value-a[i])
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
      const length=Math.hypot(...n)||1
      for(const p of [a,b,d]) {
        this.vertices.push(...p,...n.map(value=>value/length),...c)
        for(let i=0;i<3;i++){bounds.min[i]=Math.min(bounds.min[i],p[i]);bounds.max[i]=Math.max(bounds.max[i],p[i])}
      }
    }
    this.boxes.push(bounds)
    return bounds
  }

  // Revolved profiles give caps, trunks and foliage their own faceted silhouettes.
  lathe(x,y,z,profile,color,segments=12,scaleZ=1,phase=0) {
    const triangles=[]
    const point=(ring,i)=>{
      const angle=i/segments*Math.PI*2+phase
      return [x+Math.cos(angle)*ring[1],y+ring[0],z+Math.sin(angle)*ring[1]*scaleZ]
    }
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){
      const a=point(profile[j],i),b=point(profile[j+1],i),c=point(profile[j+1],i+1),d=point(profile[j],i+1)
      triangles.push([a,b,c],[a,c,d])
    }
    return this.surface(triangles,color)
  }

  ellipsoid(x,y,z,rx,ry,rz,color,segments=10,rings=6,phase=0) {
    const profile=[]
    for(let i=0;i<=rings;i++){
      const angle=-Math.PI/2+i/rings*Math.PI
      profile.push([Math.sin(angle)*ry,Math.cos(angle)*rx])
    }
    return this.lathe(x,y,z,profile,color,segments,rz/rx,phase)
  }

  smoothEllipsoid(x,y,z,rx,ry,rz,color,segments=12,rings=8,phase=0){
    const start=this.vertices.length,shape=this.ellipsoid(x,y,z,rx,ry,rz,color,segments,rings,phase)
    for(let i=start;i<this.vertices.length;i+=9){
      const n=[(this.vertices[i]-x)/(rx*rx),(this.vertices[i+1]-y)/(ry*ry),(this.vertices[i+2]-z)/(rz*rz)],length=Math.hypot(...n)||1
      for(let k=0;k<3;k++)this.vertices[i+3+k]=n[k]/length
    }
    return shape
  }

  branch(a,b,r1,r2,color,segments=8) {
    const dir=b.map((v,i)=>v-a[i]),length=Math.hypot(...dir)
    if(length<1e-6)return null
    const n=dir.map(v=>v/length),ref=Math.abs(n[1])>.9?[1,0,0]:[0,1,0]
    const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
    const u=cross(n,ref),ul=Math.hypot(...u),right=u.map(v=>v/ul),up=cross(n,right)
    const point=(center,r,i)=>center.map((v,k)=>v+r*(right[k]*Math.cos(i/segments*Math.PI*2)+up[k]*Math.sin(i/segments*Math.PI*2)))
    const triangles=[]
    for(let i=0;i<segments;i++){
      const p=point(a,r1,i),q=point(a,r1,i+1),r=point(b,r2,i),s=point(b,r2,i+1)
      triangles.push([p,q,s],[p,s,r],[a,q,p],[b,r,s])
    }
    return this.surface(triangles,color)
  }

  box(x,y,z,w,h,d,color,options = {}) {
    const c = typeof color === 'string' ? rgb(color) : color
    const center=[x,y,z], half=[w/2,h/2,d/2]
    const bounds={ min:center.map((v,i)=>v-half[i]), max:center.map((v,i)=>v+half[i]) }
    this.boxes.push(bounds)
    faces.forEach((face,index) => {
      if (options.faces && !options.faces.includes(index)) return
      for (const corner of [0,1,2,0,2,3]) {
        this.vertices.push(...face.v[corner].map((v,i)=>center[i]+v*half[i]), ...face.n, ...c)
      }
    })
    return bounds
  }

  data() { return new Float32Array(this.vertices) }
}
