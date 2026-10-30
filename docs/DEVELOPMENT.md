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
- Preserve independent mission, shipment and box ownership. Identical commodities and box sizes are not interchangeable between contracts.
- Preserve aboard cargo positions when resuming or recalculating an active run. Never silently erase missions or progress.
- Keep cargo views grid-only unless exact authorized ship exteriors are available. Hull B uses port/starboard views; other holds use their appropriate view. Preserve orientation and access guides.
- Keep bloom disabled. Warm stellar surfaces and a thin corona replace white clipping. Pyro is red/orange, Stanton teal-blue, Nyx indigo/violet.
- Keep straight quantum routes with body avoidance and sourced gateway connections. No automatic return-to-origin in the UI.
- Show partner selection before the introduction. Keep senior navigator, loyal navigation officer and lively adult female aide voices throughout planning and execution. Reuse the committed portraits unless asked to replace them.
- Select drive defaults by actual slot: Atlas S1, Hemera S2, Erebos S3, sourced factory equipment for larger slots. Support factory/recommended/manual presets and per-ship overrides. Custom grid profiles retain performanceId.
- Quantum transit depends on the drive; SCM/NAV speeds affect approach estimates. Do not invent a generic large-ship speed multiplier. Approach distances and average-speed factors are planning assumptions.
- Preserve personal location management, aliases and the validated daily coordinate refresh workflow.
- Existing storage is browser-local. Google login and account synchronization are not implemented. Firebase was proposed, but no connection or project is confirmed. Do not claim login works before integrating and testing it.
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

- 현재 구조와 기존 변경을 보존하며 요청에 필요한 범위만 수정한다. 불필요한 프레임워크 도입·전면 재작성·데이터 삭제를 하지 않는다.
- 기능 변경은 관련 테스트와 전체 `npm test`를 실행하고, UI 변경은 가능한 브라우저 검증을 한다. 문서만 바꾼 경우 링크·명령·차이 검토를 중심으로 확인한다.
- 성공·실패·미실행을 구별하고 실행 명령과 결과를 기록한다. 과거 32개 통과 기록을 현재 실행 결과로 보고하지 않는다. 모의 AI 테스트는 실제 API 검증과 구분한다.
- 비밀번호·API 키·인증정보·사용자 스크린샷·개인 데이터·컴퓨터별 개인 경로를 Git이나 인계 문서에 넣지 않는다. `.env.example`만 형식 예시로 사용하고 실제 `.env`는 로컬에서 관리한다.

## 종료 및 AI 전환

1. `git diff`, `git diff --stat`, 미추적 파일을 확인하고 의도하지 않은 변경이 없는지 검토한다.
2. 가능한 검증을 수행하고 실패 원인·미실행 이유를 구분한다.
3. `PROJECT_STATUS.md`에 마지막 작업 AI·날짜(KST)·브랜치·완료 내용·변경 파일·검증 결과·남은 문제·다음 구체적 작업을 남긴다. 진행 중이면 중단 지점도 기록한다.
4. `git status --short --branch`, 필요하면 `git diff --check`로 최종 상태를 확인한다. 미커밋 작업과 원격 반영 여부를 명시한다. 자신의 커밋 해시를 만들기 위해 무한히 상태 문서를 갱신하지 않는다. 최종 커밋은 Git 이력에서 확인한다.
5. 커밋과 푸시는 사용자 승인 후에만 진행한다. 승인 대상 파일·브랜치·커밋 메시지·푸시 대상과 배포 영향을 먼저 설명한다. 기존 승인이 해당 작업을 명확히 포함하면 반복 요청하지 않는다.
6. 강제 푸시·브랜치 삭제·대규모 변경은 사전 승인을 받는다. `main` 푸시는 Pages 배포를 유발한다. 기능 배포 시 Actions와 실제 사이트를 확인한다. 문서 작업을 이유로 앱 기능을 수정하지 않는다.

미커밋 변경은 다른 PC나 Cloud에 자동 전달되지 않는다. 다른 PC로 옮길 때는 승인된 커밋·푸시를 완료한 뒤 다음 PC에서 가져온다. `.env`와 브라우저 `localStorage`는 GitHub 동기화 대상이 아니다.
