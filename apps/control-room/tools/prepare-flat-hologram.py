"""Reuse approved generated artwork; user requested no tilt, no redesign.

Deterministic crops and geometric correction. The broad glass transmission and
RGB gamma match the browser material test. Never overwrite the source image.
Requires Pillow and numpy; not part of the Node build or runtime.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT/'docs/cinematics/flat-hologram-20261113/source.png'
OUT = ROOT/'apps/control-room/src/assets/hologram/flat'
OUT.mkdir(parents=True,exist_ok=True)
art = Image.open(SOURCE).convert('RGBA')

def project(quad,size):
    w,h=size;a=[];b=[]
    for (x,y),(u,v) in zip([(0,0),(w,0),(w,h),(0,h)],quad):
        a.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]])
        b.extend([u,v])
    coefficients=np.linalg.solve(np.array(a),np.array(b))
    return art.transform(size,Image.Transform.PERSPECTIVE,coefficients,Image.Resampling.BICUBIC)

def optical(im):
    p=np.array(im).astype(float)/255
    lum=p[:,:,:3]@np.array([.2126,.7152,.0722])
    p[:,:,3]*=np.clip(.8*lum+.42,0,1)
    p[:,:,:3]**=1.25
    p[p[:,:,3]==0,:3]=0
    return Image.fromarray(np.rint(p*255).astype('uint8'))

def ink(im,insets=(0,0,0,0)):
    p=np.array(im).astype(float)
    alpha=np.clip((p[:,:,:3].min(axis=2)-125)/100,0,1)*p[:,:,3]
    l,t,r,b=insets;mask=np.zeros(alpha.shape);mask[t:im.height-b,l:im.width-r]=1
    p[:,:,3]=alpha*mask;p[p[:,:,3]==0,:3]=0
    return Image.fromarray(p.astype('uint8'))

def save(im,name):im.save(OUT/(name+'.png'))

# Correct the sloped shell separately: a global warp would tilt its already
# horizontal lettering. Only the perimeter of this corrected shell is retained.
frame=project([(54,60),(1483,143),(1483,880),(54,923)],(1429,850))
mask=Image.new('L',frame.size)
draw=ImageDraw.Draw(mask)
draw.polygon([(55,0),(1384,0),(1429,45),(1429,805),(1384,850),(45,850),(0,805),(0,45)],fill=255)
draw.polygon([(66,49),(1355,49),(1389,83),(1389,761),(1355,801),(66,801),(37,770),(37,83)],fill=0)
frame.putalpha(Image.fromarray((np.array(frame.getchannel('A'),dtype=float)*np.array(mask)/255).astype('uint8')))
save(optical(frame),'frame')
# An empty vertical strip supplies the real surface texture, never the text.
save(optical(art.crop((738,280,786,844))),'face')

button_boxes=[(135,370,725,493),(138,505,723,607),(138,617,724,731),(138,730,724,852),(791,550,1422,656),(791,670,1422,776)]
for i,box in enumerate(button_boxes):
    button=art.crop(box)
    save(ink(button,(28,19,25,28 if i in [2,3] else 19)),f'label-{i}')
    if i in [0,1]:
        # Straighten each button's top and bottom independently of the text.
        skin=(project([(135,370),(725,374),(725,493),(135,490)],(590,112)) if i==0 else
              project([(138,505),(723,505),(723,598),(138,607)],(590,112)))
        strip=skin.crop((28,23 if i==0 else 12,562,26 if i==0 else 15)).resize((534,72))
        skin.paste(strip,(28,20))
        edge=Image.new('L',skin.size)
        ImageDraw.Draw(edge).polygon([(22,1),(568,1),(589,22),(589,90),(568,111),(22,111),(1,90),(1,22)],fill=255)
        skin.putalpha(edge)
        save(optical(skin),'button-amber' if i==0 else 'button-teal')

for name,box in {
 'heading':(142,123,611,224),
 'welcome':(1129,177,1398,219),
 'question':(150,280,642,337),
 'greeting':(795,326,1434,447),
 'divider':(790,495,1419,514),
}.items():save(ink(art.crop(box)),name)

record={
 'source':str(SOURCE.relative_to(ROOT)),
 'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
 'method':'Existing generated artwork, separately rectified rim; native horizontal content crops; same optical alpha/gamma as reviewed composition. No new image generation.',
 'layout':'one front-facing panel; zero CSS rotation, skew or perspective; translateX only for entry/exit',
 'staticKoreanCopy':'Raster letterforms/icons from source.png; underlying live accessible text preserved.',
 'dynamicCopy':'Existing SUIT for changing dialogue, English, and partner names; no claim to the unknown original typeface.',
 'notPixelIdenticalToOriginalReference':True,
 'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(OUT.glob('*.png'))}
}
(OUT/'record.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(f'Prepared {len(record["files"])} front-facing asset pieces.')
