from PIL import Image
ids=[16,22,28,31,34,37,40,46,52,58,64,70]
ims=[Image.open(f'raw-frames/{i:03d}.png').convert('RGB').resize((320,320)) for i in ids]
out=Image.new('RGB',(320*6,640))
for n,i in enumerate(ims): out.paste(i,(n%6*320,n//6*320))
out.save('zoom.png')
