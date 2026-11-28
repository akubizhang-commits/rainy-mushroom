# usage: contact.py name -> <name>-contact.png from <name>/raw-frames (every 4th frame, 0-based labels)
import sys
from PIL import Image,ImageDraw
n=sys.argv[1];W=200;ids=list(range(0,124,4));s=Image.new('RGB',(W*11,W*3))
for j,i in enumerate(ids):
  t=Image.open(f'{n}/raw-frames/{i+1:03}.png').convert('RGB').resize((W,W));ImageDraw.Draw(t).text((4,4),str(i),fill='black');s.paste(t,((j%11)*W,(j//11)*W))
s.save(f'{n}-contact.png')
