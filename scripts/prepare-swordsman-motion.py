#!/usr/bin/env python3
"""Prepare approved videos into anchored RGBA frames; never modifies source videos.
Requires numpy/Pillow and ffmpeg. Runtime manifest tracks source frame IDs and poses.
"""
import json, math, subprocess, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'design/xianxia-grounded-character-2026-10-28/continuation/resumed-2026-10-29'
OUT=ROOT/'design/xianxia-grounded-character-2026-10-28/production'
OUT.mkdir(parents=True,exist_ok=True)
SCALE=4/15; OFFSET=np.array([240,420]); CELL=(256,384); ANCHOR=(np.array([260,650])+OFFSET)*SCALE

def repair(im,pose):
    a=np.array(im.convert('RGB'),dtype=float); original=a.copy(); h,w=a.shape[:2]
    yy,xx=np.mgrid[:h,:w]; pts=np.stack([xx,yy],axis=-1)
    segments=pose.get('removeSegments',[[pose['guard'],pose['tip'],19]])
    for start,end,width in segments:
        start=np.array(start,dtype=float);end=np.array(end,dtype=float);v=end-start;length=np.linalg.norm(v)
        if length<1:continue
        d=v/length;n=np.array([-d[1],d[0]]);along=np.sum((pts-start)*d,axis=-1);cross=np.sum((pts-start)*n,axis=-1)
        # Wide enough to remove guard; narrower shaft. Preserve hand behind guard.
        radius=np.where(along<18,width*.85,width*.50)
        mask=(along>=-5)&(along<=length+8)&(np.abs(cross)<=radius)
        sample=radius+6
        center=pts-cross[...,None]*n
        p1=np.rint(center+sample[...,None]*n).astype(int);p2=np.rint(center-sample[...,None]*n).astype(int)
        c1=original[np.clip(p1[:,:,1],0,h-1),np.clip(p1[:,:,0],0,w-1)]
        c2=original[np.clip(p2[:,:,1],0,h-1),np.clip(p2[:,:,0],0,w-1)]
        weight=np.clip((cross+sample)/(2*sample),0,1)[...,None]
        filled=c1*weight+c2*(1-weight)
        a[mask]=filled[mask]
    # Green screen removal and despill, retaining soft white hair edges.
    r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]; excess=g-np.maximum(r,b)
    alpha=np.clip(1-(excess-8)/105,0,1)
    a[:,:,1]=np.minimum(g,np.maximum(r,b)+3)
    result=np.dstack([a,alpha*255]).clip(0,255).astype('uint8')
    result[alpha<.01,:3]=0
    return Image.fromarray(result,'RGBA')

def point(p, offset=OFFSET):return [round(float(v),4) for v in (np.array(p)+offset)*SCALE]

def main():
    manifests={k:json.loads((OUT/f'{k}-track.json').read_text()) for k in ('walk','run','slash')}
    frames=[]; images=[]; clips={}
    with tempfile.TemporaryDirectory(prefix='swordsman-') as td:
        for name in ['walk','run','slash']:
            subprocess.run(['ffmpeg','-v','error','-i',str(SOURCE/f'{name}.mp4'),'-vf','fps=12',f'{td}/{name}-%03d.png'],check=True)
            poses=manifests[name]['frames']
            if name=='walk':
                poses=[{'src':1,'grip':[190,376],'guard':[213,398],'tip':[425,555]}]+poses
            for pose in poses:
                im=Image.open(f'{td}/{name}-{pose["src"]:03d}.png');clean=repair(im,pose)
                offset=OFFSET+np.array([0,27 if name=='run' else 0])
                canvas=Image.new('RGBA',(960,1440));canvas.paste(clean,tuple(offset),None)
                cell=canvas.resize(CELL,Image.Resampling.LANCZOS)
                index=len(frames);d=np.array(pose['tip'])-np.array(pose['guard']);d=d/max(1,np.linalg.norm(d))
                frames.append({'x':(index%8)*CELL[0],'y':(index//8)*CELL[1],'w':CELL[0],'h':CELL[1],
                  'grip':point(pose['grip'],offset),'guard':point(pose['guard'],offset),'direction':d.round(6).tolist(),'source':name,'sourceFrame':pose['src']})
                images.append(cell)
            clips[name]={'frames':list(range(len(frames)-len(poses),len(frames))),'fps':12,'loop':name!='slash'}
    clips['idle']={'frames':[clips['walk']['frames'].pop(0)],'fps':1,'loop':True}
    clips['slash']['hitFrame']=8
    atlas=Image.new('RGBA',(2048,math.ceil(len(frames)/8)*CELL[1]))
    for f,im in zip(frames,images):atlas.paste(im,(f['x'],f['y']))
    atlas.save(OUT/'ground-actions.png',optimize=True)
    manifest={'version':1,'width':atlas.width,'height':atlas.height,'cellWidth':CELL[0],'cellHeight':CELL[1],
      'anchor':ANCHOR.round(4).tolist(),'bodyHeight':160,'facing':'right','frames':frames,'clips':clips}
    (OUT/'ground-actions.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    # Contact sheets show composite with the same independent blade contract.
    for name,clip in clips.items():
        sheet=Image.new('RGB',(768,math.ceil(len(clip['frames'])/4)*240),'#24443e')
        for k,idx in enumerate(clip['frames']):
            f=frames[idx];im=images[idx].copy();draw=ImageDraw.Draw(im)
            gx,gy=f['guard'];dx,dy=f['direction'];nx,ny=-dy,dx;end=(gx+dx*72,gy+dy*72)
            draw.polygon([(gx+nx*2,gy+ny*2),end,(gx-nx*2,gy-ny*2)],fill='#b8deed')
            draw.line([(gx+nx*6,gy+ny*6),(gx-nx*6,gy-ny*6)],fill='#c4beaa',width=2)
            im.thumbnail((160,220));x=k%4*192;y=k//4*240;sheet.paste(im,(x,y),im);ImageDraw.Draw(sheet).text((x+8,y+220),f'{name} {f["sourceFrame"]}',fill='white')
        sheet.save(OUT/f'{name}-contact.jpg')
    print(json.dumps({'frames':len(frames),'atlas':atlas.size,'clips':{k:len(v['frames']) for k,v in clips.items()}}))
if __name__=='__main__':main()
