"""Apply user-provided guide assets. Portrait is crop-only; no redraw/resampling."""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parent
repo=root.parents[2]
active=repo.parent/'stam-freight-control-local-studio-20261110'
source1=root/'originals/01-grok-fullbody.png'
source2=root/'originals/02-grok-portrait.jpg'
out=root/'prepared'
out.mkdir(exist_ok=True)

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()

with Image.open(source1) as im:
    assert im.mode=='RGBA' and im.getchannel('A').getextrema()==(0,255)
    alpha_bbox=im.getchannel('A').getbbox()
shutil.copy2(source1,out/'director-standing-grok-20261111.png')
crop_box=(216,12,1032,1100)
with Image.open(source2) as im:
    crop=im.convert('RGB').crop(crop_box)
    crop.save(out/'director-portrait-grok-20261111.webp',format='WEBP',lossless=True,method=6)
    with Image.open(out/'director-portrait-grok-20261111.webp') as check:
        assert check.convert('RGB').tobytes()==crop.tobytes(),'Crop pixels changed'
    crop_size=list(crop.size)

replacements=[
 ('apps/control-room/src/assets/director-standing.png','director-standing-grok-20261111.png','01_lounge_fullbody.png'),
 ('assets/partners/director-portrait-approved.webp','director-portrait-grok-20261111.webp','02_partner_portrait.webp'),
]
expected={rel:digest(repo/'docs/cinematics/guide-replacement-pack-20261111/edit'/old) for rel,_,old in replacements}
for checkout in (repo,active):
    for rel,prepared,_ in replacements:
        target=checkout/rel
        if digest(target) not in (expected[rel],digest(out/prepared)):
            raise RuntimeError(f'Asset changed independently; refusing overwrite: {checkout.name}/{rel}')

applied=[]
for checkout in (repo,active):
    for rel,prepared,_ in replacements:
        target=checkout/rel
        backup=root/'backups'/checkout.name/rel
        backup.parent.mkdir(parents=True,exist_ok=True)
        if not backup.exists():shutil.copy2(target,backup)
        versioned=target.parent/prepared
        shutil.copy2(out/prepared,versioned)
        temporary=target.with_name(target.name+'.guide-replacement.tmp')
        shutil.copy2(out/prepared,temporary)
        temporary.replace(target)
        assert digest(target)==digest(out/prepared)
        applied.append({'checkout':checkout.name,'asset':rel,'sha256':digest(target)})
    note=checkout/'assets/partners/guide-grok-20261111.json'
    note.write_text(json.dumps({'dateKst':'2026-11-11','fullbodyPost':'5485f209-92bd-4b7b-a476-f5d291aecde0',
        'portraitPost':'1bf69ab2-cfe4-40ac-b396-a79481800c11','portraitCropBox':crop_box,
        'portraitSize':crop_size,'portraitCropPixelsUnchanged':True,
        'activeFullbody':'apps/control-room/src/assets/director-standing.png',
        'activePortrait':'assets/partners/director-portrait-approved.webp',
        'openingPosterExcluded':True,'newDeskFramesPending':True},indent=2),encoding='utf-8')

record={'dateKst':'2026-11-11','fullbodySource':{'post':'https://grok.com/imagine/post/5485f209-92bd-4b7b-a476-f5d291aecde0',
        'size':[880,2256],'alphaBbox':alpha_bbox,'bytesUnchanged':digest(source1)==digest(out/'director-standing-grok-20261111.png')},
        'portraitSource':{'post':'https://grok.com/imagine/post/1bf69ab2-cfe4-40ac-b396-a79481800c11',
        'size':[1200,1600],'cropBox':crop_box,'outputSize':crop_size,'losslessWebp':True,'cropPixelsUnchanged':True},
        'applied':applied,'otherApplicationCodeChanged':False,'oldAssetsBackedUp':True,
        'userScopeCorrection':{'item3':'excluded','items4and5':'rebuild at the desk; old scene not reused'}}
(root/'replacement-record.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(record,ensure_ascii=False,indent=2))
