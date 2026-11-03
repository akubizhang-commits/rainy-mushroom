#!/usr/bin/env python3
"""Derive runtime geometry from preserved Scenario casting videos; never edit originals."""
from pathlib import Path
import json, subprocess, math, hashlib
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'design/xianxia-sword-seal-cast-2026-11-01'
OUT=BASE/'production'
CELL=512
ANCHOR=np.array([258.,441.])

def key_and_remove(im, side):
    a=np.array(im.convert('RGB'),dtype=float)
    h,w=a.shape[:2]
    # Fit the exposed straight blade only, away from sleeves and fingers.
    xs=range(610,665,4) if side=='right' else range(115,205,4)
    points=[]
    for x in xs:
        col=a[280:440,x]
        found=np.where((col[:,1]-np.maximum(col[:,0],col[:,2])<35)&(np.min(col,axis=1)>70))[0]
        if len(found):points.append((x,float(np.median(found))+280))
    if len(points)<12:raise ValueError(f'No reliable {side} blade fit')
    points=np.array(points);slope,intercept=np.polyfit(points[:,0],points[:,1],1)
    if np.max(np.abs(points[:,1]-(slope*points[:,0]+intercept)))>7:raise ValueError('Blade fit drift')
    gx=342 if side=='right' else 234
    guard=np.array([gx,slope*gx+intercept])
    tipx=695 if side=='right' else 65
    tip=np.array([tipx,slope*tipx+intercept])
    d=tip-guard;d=d/np.linalg.norm(d);n=np.array([-d[1],d[0]])
    yy,xx=np.mgrid[:h,:w];pts=np.stack([xx,yy],axis=-1)
    along=np.sum((pts-guard)*d,axis=-1);cross=np.sum((pts-guard)*n,axis=-1)
    radius=12
    mask=(along>=0)&(along<=np.linalg.norm(tip-guard))&(np.abs(cross)<radius)
    center=pts-cross[...,None]*n
    p1=np.rint(center+(radius+6)*n).astype(int);p2=np.rint(center-(radius+6)*n).astype(int)
    c1=a[np.clip(p1[:,:,1],0,h-1),np.clip(p1[:,:,0],0,w-1)]
    c2=a[np.clip(p2[:,:,1],0,h-1),np.clip(p2[:,:,0],0,w-1)]
    weight=np.clip((cross+radius+6)/(2*(radius+6)),0,1)[...,None]
    filled=c1*weight+c2*(1-weight)
    a[mask]=filled[mask]
    r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    alpha=np.clip(1-(g-np.maximum(r,b)-8)/95,0,1)
    a[:,:,1]=np.minimum(g,np.maximum(r,b)+3)
    rgba=np.dstack([a,alpha*255]).clip(0,255).astype('uint8')
    rgba[alpha<.01,:3]=0
    return Image.fromarray(rgba),guard,d

def main():
    OUT.mkdir(exist_ok=True)
    frames=[];images=[];clips={};sources={}
    times={
      'right':{'Windup':[2.25,2.42,2.58,2.75,2.92,3.08,3.25,3.42],
               'Hold':[3.6,3.85],'Recovery':[.58,.75,.92,1.08,1.25,1.42,1.58,1.75]},
      'left':{'Windup':[1.67,1.79,1.92,2.04,2.17,2.29,2.42,2.54],
              'Hold':[2.75,3.0],'Recovery':[3.75,3.92,4.08,4.25,4.42,4.58,4.75,4.92]}}
    for side,folder in [('right','attempt-01'),('left','left-attempt-01')]:
        source=BASE/folder/'source.mp4'
        sources[side]={'path':str(source.relative_to(ROOT)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
        native=OUT/f'{side}-native';native.mkdir(exist_ok=True)
        for phase,stamps in times[side].items():
            indices=[]
            for k,time in enumerate(stamps):
                path=native/f'{phase}-{k:02}.png'
                if not path.exists():
                    subprocess.run(['ffmpeg','-v','error','-ss',str(time),'-i',str(source),'-frames:v','1',str(path)],check=True)
                clean,guard,d=key_and_remove(Image.open(path),side)
                # Constant transform per direction; never per-frame auto-fit.
                scale=.5
                source_anchor=np.array([391.,820.]) if side=='right' else np.array([383.,824.])
                offset=ANCHOR-source_anchor*scale
                canvas=Image.new('RGBA',(CELL,CELL))
                small=clean.resize((round(clean.width*scale),round(clean.height*scale)),Image.Resampling.LANCZOS)
                canvas.paste(small,tuple(np.rint(offset).astype(int)))
                index=len(frames);indices.append(index)
                frames.append({'x':index%6*CELL,'y':index//6*CELL,'w':CELL,'h':CELL,
                  'guard':(guard*scale+offset).round(3).tolist(),
                  'grip':((guard-d*25)*scale+offset).round(3).tolist(),
                  'direction':d.round(6).tolist(),'source':side,'sourceTime':time})
                images.append(canvas)
            clips[side+phase]={'frames':indices,'fps':12,'loop':phase=='Hold'}
    sheet=Image.new('RGBA',(CELL*6,math.ceil(len(frames)/6)*CELL))
    for frame,im in zip(frames,images):sheet.paste(im,(frame['x'],frame['y']))
    sheet.save(OUT/'seal-actions.png',optimize=True)
    manifest={'version':1,'width':sheet.width,'height':sheet.height,'cellWidth':CELL,'cellHeight':CELL,
      'anchor':ANCHOR.tolist(),'bodyHeight':370,'facing':'right','frames':frames,'clips':clips,'sources':sources}
    (OUT/'seal-actions.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    # Review independent equipment blade over repaired source at native and game sizes.
    review=Image.new('RGB',(4*256,math.ceil(len(frames)/4)*280),'#233d35')
    for i,(frame,im) in enumerate(zip(frames,images)):
        preview=im.copy();draw=ImageDraw.Draw(preview)
        g=np.array(frame['guard']);d=np.array(frame['direction']);n=np.array([-d[1],d[0]])
        length=72/(108/370);half=2.5/(108/370);end=g+d*length
        draw.polygon([tuple(g+n*half),tuple(end-d*12+n*half),tuple(end),tuple(end-d*12-n*half),tuple(g-n*half)],fill='#e1e8ef')
        preview.thumbnail((256,256));x=i%4*256;y=i//4*280
        review.paste(preview,(x,y),preview)
        ImageDraw.Draw(review).text((x+6,y+256),f'{frame["source"]} {frame["sourceTime"]:.2f}',fill='white')
    review.save(OUT/'contact.jpg')
    print(json.dumps({'frames':len(frames),'atlas':sheet.size,'clips':{k:len(v['frames']) for k,v in clips.items()}}))

if __name__=='__main__':main()
