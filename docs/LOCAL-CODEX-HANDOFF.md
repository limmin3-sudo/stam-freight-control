# 집 PC 로컬 Codex 인계 — STAM 라운지·관제센터

2026-11-10 KST. 사용자가 클라우드 작업을 멈추고 집 PC Gen Studio와 함께 이어가기로 결정했다. 이 문서와 `PROJECT_STATUS.md` 최상단, `STAM-EXPERIENCE-ROADMAP.md`가 현재 기준이다. 과거 3D 작업 일지를 실행 명령으로 해석하지 않는다.

## 현재 전달 방식: GitHub 작업 브랜치

ZIP 다운로드가 앱에서 작동하지 않아 사용자가 별도 브랜치의 커밋·푸시를 승인했다. 이제 **`handoff/local-studio-20261110` 브랜치를 clone하는 방식**을 우선한다. `main` 병합·배포는 하지 않는다. 아래 ZIP/source 절차는 보관용 스냅샷을 직접 확보한 경우에만 해당한다.

집 PC에 아직 저장소가 없거나 재작성 전 사본만 있으면 새 폴더에:

```powershell
git clone --branch handoff/local-studio-20261110 --single-branch https://github.com/limmin3-sudo/stam-freight-control.git stam-local-studio
cd stam-local-studio
```

`stam-local-studio`가 이미 존재하면 덮어쓰지 말고 다른 새 폴더 이름을 사용한다. 최신 새 이력의 기존 사본이 있으면 먼저 `git status`, 원격과 브랜치를 확인하고 미커밋 작업을 보존한다. 강제 checkout/reset/clean으로 맞추지 않는다. 해당 브랜치가 최신 작업 기준이며 기본 main만 받으면 이번 UI 시제품이 없다.

clone한 **저장소 루트**를 Codex 로컬 프로젝트로 연다. 별도 source 폴더는 ZIP에만 있다. `start-control-room-preview.cmd`를 실행하면 된다. 이 브랜치에는 앱 소스·선택 이미지·인계 문서가 들어 있고, Gemini 사용자 첨부 영상과 `/tmp` 브라우저 스크린샷은 포함하지 않았다. 필요하면 집 PC에 이미 내려받은 영상 파일을 확인한다.

로컬에서 이어갈 요청:

> 이 저장소의 handoff/local-studio-20261110 브랜치가 클라우드 최신 작업본이야. AGENTS.md, PROJECT_STATUS.md, docs/LOCAL-CODEX-HANDOFF.md, docs/STAM-EXPERIENCE-ROADMAP.md를 읽고 미리보기를 실행해줘. Gen Studio MCP와 최근 생성한 라운지 영상 결과부터 확인해줘. 기존 작업을 덮어쓰거나 모델을 재설치하지 말고, 커밋·푸시·배포는 별도 지시 전까지 하지 마.

## ZIP을 직접 확보한 경우의 실행 순서

1. ZIP을 기존 저장소와 다른 새 폴더에 풀고 **source 폴더**를 Codex의 **로컬 작업**으로 연다. 압축 안 소스가 최신 미커밋 상태다. 예전 집 PC 사본이나 과거 ZIP에 덮어쓰지 않는다.
2. `AGENTS.md` → `docs/DEVELOPMENT.md` → `PROJECT_STATUS.md` → 이 문서 → `docs/STAM-EXPERIENCE-ROADMAP.md`를 읽는다.
3. `node --version`과 `npm --version` 확인. Node 22.12 이상에서 `start-control-room-preview.cmd`를 실행한다. 필요한 React 의존성만 lockfile로 설치하고 `http://127.0.0.1:5173`을 연다.
4. Gen Studio MCP의 진단/설치 모델/영상 도구 스키마를 다시 읽는다. 생성 도구가 반환한 파일을 실제로 확인한다. 사용자에게 받은 진단만으로 생성 성공이나 성능을 단정하지 않는다.
5. 사용자가 로컬 Codex에서 이미 만든 영상 결과를 먼저 찾는다. 최근 작업 목록/기록에서 라운지 3초 시험을 확인하고, 같은 작업을 다시 돌리기 전에 성공·실패와 출력 경로를 확인한다.
6. 현재 사이트 전경과 결과 영상을 나란히 검토한 뒤 다음 작업을 정한다. 새 모델 설치·유료 서비스·커밋·푸시·배포는 이 인계만으로 실행하지 않는다.

