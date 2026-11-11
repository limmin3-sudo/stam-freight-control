"""Constrain the image-model edit to the guide; retain the real video frame elsewhere."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

root = Path(__file__).resolve().parent
original = Image.open(root / 'original-video-last-frame.png').convert('RGB')
generated = Image.open(root / 'generated-guide-composite.png').convert('RGB').resize(original.size, Image.Resampling.LANCZOS)
mask_paths = [
    root / 'original-guide-mask.png',
    root / 'generated-guide-mask.png',
]
masks = []
for path in mask_paths:
    mask = np.asarray(Image.open(path).convert('L')) > 128
    labels, count = ndimage.label(mask)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    mask = labels == sizes.argmax()
    mask_image = Image.fromarray((mask * 255).astype('uint8')).resize(original.size, Image.Resampling.NEAREST)
    masks.append(np.asarray(mask_image) > 128)
union = Image.fromarray((np.logical_or(*masks) * 255).astype('uint8'))
# Include the antialiased edge, with a short smooth seam into the original frame.
edit_mask = union.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(1.2))
edit_mask.save(root / 'guide-only-edit-mask.png')
output = Image.composite(generated, original, edit_mask)
output.save(root / 'lounge-desk-endframe-guide-v1-1280x720.png')
original_pixels = np.asarray(original)
output_pixels = np.asarray(output)
mask_pixels = np.asarray(edit_mask)
assert np.array_equal(output_pixels[mask_pixels == 0], original_pixels[mask_pixels == 0])
record = {
    'purpose': 'Grok replacement end frame; review only, not applied to a video or runtime',
    'videoPost': 'https://grok.com/imagine/post/dd7338ad-b302-4ae8-8b97-b74b79df4196',
    'guideReferencePost': 'https://grok.com/imagine/post/2b0c4f5a-2425-403b-8a55-df23e3f774d9',
    'video': {'width': 1280, 'height': 720, 'frames': 145, 'fps': 24, 'extractedFrame': 144},
    'generation': 'Built-in image_gen; actual final frame edit with new guide identity reference',
    'finishing': 'SAM guide masks only; largest connected component per person, union, 3px expansion and 1.2px seam blur. No background-wide generative replacement.',
    'backgroundOutsideMaskPixelExact': True,
    'unchangedPixels': int((mask_pixels == 0).sum()),
    'totalPixels': int(mask_pixels.size),
    'output': 'lounge-desk-endframe-guide-v1-1280x720.png',
    'sha256': hashlib.sha256((root / 'lounge-desk-endframe-guide-v1-1280x720.png').read_bytes()).hexdigest(),
    'limitations': 'Image-model guide identity is an approximation. Original video is unchanged; a new generation is required to carry this guide throughout the moving shot.'
}
(root / 'composite-record.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(record, ensure_ascii=False, indent=2))
