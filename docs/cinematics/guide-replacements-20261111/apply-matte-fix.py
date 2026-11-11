"""Export the background-removal tool matte over unchanged source RGB pixels."""
import hashlib,json,shutil
from pathlib import Path
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parent
repo=root.parents[2]
active=repo.parent/'stam-freight-control-local-studio-20261110'
source=root/'originals/01-grok-fullbody.png'
tool_result=root/'prepared/director-standing-matte-candidate.png'
a=np.asarray(Image.open(source).convert('RGBA')).copy()
b=np.asarray(Image.open(tool_result).convert('RGBA'))
assert a.shape==b.shape
alpha=np.minimum(a[:,:,3],b[:,:,3])
alpha[(a[:,:,3]>250)&(b[:,:,3]>250)]=255
alpha[alpha<3]=0
result=a.copy()
result[:,:,3]=alpha
output=root/'prepared/director-standing-grok-mattefix-20261111.png'
Image.fromarray(result).save(output)
assert np.array_equal(np.asarray(Image.open(output))[:,:,:3],a[:,:,:3])
old_hash=hashlib.sha256(source.read_bytes()).hexdigest()
new_hash=hashlib.sha256(output.read_bytes()).hexdigest()
applied=[]
for checkout in (repo,active):
    target=checkout/'apps/control-room/src/assets/director-standing.png'
    assert hashlib.sha256(target.read_bytes()).hexdigest() in (old_hash,new_hash),'Unexpected independent asset change'
    shutil.copy2(output,target.parent/output.name)
    temporary=target.with_name(target.name+'.matte-fix.tmp')
    shutil.copy2(output,temporary)
    temporary.replace(target)
    meta=checkout/'assets/partners/guide-grok-20261111.json'
    data=json.loads(meta.read_text(encoding='utf-8'))
    data.update(fullbodyAlphaRefined=True,fullbodyRGBUnchanged=True,matteTool='BiRefNet',fullbodyVersion=output.name)
    meta.write_text(json.dumps(data,indent=2),encoding='utf-8')
    notes=checkout/'assets/partners/README.md'
    text=notes.read_text(encoding='utf-8').replace('The full-body PNG is unchanged at 880 x 2256 with genuine alpha.',
        'The full-body is 880 x 2256; its original RGB pixels are preserved and its white-fringed alpha was refined using BiRefNet. director-standing-grok-mattefix-20261111.png is the active matte version.')
    notes.write_text(text,encoding='utf-8')
    applied.append(checkout.name)
record={'dateKst':'2026-11-11','tool':'Gen Studio remove_background / BiRefNet','jobId':'804056b6c59e',
    'source':source.name,'toolResult':'20261111-233553-104b41','output':output.name,
    'method':'Use tool alpha, constrain it to original alpha; make high-confidence interior opaque. Copy original RGB unchanged.',
    'rgbPixelsUnchanged':True,'poseProportionsColoursChanged':False,
    'alphaPixelsChanged':int((a[:,:,3]!=alpha).sum()),'appliedTo':applied,'sha256':new_hash,
    'review':'Dark-background upper-body and legs/shoes reviewed. Live lounge verification follows.'}
(root/'matte-fix-record.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print(json.dumps(record,indent=2))