## 현재 소스와 완성 범위

- `apps/control-room/src/main.tsx` → `SpaceExperience.tsx`: 첫 화면 STAM 라운지, 안내데스크/게이트/터미널/정보실/영상관과 우주 관제센터 왕복.
- `space-config.ts`: 이미지, 클릭 영역 SVG 윤곽, 라벨, 확대 중심, 850ms 연출 시간. 변경 가능한 시각 설정이다.
- `space-navigation.ts`: lounge/guide/information/cinema/bridge와 기존 mission/map/operations hash. 첫 방문 lounge, 기존 콘솔 직접 주소 유지.
- `space-experience.css`: 글라스/SF 테마, hover/포커스 윤곽, 제한 이미지 확대, 반응형 배치.
- 안내데스크 근접 UI는 기존 `assets/partners/director-portrait.webp`를 사용한다. 원경 생성 인물 얼굴은 아직 수정하지 않았다.
- 소개영상은 기존 `assets/intro/intro.mp4`, 명시적 재생 뒤에만 다운로드. Gemini 이동 클립과 구분한다.
- `ControlRoom.tsx`와 `GlassNavigation.tsx`의 미션/지도/운항은 **구성 시안**이다. 실제 계약·운항 상태 연결과 최종 지도/적재 재제작은 완료되지 않았다.
- CameraStudy 진입 메뉴/import는 제외했다. 관련 오래된 파일/GLB는 원본 보존용이다. 다시 확장하지 않는다.
- 저장/계산 엔진, 기존 루트 앱의 미커밋 레이아웃 변경도 묶음에 보존했다. 단순히 현재 시제품에서 import하지 않는다고 삭제하지 않는다.

## 현재 전경과 자료

| 자료 | source 기준 경로 | 상태 |
|---|---|---|
| 현재 라운지 | apps/control-room/src/assets/lounge-terminal-reference.png | 터미널·탑승 게이트·작은 생성 인물 포함 |
| 최초 라운지 원본 | apps/control-room/src/assets/ground-lobby-reference.png | 원본 보존 |
| 현재 관제센터 | apps/control-room/src/assets/control-room-empty-seats-reference.png | 좌우 빈자리, 홀로그램 지구는 시각 참고 |
| STAM 로고 | assets/stam-logo-transparent.png | 기존 원본 사용 |
| 튜토리얼 파트너 | assets/partners/director-portrait.webp | 기존 원본 사용 |
| 기존 소개영상 | assets/intro/intro.mp4 | 영상관에 연결 |

ZIP의 `references/`에는 Gemini 영상 두 개와 브라우저 검증 스크린샷이 있다. 앱이 자동 재생하거나 배포하는 자료가 아니다. 전체 생성 이미지 폴더나 과거 영상 제작 프로젝트는 이 묶음에 포함하지 않고 클라우드 원본을 보존했다.

## 사용자 확정 방향

