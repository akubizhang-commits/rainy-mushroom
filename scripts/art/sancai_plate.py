"""Preserve the supplied plate; unmatte black and register its three eyes."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "design/xianxia-sancai-triad-2026-11-04"
src = Image.open(OUT / "source/original.png").convert("RGB")
# Eye centres measured on the 1280px displayed reference, scaled to source.
# Use the circular seals, not the decorative flame tips.
eyes = np.array([[643, 290], [231, 974], [1054, 974]], dtype=float)
eyes *= np.array(src.size)/1280
r = 332
dest = np.array([[512, 512-r], [512-np.sqrt(3)*r/2, 512+r/2],
                 [512+np.sqrt(3)*r/2, 512+r/2]])
inverse = np.linalg.solve(np.column_stack((dest,np.ones(3))),eyes).T
registered = src.transform((1024,1024),Image.Transform.AFFINE,
                           inverse.reshape(-1),Image.Resampling.BICUBIC)
rgb = np.asarray(registered).astype(float)/255
alpha = np.clip((rgb.max(axis=2)-8/255)/(1-8/255),0,1)
color = np.clip(rgb/np.maximum(alpha[:,:,None],1/255),0,1)
rgba = np.uint8(np.dstack((color,alpha))*255+.5)
image = Image.fromarray(rgba)
runtime = ROOT/"cocos-pilot/assets/resources/tower-skill-fx/sancai-triad-v1.png"
image.save(runtime)
image.save(OUT/"plate-transparent.png")
checks={}
for name,bg in [("dark",(22,46,42,255)),("light",(210,217,205,255))]:
 canvas=Image.new("RGBA",image.size,bg)
 canvas.alpha_composite(image)
 canvas.convert("RGB").save(OUT/f"plate-{name}.jpg")
checks["edge_max_alpha"]=int(max(rgba[0,:,3].max(),rgba[-1,:,3].max(),
                                  rgba[:,0,3].max(),rgba[:,-1,3].max()))
checks["transparent_pixel_fraction"]=float((rgba[:,:,3]==0).mean())
checks["source_size"]=src.size
checks["source_eyes"]=eyes.tolist()
checks["runtime_eyes"]=dest.tolist()
checks["runtime_radius"]=r
checks["registration_error"]=float(np.abs(np.column_stack((dest,np.ones(3)))@inverse.T-eyes).max())
(OUT/"asset-check.json").write_text(json.dumps(checks,indent=2)+"\n")
assert checks["edge_max_alpha"]==0,checks
print(json.dumps(checks,indent=2))
