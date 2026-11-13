# 정면 단일 유리 홀로그램 — 기능 담당 인계

사용자가 마지막으로 “그냥 기울지 마”라고 지정했다. 하나의 큰 안내데스크 패널을 정면으로 세우고, 테두리·버튼·글자 사이의 원근 불일치를 제거했다. 오퍼레이터/항해사의 대화창도 같은 정면 프레임을 사용한다.

- 브랜치: `cinematic/unified-glass-runtime-20261113`
- 시작 기준: `40c3301b95442404fe5a95495fe62fd607199616` (`main` beta 2.6.0)
- 최종 SHA: 해당 브랜치/PR의 최신 커밋을 확인한다.
- 통합·운영 배포: 기능 담당. 이 브랜치에서 main 또는 개발 인계 브랜치를 변경하지 않는다.
- PR #25의 이전 반려 runtime과 합치지 않는다. 이 작업은 최신 main 위의 독립 변경이며 #25에 의존하지 않는다.

## 변경 파일과 범위

| 파일 | 내용 |
| --- | --- |
| `apps/control-room/src/GuideDesk.tsx` | 기존 DOM에 시각 스킨 연결, 정리 함수 호출 |
| `apps/control-room/src/guide-raster-skin.ts` | 기존 한글 문구의 생성 이미지 글자/아이콘 연결, 대화가 바뀌면 실제 텍스트 표시 |
| `apps/control-room/src/hologram-glass.css` | 단일 정면 프레임, 반투명 유리 면, 청록/호박 버튼 면, 모바일 한 열 |
| `apps/control-room/src/PartnerConversation.tsx` | 공통 스킨 클래스와 CSS만 추가; 이벤트 유지 |
| `apps/control-room/src/assets/hologram/flat/` | 분리한 PNG와 제작 기록 |
| `apps/control-room/tools/prepare-flat-hologram.py` | 저장된 생성 자산을 자르고 기하 보정하는 재현 스크립트 |
| `PROJECT_STATUS.md`, 이 폴더 | 인계, 생성 원본, 실제 화면 검수 |

공유 파일은 `GuideDesk.tsx`, `PartnerConversation.tsx`, `PROJECT_STATUS.md`다. 기능 담당이 이후 같은 파일을 수정했다면 위의 작은 연결 변경만 대조해 병합한다. `SpaceExperience.tsx`, `SpaceNavigation.tsx`, 상단바/사이드바, 파트너 선택 정책, 계약·적재·경로·저장 로직은 건드리지 않았다. 기존 데스크 접근/교대 대기/복귀 영상과 컨트롤러, DOM 식별자, 버튼 이벤트와 이동 목적지를 유지한다.

## 자산의 출처와 한계

`source.png`는 image_gen `exec-d1111e7f-6ddc-45f2-a4a7-a08b86688164`의 생성 결과를 그대로 복사한 것이다. 승인 RGB 사진의 원본 투명 레이어를 발견/복구한 파일은 아니다. 사용자가 이 생성 결과로 진행하면서 기울기를 없애라고 지정해, 새 생성 없이 둘레만 정면 보정하고 수평 글자는 따로 분리했다. 원본 사진과 픽셀 단위 동일하다고 주장하지 않는다.

유리 면은 생성 이미지의 빈 부분을 분리하고 알파/밝기를 보정했다. 밝은 글자와 프레임은 별도 레이어라 면과 함께 흐려지지 않는다. 기본 청록 버튼과 선택 호박 버튼은 각각 실제 PNG 면이다. 정적인 한글 글자·아이콘은 `source.png`의 픽셀을 이용하며 밑의 접근 가능한 실제 텍스트/버튼을 유지한다. 영어, 바뀐 대사, 다른 파트너 이름은 기존 SUIT를 사용한다. 알 수 없는 원본 폰트를 복원했다는 뜻은 아니다.

재현: 저장소 루트에서 `python apps/control-room/tools/prepare-flat-hologram.py` (Pillow, NumPy 필요). 생성 모델/네트워크를 사용하지 않으며 Node 빌드에는 Python이 필요 없다. 원본과 결과 해시는 `apps/control-room/src/assets/hologram/flat/record.json`에 있다.

## 검증과 실제 캡처

- `npm run build --prefix apps/control-room`: TypeScript/Vite 통과. 기존의 큰 번들 경고는 남아 있다.
- `npm test --prefix apps/control-room`: 테스트 14개 파일 통과.
- 실제 production preview Chromium에서 ko/mix/en × 1366px/390px 검수. 모든 패널/내용 회전 없음, 가로 넘침 없음, 실제 대화 텍스트 갱신, 선택 면 호박색 전환, 대기 영상 유지, 운항 저장값 유지 확인.
- 패널 접기/펼치기와 inert, 왼쪽 수납 후 정보실/미션 이동, 기존 복귀 영상 재생 후 라운지 이동 확인.
- 오퍼레이터/항해사 대화와 Esc 닫기 확인. 배경 관제센터가 동시에 닫히지 않는다.
- 요약 결과: [review/checks.json](review/checks.json). 실제 휴대폰 기기는 별도 검증 범위다.

[데스크톱](review/guide-1366.png) · [모바일](review/guide-390.png) · [모바일 변경 대사](review/dialogue-390.png) · [오퍼레이터](review/operator.png) · [항해사](review/navigator.png)

기능 담당이 새로 연결할 이벤트는 없다. 최종 통합 후 언어/모바일/데스크 접근·복귀를 확인하고 배포하면 된다. 실제 선택 동선으로 연결하는 2.5D 파트너 선택 연출은 기존 후속 작업으로 남는다.
