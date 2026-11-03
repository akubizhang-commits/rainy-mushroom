/** Approved golden-core v4 choreography; outcome is neutral until two seconds. */
export function createJindanPainter(canvas,images){
const ctx=canvas.getContext("2d"),settings={effects:true,reduced:false,light:false,success:true};
const CORE_CENTER={x:624,y:464};
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function image(name,x,y,w,h,alpha=1){ctx.save();ctx.globalAlpha=clamp(alpha);ctx.drawImage(images[name],x,y,w,h);ctx.restore()}
function ellipse(x,y,rx,ry,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.stroke()}
function glow(x,y,r,color,alpha){
 const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
 gradient.addColorStop(0,`rgba(${color},${alpha})`);gradient.addColorStop(.25,`rgba(${color},${alpha*.5})`);
 gradient.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function streamPoint(i,u,t){
 const compression=smooth((t-1.58)/.28);
 const angle=i*Math.PI*2/8+.32+Math.sin(i*7.3)*.17+u*(.7+i%3*.15)+.04*Math.sin(t*1.1+i);
 const r=(435+i%3*44)*Math.pow(1-u,.9)*(1-compression*.72);
 return [CORE_CENTER.x+Math.cos(angle)*r,CORE_CENTER.y+Math.sin(angle)*r*(.47+i%2*.1)-35*Math.sin(u*Math.PI)];
}
function gathering(t,g,front=false){
 const compression=smooth((t-1.65)/.30);
 const power=smooth(t/.38)*(1-smooth((t-1.64)/.24));
 const stored=smooth((t-.28)/1.38);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 if(front){
   // Incoming tips and stored light stay below the face, near the hands.
   ctx.beginPath();ctx.rect(0,411,1280,309);ctx.clip();
 }else glow(CORE_CENTER.x,CORE_CENTER.y,180,'123,207,245',stored*.06);
 for(let i=0;i<8;i++){
   const head=(t*(.44+i%3*.045)+t*t*.18+i*.137)%1;
   const start=Math.max(front?.68:0,head-(.44+i%3*.075));
   const end=Math.min(head,front?1:.84);
   if(end<=start)continue;
   // Wide soft envelope, narrower cyan ribbon and a fine bright core.
   const [sx,sy]=streamPoint(i,start,t),[ex,ey]=streamPoint(i,end,t);
   for(const [width,strength] of [[30,.045],[15,.07],[5,.16],[1.25,.65]]){
     const alpha=power*strength*(.45+.85*g)*Math.sin((start+end)/2*Math.PI)*(front?.72:1);
     const gradient=ctx.createLinearGradient(sx,sy,ex,ey);
     gradient.addColorStop(0,'rgba(232,204,146,0)');
     gradient.addColorStop(.38,`rgba(232,204,146,${alpha*.65})`);
     gradient.addColorStop(.8,`rgba(255,243,211,${alpha})`);
     gradient.addColorStop(1,'rgba(255,243,211,0)');
     ctx.strokeStyle=gradient;ctx.lineWidth=width;
     ctx.beginPath();
     for(let j=0;j<=64;j++){
       const u=start+(end-start)*j/64,[x,y]=streamPoint(i,u,t);
       if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
     }ctx.stroke();
   }
   // A softer secondary filament gives each stream width and internal movement.
   ctx.strokeStyle=`rgba(247,223,168,${power*.12})`;ctx.lineWidth=1;
   ctx.beginPath();
   for(let j=0;j<=64;j++){
     const u=start+(end-start)*j/64,[x,y]=streamPoint(i,u,t);
     const offset=Math.sin(j/64*Math.PI)*9*Math.sin(u*9-t*3+i);
     if(!j)ctx.moveTo(x,y);else ctx.lineTo(x+offset*.5,y+offset);
   }
   ctx.stroke();
 }
 // Staggered, finite-lived motes accelerate inward and disappear on arrival.
 // Split by depth so distant motes stay behind the face and incoming tips
 // remain visible near the hands. All motes finish before the burst.
 for(let i=0;i<64;i++){
   const birth=.04+i/64*.95,life=.68+i%7*.033,p=(t-birth)/life;
   if(p<=0||p>=1)continue;
   const u=Math.pow(p,1.6);
   if(front!==(u>.7))continue;
   const point=q=>{
     const k=Math.pow(Math.max(0,q),1.6),angle=i*2.399963+.52*k;
     const r=(285+i%6*32)*(1-k);
     return [CORE_CENTER.x+Math.cos(angle)*r,CORE_CENTER.y+Math.sin(angle)*r*.54-22*Math.sin(k*Math.PI)];
   };
   const [x,y]=point(p),[tx,ty]=point(p-.022);
   const alpha=smooth(p/.13)*(1-smooth((p-.83)/.17))*(.55+i%3*.1);
   const radius=(1.25+i%4*.32)*(1-u*.55);
   glow(x,y,radius*4.5,'255,191,75',alpha*.43);
   ctx.strokeStyle=`rgba(255,202,105,${alpha*.42})`;ctx.lineWidth=radius*.7;
   ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(x,y);ctx.stroke();
   ctx.fillStyle=`rgba(255,219,137,${alpha})`;
   ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
 }
 if(front){
   // The gathered energy remains through the hold instead of fading to nothing.
   const radius=(24+stored*21)*(1-compression*.60);
   glow(CORE_CENTER.x,CORE_CENTER.y,radius*2.1,'146,218,252',stored*(.13+compression*.08));
   glow(CORE_CENTER.x,CORE_CENTER.y,radius,'255,242,207',stored*(.28+compression*.2));
   for(let i=0;i<3;i++){
     ctx.beginPath();
     for(let j=0;j<=48;j++){
       const a=t*(1.3-compression*.9)+i*2.1+j/48*1.8;
       const r=radius*(.65+.23*Math.sin(a+i));
       const x=CORE_CENTER.x+Math.cos(a)*r,y=CORE_CENTER.y+Math.sin(a)*r*.55;
       if(!j)ctx.moveTo(x,y);else ctx.lineTo(x,y);
     }
     ctx.strokeStyle=`rgba(186,236,255,${stored*(.16+compression*.12)})`;ctx.lineWidth=.9;ctx.stroke();
   }
 }
 ctx.restore();
}
function shockwave(t,front){
 const age=t-2;if(age<0||age>.65)return;
 const p=age/.65,eased=1-Math.pow(1-p,2.4),radius=135+440*eased;
 const fade=Math.pow(1-p,1.5)*smooth(age/.035);
 ctx.save();ctx.translate(640,570);ctx.scale(1,.29);
 // Split rear/front semicircles so the ground wave passes around the character.
 ctx.beginPath();ctx.rect(-650,front?0:-650,1300,650);ctx.clip();
 const width=54*(1-p)+9;
 const band=ctx.createRadialGradient(0,0,Math.max(0,radius-width*1.8),0,0,radius+width*.45);
 band.addColorStop(0,'rgba(245,193,100,0)');
 band.addColorStop(.42,`rgba(246,199,117,${fade*.12})`);
 band.addColorStop(.69,`rgba(255,219,158,${fade*.38})`);
 band.addColorStop(.84,`rgba(255,237,194,${fade*.78})`);
 band.addColorStop(.92,`rgba(255,221,152,${fade*.35})`);
 band.addColorStop(1,'rgba(245,193,100,0)');
 ctx.fillStyle=band;ctx.fillRect(-650,-650,1300,1300);
 ellipse(0,0,radius-width*.08,radius-width*.08,`rgba(255,237,198,${fade*.75})`,4+5*(1-p));
 ellipse(0,0,radius-width*.65,radius-width*.65,`rgba(243,207,148,${fade*.28})`,2);
 for(let i=0;i<40;i++){
   const a=i*2.39996,r=radius+Math.sin(i*17)*width*.65,x=Math.cos(a)*r,y=Math.sin(a)*r;
   ctx.strokeStyle=`rgba(255,225,167,${fade*(.18+i%3*.12)})`;ctx.lineWidth=1+i%3;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*(5+i%5*3),y+Math.sin(a)*(5+i%5*3));ctx.stroke();
 }
 ctx.restore();
}
function draw(t,options={}){
 Object.assign(settings,{effects:true,reduced:false,light:false,success:true},options);
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.scale(canvas.width/1280,canvas.height/720);
 const bg=ctx.createRadialGradient(640,370,30,640,370,760);
 bg.addColorStop(0,settings.light?'#abbcc9':'#233549');bg.addColorStop(1,settings.light?'#e0e4e7':'#070e18');
 if(options.background!==false){ctx.fillStyle=bg;ctx.fillRect(0,0,1280,720);}
 const gather=smooth(t/1.65),burst=settings.success?smooth((t-2)/.1)*(1-smooth((t-2.38)/.38)):0;
 const tail=settings.success?1-smooth((t-2.65)/1.05):1-smooth((t-2)/.65),quiet=settings.reduced;
 // Ground remains at the seated character's foot baseline.
 ctx.save();ctx.fillStyle='rgba(0,0,0,.22)';ctx.filter='blur(12px)';
 ctx.beginPath();ctx.ellipse(640,578,154,27,0,0,Math.PI*2);ctx.fill();ctx.restore();
 if(settings.effects){
   let size=quiet?560:440+110*gather+48*burst;
   const opacity=(.12+.48*gather+.34*burst)*tail;
   ctx.save();ctx.translate(640,568);ctx.scale(1,.32);
   ctx.rotate(quiet?0:t*.075);image('dao',-size/2,-size/2,size,size,opacity);ctx.restore();
   // Golden core: outward revelation around the seated figure, no sky beam.
   if(t>=2&&settings.success){
     const open=quiet?1:smooth((t-2)/.28),decay=1-smooth((t-2.65)/.85);
     const size=330+250*open;
     ctx.save();ctx.translate(640,354);ctx.rotate(quiet?0:(t-2)*.09);
     image('dao',-size/2,-size/2,size,size,(.12+.54*decay)*open);ctx.restore();
     glow(640,400,220,'250,203,111',open*decay*.12);
   }
   if(t<2&&!quiet)gathering(t,gather);
   if(!quiet&&settings.success)shockwave(t,false);
 }
 // No synthetic body warping: static approved master until breathing is available.
 const heroHeight=399,heroWidth=heroHeight*images.hero.width/images.hero.height;
 image('hero',640-heroWidth/2,582-heroHeight,heroWidth,heroHeight);
 if(settings.effects&&!quiet){if(t<2)gathering(t,gather,true);if(settings.success)shockwave(t,true);}
 if(settings.effects&&settings.success&&t>=2){
   const grow=smooth((t-2)/.72),condense=smooth((t-2.72)/.63);
   const size=(6+120*grow)*(1-condense)+49*condense;
   const solid=smooth((t-2.32)/.96),appear=smooth((t-2)/.09);
   const {x:cx,y:cy}=CORE_CENTER;
   // Fixed above the joined thumbs. Body opacity stays full even at seed size.
   glow(cx,cy,(3+37*grow)*(1-condense)+17*condense,'255,213,117',appear*(.43-.21*solid));
   if(t<2.4){
     ctx.fillStyle=`rgba(255,226,154,${appear*(1-smooth((t-2.15)/.25))})`;
     ctx.beginPath();ctx.ellipse(cx,cy,1.2+grow,2+grow*1.5,0,0,Math.PI*2);ctx.fill();
   }
   image('core',cx-size/2,cy-size/2,size,size,1);
 }
 if(settings.effects&&settings.success&&t>=2&&t<3.65){
   const fade=1-smooth((t-2.5)/1.15);
   for(let i=0;i<16;i++){
     const a=i*2.39996,x=640+Math.cos(a)*(105+i%4*28),y=548-i%5*53-(t-2)*(18+i%3*7);
     ctx.fillStyle=`rgba(${i%3?'246,228,181':'255,241,207'},${fade*.6})`;
     ctx.beginPath();ctx.arc(x,y,quiet?1:1+i%2*.6,0,Math.PI*2);ctx.fill();
   }
 }
 if(settings.effects&&!settings.success&&t>=2&&t<2.65){ctx.save();ctx.globalAlpha=1-smooth((t-2)/.65);gathering(1.999,1,true);ctx.restore();}
 if(options.labels!==false){
 ctx.textAlign='center';ctx.fillStyle=settings.light?'#384b60':'#b9cddf';
 ctx.save();ctx.globalAlpha=1-burst*.85;
 ctx.font='16px system-ui';ctx.fillText('金 丹 · 凝 神 破 境',640,79);
 ctx.font='14px system-ui';ctx.fillStyle=settings.light?'#54657a':'#8fa6b9';
 ctx.fillText(t<1.65?'引灵入体':t<2?'凝气归元':t<2.72?'灵光渐聚':t<3.35?'收凝成丹':t<3.5?'丹息已定':'',640,111);
 ctx.restore();
 if(t>=3.5&&settings.success){
   ctx.save();ctx.globalAlpha=smooth((t-3.5)/.35);ctx.fillStyle=settings.light?'#796137':'#ead6a7';
   ctx.font='30px serif';ctx.fillText('金 丹 已 成',640,656);ctx.restore();
 }
 }
}

return {draw};
}