- 밝은 지상 공간 이름은 **STAM 라운지**. **STAM 본부**는 향후 여러 사이트 통합용으로 남긴다.
- 왼쪽 안내데스크는 기존 튜토리얼 파트너. 가운데 터미널/우주선 탑승 게이트, 오른쪽 정보실·영상관. 관제센터는 우주에 있다.
- 어두운 우주 관제센터, 좌우 다른 오퍼레이터들은 착석, 사용자 좌석은 양쪽 하나씩 비워 둔다. 왼쪽 미션, 오른쪽 운항/적재. 중앙은 **스탠턴 항성계**. 지구 전경을 실제 게임 지도로 오인하지 않는다.
- 사물을 선택하면 짧은 접근 연출 후 실제 UI. 호버/포커스에 사물 윤곽과 선택형 효과음. 의자가 살짝 뒤로 빠지는 연출은 별도 레이어·배경 복원으로 후속 구현.
- 화면 상하단 UI와 원본 STAM 로고, SUIT/Oxanium 글꼴, A 글라스 분위기 유지. 나중에 이미지/배치/색/전환을 바꿀 수 있게 분리.
- **폐기:** 관제실 전체 3D 모델링, 자유 보행/WASD, 지도 뒤편 콘솔/모니터, 180도 회전, Blender 준비·3D 자산 구매 계획. 실제 항로 지도·적재 3D까지 폐기한 것이 아니다.
- 지도는 고품질 행성, 굵은 홀로그램 경로/사인/정거장 아이콘. 적재는 밝은 배경과 금속 화물/공간 그리드. 실제 좌표·직선 퀀텀/천체 회피·계약 소유권·기존 저장 유지, bloom 비활성.
- 튜토리얼은 핵심 화면 이후 기존 파트너가 실제 사이트 위에서 안내. Bokoko33의 방은 사물 선택 경험 참고다.
- 연결 앱의 설치 아이콘·자동 로그 찾기·선택형 게임 오버레이는 이후 범위. 계획은 로드맵에 보존돼 있다.

## Gen Studio — 사용자가 전달한 로컬 진단

클라우드가 직접 실행한 진단이 아니다. 집 PC의 로컬 Codex 보고를 사용자가 전달했다.

- Gen Studio 0.1.0 / ComfyUI 0.44.0 / RTX 4080 SUPER 16GB.
- MCP 연결/모델 조회 성공, 필수 노드 누락 없음, 당시 진행·대기·실패 작업 없음.
- RedCraft QW21 v3, PornMaster Z-Image Turbo V3.5, Illustrij v21 설치됨. 모델명은 설치 목록 정보이며 이들 이미지 모델로 사이트 제작을 완료했다는 뜻이 아니다.
- `video_i2v` 설치됨. Wan 2.2 이미지→영상, 3초·5초, 480p·720p. 입력 `image_id` 또는 `image_path`로 시작 프레임 지정 가능.
- **끝 프레임 입력은 당시 공개 MCP 도구에 없었다.** 임의 매개변수를 만들어 호출하지 않는다. 실제 스키마가 바뀌었는지 재조회한다.
- Windows 단일 GPU 모드 경고가 있었으나 생성 실패로 확인된 것은 아니다.
- 토큰/개인 설치 경로는 인계 문서에 넣지 않는다. 현재 로컬 MCP 도구를 사용하고 앱을 중복 설치하지 않는다.

### 현재 영상 시험

사용자는 로컬에서 시험 영상이 만들어진 것 같다고 했으나 클라우드에는 결과를 보내지 않았다. **최근 결과 확인부터**, 불필요한 재생성 방지.

첫 시험 설정: 라운지 원본 1장 → 16:9 / 480p / 3초 / 1개. 시드 지원 시 고정. 모델/실제 파라미터/소요시간/출력 경로를 기록. 목표는 기존 금속 게이트 쪽으로 **짧고 느리게 전진**, 구조·단말기·안내데스크를 보존하는 것이다. 도착/탑승/이륙/우주/관제실까지 한 영상에 넣지 않는다. 도구가 지원하는 설정만 쓴다. 안정적일 때 720p·5초를 검토한다. 로컬이라서 Gemini보다 낫다고 보장하지 않는다.

Gemini 비교 자료:

- `gemini_generated_video_844cb197.mp4`: 10.03초/1280×720/24fps. 게이트 옆에 새 출입구가 생기고 통로→우주선→우주/관제실로 변형. 채택하지 않음.
- `gemini_generated_video_89dfbb58.mp4`: 10.03초/1280×720/24fps. 라운지 내 전진으로 개선됐으나 정지 구도와 게이트 구조의 정확한 유지 확인 필요. 최종 채택/사이트 적용하지 않음.

