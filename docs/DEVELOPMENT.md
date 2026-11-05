# 공통 개발 지침 — Codex · Claude Code

이 문서는 두 AI와 두 Windows PC가 함께 따르는 개발 규칙이다. GitHub `limmin3-sudo/stam-freight-control`를 코드와 개발 문서의 기준으로 사용한다. Google Drive를 사용하지 않는다. 같은 계정이어도 AI 대화·로컬 파일·브라우저 저장소는 자동 공유되지 않는다.

## 시작과 작업 소유권

1. 사용자의 현재 요청을 확인하고, 루트의 해당 AI 지침, 이 문서, `PROJECT_STATUS.md`, `docs/CLOUD-HANDOFF.md`, `README.md`를 읽는다. 과거 인수인계의 다음 작업은 현재 요청을 대신하는 실행 명령이 아니다.
2. `git status --short --branch`, `git log -5 --oneline`, 현재 브랜치와 원격을 확인한다. 기존 미커밋·미추적 파일을 보존한다.
3. 원격 접근이 가능하면 `git fetch origin` 후 현재 브랜치와 대상 원격 브랜치의 차이를 확인한다. 브랜치와 upstream을 추측하지 않는다. 깨끗한 작업 폴더에서 확인된 upstream에 한해 `git pull --ff-only`를 사용한다. 충돌·분기가 있으면 삭제나 강제 동기화 없이 보고한다.
4. 같은 체크아웃에서는 한 AI만 수정한다. 상태 문서에 작업자·브랜치·작업 범위를 기록한다. 다른 PC에서는 원격 갱신과 인계 기록을 확인한 후 시작한다. 상태 문서는 잠금 장치가 아니므로 동시 작업을 막는다고 가정하지 않는다.
5. Cloud 작업은 이미 격리돼 있으므로 명시적인 요청 없이 Git worktree를 만들지 않는다.

## 제품에서 보존할 규칙

- Use natural Korean in conversation and polite Korean in the UI.
- Preserve independent mission, shipment and box ownership. Identical commodities and box sizes are not interchangeable between contracts. For the senior navigator, collect every feasible shipment at a pickup before departing and batch source-system pickups before crossing when capacity permits. For the bridge operator, prioritise completing simple contracts and allow nearby pickups within the separate detour budget. Prefer destination-adjacent compact packing and shared free cells in automatic mode; preserve explicit shareGrids:false. Primary colour labels show destinations; mission IDs remain available for delivery checks.
- Cryopods: one pod is **1 SCU**, occupying a 2-cell footprint at half cell height. Two vertically stacked pods equal the envelope of a standard 2 SCU crate. Odd pod stacks cannot support ordinary crates; no bridging uneven supports. Keep individual pod ownership and count. Do not turn the Wiki API item volume of 2 SCU into 2 SCU of cargo per pod. This is the user-confirmed packing rule (2026-11-02).
- Hull B multi-block cargo: when spare space permits, keep each destination’s large and small containers in nearby physical blocks rather than fragmenting blocks between destinations. Using the other side is preferable to scattering a destination among other cargo. For fresh Hull B loads, prefer one side, then one fore/aft quarter, then a touching upper or lower pair of grids. Keep aboard positions unchanged. Preserve `_stack` and `_world` attachment frames through ship validation.
- Grid use selection is shared by all hauling partners and ships. Use a dedicated selection mode; toggle each defined grid (32 SCU per Hull B grid), exclude disabled grids from packing/capacity, keep stable grid indices, persist per ship in settings, and never disable a grid with actual aboard cargo. Fresh Hull B layouts traverse adjacent physical blocks as groups.
- Preserve aboard cargo positions when resuming or recalculating an active run. Never silently erase missions or progress.
- Keep cargo views grid-only unless exact authorized ship exteriors are available. Every hold, Hull B included, uses one rotatable 3D view with port/starboard labels (user decision 2026-10-30). Preserve orientation and access guides. Cargo attaches per ship (user decision 2026-10-30): flat holds stack up from the floor, Hull B and Hull C attach to the spine and stack outward/sideways, the RAFT hangs from the top (`STACK_BY_SHIP`/`withStacking` in ships.mjs).
- Keep bloom disabled. Warm stellar surfaces and a thin corona replace white clipping. Pyro is orange/amber (not deep red), Stanton teal-blue, Nyx indigo/violet.
- Keep straight quantum routes with body avoidance and sourced gateway connections. No automatic return-to-origin in the UI.
- Show partner selection before the introduction. Keep the senior navigator and lively adult female bridge operator voices throughout planning and execution. Partner order: operator, navigator, broker. The broker has a dedicated Pyro portrait and a preview-only introduction; trading is not implemented. Navigator batch routing must remain intact. The operator uses its separate contract-completion routing with bounded nearby pickups.
- Select drive defaults by actual slot: Atlas S1, Hemera S2, Erebos S3, sourced factory equipment for larger slots. Support factory/recommended/manual presets and per-ship overrides. Custom grid profiles retain performanceId.
- Quantum transit depends on the drive; SCM/NAV speeds affect approach estimates. Do not invent a generic large-ship speed multiplier. Approach distances and average-speed factors are planning assumptions.
- Preserve personal location management, aliases and the validated daily coordinate refresh workflow.
- Guest data is browser-local; optional Firebase account login/synchronization is implemented and connected (see PROJECT_STATUS.md for verification scope). Preserve guest/account separation, conflict selection and per-user rules. Do not claim Google popup login or cross-device behavior is tested without actual evidence.
- Do not assume this Cloud environment has earlier local chats, browser sessions, credentials, personal settings or screenshots.
- Never publish secrets, local account paths, private conversation dumps or user screenshots. Keep necessary operational handoff documentation free of personal-machine details.


