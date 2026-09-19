import { MeshBuilder } from './geometry.js'
import { woodlandFungus } from './WoodlandFungi.js'

// Original faceted botanical models; no borrowed textures or camera-facing sprites.
export function makeMushroom(spawn,species,anchor,heightAt=null,options={}) {
  const mesh=options.mesh||new MeshBuilder(),{x,y,z}=anchor,{cap,stem,shape}=species.style,id=species.id
  if(options.sculpt?.(mesh,spawn,species,anchor,heightAt)){
    // Native species sculpture supplies both visible and selectable geometry.
  }else if(woodlandFungus(mesh,id,anchor)){
    // The three woodland reference species have their own connected structures.
  }else if(shape==='morel'){
    mesh.lathe(x,y,z,[[0,.075],[.07,.06],[.23,.06]],stem,12)
    mesh.lathe(x,y+.2,z,[[0,.13],[.12,.20],[.30,.17],[.43,.08],[.47,0]],cap,16)
    for(let row=0;row<5;row++)for(let k=0;k<10;k++){
      const a=(k+(row%2)*.5)/10*Math.PI*2,r=[.155,.191,.189,.145,.091][row]
      mesh.ellipsoid(x+Math.cos(a)*r,y+.24+row*.085,z+Math.sin(a)*r,.031,.034,.025,'#625432',7,5,a)
    }
  }else if(shape==='parasol'){
    mesh.branch([x,y,z],[x,y+.63,z],.04,.027,stem,12)
    mesh.lathe(x,y+.62,z,[[0,.39],[.025,.40],[.07,.31],[.10,.12],[.15,.055],[.16,0]],'#d7ccb4',20)
    mesh.lathe(x,y+.43,z,[[0,.085],[.022,.045]],'#e0d7bf',12)
    for(let n=0;n<30;n++){
      const a=n*2.4,r=.09+(n%5)*.055
      mesh.ellipsoid(x+Math.cos(a)*r,y+.72-r*.17,z+Math.sin(a)*r,.024,.008,.032,cap,6,4,a)
    }
    for(let n=0;n<9;n++)mesh.branch([x-.028,y+.08+n*.052,z+.027],[x+.028,y+.10+n*.052,z+.027],.006,.004,'#8b795b',4)
  }else if(id==='flammulina-velutipes'){
    for(let i=0;i<5;i++){
      const px=x+Math.sin(i*2.4)*.14,pz=z+Math.cos(i*2.4)*.11,h=.20+(i%3)*.08
      mesh.branch([px,y,pz],[px,y+h,pz],.023,.017,stem,8)
      mesh.lathe(px,y+h,pz,[[0,.13],[.035,.14],[.08,.09],[.1,0]],cap,14)
      mesh.lathe(px,y+h-.01,pz,[[0,.025],[.01,.125]],'#e2d6b4',12)
    }
  }else if(shape==='fan'){
    const colors=id==='trametes-versicolor'?['#756443','#bea57b','#ded3a9']:[cap,stem,cap]
    for(let tier=0;tier<4;tier++){
      const px=x+Math.sin(tier*2)*.11,py=y+.06+tier*.12,r=.34-tier*.038
      mesh.branch([x,y,z],[px,py+.035,z],.033,.024,'#c3af75',8)
      mesh.lathe(px,py,z,[[0,.05],[.025,r],[.06,r*.93],[.09,r*.57],[.10,0]],colors[tier%3],16,.62)
      mesh.lathe(px,py-.012,z,[[0,0],[.01,r*.95],[.025,r]],'#d3c9a6',16,.62)
    }
  }else if(shape==='hoof'){
    mesh.lathe(x,y,z,[[0,0],[.02,.32],[.12,.32],[.25,.25],[.34,.12],[.36,0]],cap,16,.7)
  }else if(shape==='puffball'){
    mesh.ellipsoid(x,y+.18,z,.23,.23,.22,cap,14,10)
    for(let i=0;i<24;i++){const a=i*2.4,r=.08+(i%3)*.05;mesh.ellipsoid(x+Math.cos(a)*r,y+.36-r*.3,z+Math.sin(a)*r,.012,.023,.012,stem,5,4)}
  }else if(shape==='earthstar'){
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2;mesh.surface([[[x,y+.04,z],[x+Math.cos(a-.3)*.17,y+.08,z+Math.sin(a-.3)*.17],[x+Math.cos(a)*.36,y+.01,z+Math.sin(a)*.36]]],stem)}
    mesh.ellipsoid(x,y+.19,z,.15,.14,.15,cap,12,8)
  }else if(shape==='cup'||shape==='nest'||shape==='funnel'){
    const base=shape==='funnel'?.23:.02,r=shape==='nest'?.16:.27
    if(base>.1)mesh.branch([x,y,z],[x,y+base,z],.04,.06,stem,10)
    mesh.lathe(x,y+base,z,[[0,0],[.03,.09],[.14,r],[.15,r],[.11,r*.80],[.045,.07]],cap,18)
    if(shape==='nest')for(let i=0;i<4;i++)mesh.ellipsoid(x+Math.sin(i*2.4)*.07,y+.10,z+Math.cos(i*2.4)*.07,.04,.025,.03,stem,8,5)
  }else if(shape==='jelly'){
    for(let i=0;i<9;i++)mesh.ellipsoid(x+Math.sin(i*2.4)*.13,y+.10+(i%3)*.035,z+Math.cos(i*2.4)*.11,.09,.11,.065,cap,9,6)
  }else if(shape==='tooth'){
    mesh.ellipsoid(x,y+.30,z,.27,.23,.20,'#e8e0bd',12,8)
    for(let i=0;i<22;i++){
      const angle=i*2.4,r=.07+(i%3)*.055,px=x+Math.cos(angle)*r,pz=z+.06+Math.sin(angle)*r*.6
      mesh.branch([px,y+.24+(i%3)*.025,pz],[px,y+.01+(i%4)*.02,pz+.035],.018,.004,'#e3d9b6',5)
    }
  }else if(shape==='coral'){
    for(let i=0;i<9;i++){
      const angle=i*2.4,px=x+Math.cos(angle)*.15,pz=z+Math.sin(angle)*.13,h=.21+(i%3)*.085
      mesh.branch([x,y,z],[px,y+h,pz],.04,.023,'#625e46',7)
      for(let j=0;j<3;j++){
        const tip=[px+Math.cos(angle+j*2)*.06,y+h+.10+(j%2)*.05,pz+Math.sin(angle+j*2)*.06]
        mesh.branch([px,y+h*.8,pz],tip,.023,.010,'#8c8a70',6)
      }
    }
  }else if(shape==='club'){
    mesh.branch([x-.02,y,z],[x+.02,y+.34,z],.028,.018,stem,8)
    mesh.ellipsoid(x+.02,y+.36,z,.035,.095,.03,cap,9,6)
  }else{
    const count=Math.min(spawn.count,4)
    for(let i=0;i<count;i++){
      const size=1-(i%3)*.12,px=x+(count===1?0:(i%2-.5)*.35),pz=z+(count===1?0:(Math.floor(i/2)-.5)*.28)
      const baseY=!anchor.attached&&heightAt?heightAt(px,pz)+.003:y
      const h=(shape==='cone'?.34:.30)*size,r=(shape==='cone'?.14:.26)*size
      mesh.lathe(px,baseY,pz,[[0,.067*size],[.045,.055*size],[h*.70,.037*size],[h,.045*size]],stem,12)
      const profile=shape==='cone'?[[0,r],[.08*size,r*.98],[.24*size,r*.70],[.32*size,r*.3],[.34*size,0]]:
        [[0,r*.94],[.025*size,r],[.075*size,r*.88],[.13*size,r*.58],[.155*size,r*.20],[.16*size,0]]
      mesh.lathe(px,baseY+h,pz,profile,cap,18,.94,i*.35)
      mesh.lathe(px,baseY+h-.012,pz,[[0,.045*size],[.012,r*.94]],'#d2c7a6',18,.94)
      // Fine radial gills sit below the cap and follow its geometry.
      if(shape==='bolete'){for(let n=0;n<28;n++){const a=n*2.4,rr=.07+(n%4)*.04;mesh.ellipsoid(px+Math.cos(a)*rr,baseY+h-.017,pz+Math.sin(a)*rr,.013,.005,.013,'#96894d',5,4)}}
      else for(let g=0;g<14;g++){
        const angle=g/14*Math.PI*2,dx=Math.cos(angle),dz=Math.sin(angle)*.94
        mesh.branch([px+dx*.065*size,baseY+h-.011,pz+dz*.065*size],[px+dx*r*.86,baseY+h-.006,pz+dz*r*.86],.005,.003,'#b9ae8c',4)
      }
      if(species.style.spots)for(let n=0;n<9;n++){
        const angle=n*2.4,rr=r*(.23+(n%3)*.22),py=baseY+h+(.16-.12*(rr/r)**2)*size
        mesh.ellipsoid(px+Math.cos(angle)*rr,py,pz+Math.sin(angle)*rr*.94,.018*size,.009*size,.022*size,'#eadfbe',6,4)
      }
      if(id.includes('amanita'))mesh.lathe(px,baseY+h*.55,pz,[[0,.075*size],[.028,.045*size]],'#e5dab7',12)
    }
  }
  return {id:spawn.id,speciesId:species.id,anchor,boxes:mesh.boxes,data:mesh.data()}
}
