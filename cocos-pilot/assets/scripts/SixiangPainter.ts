/* Four fixed sword eyes, a true diamond frontier and one shared damage beat.
 * User-approved Four Symbols artwork. Draws retained PNGs; never changes combat state.
 * Ground 768² => 2.4R square. Air 960×1280 => 2.8R wide,
 * anchor (.5,.35), origin at (480,832). All drawing coordinates below use R.
 */
  const TAU = Math.PI * 2;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => 1 - (1 - clamp(n)) ** 3;
  const WHITE = [233, 255, 254], CYAN = [61, 232, 255];
  const GOLD = [255, 213, 125], VIOLET = [170, 183, 255], BLUE = [17, 90, 166];
  const COLORS = [[255, 91, 39], [235, 243, 255], [64, 166, 255], [62, 229, 155]];
  const SPIRITS = ['zhuque', 'baihu', 'xuanwu', 'qinglong'];
  const SEAL_TILES = [2, 1, 3, 0], SEAL_CENTER=.5, SEAL_RADIUS=.5;
  // World coordinates: north, east, south, west.
  const EYES = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  // Radial/tangential offsets cover each seal, including its outer half.
  const SEAL_RAIN = [[.26, 0], [.08, .22], [.08, -.22], [-.15, .15], [-.15, -.15]];
  const FINAL_SEAL_RAIN = [...SEAL_RAIN, [.23, .12], [.23, -.12]];
  const RAIN_POINTS = offsets => EYES.flatMap(([vx, vy]) => offsets.map(([radial, tangent]) =>
    [vx * (SEAL_CENTER + radial) - vy * tangent, vy * (SEAL_CENTER + radial) + vx * tangent]));
  const POINTS = RAIN_POINTS(SEAL_RAIN), FINAL_POINTS = RAIN_POINTS(FINAL_SEAL_RAIN);
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`;

  export class SixiangPainter {
    canvas:any; airCanvas:any; assets:any; g:any; a:any; last:any;
    static canvasSize = 768;
    static worldDiameterFactor = 2.4;
    static visualEnd = 6.78;
    static airWidth = 960;
    static airHeight = 1280;
    static airWorldWidthFactor = 2.8;
    static airWorldHeightFactor = 2.8 * 1280 / 960;
    static airAnchorX = .5;
    static airAnchorY = .35;
    constructor(ground, air, assets) {
      this.canvas = ground; this.airCanvas = air; this.assets = assets;
      ground.width = ground.height = 768; air.width = 960; air.height = 1280;
      this.g = ground.getContext('2d', { alpha: true });
      this.a = air.getContext('2d', { alpha: true });
      this.last = null;
    }
    elementAt(x,y) {
      // Nearest seal owns overlap regions; exact ties use stable compass order.
      let index=0,distance=Infinity;
      EYES.forEach(([vx,vy],i)=>{
        const d=(x-vx*SEAL_CENTER)**2+(y-vy*SEAL_CENTER)**2;
        if(d<distance-1e-12){distance=d;index=i;}
      });
      return index;
    }
    swordImage(element) {
      return {image:element<2?this.assets.swordsWarm:this.assets.swordsCool,sx:(element%2)*544};
    }
    spiritSeal(g,index,x,y,age,peak,alpha) {
      const c=COLORS[index],tile=SEAL_TILES[index],r=SEAL_RADIUS;
      g.save();g.translate(x,y);
      this.glow(g,0,0,r*1.04,c,(.10+.22*peak)*alpha);
      if(this.assets.seals) {
        g.save();g.rotate(age*TAU/24);
        g.globalAlpha=(.76+.24*peak)*alpha;
        g.drawImage(this.assets.seals,(tile%2)*512,Math.floor(tile/2)*512,512,512,-r,-r,r*2,r*2);
        g.restore();
      }
      // Each seal turns locally; its position and resident sword stay fixed.
      const angle=age*TAU/24+index*Math.PI/2;
      for(let k=0;k<2;k++) {
        const start=angle+k*Math.PI;
        this.stroke(g,c,.006,(.35+.50*peak)*alpha,p=>p.arc(0,0,r*.985,start,start+.66));
        this.glow(g,Math.cos(start)*r*.985,Math.sin(start)*r*.985,.018,c,.5*alpha);
      }
      if(peak>0) {
        this.ring(g,0,0,r*(.85+.10*peak),c,.6*peak*alpha,.007);
      }
      g.restore();
    }
    elementTrail(g,x,y,length,alpha,index) {
      const c=COLORS[index];
      if(index===3) {
        // Wood: two narrow winding strands, without a gameplay root effect.
        for(const sign of [-1,1])this.stroke(g,c,.008,alpha*.66,p=>{
          for(let k=0;k<=16;k++){
            const t=k/16,px=x+Math.sin(t*TAU*1.6)*.027*sign,py=y-length*t;
            if(k===0)p.moveTo(px,py);else p.lineTo(px,py);
          }
        });
      }else if(index===0) {
        for(const sign of [-1,1])this.stroke(g,c,.012,alpha*.55,p=>{
          p.moveTo(x,y);p.bezierCurveTo(x+sign*.055,y-length*.3,x+sign*.014,y-length*.6,x+sign*.045,y-length*.88);
        });
      }else if(index===2) {
        for(const t of [.3,.6,.85])this.stroke(g,c,.006,alpha*.45,p=>{
          p.moveTo(x-.025,y-length*t);p.bezierCurveTo(x-.01,y-length*t+.014,x+.01,y-length*t+.014,x+.025,y-length*t);
        });
      }else{
        this.stroke(g,WHITE,.005,alpha*.75,p=>{p.moveTo(x,y+.03);p.lineTo(x,y-length*1.12)});
      }
    }
    elementImpact(g,x,y,since,index,alpha) {
      const t=clamp(since/.23),fade=(1-t)*alpha,c=COLORS[index],r=.04+.11*ease(t);
      if(fade<=0)return;
      if(index===2) {
        // Water/armor visual only: no shield or reflected-damage event.
        this.stroke(g,c,.007,fade*.65,p=>{
          for(let k=0;k<=6;k++){
            const angle=k*TAU/6,px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r*.65;
            if(!k)p.moveTo(px,py);else p.lineTo(px,py);
          }
        });
      }else if(index===3) {
        this.stroke(g,c,.008,fade*.65,p=>p.arc(x,y,r,t*2,t*2+Math.PI*1.6));
      }else if(index===0) {
        for(let k=0;k<5;k++){
          const angle=k*TAU/5;
          this.stroke(g,c,.01,fade*.7,p=>{
            p.moveTo(x+Math.cos(angle)*r*.3,y+Math.sin(angle)*r*.3);
            p.lineTo(x+Math.cos(angle+.18)*r*1.25,y+Math.sin(angle+.18)*r*1.25);
          });
        }
      }else {
        this.stroke(g,WHITE,.007,fade*.8,p=>{p.moveTo(x-r,y+r*.3);p.lineTo(x+r,y-r*.3)});
      }
    }
    stroke(g, color, width, alpha, path) {
      g.beginPath(); path(g); g.strokeStyle = rgba(color, alpha); g.lineWidth = width; g.stroke();
    }
    diamond(g, scale = 1) {
      g.beginPath(); g.moveTo(0, -scale); g.lineTo(scale, 0);
      g.lineTo(0, scale); g.lineTo(-scale, 0); g.closePath();
    }
    border(g, scale, color, width, alpha) {
      this.diamond(g, scale); g.strokeStyle = rgba(color, alpha); g.lineWidth = width; g.stroke();
    }
    ring(g, x, y, radius, color, alpha, width) {
      this.stroke(g, color, width, alpha, p => p.arc(x, y, radius, 0, TAU));
    }
    glow(g, x, y, radius, color, alpha) {
      if (alpha <= 0) return;
      const fill = g.createRadialGradient(x, y, 0, x, y, radius);
      fill.addColorStop(0, rgba(color, alpha)); fill.addColorStop(.2, rgba(color, alpha * .64));
      fill.addColorStop(.55, rgba(color, alpha * .16)); fill.addColorStop(1, rgba(color, 0));
      g.fillStyle = fill; g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    sword(g, image, x, y, length, angle, alpha, color = CYAN) {
      if (!image || alpha <= 0) return;
      g.save(); g.translate(x, y); g.rotate(angle); g.globalAlpha = clamp(alpha);
      g.shadowColor = rgba(color, .9); g.shadowBlur = 7;
      const w = length * 544 / 496, h = length * 128 / 496;
      g.drawImage(image.image, image.sx, 0, 544, 128, -w / 2, -h / 2, w, h);
      g.restore();
    }
    fallingSword(g, image, x, y, length, alpha, color, element = 1, tilt = .045) {
      const angle = Math.PI / 2 - tilt, dx = Math.cos(angle), dy = Math.sin(angle);
      this.sword(g, image, x - dx * length / 2, y - dy * length / 2, length, angle, alpha, color);
      this.elementTrail(g, x, y, length, alpha, element);
      this.stroke(g, WHITE, .006, alpha * .9, p => {
        p.moveTo(x - dx * length * .76, y - dy * length * .76); p.lineTo(x, y);
      });
    }
    burst(g, x, y, since, color, scale = 1) {
      if (since < 0 || since > .23) return;
      const t = clamp(since / .23), alpha = (1 - t) ** 1.65;
      const radius = (.023 + .17 * ease(t)) * scale;
      this.glow(g, x, y, .19 * scale, color, alpha * .64);
      this.glow(g, x, y, .055 * scale, WHITE, alpha * .98);
      this.ring(g, x, y, radius, color, alpha * .84, .009);
      for (let k = 0; k < 8; k++) {
        const angle = k * TAU / 8 + .12, inner = radius * .5, outer = radius * (k % 2 ? 1.1 : 1.4);
        this.stroke(g, k % 2 ? color : WHITE, .005, alpha * .9, p => {
          p.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
          p.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
        });
      }
    }
    clear() {
      for (const [g, w, h] of [[this.g, 768, 768], [this.a, 960, 1280]]) {
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.lineCap = 'round'; g.lineJoin = 'round';
      }
    }
    draw(info) {
      this.clear();
      const age = Number(info.age), radius = Number(info.radius);
      if (!Number.isFinite(age + radius) || age < 0 || age >= 6.78 || radius <= 0) {
        this.last = { visible: false, age }; return this.last;
      }
      const pulse = Math.max(0, Number(info.pulseIndex) || 0), count = Number(info.pulseCount) || 7;
      const high = count === 9, terminal = pulse === count && pulse > 0;
      const active = pulse ? (pulse - 1) % 4 : -1;
      const pulseAge = pulse > 0 ? Math.max(0, age - Number(info.pulseAt)) : 999;
      const flash = pulseAge < .22 ? (pulseAge < .038 ? 1 : (1 - clamp((pulseAge - .038) / .182)) ** 1.5) : 0;
      const fade = (1 - clamp((age - 6.12) / .66)) ** 1.2, intro = ease(age / .34);
      const color = terminal ? GOLD : COLORS[Math.max(0, active)];
      const g = this.g, a = this.a;
      g.translate(384, 384); g.scale(320, 320);
      a.translate(480, 832); a.scale(960 / 2.8, 960 / 2.8);

      // Four intersecting seals occupy the former frame's 2R x 2R bounds.
      // The combat diamond is unchanged; no square decoration is rendered.
      for (let i=0;i<4;i++) {
        const [vx,vy]=EYES[i],lit=terminal||active===i,strength=lit?flash:0;
        this.spiritSeal(g,i,vx*SEAL_CENTER,-vy*SEAL_CENTER,age,strength,intro*fade);
      }
      this.ring(g,0,0,.14,GOLD,(.52+.30*flash)*intro*fade,.008);
      this.ring(g,0,0,.105,WHITE,.38*intro*fade,.004);
      this.glow(g,0,0,.17,GOLD,(.12+.22*flash)*intro*fade);

      if (terminal && flash) {
        this.glow(g,0,0,.25,WHITE,flash*.28*fade);
      }

      const eyes = [], introSwords = [];
      const eyeLength = high ? .34 : .30;
      for (let i = 0; i < 4; i++) {
        const [vx, vy] = EYES[i], c = COLORS[i], show = ease((age - i * .045) / .18);
        const isActive = pulse > 0 && (terminal || active === i), peak = isActive ? flash : 0;
        const localTime = age - i * .045, landing = clamp(localTime / .20);
        const lift = .48 * (1 - landing * landing);
        const tipX=vx*SEAL_CENTER,tipY=-vy*SEAL_CENTER;
        const angle=Math.PI/2,image=this.swordImage(i);
        if (localTime>=0 && landing<1) {
          this.sword(a,image,tipX,tipY-lift-eyeLength/2,eyeLength,angle,(.45+.55*show)*fade,c);
          introSwords.push({eye:i,x:tipX*radius,y:(-tipY+lift)*radius,
            length:eyeLength*radius,lift:lift*radius});
        } else if (landing>=1) {
          this.sword(a,image,tipX,tipY-eyeLength/2,eyeLength,angle,(.91+.09*peak)*fade,c);
          this.burst(g,tipX,tipY,localTime-.20,c,.32);
        }
        eyes.push({ x: vx * SEAL_CENTER * radius, y: vy * SEAL_CENTER * radius, active: isActive, peak,
          spirit:SPIRITS[i],sealRadius:SEAL_RADIUS*radius,sealAngle:age*TAU/24,
          swordTip:{x:tipX*radius,y:-tipY*radius},swordAngle:angle,
          swordLength: eyeLength * radius, color: c });
      }

      const nextAt = Number.isFinite(info.nextPulseAt) ? info.nextPulseAt : .5 + pulse * 2.5 / (count - 1);
      const lead = pulse + 1 === count ? .28 : .24;
      const pending = pulse < count && age >= nextAt - lead;
      let rainPhase = 'idle', rainPulse = 0, rainPoints = [], rainElements = [], rainLength = 0, rainProgress = 0;
      let rainSwords = [], landingOffsets = [];
      // Stable per-beat jitter: descent and impact share exactly the same landing point.
      const pointsFor = n => (n === count ? FINAL_POINTS : POINTS).map(([x,y],i) => [
        x + Math.sin(n * 7.13 + i * 2.47) * .012,
        y + Math.cos(n * 5.71 + i * 3.19) * .012]);
      const drawRain = (n, elapsed) => {
        const end = n === count, points = pointsFor(n), length = end ? (high ? .58 : .53) : .46;
        rainPhase = elapsed < 0 ? 'anticipation' : 'impact'; rainPulse = n;
        rainLength = length * radius; rainProgress = clamp((elapsed + .16) / .16);
        rainPoints = points.map(([x,y]) => ({x:x*radius,y:y*radius}));
        rainElements = points.map(([x,y]) => SPIRITS[this.elementAt(x,y)]);
        rainSwords = []; landingOffsets = [];
        for (const [i,[x,y]] of points.entries()) {
          // Five 40ms waves interleave the four seals, centered on the real damage beat.
          const offset = end ? 0 : ((i % 5 * 2 + Math.floor(i / 5) + n) % 5) * .04 - .08;
          const local = elapsed - offset, progress = clamp((local + .16) / .16);
          const element=this.elementAt(x,y), swordColor=COLORS[element];
          const phase = local >= 0 ? 'impact' : local >= -.16 ? 'falling' : end ? 'hover' : 'waiting';
          landingOffsets.push(offset); rainSwords.push({phase,progress,landingOffset:offset});
          if (phase === 'waiting') continue;
          if (local < 0) {
            const drop = .7 * (1 - progress * progress);
            const alpha = (end && phase === 'hover' ? .38 * ease((elapsed + .28)/.04) : .38 + .62 * ease(progress)) * fade;
            const tx=x-.09*drop,ty=-y-drop;
            this.ring(g,x,-y,.045+.025*progress,swordColor,(.20+.27*progress)*fade,.005);
            this.stroke(a,swordColor,.024,alpha*.27,p=>{p.moveTo(tx,ty-length);p.lineTo(tx,ty);});
            this.fallingSword(a,this.swordImage(element),tx,ty,length,alpha,swordColor,element);
          } else if (local < .19) {
            const hold = local < .04 ? 1 : (1-clamp((local-.04)/.15))**1.25;
            this.fallingSword(a,this.swordImage(element),x,-y+.026*ease(local/.19),length,hold*fade,swordColor,element);
            this.burst(g,x,-y,local,swordColor,end?.7:.55);
            this.elementImpact(g,x,-y,local,element,fade);
          }
        }
      };
      if (pending) drawRain(pulse+1,age-nextAt);
      if (pulse > 0 && pulseAge < (terminal ? .19 : .27)) drawRain(pulse,pulseAge);
      const hitPoints = (info.hitPoints || []).filter(p => Number.isFinite(p.x + p.y + p.radius));
      if (pulseAge < .23) for (const hit of hitPoints) {
        this.burst(a, hit.x / radius, -hit.y / radius, pulseAge, COLORS[this.elementAt(hit.x/radius,hit.y/radius)], .66);
        this.glow(a, hit.x / radius, -hit.y / radius - Math.min(.12, hit.radius / radius * .5),
          .13, WHITE, flash * .8 * fade);
      }
      if (terminal && pulseAge < .26) {
        const strength = (1 - clamp(pulseAge / .26)) ** 1.3 * fade;
        for (let i = 0; i < 4; i++) {
          const [vx, vy] = EYES[i];
          this.stroke(a, COLORS[i], .03, strength * .6, p => { p.moveTo(vx * .31, -vy * .31); p.lineTo(0, 0); });
          this.stroke(a, WHITE, .009, strength * .88, p => { p.moveTo(vx * .31, -vy * .31); p.lineTo(0, 0); });
        }
        this.glow(a, 0, 0, high ? .44 : .36, GOLD, strength * .75);
        this.glow(a, 0, 0, .13, WHITE, strength * .94);
      }
      this.last = {
        visible: true, age, radius, shape: 'diamond', pulseIndex: pulse, pulseCount: count,
        terminal, eyes, introSwords, actualHitPoints: hitPoints.map(p => ({ ...p })),
        vertices: EYES.map(([x, y]) => ({ x: x * radius, y: y * radius })),
        logicalDiamondRadiusPx: 320, worldDiameter: radius * 2.4,
        visualOnlyAfter: 6, visualEnd: 6.78, fade,
        layers: {
          ground: { canvasWidth: 768, canvasHeight: 768, worldWidth: 2.4 * radius, worldHeight: 2.4 * radius, anchorX: .5, anchorY: .5 },
          air: { canvasWidth: 960, canvasHeight: 1280, worldWidth: 2.8 * radius, worldHeight: 2.8 * 1280 / 960 * radius, anchorX: .5, anchorY: .35 },
        },
        swordRain: { phase: rainPhase, pulseIndex: rainPulse, points: rainPoints, elements:rainElements, bodyLength: rainLength,
          dropHeight: .7 * radius, progress: rainProgress, leadSeconds: rainPulse === count ? .28 : .24, impactHeldSeconds: .04,
          landingOffsets, swords: rainSwords, staggerSeconds: .04, finaleHoverSeconds: .12 },
      };
      return this.last;
    }
  }
