export class ImageStore {
  constructor(platformApi,canvas=null,{maxRecords=32,maxBytes=64*1024*1024}={}){
    this.platformApi=platformApi;this.canvas=canvas;this.records=new Map()
    this.maxRecords=maxRecords;this.maxBytes=maxBytes;this.revision=0;this.clock=0;this.used=new Set()
  }
  preload(paths){return paths.map(path=>this.load(path))}
  beginFrame(){this.used.clear()}
  get bytes(){let bytes=0;for(const record of this.records.values())bytes+=record.bytes||0;return bytes}
  endFrame(){
    // Visible images are pinned for this frame; the budget is soft if they alone exceed it.
    let bytes=this.bytes
    const oldest=[...this.records.values()].sort((a,b)=>a.usedAt-b.usedAt)
    for(const record of oldest){
      if(this.records.size<=this.maxRecords&&bytes<=this.maxBytes)break
      if(this.used.has(record.path))continue
      bytes-=record.bytes||0;this._release(record)
    }
  }
  _release(record){
    if(record.image){record.image.onload=null;record.image.onerror=null}
    record.image=null;this.records.delete(record.path)
  }
  clear(){for(const record of this.records.values())this._release(record);this.used.clear();this.revision++}
  load(path){
    this.used.add(path)
    let record=this.records.get(path)
    if(record){record.usedAt=++this.clock;return record}
    record={path,image:null,status:'loading',error:null,bytes:0,usedAt:++this.clock}
    this.records.set(path,record)
    try{
      const image=this.platformApi?.createImage?.()||this.canvas?.createImage?.()
      if(!image)throw Error('Image API is unavailable')
      record.image=image
      image.onload=()=>{record.status='ready';record.bytes=(image.width||0)*(image.height||0)*4;this.revision++}
      image.onerror=error=>{record.status='error';record.error=error||Error(`Failed to load ${path}`);this.revision++}
      image.src=path
    }catch(error){record.status='error';record.error=error;this.revision++}
    return record
  }
  get(path){return this.load(path)}
}
