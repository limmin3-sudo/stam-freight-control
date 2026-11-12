# 원본 제작·자산·앱 연결 추적 결과

조사 기준: 현재 원격 통합본 `737b957`. 기존 승인 이미지와 제작 기록은 최초 포함 커밋 `7b099a6`부터 현재 원격까지 변경되지 않았다. 이번 새 시안/미커밋 구현은 과거 제작 근거로 사용하지 않았다.

## 1. 첨부한 승인 그림은 어떻게 만들어졌는가

`../lounge-guide/hologram-ui-record.json`에 2026-11-11, 도구 `built-in image_gen`, 입력 `lounge-guide-end-v1.png`, 출력 `lounge-guide-hologram-ui-v1.png`가 기록돼 있다. 입력 사진에 좌우 홀로그램을 추가하는 이미지 편집이었다. 기록의 원문은 `runtimeChanged: false`, `Visual concept only; interaction not implemented.`다. 실제 생성 프롬프트 전체도 같은 JSON의 `prompt`에 보존돼 있다.

재질 지시는 얇게 겹친 청록 유리 깊이, 약한 원근, 배경 투과, 얇은 발광 경계, 따뜻한 금색 선택, 은은한 반사, 버튼과 뒷판 사이 깊이다. 과도한 bloom·흰 플레어·불투명 웹 화면은 금지했다. 폰트 파일명/정확한 글꼴 이름이나 IOR/roughness 같은 3D 렌더러 수치는 지정하지 않았다. 그림의 글씨도 이미지 생성 결과에 포함됐다.

원본 SHA-256: `5529bf735d63880c500ebbcb058ab6dc2b2a3e22f339be58b6f952d1d0dd86ed`.
`../guide-replacement-pack-20261111/reference/hologram_design_keep.png`와 같은 패키지 ZIP 안의 원본도 이 해시와 일치한다. 원본 그림은 손실·덮어쓰기가 발생하지 않았다.

## 2. 별도로 제작한 유리 자산은 실제로 있었는가

**있었다.** `apps/control-room/tools/bake-optical-glass.mjs`가 아래 자산을 생성한다.

- `src/assets/ops-glass-panel.png`: 824×464 RGBA 패널.
- `src/assets/ops-glass-key.png`: 청색 키캡.
- `src/assets/ops-glass-key-amber.png`: 호박색 키캡.

코드는 베벨의 법선, 후면 두께, Fresnel 근사, 반사광 스트립, 하부 caustic과 각 층의 알파 합성을 계산해 PNG로 굽는다. 패널 기본 face alpha `.40`, 키캡 `.68`; 추가 반사·두께 층이 합성된다. 이 코드는 임의의 생성 PNG가 아니라 재현 가능한 별도 제작 원본이다. PROJECT_STATUS의 `2026-11-12 로컬 — 관제 전용 유리 패널과 입체 버튼`에도 제작 사실과 재생성 경로가 기록돼 있다.

다만 이 자산은 **관제 전용**이며 첨부한 안내데스크 원본과 동일한 자산이라는 근거는 없다. `operations-glass.css:17–19`에서 border-image로 사용한다. 이를 안내데스크 원본에서 추출한 재질이나 같은 외형이라고 섞어 설명하지 않는다. 별도로 `hologram-button.png`도 존재하며 `a21d55c`에서 들어온 왼쪽 탐색용 이미지 자산이다.

## 3. 평면적인 데스크 UI가 연결된 경로

1. `motion-preview-v2.html`: SVG frame/action 경로와 CSS 그라데이션으로 움직임/선택 UI를 구현. 이 구현의 폰트는 SUIT.
2. `build-arrival-preview.py:5–12`: 위 미리보기 CSS·SVG·패널을 추출해 `hologram-design-v2.css`와 도착 미리보기를 생성.
3. `arrival-ui-record.json:8`: 구현 기반이 기존 motion-preview-v2 SVG/CSS라고 명시.
4. `build-arrival-unified.py`와 `arrival-ui-unified-record.json`: 가이드가 오른쪽인 영상에 맞춰 두 패널을 왼쪽 한 패널로 합침. 이후 원본 사진의 실제 광학 재질을 가져온 기록은 없다.
5. `apps/control-room/tools/prepare-guide-desk.mjs:16–33`: 도착 HTML에서 SVG symbols/main을 읽고 CSS를 scope 처리해 실제 `guide-desk-template.html`과 `guide-desk.css`로 출력. 승인 PNG/관제 유리 PNG는 이 경로에서 패널 재질로 연결되지 않는다.
6. `GuideDesk.tsx`: 이 템플릿과 컨트롤러를 실제 영상 위에 마운트. 최초 통합은 `7b099a6`.

**시각 기준과 구현 기반이 어긋난 근거:** 원본 제작 기록의 approvalScope와 AGENTS의 기존 지침은 모두 “simplified motion preview is not the visual standard” / “단순화했던 motion-preview.html의 패널 외형은 디자인 기준이 아니며 움직임 검토용”이라고 명시한다. 그런데 실제 연결 경로는 그 움직임 미리보기에서 출발한 SVG/CSS를 사용했다.

## 조사 범위와 현재 상태

현재 새 이력의 Git all-branch 파일 이력, 현재 제작 기록/생성기, 관련 ZIP 백업, 별도 제작·첨부 폴더의 관련 자산을 대조했다. 승인 PNG 원본·전체 프롬프트·다른 유리 자산 제작 코드는 찾았다. 첨부한 안내데스크 PNG의 레이어가 분리된 Blender/PSD/정확한 글꼴·3D 재질 프로젝트는 찾지 못했다. 저장소의 bridge GLB/첨부 Blender 파일은 관제실 공간이며 해당 데스크 패널 원본과 다르다.

최근 추정 구현과 새 이미지들은 미완료 검수이며 원본 복원 완료 근거가 아니다. 해당 추정안은 main/운영에 반영하지 않았다. 이후 작업은 이 조사 결과와 사용자 최신 재질·각도·투명도 지시를 기준으로 진행한다.
