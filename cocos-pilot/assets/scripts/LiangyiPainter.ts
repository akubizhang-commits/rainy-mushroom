/* Approved Liangyi artwork, ported from the retained v3 review renderer. Two visual planes, no simulation writes.
 * Ground: 512² -> 2.24R square, anchor .5/.5.
 * Air: 768×1024 -> 3R×4R, anchor .5/.3125; ground origin at pixel 384/704.
 */
  const TAU=Math.PI*2, clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>1-Math.pow(1-clamp(x),3);
  const SILVER=[235,235,235], ASH=[150,150,150];
  const WHITE=[255,255,255], BLACK=[0,0,0];
  const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;
  const POINTS=[[-.52,.30],[-.30,-.39],[0,.10],[.31,.44],[.54,-.24]];
  const FINAL_POINTS=[...POINTS,[-.04,.60],[.03,-.61]];

  export class LiangyiPainter {
    canvas:any;airCanvas:any;assets:any;g:any;a:any;ringRadius:number;last:any;
    static canvasSize=512;
    static worldDiameterFactor=2.24;
    static visualEnd=8.68;
    static airWidth=768;
    static airHeight=1024;
    static airWorldWidthFactor=3;
    static airWorldHeightFactor=4;
    static airAnchorX=.5;
    static airAnchorY=.3125;
    constructor(groundCanvas,airCanvas,assets){
      this.canvas=groundCanvas;this.airCanvas=airCanvas;this.assets=assets;
      groundCanvas.width=groundCanvas.height=512;
      airCanvas.width=768;airCanvas.height=1024;
      this.g=groundCanvas.getContext('2d',{alpha:true});
      this.a=airCanvas.getContext('2d',{alpha:true});
      this.ringRadius=assets.ringRadius||512/2.24;
      this.last=null;
    }
    rainTone(seed,pulse,index){
      // Stable visual-only hash: never consumes combat RNG and cannot flicker
      // between anticipation, impact, pause, or restored rendering.
      const key=`${seed||''}:${pulse}:${index}`;
      let hash=2166136261;
      for(let i=0;i<key.length;i++)hash=Math.imul(hash^key.charCodeAt(i),16777619);
      hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;
      return (hash>>>0)%2?'white':'black';
    }
    stroke(g,color,width,alpha,path){
      g.beginPath();path(g);g.strokeStyle=rgba(color,alpha);g.lineWidth=width;g.stroke();
    }
    ring(g,x,y,r,color,alpha,width,start=0,end=TAU){
      this.stroke(g,color,width,alpha,p=>p.arc(x,y,r,start,end));
    }
    glow(g,x,y,r,color,alpha){
      const gradient=g.createRadialGradient(x,y,0,x,y,r);
      gradient.addColorStop(0,rgba(color,alpha));
      gradient.addColorStop(.18,rgba(color,alpha*.6));
      gradient.addColorStop(.52,rgba(color,alpha*.19));
      gradient.addColorStop(1,rgba(color,0));
      g.fillStyle=gradient;g.fillRect(x-r,y-r,2*r,2*r);
    }
    sword(g,image,x,y,length,angle,alpha,glow=false){
      if(!image||alpha<=0)return;
      g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=clamp(alpha);
      if(glow){g.shadowColor=rgba(SILVER,.55);g.shadowBlur=9;}
      const w=length*544/496,h=length*128/496;
      g.drawImage(image,-w/2,-h/2,w,h);g.restore();
    }
    tipSword(g,image,x,y,length,alpha,tone='white',tilt=.055){
      const angle=Math.PI/2-tilt,dx=Math.cos(angle),dy=Math.sin(angle);
      this.sword(g,image,x-dx*length/2,y-dy*length/2,length,angle,alpha,true);
      // Keep the core the same pure tone as this sword, including black swords.
      this.stroke(g,tone==='black'?BLACK:WHITE,.006,alpha*.86,p=>{
        p.moveTo(x-dx*length*.74,y-dy*length*.74);p.lineTo(x,y);
      });
    }
    burst(g,x,y,t,color,power=1){
      if(t<0||t>.25)return;
      const fade=Math.pow(1-clamp(t/.25),1.6),radius=.025+ease(t/.25)*.20*power;
      this.glow(g,x,y,.24*power,color,fade*.66);
      this.glow(g,x,y,.065*power,g===this.g?SILVER:WHITE,fade*.95);
      this.ring(g,x,y,radius,color,fade*.78,.009);
      for(let k=0;k<8;k++){
        const angle=k*TAU/8+.2,inner=radius*.55,outer=radius*(k%2?1.05:1.38);
        this.stroke(g,k%2?color:(g===this.g?SILVER:WHITE),.006,fade*(k%2?.62:.94),p=>{
          p.moveTo(x+Math.cos(angle)*inner,y+Math.sin(angle)*inner);
          p.lineTo(x+Math.cos(angle)*outer,y+Math.sin(angle)*outer);
        });
      }
    }
    clear(){
      for(const [g,w,h] of [[this.g,512,512],[this.a,768,1024]]){
        g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,w,h);g.globalAlpha=1;
        g.globalCompositeOperation='source-over';g.lineCap='round';g.lineJoin='round';
      }
    }
    draw(info){
      this.clear();
      const age=Number(info.age),r=Number(info.radius);
      if(!Number.isFinite(age+r)||age<0||age>=8.68||r<=0){
        this.last={visible:false,age};return this.last;
      }
      const pulse=Math.max(0,Number(info.pulseIndex)||0),count=Number(info.pulseCount)||6;
      const pulseAge=pulse>0?Math.max(0,age-Number(info.pulseAt)):999;
      const terminal=count>=7&&pulse===count,active=pulse?(pulse-1)%2:-1;
      const flash=pulseAge<.26?(pulseAge<.045?1:Math.pow(1-clamp((pulseAge-.045)/.215),1.6)):0;
      const fade=Math.pow(1-clamp((age-8.10)/.58),1.15),intro=ease(age/.3);
      const color=SILVER;
      const baseRotation=age*TAU/20;
      const g=this.g,a=this.a,scale=512/2.24;
      g.translate(256,256);g.scale(scale,scale);
      a.translate(384,704);a.scale(256,256);

      // Original monochrome painting, source-over keeps the dark yin half visible.
      // Slow clockwise turn carries the painting and both eyes together.
      // Cloud detail flows locally; the circular damage boundary stays fixed.
      if(this.assets.ring){
        const size=2.24, step=4, phase=age*TAU/4;
        g.save();g.rotate(baseRotation);g.globalAlpha=(.68+.08*flash)*intro*fade;
        for(let sy=0;sy<512;sy+=step){
          const v=sy/512;
          const eyeMask=Math.min(1,Math.abs(v-.286)/.075,Math.abs(v-.658)/.075);
          const shift=Math.sin(v*TAU*3-phase)*.006*Math.sin(v*Math.PI)**2*eyeMask;
          g.drawImage(this.assets.ring,0,sy,512,step,
            -size/2+shift,(v-.5)*size,size,step/512*size);
        }
        g.restore();
      }
      this.ring(g,0,0,1,SILVER,(.30+.28*flash)*intro*fade,.006);
      // The whole damaging region lights once per actual pulse.
      g.save();g.beginPath();g.arc(0,0,.977,0,TAU);g.clip();
      if(flash){
        this.glow(g,0,0,1.15,SILVER,flash*(terminal?.20:.10)*fade);
        this.ring(g,0,0,.30+.68*ease(pulseAge/.22),SILVER,flash*.58*fade,.021);
      }
      g.restore();
      const eyes=[];
      g.save();g.rotate(baseRotation);
      for(let i=0;i<2;i++){
        const y=i===0?-.48:.354,c=i?ASH:SILVER;
        const isActive=pulse>0&&(terminal||active===i),strength=isActive?flash:0;
        const e=ease((age-i*.045)/.22);
        this.glow(g,0,y,.20,c,(.08+.42*strength)*e*fade);
        this.ring(g,0,y,.118,c,(.65+.35*strength)*e*fade,.011);
        this.ring(g,0,y,.153,c,(.23+.42*strength)*e*fade,.004);
        this.sword(g,i?this.assets.swordBlack:this.assets.swordWhite,0,y,.42,i? -Math.PI/2:Math.PI/2,
          (.87+.13*strength)*e*fade,true);
        eyes.push({x:-Math.sin(baseRotation)*y*r,y:-Math.cos(baseRotation)*y*r,active:isActive,peak:strength});
      }
      g.restore();

      const nextAt=Number.isFinite(info.nextPulseAt)?info.nextPulseAt:.5+pulse*7.5/(count-1);
      const nextFinal=count>=7&&pulse+1===count;
      const pending=pulse<count&&age>=nextAt-(nextFinal?.30:.26);
      let rainPhase='idle',rainPulse=0,rainPoints=[],rainTones=[],rainLength=0,rainProgress=0;
      let landingOffsets=[],rainSwords=[];
      const drawRain=(n,elapsed)=>{
        const isFinal=count>=7&&n===count,points=isFinal?FINAL_POINTS:POINTS,length=isFinal?.87:.67;
        rainPhase=elapsed<0?'anticipation':'impact';rainPulse=n;rainLength=length*r;
        rainProgress=clamp((elapsed+.18)/.18);
        rainPoints=points.map(([x,y])=>({x:x*r,y:y*r}));
        rainTones=points.map((_,i)=>this.rainTone(info.rainSeed,n,i));
        landingOffsets=[];rainSwords=[];
        for(const [index,[x,wy]] of points.entries()){
          // Interleave distant landing positions in five 40ms waves around the damage beat.
          const offset=isFinal?0:((index*2+n)%5)*.04-.08;
          const local=elapsed-offset,progress=clamp((local+.18)/.18);
          const phase=local>=0?'impact':local>=-.18?'falling':isFinal?'hover':'waiting';
          landingOffsets.push(offset);rainSwords.push({phase,progress,landingOffset:offset});
          if(phase==='waiting')continue;
          const tone=rainTones[index],c=tone==='black'?BLACK:WHITE,y=-wy;
          const image=tone==='black'?this.assets.swordBlack:this.assets.swordWhite;
          if(local<0){
            const drop=1.13*(1-progress*progress);
            this.ring(g,x,y,.055+.025*progress,SILVER,(.14+.30*progress)*fade,.005);
            this.glow(g,x,y,.11,SILVER,.22*progress*fade);
            const tipX=x-.14*drop,tipY=y-drop;
            const alpha=(phase==='hover'?.4*ease((elapsed+.30)/.04):.4+.6*ease(progress))*fade;
            this.stroke(a,c,.028,alpha*.24,p=>{p.moveTo(tipX-.04,tipY-length*.92);p.lineTo(tipX,tipY);});
            this.tipSword(a,image,tipX,tipY,length,alpha,tone);
          }else if(local<.25){
            const hold=local<.05?1:Math.pow(1-clamp((local-.05)/.20),1.1);
            const sink=.035*ease(local/.25);
            this.tipSword(a,image,x,y+sink,length,hold*fade,tone);
            this.burst(g,x,y,local,SILVER,isFinal?1.2:1);
            this.stroke(a,c,.025,hold*.44*fade,p=>{p.moveTo(x-.05,y-length*.95);p.lineTo(x,y);});
          }
        }
      };
      if(pulse>0&&pulseAge<(terminal?.25:.33))drawRain(pulse,pulseAge);
      if(pending)drawRain(pulse+1,age-nextAt);
      const hitPoints=(info.hitPoints||[]).filter(p=>Number.isFinite(p.x+p.y+p.radius));
      if(pulseAge<.22){
        for(const hit of hitPoints){
          const x=hit.x/r,y=-hit.y/r;
          this.burst(a,x,y,pulseAge,color,.68);
          this.glow(a,x,y-Math.min(.13,hit.radius/r*.5),.15,WHITE,flash*.72*fade);
        }
      }
      if(terminal&&flash>0){
        g.save();g.rotate(baseRotation);
        this.stroke(g,SILVER,.015,flash*.65*fade,p=>{p.moveTo(0,-.48);p.lineTo(0,.354);});
        g.restore();
        this.glow(g,0,0,.50,SILVER,flash*.62*fade);
        this.ring(g,0,0,.28+.65*ease(pulseAge/.23),SILVER,flash*.8*fade,.017);
      }
      this.last={
        visible:fade>0,age,radius:r,eyes,baseRotation,pulseIndex:pulse,pulseCount:count,pulseAge,flash,terminal,fade,
        logicalCircleRadiusPx:scale,worldDiameter:r*2.24,visualOnlyAfter:8,visualEnd:8.68,
        layers:{
          ground:{canvasWidth:512,canvasHeight:512,worldWidth:2.24*r,worldHeight:2.24*r,anchorX:.5,anchorY:.5},
          air:{canvasWidth:768,canvasHeight:1024,worldWidth:3*r,worldHeight:4*r,anchorX:.5,anchorY:.3125},
        },
        swordRain:{phase:rainPhase,pulseIndex:rainPulse,points:rainPoints,tones:rainTones,bodyLength:rainLength,
          dropHeight:1.13*r,progress:rainProgress,leadSeconds:count>=7&&rainPulse===count?.30:.26,impactHeldSeconds:.05,
          landingOffsets,swords:rainSwords,staggerSeconds:.04,finaleHoverSeconds:.12},
        actualHitPoints:hitPoints.map(p=>({...p})),
      };
      return this.last;
    }
  }
