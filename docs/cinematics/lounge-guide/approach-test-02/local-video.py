"""Reuse the installed Gen Studio workflow with explicit frame count and FPS.
No installation files/settings are changed and no models are downloaded.
"""
import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, 'C:/gen-studio-main')
from genstudio.config import load_settings
from genstudio.registry import Registry
from genstudio.comfy import ComfyClient
from genstudio import workflows

def save(name, value):
    (ROOT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')

async def main(mode):
    settings=load_settings()
    client=ComfyClient(settings.comfy_url)
    try:
        if mode=='submit':
            if (ROOT/'submission.json').exists():
                print((ROOT/'submission.json').read_text(encoding='utf-8'))
                return
            registry=Registry.load()
            if not registry.tool_ready('video_i2v',settings.models_dir):
                raise RuntimeError('Existing video model is not ready. No download attempted.')
            config=json.loads((ROOT/'request.json').read_text(encoding='utf-8'))
            info=await client.object_info()
            required=['WanImageToVideo','CreateVideo','SaveVideo']
            if any(name not in info for name in required):
                raise RuntimeError('Required existing video nodes unavailable.')
            specs=registry.tools['video_i2v']
            unets=[f.name for f in specs if f.dir=='diffusion_models']
            files=[next(n for n in unets if 'high' in n.lower()),
                   next(n for n in unets if 'low' in n.lower()),
                   next(f.name for f in specs if f.dir=='text_encoders'),
                   next(f.name for f in specs if f.dir=='vae')]
            loras=[f.name for f in specs if f.dir=='loras']
            if loras:
                files.extend([next(n for n in loras if 'high' in n.lower()),next(n for n in loras if 'low' in n.lower())])
            image=(ROOT/config['source']).resolve()
            if not image.is_file():
                raise RuntimeError('Guide start frame missing.')
            unique_name='stam-guide-start-02-1204701976.png'
            name=await client.upload_image(image.read_bytes(),unique_name)
            negative=workflows.WAN_NEGATIVE+', '+config['negativeAdditions']
            graph=workflows.image_to_video(name,files,config['prompt'],negative,
                config['width'],config['height'],config['frames'],config['seed'],
                config['fps'],prefix='gen-studio/stam-guide-approach-02')
            save('workflow.json',graph)
            prompt_id=await client.queue(graph)
            rec={'promptId':prompt_id,'status':'queued','submittedAtUtc':datetime.now(timezone.utc).isoformat(),
                 'fps':config['fps'],'frames':config['frames'],'width':config['width'],'height':config['height'],
                 'models':files,'newModelsInstalled':False,'installedSettingsChanged':False,
                 'endFrameSubmitted':False,'source':config['source']}
            save('submission.json',rec)
            print(json.dumps(rec,indent=2))
        else:
            rec=json.loads((ROOT/'submission.json').read_text(encoding='utf-8'))
            history=await client.history(rec['promptId'])
            if mode=='watch':
                waited=0
                while not history:
                    await asyncio.sleep(5)
                    waited+=5
                    if waited%30==0:
                        print(json.dumps({'status':'running','watchElapsedSeconds':waited}),flush=True)
                    history=await client.history(rec['promptId'])
                    if waited>=1800:
                        raise RuntimeError('Watch timeout; original job left running, no resubmission.')
            if not history:
                print(json.dumps({'promptId':rec['promptId'],'status':'running-or-queued'}));return
            save('history.json',history)
            status=history.get('status',{})
            if not status.get('completed'):
                print(json.dumps(status));return
            if status.get('status_str')!='success':
                print(json.dumps(status));return
            candidates=[]
            for output in history.get('outputs',{}).values():
                for values in output.values():
                    if isinstance(values,list):
                        candidates.extend(x for x in values if isinstance(x,dict) and str(x.get('filename','')).lower().endswith(('.mp4','.webm','.mov')))
            if not candidates:
                raise RuntimeError('Completed job has no video output.')
            item=candidates[0]
            if mode in ('fetch','watch'):
                data=await client.view(item['filename'],item.get('subfolder',''),item.get('type','output'))
                (ROOT/'guide-desk-approach-02-24fps.mp4').write_bytes(data)
                rec.update(status='done-awaiting-review',output='guide-desk-approach-02-24fps.mp4',completedAtUtc=datetime.now(timezone.utc).isoformat())
                save('submission.json',rec)
            print(json.dumps({'status':'done','output':item},indent=2))
    finally:
        await client.close()

asyncio.run(main(sys.argv[1]))
