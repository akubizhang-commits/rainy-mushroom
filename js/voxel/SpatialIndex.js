// Conservative broad phase in X/Z. Exact collision and ray tests remain unchanged.
export class SpatialIndex {
  constructor(shapes=[],cellSize=2){
    this.count=shapes.length;this.cellSize=cellSize;this.cells=new Map();this.shapes=shapes
    for(const shape of shapes){
      this._visit(shape.min[0],shape.min[2],shape.max[0],shape.max[2],key=>{
        if(!this.cells.has(key))this.cells.set(key,[])
        this.cells.get(key).push(shape)
      })
    }
    this.lastCandidateCount=0
  }
  _visit(minX,minZ,maxX,maxZ,visit){
    for(let x=Math.floor(minX/this.cellSize);x<=Math.floor(maxX/this.cellSize);x++)
      for(let z=Math.floor(minZ/this.cellSize);z<=Math.floor(maxZ/this.cellSize);z++)visit(`${x},${z}`)
  }
  query(minX,minZ,maxX,maxZ){
    const found=new Set()
    this._visit(minX,minZ,maxX,maxZ,key=>{
      for(const shape of this.cells.get(key)||[])if(shape.max[0]>=minX&&shape.min[0]<=maxX&&shape.max[2]>=minZ&&shape.min[2]<=maxZ)found.add(shape)
    })
    this.lastCandidateCount=found.size
    return Array.from(found)
  }
  segment(from,to){
    return this.query(Math.min(from[0],to[0]),Math.min(from[2],to[2]),Math.max(from[0],to[0]),Math.max(from[2],to[2]))
  }
}
