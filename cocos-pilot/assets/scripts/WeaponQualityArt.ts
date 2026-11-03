import { Color, Graphics } from 'cc';

type Pair=[number,number];
type Input={id:string;quality:number;time:number;guard:Pair;direction:Pair;length:number;
 scale:number;edge:number;warm:boolean;active:boolean;binding:string};
type Sample={time:number;start:Pair;end:Pair};

/** Approved quality preview, driven only by simulation time. No resources or gameplay writes. */
export class WeaponQualityArt {
 private samples:Sample[]=[];
 private key='';
 private lastTime=-1;
 reset(){this.samples=[];this.key='';this.lastTime=-1;}
 draw(light:Graphics,trail:Graphics,p:Input){
  light.clear();trail.clear();
  if(!Number.isInteger(p.quality)||p.quality<2||p.quality>4||!Number.isFinite(p.time)
   ||p.scale<=0||![...p.guard,...p.direction,p.length,p.scale,p.edge].every(Number.isFinite)){
   this.reset();return;
  }
  const q=p.quality-1,key=`${p.id}:${p.quality}:${p.binding}`;
  if(key!==this.key||p.time<this.lastTime||p.time-this.lastTime>.2)this.reset();
  this.key=key;this.lastTime=p.time;
  const rgb=p.warm?[246,216,154]:[185,225,242],L=p.length,e=p.edge;
  const color=(alpha:number,white=false)=>new Color(...(white?[246,250,244]:rgb) as [number,number,number],Math.round(Math.max(0,Math.min(1,alpha))*255));
  // All parameters are design pixels; convert once to the current atlas's local coordinates.
  const point=(x:number,y:number):Pair=>[
   p.guard[0]+(x*p.direction[0]-y*p.direction[1])/p.scale,
   p.guard[1]+(x*p.direction[1]+y*p.direction[0])/p.scale];
  const segment=(g:Graphics,a:Pair,b:Pair,width:number,alpha:number,white=false)=>{
   g.strokeColor=color(alpha,white);g.lineWidth=width/p.scale;
   g.moveTo(...a);g.lineTo(...b);g.stroke();
  };
  const line=(x1:number,y1:number,x2:number,y2:number,width:number,alpha:number,white=false)=>
   segment(light,point(x1,y1),point(x2,y2),width,alpha,white);
  const glow=(x:number,y:number,r:number,alpha:number)=>{
   const at=point(x,y);
   // Concentric low-alpha disks approximate the preview's soft radial light.
   for(let n=5;n>=1;n--){
    light.fillColor=color(alpha*(n===1?.48:.065),n===1);
    light.circle(at[0],at[1],r*n/5/p.scale);light.fill();
   }
  };
  if(q>=2&&p.active){
   const life=q===3?.126:.054,count=q===3?7:3;
   // Append before trimming/drawing: repeated paused draws keep the same oldest sample.
   if(!this.samples.length||this.samples[this.samples.length-1].time!==p.time)
    this.samples.push({time:p.time,start:point(L*.65,0),end:point(L,0)});
   this.samples=this.samples.filter(s=>p.time-s.time<=life).slice(-count);
   for(const s of this.samples){
    const age=p.time-s.time;if(age<=0)continue;
    segment(trail,s.start,s.end,q===3?2.2:1.3,(1-age/life)*(q===3?.22:.13));
   }
  }else this.samples=[];
  if(q>=2){
   line(L*.06,e,L*.97,0,q===3?1.4:.8,q===3?.85:.5);
   line(L*.08,e,L*.96,0,q===3?6:3,q===3?.14:.06);
  }else if(p.active)line(L*.1,e,L*.96,0,.65,.32);
  const period=q===1?3.2:q===2?2.2:1.7,phase=((p.time%period)+period)%period;
  const travel=q===1?.95:period;
  if(phase<travel){
   const u=phase/travel,alpha=Math.sin(u*Math.PI),pos=L*(.1+.86*u),y=e*(1-u),tail=q===1?8:q===2?12:17;
   for(let n=0;n<6;n++){
    const x1=Math.max(L*.05,pos-tail+tail*n/6),x2=Math.max(x1,pos-tail+tail*(n+1)/6);
    line(x1,y,x2,y,1,alpha*.9*(n+1)/6,true);
   }
   glow(pos,y,q===3?6:3,alpha*.7);
  }
  if(q===3){
   const u=((p.time/1.7+.5)%1+1)%1,pos=L*(.1+.86*u);
   line(Math.max(L*.06,pos-10),-e*(1-u),pos,-e*(1-u),.8,Math.sin(u*Math.PI)*.75);
   const pulse=Math.pow((Math.cos(p.time/1.7*Math.PI*2)+1)/2,5);
   glow(L*.98,0,5+4*pulse,.65+.3*pulse);
   for(let i=0;i<3;i++){
    const v=((p.time/1.7+i/3)%1+1)%1;
    glow(L*(.55+.5*v),(i%2?1:-1)*(2+9*v),2.7,Math.sin(v*Math.PI)*.85);
   }
  }
 }
}
