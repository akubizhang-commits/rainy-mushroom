from PIL import Image,ImageDraw
def sheet(d,ids,name):
    out=Image.new('RGB',(240*len(ids),258),'white');dr=ImageDraw.Draw(out)
    for n,i in enumerate(ids):
        out.paste(Image.open(f'{d}/raw-frames/{i:03d}.png').convert('RGB').resize((240,240)),(n*240,0));dr.text((n*240+4,242),str(i),fill='black')
    out.save(name)
sheet('tiger-humanoid-m07',[44,48,51,53,55,57,60,64,70,78,86],'zoom-tiger.png')
sheet('falcon-humanoid-m07',[12,18,24,30,36,42,46,50,54,60,66,74,82,90],'zoom-falcon.png')
