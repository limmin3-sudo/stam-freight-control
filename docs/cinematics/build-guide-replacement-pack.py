"""Collect existing guide assets for the user's external edits. No app changes."""
import hashlib
import json
import shutil
import zipfile
from pathlib import Path
from PIL import Image

repo=Path(__file__).resolve().parents[2]
active=repo.parent/'stam-freight-control-local-studio-20261110'
pack=repo/'docs/cinematics/guide-replacement-pack-20261111'
items=[
 ('edit/01_lounge_fullbody.png',active,'apps/control-room/src/assets/director-standing.png','active','라운지 전신 인물. 실제 투명 PNG. 새 가이드와 같은 얼굴·체형·복장으로.'),
 ('edit/02_partner_portrait.webp',active,'assets/partners/director-portrait-approved.webp','active','안내데스크 소개·튜토리얼에 공통 사용하는 상반신 초상.'),
 ('edit/03_opening_poster.jpg',active,'apps/control-room/src/assets/director-cleaning-poster.jpg','active','라운지 준비 오프닝 영상의 정지 포스터. 청소 자세와 배경을 유지해 인물 교체.'),
 ('edit/04_lounge_video_start.png',repo,'docs/cinematics/lounge-guide/lounge-guide-first-frame.png','production','라운지 접근 영상의 첫 프레임. 서 있는 가이드만 교체하고 접수 직원·소품·배경 유지.'),
 ('edit/05_hologram_preview_background.png',repo,'docs/cinematics/lounge-guide/lounge-guide-end-v1.png','preview-only','홀로그램 움직임 미리보기의 인물 포함 배경. 기존 먼 데스크 구도이며 최종 도착 구도는 미확정.'),
 ('reference/portrait_larger_source.webp',active,'assets/partners/director-portrait-v13.webp','reference','02의 더 큰 원본. 이 파일로 얼굴을 맞춘 뒤 02 구도로 잘라도 됨.'),
 ('reference/hologram_design_keep.png',repo,'docs/cinematics/lounge-guide/lounge-guide-hologram-ui-v1.png','design-reference','승인된 홀로그램 디자인. 글자·테두리·금색 강조와 배치는 변경하지 않음.'),
 ('reference/lounge_background_keep.png',active,'apps/control-room/src/assets/lounge-original-composite.png','scene-reference','가이드 없는 라운지 원본. 앉아 있는 접수 직원은 가이드와 별도 인물이며 교체하지 않음.'),
 ('reference/opening_original_video.mp4',active,'apps/control-room/src/assets/director-cleaning-intro.mp4','video-reference','기존 오프닝 영상. 사진만 바꿔도 영상 속 인물은 바뀌지 않아 별도 재제작 필요.'),
]
manifest=[]
for filename,base,source,kind,note in items:
    src=base/source
    dst=pack/filename
    dst.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(src,dst)
    digest=hashlib.sha256(dst.read_bytes()).hexdigest()
    if digest!=hashlib.sha256(src.read_bytes()).hexdigest():
        raise RuntimeError(f'Copy mismatch: {filename}')
    rec={'file':filename,'kind':kind,'sourceRelative':source,'note':note,
         'bytes':dst.stat().st_size,'sha256':digest}
    if dst.suffix.lower()!='.mp4':
        with Image.open(dst) as im:
            rec.update(width=im.width,height=im.height,mode=im.mode)
    manifest.append(rec)
candidate=pack/'reference/new-guide-shared-image.jpg'
with Image.open(candidate) as im:
    manifest.append({'file':str(candidate.relative_to(pack)).replace('\\','/'),
        'kind':'new-guide-reference','sourceUrl':'https://grok.com/imagine/post/37e31877-b814-416d-8bf6-e00bf70734f3',
        'width':im.width,'height':im.height,'format':im.format,'mode':im.mode,
        'hasAlpha':'A' in im.getbands(),'note':'체커무늬가 실제 RGB 픽셀로 포함되어 있으며 투명 배경이 아님.',
        'sha256':hashlib.sha256(candidate.read_bytes()).hexdigest()})
