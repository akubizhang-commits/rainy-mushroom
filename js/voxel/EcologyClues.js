import { MeshBuilder } from './geometry.js'

export function makeLitterCover(spawn,anchor){
  const mesh=new MeshBuilder(),{x,y,z}=anchor,needles=spawn.host==='pine'
  mesh.ellipsoid(x,y+.20,z,.38,.22,.34,needles?'#716341':'#806544',12,7)
  for(let i=0;i<22;i++){
    const a=i*2.4,r=.10+(i%4)*.065,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r,py=y+.42-r*.25
    if(needles)mesh.branch([px-.08,py,pz-.025],[px+.085,py+.004,pz+.025],.006,.004,i%2?'#ac935b':'#807044',4)
    else mesh.ellipsoid(px,py,pz,.07,.01,.025,i%2?'#a07b43':'#baa363',6,4,a)
  }
  return {id:spawn.id,boxes:mesh.boxes,data:mesh.data(),covered:true,clue:needles?'松针隆起 · 轻点拨开':'落叶下有轮廓 · 轻点拨开'}
}

export function makeTracks(world){
  const mesh=new MeshBuilder(),startX=world.scene.environment==='river'?2:0
  for(let i=0;i<6;i++){
    const x=startX+(i%2?.16:-.16),z=6-i*.33,y=world.heightAt(x,z)+.008
    mesh.ellipsoid(x,y,z,.055,.008,.085,'#554c36',8,4)
    for(let toe=0;toe<3;toe++)mesh.ellipsoid(x+(toe-1)*.032,y,z-.08,.017,.008,.022,'#554c36',6,4)
  }
  return mesh.data()
}
