"""Original 24-second cinematic score: synthesized instruments only, no sampled music."""
import math, wave, sys
import numpy as np
rate=48000;duration=24;n=rate*duration;t=np.arange(n)/rate;mix=np.zeros((n,2));rng=np.random.default_rng(45)
def add(start,length,freq,gain,kind='pad',pan=0):
 size=min(int(length*rate),n-int(start*rate));x=np.arange(size)/rate
 if size<=0:return
 if kind=='pad':
  vibrato=.003*np.sin(2*np.pi*.18*x);phase=2*np.pi*freq*np.cumsum(1+vibrato)/rate
  signal=sum(np.sin(phase*k+.02*k*np.sin(x*3))/(k**1.7) for k in range(1,7));env=(1-np.exp(-x*2))*np.minimum(1,np.maximum(0,(length-x)/1.5))
 elif kind=='pluck':
  signal=np.sin(2*np.pi*freq*x+1.2*np.sin(2*np.pi*freq*2*x)*np.exp(-x*5));env=(1-np.exp(-x*130))*np.exp(-x*5)
 elif kind=='impact':
  phase=2*np.pi*(freq*x+40*(1-np.exp(-x*9))/9);signal=np.sin(phase)+.16*rng.standard_normal(size)*np.exp(-x*35);env=(1-np.exp(-x*250))*np.exp(-x*2)
 elif kind=='bell':
  signal=np.sin(2*np.pi*freq*x)+.25*np.sin(2*np.pi*freq*2.76*x);env=(1-np.exp(-x*70))*np.exp(-x*1.8)
 for ch,weight in enumerate([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)]):mix[int(start*rate):int(start*rate)+size,ch]+=signal*env*gain*weight
chords=[[38,45,50,53,57],[34,41,46,50,53],[31,38,43,46,50],[33,40,45,50,52]]
for bar,chord in enumerate(chords):
 for k,note in enumerate(chord):add(bar*6,8,440*2**((note-69)/12),.085,'pad',-.65+k*.325)
 if bar<3:
  for beat in range(10):
   note=chord[(beat*2)%5]+12;add(bar*6+beat*.6,1.4,440*2**((note-69)/12),.075,'pluck',math.sin(beat)*.55)
  for beat in [0,4,7]:add(bar*6+beat*.6,2,45,.27,'impact')
for at,note in [(1.8,74),(5.4,77),(7.8,74),(10.8,72),(13.8,70),(16.8,69),(19.4,74)]:add(at,3,440*2**((note-69)/12),.07,'bell',.2)
# Short stereo early reflections for depth; no long wash over titles.
base=mix.copy()
for delay,gain in [(.13,.11),(.23,.08),(.37,.04)]:
 offset=int(delay*rate);mix[offset:]+=base[:-offset,::-1]*gain
# Sound design: engine mass, magnetic tractor field and a heavy cargo-lock impact.
sfx=np.zeros_like(mix)
def effect(start,length,kind,gain,pan):
 count=min(int(length*rate),n-int(start*rate));x=np.arange(count)/rate
 env=np.sin(np.pi*np.clip(x/length,0,1))**.7
 if kind=='engine':
  phase=2*np.pi*(27*x+2.2*x*x);signal=np.sin(phase)+.45*np.sin(phase*2.01)+.13*np.sin(phase*5.03)
  air=rng.standard_normal(count);air=np.convolve(air,np.ones(150)/150,mode='same');signal+=air*1.5
 elif kind=='tractor':
  phase=2*np.pi*(108*x+7*x*x);signal=.5*np.sin(phase)*(1+.35*np.sin(2*np.pi*8*x))+.16*np.sin(phase*3.07)+.08*np.sin(2*np.pi*1100*x+2*np.sin(x*14))
 else:
  signal=sum(np.sin(2*np.pi*f*x)*np.exp(-x*d) for f,d in [(38,3),(81,5),(173,9),(419,15),(731,24)])
  noise=rng.standard_normal(count)*np.exp(-x*55);signal+=noise*.35;env=(1-np.exp(-x*200))*np.exp(-x*1.6)
 for ch,w in enumerate([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)]):sfx[int(start*rate):int(start*rate)+count,ch]+=signal*env*gain*w
effect(.3,5.5,'engine',.22,-.3);effect(9.8,4.6,'tractor',.17,.4);effect(13.8,2.4,'lock',.32,.2);effect(19.5,4.5,'engine',.29,.15)
duck=1-.25*np.exp(-((t-12)/2.7)**2)-.17*np.exp(-((t-21.4)/1.7)**2)
mix=mix*duck[:,None]+sfx
fade=np.minimum(np.clip(t/1.4,0,1),np.clip((duration-t)/2.5,0,1));mix=np.tanh(mix*1.6)*fade[:,None]
mix*=.88/max(.88,np.max(np.abs(mix)))
with wave.open(sys.argv[1],'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes((mix*32767).astype('<i2').tobytes())
