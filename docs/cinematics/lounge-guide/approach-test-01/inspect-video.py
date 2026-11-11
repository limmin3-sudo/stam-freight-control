"""Extract existing video frames for inspection; submit no generation jobs."""
import json
import shutil
import sys
from pathlib import Path
import av
import numpy as np
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
source = Path(sys.argv[1]).resolve()
video = root / 'lounge-desk-approach-test-01.mp4'
if source != video:
    shutil.copy2(source, video)
with av.open(str(video)) as container:
    stream = container.streams.video[0]
    fps = float(stream.average_rate)
    frames = [frame.to_image() for frame in container.decode(video=0)]
    facts = {'width':stream.width, 'height':stream.height,
             'frames':len(frames), 'fps':fps,
             'durationSeconds':len(frames)/fps,
             'codec':stream.codec_context.name}
indices = sorted(set([0, len(frames)//3, 2*len(frames)//3, len(frames)-1]))
thumb_w = 720
thumb_h = round(thumb_w*frames[0].height/frames[0].width)
sheet = Image.new('RGB', (thumb_w*2, (thumb_h+30)*2), '#101e27')
draw = ImageDraw.Draw(sheet)
for i, index in enumerate(indices):
    frame = frames[index]
    frame.save(root / f'frame-{index:03d}.png')
    x, y = i%2*thumb_w, i//2*(thumb_h+30)
    sheet.paste(frame.resize((thumb_w,thumb_h),Image.Resampling.LANCZOS),(x,y))
    draw.text((x+12,y+thumb_h+8),f'{index/fps:.2f} s | frame {index+1}/{len(frames)}',fill='#edfaff')
frames[0].save(root/'first-frame.png')
frames[-1].save(root/'last-frame.png')
sheet.save(root/'frames-contact-sheet.jpg',quality=94)
facts['meanAbsoluteFirstLastDifference'] = float(np.abs(
    np.asarray(frames[0],dtype=np.float32)-np.asarray(frames[-1],dtype=np.float32)).mean())
facts['differenceNote'] = 'Pixel difference does not establish real camera translation or unchanged geometry.'
metadata = source.with_suffix('.json')
if metadata.is_file():
    shutil.copy2(metadata,root/'gen-studio-metadata.json')
(root/'video-facts.json').write_text(json.dumps(facts,indent=2),encoding='utf-8')
print(json.dumps(facts,indent=2))
