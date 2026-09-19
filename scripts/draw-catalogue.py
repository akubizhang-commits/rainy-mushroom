"""Original schematic plates, drawn from geometry; no external image pixels copied.
Run after exporting EXPANDED_SPECIES to /tmp/rainy-catalogue.json.
"""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw
species=json.loads(Path('/tmp/rainy-catalogue.json').read_text())
for s in species:
 # Historical schematic export must never overwrite the real photo paths.
 s['photos']=[f"assets/exploration/catalogue/{s['id']}-{i}.png" for i in (0,1)]
 for view in (0,1):
  im=Image.new('RGB',(640,420),'#eee9da');d=ImageDraw.Draw(im)
  cap=s['style']['cap'];stem=s['style']['stem'];shape=s['style']['shape']
  d.ellipse((105,315,535,370),fill='#d8d9c5')
  d.line((35,377,605,377),fill='#a6b29a',width=3)
  if shape in ('fan','hoof'):
   d.rounded_rectangle((120,80,200,342),20,fill='#7e634c')
   for k in range(8):
    x=128+k*9
    d.line([(x,94),(x+5,175),(x-3,260),(x+2,331)],fill='#594b3e',width=2)
   if view:
    # A large underside, rather than dots over the same cap silhouette.
    bounds=(170,100,550,324)
    d.ellipse(bounds,fill=stem,outline=cap,width=6)
    if s['id']=='pleurotus-ostreatus':
     root=(182,212)
     for k in range(49):
      a=-math.pi*.49+k/48*math.pi*.98
      end=(360+184*math.cos(a),212+105*math.sin(a))
      mid=(260+85*math.cos(a),212+53*math.sin(a))
      pts=[]
      for j in range(25):
       t=j/24
       pts.append(((1-t)**2*root[0]+2*t*(1-t)*mid[0]+t*t*end[0],
                   (1-t)**2*root[1]+2*t*(1-t)*mid[1]+t*t*end[1]))
      d.line(pts,fill='#928976',width=2)
     d.rounded_rectangle((147,195,203,229),12,fill=stem,outline=cap,width=3)
    elif s['id'] in ('daedalea-quercina','daedaleopsis-confragosa'):
     for row in range(10):
      for col in range(16):
       x=207+col*20;y=126+row*18
       if ((x-360)/173)**2+((y-212)/94)**2<1:
        d.line([(x,y),(x+9,y+6),(x+5,y+14),(x+16,y+18)],fill=cap,width=4)
    else:
     for row in range(18):
      for col in range(31):
       x=183+col*12+(row%2)*6;y=111+row*12
       if ((x-360)/178)**2+((y-212)/99)**2<1:
        d.ellipse((x,y,x+3,y+4),fill=cap)
   else:
    count=7 if s['id']=='grifola-frondosa' else 3 if shape=='fan' else 1
    for n in range(count):
     y=122+n*(27 if count==7 else 65);left=164+(n%2)*18
     right=490-n*15;bottom=y+(84 if shape=='fan' else 170)
     d.ellipse((left,y+11,right,bottom+11),fill=stem,outline='#a49b83',width=3)
     d.ellipse((left,y,right,bottom),fill=cap,outline=stem,width=4)
     if s['id']=='pleurotus-ostreatus':
      # Fine radial cap fibres, a pale margin and a short lateral attachment.
      for k in range(15):
       a=-1.15+k/14*2.3
       d.line((left+18,(y+bottom)/2,(left+right)/2+(right-left)*.42*math.cos(a),
               (y+bottom)/2+(bottom-y)*.38*math.sin(a)),fill='#aaa393',width=1)
     else:
      for inset in (9,18,28):
       if right-left>inset*3 and bottom-y>inset*2:
        d.arc((left+inset,y+inset/2,right-inset,bottom-inset/2),-80,80,fill=stem,width=2)
  elif shape in ('puffball','earthstar'):
   if shape=='earthstar':
    pts=[(320+math.cos(i*math.pi/7)*(185 if i%2==0 else 75),280+math.sin(i*math.pi/7)*(66 if i%2==0 else 28)) for i in range(14)]
    d.polygon(pts,fill=stem)
   d.ellipse((218,140,422,325),fill=cap,outline=stem,width=4)
   for i in range(36):
    a=i*2.4;r=20+(i%5)*14;x=320+math.cos(a)*r;y=225+math.sin(a)*r
    d.ellipse((x,y,x+5,y+5),fill=stem)
   if view:d.ellipse((309,143,331,151),fill='#655d45')
  elif shape in ('cup','nest','funnel'):
   if shape=='funnel':d.rounded_rectangle((302,225,336,337),10,fill=stem)
   d.polygon([(165,200),(230,293),(405,293),(475,200)],fill=stem)
   d.ellipse((165,145,475,257),fill=cap,outline=stem,width=10)
   if shape=='nest':
    for i in range(5):
     x=255+(i%3)*45;y=182+(i//3)*30;d.ellipse((x,y,x+33,y+22),fill=stem,outline='#796348',width=2)
   elif view:
    for i in range(12):d.line((320,290,180+i*25,217),fill=cap,width=3)
  elif shape=='jelly':
   for i in range(16):
    x=210+(i%5)*34;y=175+(i//5)*32;d.ellipse((x,y,x+65,y+84),fill=cap,outline=stem,width=4)
  elif shape=='club':
   for i in range(5):
    x=235+i*35;h=100+(i%3)*28;d.rounded_rectangle((x,320-h,x+28,330),14,fill=cap,outline=stem,width=3)
  else:
   d.rounded_rectangle((293,202,349,339),16,fill=stem)
   if shape=='cone':d.rounded_rectangle((239,110,403,275),70,fill=cap,outline=stem,width=5)
   else:d.pieslice((155,90,485,317),180,360,fill=cap,outline=stem,width=4)
   if view:
    d.ellipse((159,185,481,240),fill=stem)
    if shape=='bolete':
     for i in range(75):
      a=i*2.4;r=20+(i%8)*16;x=320+math.cos(a)*r;y=212+math.sin(a)*r*.13;d.ellipse((x,y,x+4,y+3),fill='#9a9059')
    else:
     for i in range(24):d.line((320,215,169+i*13,210+int(18*math.sin(i/23*math.pi))),fill=cap,width=2)
   if s['id']=='suillus-luteus':d.ellipse((280,255,363,275),fill='#a28464')
  d.text((24,20),'ORIGINAL SCHEMATIC / '+('STRUCTURE' if view else 'FORM'),fill='#50624e')
  # Deliberately omit species names from plates used by the identification quiz.
  im.save(s['photos'][view])
Path('assets/exploration/catalogue/MANIFEST.json').write_text(json.dumps({'method':'Original code-drawn schematic plates; no source pixels copied; not field photographs','species':[{'id':s['id'],'sourceUrl':s['sourceUrl'],'files':s['photos']} for s in species]},ensure_ascii=False,indent=2))