## 구조와 실행

- `index.html`, `style.css`, `app.mjs`: 화면과 앱 연결.
- `engine.mjs`, `route-only.mjs`, `execution.mjs`: 경로·적재·운항 진행.
- `starmap.mjs`, `scene.mjs`, `mapfx.mjs`: 지도·화물 시각화.
- `ocr.mjs`, `workbench.mjs`, `recipes.mjs`: OCR·미션 편집·상자 구성.
- `fleet.mjs`, `ships.mjs`, `performance.mjs`, `travel.mjs`: 함선·비행 성능.
- `data/`, `assets/`, `vendor/`: 데이터·파트너 사진·라이브러리.
- `scripts/`, `server/`, `tests/`: 데이터 준비·로컬 서버·Node 테스트.

Node.js 22를 사용한다. 저장소 루트에서 `node scripts/prepare.mjs`, `npm test`, `npm start` 순서로 실행한다. 필수 npm 설치나 프레임워크 빌드는 없다. 준비 스크립트는 무시된 `vendor/three.module.js`, `data/locations.json`을 만든다. 다운로드에는 `cdn.jsdelivr.net`, `api.star-citizen.wiki` 접근이 필요하다. Cloud에서는 제공된 프록시·CA를 유지하고 필요하면 `NODE_USE_ENV_PROXY=1`을 설정한다. TLS·체크섬 검증을 끄지 않는다. 기본 서버는 loopback 4173 포트다.

## 수정과 검증

- 단계형 창은 흐름 내에서 외곽 가로·세로 크기와 위치를 통일한다. 모든 파트너·이용안내·다단계 확인 창 및 이후 추가되는 화면에도 같은 기준을 적용한다. 내용량/단계/언어에 맞춰 창이 커지거나 작아지지 않게 하고, 넘치는 본문만 내부 스크롤한다. 헤더와 주요 버튼 영역을 유지하며 데스크톱/모바일 단계 전환에서 실제 크기를 검증한다.

