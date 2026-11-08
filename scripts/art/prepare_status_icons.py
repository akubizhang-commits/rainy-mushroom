"""Extract status-only silhouettes from approved skill art; never overwrite sources."""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'cocos-pilot/assets/resources/tower-status-icons'
OUT.mkdir(exist_ok=True)
for source,name in [('sj_mark','scar'),('sj_spirit','spirit')]:
    im=Image.open(ROOT/f'cocos-pilot/assets/resources/tower-skill-icons/{source}.png').convert('RGB')
    rgb=np.array(im).astype(float)
    # Cream paper is bright and nearly neutral. Preserve colored/dark artwork,
    # remove pale paper texture and unmix its color from antialiased edges.
    bg=np.array([250,243,225] if name=='scar' else [242,240,229])
    contrast=np.max(bg-rgb,axis=2)
    alpha=np.clip((contrast-24)/65,0,1)
    fg=np.clip((rgb-bg*(1-alpha[:,:,None]))/np.maximum(alpha[:,:,None],.001),0,255)
    rgba=np.dstack((fg,alpha*255)).astype('uint8')
    image=Image.fromarray(rgba)
    bounds=Image.fromarray((alpha>.15).astype('uint8')*255).getbbox()
    image=image.crop(bounds)
    image.thumbnail((120,120),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(128,128));canvas.alpha_composite(image,((128-image.width)//2,(128-image.height)//2))
    if name=='spirit':
        # A narrow gold silhouette rim survives downsampling to the HUD size.
        rim=canvas.getchannel('A').filter(ImageFilter.MaxFilter(7)).point(lambda a:min(220,a*2))
        outlined=Image.new('RGBA',canvas.size,(255,220,135,0));outlined.putalpha(rim)
        outlined.alpha_composite(canvas);canvas=outlined
    canvas.save(OUT/f'{name}.png')
    if name=='scar':
        red=np.array(canvas);a=red[:,:,3].copy()
        # The same extracted cuts, red for weapon bleeding, teal for vulnerability.
        red[:,:,0]=235;red[:,:,1]=64;red[:,:,2]=77;red[:,:,3]=a
        Image.fromarray(red).save(OUT/'bleed.png')
preview=Image.new('RGB',(480,160),'#344c43')
for i,name in enumerate(['bleed','scar','spirit']):
    image=Image.open(OUT/f'{name}.png');preview.paste(image,(i*160+16,4),image)
    small=image.resize((24,24),Image.Resampling.LANCZOS);preview.paste(small,(i*160+64,132),small)
preview.save(ROOT/'design/status-icons-2026-11-05/preview.png')
