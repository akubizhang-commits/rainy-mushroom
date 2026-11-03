"""Local paper-background extraction of approved monster samples; no generation/API.
Keeps originals intact. Threshold matte is reviewable, not a claim of perfect matting.
"""
from pathlib import Path
from collections import deque
import json, hashlib
from PIL import Image, ImageFilter, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
src=ROOT/'design/xianxia-monster-demonic-2026-10-28'
out=ROOT/'cocos-pilot/assets/resources/tower-monsters'
proof=src/'runtime-preparation'
out.mkdir(parents=True,exist_ok=True); proof.mkdir(exist_ok=True)
families=['boar','wolf','bear','tiger','ape','snake','crocodile','scorpion','centipede']
records=[]; sheet=Image.new('RGB',(3*360,3*320),'#243c37'); draw=ImageDraw.Draw(sheet)
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
        if distance>72: continue
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
    rgba=rgba.crop(box);rgba.thumbnail((232,232),Image.Resampling.LANCZOS)
    tile=Image.new('RGBA',(256,256));tile.alpha_composite(rgba,((256-rgba.width)//2,(256-rgba.height)//2))
    path=out/f'{family}.png';tile.save(path)
    x,y=(n%3)*360,(n//3)*320
    sheet.paste(tile,(x+52,y+20),tile);draw.text((x+20,y+282),family,fill='white')
    records.append({'family':family,'source':str((src/f'{family}-demonic.png').relative_to(ROOT)),'sourceSize':[w,h],'background':bg,'crop':box,'output':str(path.relative_to(ROOT)),'size':[256,256],'alphaExtrema':tile.getchannel('A').getextrema(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
sheet.save(proof/'dark-background-contact.png')
(proof/'manifest.json').write_text(json.dumps({'method':'Local exterior-connected paper matte, max RGB difference 72; antialiased edge; original generated art preserved. Baked dark shadows may remain. Static art only.','images':records},ensure_ascii=False,indent=2)+'\n')
print('Prepared',len(records),'RGBA sprites and contact sheet')
