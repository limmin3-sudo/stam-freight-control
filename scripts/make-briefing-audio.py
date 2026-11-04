"""Original procedural score for STAM: no samples, melodies or third-party audio."""
import math, wave, sys
import numpy as np
rate=44100;duration=66
song=np.zeros((rate*duration,2),dtype=np.float64)
def voice(start,length,freq,gain,pan=0,pulse=False):
    count=min(int(length*rate),len(song)-int(start*rate))
    if count<=0:return
    t=np.arange(count)/rate
    envelope=(1-np.exp(-t/(.018 if pulse else .9)))*np.clip((length-t)/(0.5 if pulse else 2),0,1)
    if pulse: envelope*=np.exp(-t*3.5)
    signal=(np.sin(2*np.pi*freq*t)+.20*np.sin(2*np.pi*freq*2.003*t)+.08*np.sin(2*np.pi*freq*3*t))*envelope*gain
    for channel,weight in enumerate([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)]):song[int(start*rate):int(start*rate)+count,channel]+=signal*weight
# Broad suspended harmony: D minor / Bb / F / C. Deliberately no quotation of any theme.
chords=[[38,45,50,57,64],[34,41,46,53,60],[41,48,53,60,67],[36,43,48,55,62],[38,45,50,57,64],[38,45,52,57,62]]
for bar,chord in enumerate(chords):
    for i,note in enumerate(chord):voice(bar*11,13,440*2**((note-69)/12),.045,(-.6+i*.3))
    if 1<=bar<=4:
        for step in range(16):
            note=chord[(step*3)%len(chord)]+12
            voice(bar*11+step*.625,1.1,440*2**((note-69)/12),.027,math.sin(step)*.5,True)
            if step%4==0:voice(bar*11+step*.625,.8,48,.08,0,True)
fade=np.minimum(np.arange(len(song))/rate/3,(len(song)-np.arange(len(song)))/rate/5).clip(0,1)
song=np.tanh(song*1.1)*fade[:,None];song*=.7/max(.7,np.max(np.abs(song)))
with wave.open(sys.argv[1],'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes((song*32767).astype('<i2').tobytes())