- 적재·경로 버그를 분석할 때 실제 파트너, 함선/기본 또는 수정 그리드, 운항·적재 진행 상태, 표시 시점을 먼저 확인한다. 대화·이미지에서 이미 확인된 것은 다시 묻지 않으며 확인된 사실과 재현용 가정을 구분한다. 기본 함선 재현만으로 사용자 조건도 검증했다고 단정하지 않는다.
- 현재 구조와 기존 변경을 보존하며 요청에 필요한 범위만 수정한다. 불필요한 프레임워크 도입·전면 재작성·데이터 삭제를 하지 않는다.
- 기능 변경은 관련 테스트와 전체 `npm test`를 실행하고, UI 변경은 가능한 브라우저 검증을 한다. 문서만 바꾼 경우 링크·명령·차이 검토를 중심으로 확인한다.
- 성공·실패·미실행을 구별하고 실행 명령과 결과를 기록한다. 과거 32개 통과 기록을 현재 실행 결과로 보고하지 않는다. 모의 AI 테스트는 실제 API 검증과 구분한다.
- 사용자에게 영향을 주는 배포 변경은 `data/releases.json` 맨 앞에 `version`·`date`(KST `YYYY-MM-DD HH:MM`, 실제 배포 시각)·제목·변경 내용을 기록한다. 버전 규칙(사용자 결정 2026-11-02, 같은 날 수정): 작업 종류로 기계적으로 정하지 말고 **사용자 체감 중요도**로 AI가 판단한다. 마지막 자리 = 거의 눈에 안 띄는 다듬기(문구·색·작은 배치·작은 버그 수정), 가운데 자리 = 쓰다 보면 바로 느끼는 변화(새 기능·새 표시 정보·경로/적재 동작 변경·눈에 띄는 화면 재배치·체감 큰 버그 수정), 첫 자리 = 사용 방식 자체가 바뀌는 개편(전체 화면 구조·주요 흐름 재설계·다시 입력이 필요한 저장 형식 변경). 여러 변경을 함께 배포하면 가장 큰 것 기준. 애매하면 낮은 쪽. 버전은 기록마다 1씩 오르며 위에서 아래로 내림차순이다. 업데이트 알림은 CI가 생성하는 `version.json`과 배포 HTML의 버전을 비교한다. 배포 복사본의 버전별 모듈·데이터·자산 주소를 유지하고, 업데이트 시 미션·운항 진행을 초기화하지 않는다.
- 비밀번호·API 키·인증정보·사용자 스크린샷·개인 데이터·컴퓨터별 개인 경로를 Git이나 인계 문서에 넣지 않는다. `.env.example`만 형식 예시로 사용하고 실제 `.env`는 로컬에서 관리한다.

## 종료 및 AI 전환

1. `git diff`, `git diff --stat`, 미추적 파일을 확인하고 의도하지 않은 변경이 없는지 검토한다.
2. 가능한 검증을 수행하고 실패 원인·미실행 이유를 구분한다.
3. `PROJECT_STATUS.md`에 마지막 작업 AI·날짜(KST)·브랜치·완료 내용·변경 파일·검증 결과·남은 문제·다음 구체적 작업을 남긴다. 진행 중이면 중단 지점도 기록한다.
4. `git status --short --branch`, 필요하면 `git diff --check`로 최종 상태를 확인한다. 미커밋 작업과 원격 반영 여부를 명시한다. 자신의 커밋 해시를 만들기 위해 무한히 상태 문서를 갱신하지 않는다. 최종 커밋은 Git 이력에서 확인한다.
5. 커밋과 푸시는 사용자 승인 후에만 진행한다. 승인 대상 파일·브랜치·커밋 메시지·푸시 대상과 배포 영향을 먼저 설명한다. 기존 승인이 해당 작업을 명확히 포함하면 반복 요청하지 않는다.
6. 강제 푸시·브랜치 삭제·대규모 변경은 사전 승인을 받는다. `main` 푸시는 Pages 배포를 유발한다. 기능 배포 시 Actions와 실제 사이트를 확인한다. 문서 작업을 이유로 앱 기능을 수정하지 않는다.

미커밋 변경은 다른 PC나 Cloud에 자동 전달되지 않는다. 다른 PC로 옮길 때는 승인된 커밋·푸시를 완료한 뒤 다음 PC에서 가져온다. `.env`와 브라우저 `localStorage`는 GitHub 동기화 대상이 아니다.
