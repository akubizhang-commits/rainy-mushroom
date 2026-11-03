/** Original procedural beam. The vertical core never shifts; only light travels. */
export function drawLevelBeam(canvas,time,reduced=false){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,cx=w/2,foot=h*.93;
 c.clearRect(0,0,w,h);
 const band=(radius,alpha)=>{
  const g=c.createLinearGradient(cx-radius,0,cx+radius,0);
  g.addColorStop(0,'rgba(96,199,255,0)');g.addColorStop(.35,`rgba(130,217,255,${alpha*.4})`);
  g.addColorStop(.5,`rgba(235,252,255,${alpha})`);g.addColorStop(.65,`rgba(130,217,255,${alpha*.4})`);g.addColorStop(1,'rgba(96,199,255,0)');
  c.fillStyle=g;c.fillRect(cx-radius,0,radius*2,foot);
 };
 // Fixed, straight layered column: no sideways deformation, scaling or texture reuse.
 band(w*.38,.18);band(w*.24,.32);band(w*.15,.58);band(w*.065,.72);
 if(!reduced){
  c.globalCompositeOperation='lighter';
  for(let i=0;i<25;i++){
   const seed=(i*.61803398875)%1,travel=(time*(.85+seed*.55)+i*.137)%1;
   const x=cx+(seed-.5)*w*.34,y=foot*(1-travel),length=35+seed*110;
   const fade=Math.sin(travel*Math.PI),g=c.createLinearGradient(0,y,0,y+length);
   g.addColorStop(0,`rgba(225,250,255,${fade*.85})`);g.addColorStop(1,'rgba(105,209,255,0)');
   c.fillStyle=g;c.fillRect(x,y,1+seed*1.3,Math.min(length,foot-y));
  }
  // Discrete orbital sparks around the rigid column, rather than a waving silhouette.
  for(let i=0;i<14;i++){
   const u=(time*.65+i/14)%1,angle=time*7+i*2.39996;
   const radius=w*(.09+.035*u),x=cx+Math.cos(angle)*radius,y=foot*(1-u);
   const front=(Math.sin(angle)+1)/2,alpha=Math.sin(u*Math.PI)*(.2+.6*front);
   c.fillStyle=`rgba(190,236,255,${alpha})`;c.beginPath();c.ellipse(x,y,1+front,3+front*2,0,0,Math.PI*2);c.fill();
  }
  c.globalCompositeOperation='source-over';
 }
 // Foot contact bloom is fixed in both position and size.
 c.save();c.translate(cx,foot);c.scale(1,.22);
 const g=c.createRadialGradient(0,0,0,0,0,w*.33);
 g.addColorStop(0,'rgba(244,254,255,.95)');g.addColorStop(.2,'rgba(171,233,255,.6)');g.addColorStop(1,'rgba(112,204,255,0)');
 c.fillStyle=g;c.fillRect(-w*.33,-w*.33,w*.66,w*.66);c.restore();
}