(pack/'manifest.json').write_text(json.dumps({'dateKst':'2026-11-11','appChanged':False,'items':manifest},ensure_ascii=False,indent=2),encoding='utf-8')
readme='''가이드 교체 자료 — 2026-11-11

edit 폴더의 5장을 수정해서 같은 번호로 돌려주세요.

01_lounge_fullbody.png — 현재 라운지의 전신 누끼 (887×1774)
02_partner_portrait.webp — 안내데스크 소개·튜토리얼 공통 초상 (768×1024)
03_opening_poster.jpg — 오프닝 청소 영상의 정지 포스터 (1280×720)
04_lounge_video_start.png — 가이드와 함께 데스크로 가는 영상의 시작 사진 (1280×720)
05_hologram_preview_background.png — 홀로그램 움직임 시안의 배경 (1672×941)

01~03은 현재 앱에서 사용합니다. 04는 영상 제작용, 05는 독립 미리보기용입니다.
05의 먼 데스크 구도는 최종 도착 구도로 확정된 것이 아닙니다.
반려된 데스크 시안 v2/v3/v4와 옛 인물 후보 v2~v12는 교체 대상에서 제외했습니다.

새 가이드의 얼굴·머리·체형·복장을 모든 사진에서 일관되게 맞춰주세요.
검은 커버는 인물의 오른팔, 시계는 왼쪽 손목입니다.
02가 얼굴이 크게 보이는 상반신용 사진입니다. 전신 사진을 단순 확대하는 대신
이 구도에서 얼굴 디테일이 있는 별도 이미지를 만드는 편이 좋습니다.

가이드만 바꾸고 배경·접수 직원·모니터 두 대·데스크·게이트는 그대로 유지합니다.
앉아 있는 접수 직원은 별도 인물이므로 가이드와 같은 얼굴로 바꾸지 않습니다.
reference/lounge_background_keep.png가 원래 공간 배치 기준입니다.

reference/new-guide-shared-image.jpg는 사용자가 공유한 새 가이드 기준입니다.
실제 파일은 880×2256 RGB JPEG이고 투명 채널이 없습니다.
뒤의 체커무늬는 그림에 포함된 픽셀입니다. 체커무늬를 일부러 그리지 마세요.
깨끗한 흰 배경으로 주셔도 됩니다. 실제 투명 처리와 파일 변환·크기 조정은 이쪽에서 합니다.

reference/portrait_larger_source.webp는 02의 더 큰 원본입니다.
reference/hologram_design_keep.png는 유지할 홀로그램 디자인 참고용입니다.
reference/opening_original_video.mp4는 이전 오프닝 영상입니다.
03 사진만 교체해도 기존 영상 속 인물은 그대로이므로 오프닝 영상도 별도로 재제작해야 합니다.

가능하면 수정본은 원래 해상도 이상으로 저장하고 PNG 원본으로 돌려주세요.
사이트에 자동 적용하지 않았으며 원본 파일은 모두 보존했습니다.
'''
(pack/'README.txt').write_text(readme,encoding='utf-8-sig')
archive=pack.with_suffix('.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as bundle:
    for file in sorted(pack.rglob('*')):
        if file.is_file(): bundle.write(file,arcname=str(file.relative_to(pack)))
with zipfile.ZipFile(archive) as bundle:
    if bundle.testzip() is not None: raise RuntimeError('Archive CRC check failed')
    for item in manifest:
        if hashlib.sha256(bundle.read(item['file'])).hexdigest()!=item['sha256']:
            raise RuntimeError('Archive byte comparison failed: '+item['file'])
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'editImages':5,
                  'copiedAssetsVerified':len(items),'crc':'passed'},ensure_ascii=False))
