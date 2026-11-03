"""Deterministic, locally synthesized ritual cues. No external samples."""
import math, struct, wave
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'cocos-pilot/assets/resources/tower-breakthrough'
root.mkdir(parents=True,exist_ok=True)
rate=22050
for name,duration in [('minor',1.15),('gather',2.05),('success',1.5),('failure',1.1)]:
    samples=[]
    for i in range(int(rate*duration)):
        t=i/rate;u=t/duration
        attack=min(1,t/.025);end=min(1,(duration-t)/.15)
        if name=='gather':
            env=attack*end*(.1+.35*u)
            val=sum(math.sin(2*math.pi*(f*t+32*t*t))*.18 for f in (110,165,220))
        elif name=='failure':
            env=attack*end*math.exp(-3*u)
            val=.35*math.sin(2*math.pi*(260*t-35*t*t))+.1*math.sin(2*math.pi*130*t)
        else:
            env=attack*end*math.exp(-4*u)
            freqs=(660,880,1320) if name=='minor' else (220,440,660,880,1320)
            val=sum(math.sin(2*math.pi*f*t+0.3*math.sin(t*9)) for f in freqs)/len(freqs)*.65
        samples.append(struct.pack('<h',round(max(-1,min(1,val*env))*32767)))
    with wave.open(str(root/f'{name}.wav'),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(b''.join(samples))
print('Created four local breakthrough audio cues.')
