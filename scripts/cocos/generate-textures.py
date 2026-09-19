"""Small seamless procedural material maps; original generated art, no external images."""
import math, struct, zlib
from pathlib import Path
out=Path(__file__).resolve().parents[2]/'cocos-pilot/assets/resources/materials'
out.mkdir(parents=True,exist_ok=True)
def chunk(k,v):return struct.pack('!I',len(v))+k+v+struct.pack('!I',zlib.crc32(k+v)&0xffffffff)
for name in ['ground','bark','leaves','fungus','water','stone']:
 n=128;rows=[]
 for y in range(n):
  row=bytearray([0])
  for x in range(n):
   a=x/n*math.tau;b=y/n*math.tau
   fine=math.sin(a*31+math.sin(b*7))*math.cos(b*27+math.sin(a*9))
   noise=math.sin(a*3+math.sin(b*2))*math.cos(b*5+math.sin(a*4))
   if name=='bark':v=.93+.04*math.sin(a*17+math.sin(b*3)*.9)+.010*fine
   elif name=='ground':v=.98+.012*noise+.008*fine
   elif name=='leaves':v=.98+.007*math.sin(a*9)*math.cos(b*7)+.006*fine
   elif name=='fungus':v=.95+.020*noise+.014*fine
   elif name=='water':v=.93+.04*math.sin(b*8+math.sin(a*3))+.014*fine
   else:v=.91+.05*noise+.02*fine
   c=max(0,min(255,round(v*255)));row.extend([c,c,c])
  rows.append(bytes(row))
 png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',n,n,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')
 (out/(name+'.png')).write_bytes(png)
print('Generated 6 original seamless material maps')
