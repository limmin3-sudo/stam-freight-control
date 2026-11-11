"""Deliver user-selected end frame and constrain the generated start edit to the guide."""
from pathlib import Path
import hashlib
import json
import zipfile
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

root = Path(__file__).resolve().parent
repo = root.parents[3]
background = Image.open(repo / 'apps/control-room/src/assets/lounge-original-composite.png').convert('RGB')
generated = Image.open(root / 'first-frame-generated.png').convert('RGB')
assert generated.size == background.size
mask = np.asarray(Image.open(root / 'standing-guide-mask.png').convert('L')) > 128
labels, _ = ndimage.label(mask)
counts = np.bincount(labels.ravel())
counts[0] = 0
mask = Image.fromarray(((labels == counts.argmax()) * 255).astype('uint8'))
mask = mask.resize(background.size, Image.Resampling.NEAREST)
mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
mask.save(root / 'first-frame-edit-mask.png')
first = Image.composite(generated, background, mask)
first.save(root / '01-first-frame-native.png')
first.resize((1280, 720), Image.Resampling.LANCZOS).save(root / '01-first-frame-1280x720.png')
outside = np.asarray(mask) == 0
assert np.array_equal(np.asarray(first)[outside], np.asarray(background)[outside])
last = Image.open(root / 'last-frame-grok-original.jpg').convert('RGB')
assert np.array_equal(np.asarray(last), np.asarray(Image.open(root / '02-last-frame-native.png')))
files = ['01-first-frame-1280x720.png', '02-last-frame-1280x720.png']
with zipfile.ZipFile(root / 'grok-first-last-1280x720.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in files:
        archive.write(root / file, file)
with zipfile.ZipFile(root / 'grok-first-last-1280x720.zip') as archive:
    assert archive.testzip() is None
record = {
    'dateKst': '2026-11-12',
    'approvedGuidePost': 'https://grok.com/imagine/post/0b82f884-a909-45f3-aa2f-9f265fd50b7c',
    'firstFrame': 'Built-in image_gen identity/body/uniform edit; SAM guide mask only over unchanged original lounge background. Generated likeness remains a model interpretation.',
    'lastFrame': 'User-selected Grok image; decoded RGB unchanged in native PNG. No guide regeneration.',
    'nativeDimensions': list(first.size),
    'videoDimensions': [1280, 720],
    'firstFrameBackgroundOutsideMaskPixelExact': True,
    'runtimeOrVideoChanged': False,
    'files': {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in files},
    'review': 'Visual verification of full standing pose, black right-arm covering, clasped hands, feet visible, original room geometry, desk-facing final pose. User review pending.'
}
(root / 'frame-pair-record.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(record, ensure_ascii=False, indent=2))