## 검증과 남은 일

클라우드 마지막 기능 변경 검증:

- React 테스트 파일 4개 통과, TypeScript/Vite 빌드 통과.
- `npm test`: 로컬 포트 허용 환경에서 **231개 통과**. 제한 샌드박스에서의 최초 서버 테스트 실패와 구분한다.
- `node scripts/check-space-experience-browser.mjs`: 3언어·4너비·공간/콘솔 동선·이력·포커스·취소/건너뛰기·영상 지연 로드/종료·소리 토글·저장 보존·미공개 경계 통과.
- 이 브라우저 검사 기본값은 Linux Playwright/Chromium 경로다. Windows에서는 설치 경로에 맞게 `STAM_PLAYWRIGHT_MODULE`과 `STAM_CHROMIUM`을 지정하거나 로컬 브라우저 도구로 같은 시나리오를 확인한다. Linux 경로가 없다고 앱 실패로 판단하지 않는다.
- `check-control-room-browser.mjs`는 폐기한 3D 동선을 요구하는 **이전 검사**이므로 현재 합격 기준으로 실행하지 않는다.

남은 순서:

1. 집 PC 현재 화면과 로컬 영상 결과 확인.
2. 원경 파트너 얼굴/콘솔 근접 품질 개선. 의자 레이어와 가려진 배경 복원은 아직 안 됨.
3. 최종 승인한 이동 영상만 연결하고 스킵·즉시 이동·재방문 편의 유지.
4. 실제 미션→지도→운항/적재 연결. 게임 데이터/저장/파트너 규칙 보존.
5. Windows 연결 앱, 로그 탐색/오버레이, 파트너 튜토리얼은 로드맵 순서대로.

## Git과 이전 PC 충돌 방지

이 묶음은 `.git` 없는 **전체 소스 스냅샷**이다. 최신 Git 이력을 대신하는 저장소가 아니다. 미리보기는 그대로 실행할 수 있다.

- 원격: `https://github.com/limmin3-sudo/stam-freight-control.git`.
- 정확한 기준 SHA/브랜치/변경·삭제 목록은 ZIP 루트 `TRANSFER-MANIFEST.json`에서 읽는다.
- 과거 재작성 전 체크아웃/객체를 가져와 합치거나 push하지 않는다. 클라우드의 폐기 경로를 복구하지 않는다.
- Git 연결이 필요하면 **새 빈 경로**로 현재 원격을 clone하고 manifest 기준 커밋이 그 새 이력에 있는지 확인한다. 원격이 그 이후 전진했으면 차이를 먼저 검토한다.
- 새 clone에서 기준 커밋에 로컬 작업 브랜치를 만든 다음, 검증된 source 파일을 복사해 미커밋 변경으로 복원한다. manifest의 삭제 목록도 따로 대조한다. 기존 작업 폴더를 reset하거나 덮어쓰지 않는다.
- `git init`으로 별도 루트 이력을 만든 뒤 기존 저장소에 합치지 않는다. 클라우드에서 커밋/푸시/배포하지 않았으며 로컬에서도 별도 승인 없이 하지 않는다.

## 로컬 Codex에 붙여넣을 요청

> 이 source 폴더가 클라우드에서 가져온 최신 STAM 작업본이야. AGENTS.md, PROJECT_STATUS.md, docs/LOCAL-CODEX-HANDOFF.md, docs/STAM-EXPERIENCE-ROADMAP.md를 읽고 로컬 미리보기를 실행해줘. Gen Studio MCP 연결을 확인한 뒤 최근 생성한 라운지 영상 결과부터 찾아서 확인해줘. 설치/재생성을 먼저 하지 말고 현재 결과와 사이트 전경을 비교해. 전체 방 3D/Blender 계획은 폐기했고 이미지 기반 라운지·관제센터를 만드는 중이야. 기존 작업·계약 데이터는 보존하고, 커밋·푸시·배포는 하지 마.
