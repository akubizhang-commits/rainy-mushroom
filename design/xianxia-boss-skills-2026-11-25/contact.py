# usage: contact.py name  -> raw-frames + <name>-v1-contact.png (every 5th source frame, numbered)
import sys,subprocess,os
from PIL import Image,ImageDraw
n=sys.argv[1];v=sys.argv[2] if len(sys.argv)>2 else 'v1';os.makedirs(f'{n}/raw-frames',exist_ok=True)
subprocess.run(['ffmpeg','-loglevel','error','-y','-i',f'{n}-{v}.mp4',f'{n}/raw-frames/%03d.png'],check=True)
ids=list(range(1,121,5));W=200;s=Image.new('RGB',(W*12,W*2))
for j,i in enumerate(ids):
  t=Image.open(f'{n}/raw-frames/{i:03}.png').resize((W,W));ImageDraw.Draw(t).text((4,4),str(i),fill='black');s.paste(t,((j%12)*W,(j//12)*W))
s.save(f'{n}-{v}-contact.png')
