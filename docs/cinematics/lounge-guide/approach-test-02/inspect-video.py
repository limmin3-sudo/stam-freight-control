"""Decode the generated video and extract review frames; no image generation."""
import hashlib
import json
from pathlib import Path
import av
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parent
video=root/'guide-desk-approach-02-24fps.mp4'
with av.open(str(video)) as container:
    stream=container.streams.video[0]
    fps=float(stream.average_rate)
    frames=[frame.to_image() for frame in container.decode(video=0)]
    facts={'width':stream.width,'height':stream.height,'frames':len(frames),
           'fps':fps,'durationSeconds':len(frames)/fps,'codec':stream.codec_context.name}
hashes=[hashlib.sha256(frame.tobytes()).hexdigest() for frame in frames]
facts['uniqueDecodedFrames']=len(set(hashes))
facts['consecutiveIdenticalFrames']=sum(a==b for a,b in zip(hashes,hashes[1:]))
indices=sorted(set([0,*range(round(fps),len(frames),round(fps)),len(frames)-1]))
width=640
height=round(width*frames[0].height/frames[0].width)
rows=(len(indices)+1)//2
sheet=Image.new('RGB',(width*2,(height+28)*rows),'#10222c')
draw=ImageDraw.Draw(sheet)
for position,index in enumerate(indices):
    frames[index].save(root/f'frame-{index:03d}.png')
    x,y=position%2*width,position//2*(height+28)
    sheet.paste(frames[index].resize((width,height),Image.Resampling.LANCZOS),(x,y))
    draw.text((x+12,y+height+7),f'{index/fps:.2f} s | {index+1}/{len(frames)}',fill='#edfbff')
frames[0].save(root/'first-frame.png')
frames[-1].save(root/'last-frame.png')
sheet.save(root/'frames-contact-sheet.jpg',quality=94)
(root/'video-facts.json').write_text(json.dumps(facts,indent=2),encoding='utf-8')
print(json.dumps(facts,indent=2))
