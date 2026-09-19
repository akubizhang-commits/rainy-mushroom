import { MeshBuilder } from './geometry.js'

// Original woodland silhouettes, with articulated heads shared by render and picking.
export function makeUngulateModel(kind){
  const yak=kind==='yak',body=new MeshBuilder(),head=new MeshBuilder(),leg=new MeshBuilder()
  const coat=yak?'#4e4438':'#746454',dark=yak?'#39372f':'#514a40',light=yak?'#716353':'#93816b'
  const hip=yak?.83:.49,width=yak?.43:.30,length=yak?.78:.58
  body.smoothEllipsoid(0,hip+.17,-.03,width,yak?.43:.30,length,coat,16,10)
  body.smoothEllipsoid(0,hip+.25,.30,width*.91,yak?.43:.32,length*.52,coat,14,8)
  body.smoothEllipsoid(0,hip+.11,-length*.58,width*.91,.26,length*.43,coat,14,8)
  if(yak){
    // Overlapping tapered locks make a continuous shaggy skirt, not dangling rods.
    for(let i=0;i<40;i++){
      const a=i/40*Math.PI*2,b=(i+1)/40*Math.PI*2
      const point=(angle,y,scale)=>[Math.cos(angle)*width*scale,y,Math.sin(angle)*length*.87*scale]
      const topA=point(a,.83,.95),topB=point(b,.83,.95)
      const lowA=point(a,.34+(i%3)*.012,1.02),lowB=point(b,.34+((i+1)%3)*.012,1.02)
      const tip=point((a+b)/2,.26+(i%4)*.018,1.025)
      body.surface([[topA,lowA,topB],[topB,lowA,lowB],[lowA,tip,lowB]],i%4?'#4e4438':'#554a3d')
    }
  }else{
    for(let i=0;i<15;i++){
      const z=-.48+i*.06,y=hip+.44-Math.abs(z-.1)*.16
      body.surface([[[-.055,y,z],[.055,y,z],[0,y+.10+(i%3)*.015,z-.045]]],dark)
    }
  }
  const pivot=[0,yak?.97:.63,yak?.54:.40]
  head.smoothEllipsoid(0,0,.07,yak?.22:.20,yak?.25:.22,.30,coat,16,10)
  head.branch([0,-.025,.18],[0,yak?-.14:-.10,yak?.43:.48],yak?.17:.15,yak?.13:.10,light,14)
  head.smoothEllipsoid(0,yak?-.14:-.10,yak?.44:.49,yak?.135:.105,.075,.047,dark,12,8)
  for(const side of [-1,1]){
    head.smoothEllipsoid(side*.044,yak?-.13:-.09,yak?.482:.528,.018,.014,.006,'#272b25',8,5)
    head.smoothEllipsoid(side*(yak?.193:.172),.055,.19,.018,.019,.025,'#242b25',10,6)
    head.surface([[[side*.12,.13,.05],[side*(yak?.35:.25),yak?.15:.36,-.04],[side*.21,.05,.14]]],coat)
    head.surface([[[side*.15,.14,.06],[side*(yak?.31:.23),yak?.15:.30,-.015],[side*.20,.10,.115]]],light)
    if(yak){
      const points=[[side*.17,.19,.02],[side*.36,.23,-.01],[side*.49,.40,-.025],[side*.46,.61,.02]]
      for(let i=0;i<3;i++)head.branch(points[i],points[i+1],.066-i*.017,i===2?.004:.049-i*.017,'#b7b09a',10)
      head.branch([0,-.15,.20],[0,-.41,.23],.095,.008,dark,10)
      for(let i=0;i<5;i++)head.branch([(i-2)*.05,.22,.16],[(i-2)*.05,.02+(i%2)*.03,.25],.031,.004,dark,7)
    }else{
      head.branch([side*.105,-.13,.37],[side*.15,-.07,.43],.023,.016,'#d4c6a8',8)
      head.branch([side*.15,-.07,.43],[side*.16,.015,.42],.016,.002,'#d4c6a8',8)
    }
  }
  body.branch([0,hip+.1,-length*.86],[.09,hip-.06,-length-.16],.032,.018,coat,9)
  body.branch([.09,hip-.06,-length-.16],[.11,hip-.23,-length-.12],yak?.055:.018,.008,dark,8)
  leg.smoothEllipsoid(0,-.08,0,yak?.10:.07,.16,.10,coat,12,8)
  leg.branch([0,-.1,0],[0,-hip+.09,.035],yak?.063:.043,.028,light,10)
  for(const side of [-1,1])leg.smoothEllipsoid(side*.027,-hip+.055,.05,.025,.045,.075,dark,10,6)
  return {body:body.data(),bodyGeometry:body.boxes,head:head.data(),headGeometry:head.boxes,headPivot:pivot,headDip:yak?.39:.33,
    leg:leg.data(),stride:yak?.20:.29,hips:[[-width*.65,hip,-length*.52],[width*.65,hip,-length*.52],[-width*.65,hip,length*.53],[width*.65,hip,length*.53]]}
}
