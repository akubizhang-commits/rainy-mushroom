"""Local paper-background extraction of approved monster samples; no generation/API.
Keeps originals intact. Threshold matte is reviewable, not a claim of perfect matting.
"""
from pathlib import Path
from collections import deque
import json, hashlib
from PIL import Image, ImageFilter, ImageDraw
ROOT=Path.cwd()
src=ROOT/'design/xianxia-monster-demonic-2026-10-28'
out=ROOT/'design/xianxia-tiger-walk-meowa'
proof=out
out.mkdir(parents=True,exist_ok=True); proof.mkdir(exist_ok=True)
families=['tiger']
for n,family in enumerate(families):
    im=Image.open(src/f'{family}-demonic.png').convert('RGB')
    w,h=im.size; pix=im.load()
    corners=[pix[x,y] for x,y in [(5,5),(w-6,5),(5,h-6),(w-6,h-6)]]
    bg=tuple(sorted(c[i] for c in corners)[2] for i in range(3))
    # Exterior-connected low-contrast paper and pale baked shadow only.
    visited=bytearray(w*h); q=deque()
    for x in range(w): q.extend([x,(h-1)*w+x])
    for y in range(h): q.extend([y*w,y*w+w-1])
    seeds={"snake":[(.65,.70)],"scorpion":[(.44,.66)]}
    for fx,fy in seeds.get(family,[]): q.append(int(fy*h)*w+int(fx*w))
    while q:
        k=q.popleft()
        if visited[k]: continue
        x,y=k%w,k//w
        c=pix[x,y]
        distance=max(abs(c[i]-bg[i]) for i in range(3))
        # Near-white highlights are protected once separated from the exterior.
        if distance>45: continue
        visited[k]=1
        if x:q.append(k-1)
        if x<w-1:q.append(k+1)
        if y:q.append(k-w)
        if y<h-1:q.append(k+w)
    mask=Image.frombytes('L',(w,h),bytes(0 if x else 255 for x in visited))
    # Remove tiny detached compression/shadow flecks, keep separate thin appendages.
    mp=mask.load(); seen=bytearray(w*h)
    for k in range(w*h):
        if visited[k] or seen[k]: continue
        component=[]; todo=[k]; seen[k]=1
        while todo:
            a=todo.pop(); component.append(a); x,y=a%w,a//w
            for b in ([a-1] if x else [])+([a+1] if x<w-1 else [])+([a-w] if y else [])+([a+w] if y<h-1 else []):
                if not visited[b] and not seen[b]:seen[b]=1;todo.append(b)
        if len(component)<max(5,w*h//30000):
            for a in component:mp[a%w,a//w]=0
    mask=mask.filter(ImageFilter.GaussianBlur(.45))
    box=mask.getbbox(); rgba=im.convert('RGBA');rgba.putalpha(mask)
    rgba=rgba.crop(box);rgba.thumbnail((440,440),Image.Resampling.LANCZOS)
    tile=Image.new('RGBA',(512,512));tile.alpha_composite(rgba,((512-rgba.width)//2,(512-rgba.height)//2))
    tile.save(out/'reference-alpha.png')
    green=Image.new('RGBA',tile.size,'#00FF00');green.alpha_composite(tile);green.convert('RGB').save(out/'reference-green.png')
    (out/'preflight.json').write_text(json.dumps({'source':str(src/f'{family}-demonic.png'),'sourceSha256':hashlib.sha256((src/f'{family}-demonic.png').read_bytes()).hexdigest(),'sourceSize':im.size,'referenceSize':tile.size,'alphaBounds':tile.getchannel('A').getbbox(),'creditsBefore':20,'runtimeIntegrated':False},indent=2))
