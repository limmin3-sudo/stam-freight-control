# Codex 개발 지침

## “최신으로 받아와”의 기본 동작

이 STAM 프로젝트에서 사용자가 “최신으로 받아와”, “최신 받아”, “집에서 이어서”라고만 말하면 **개발 인계 브랜치 `handoff/local-studio-20261110`의 최신 원격 상태**를 뜻한다. `main`은 공개 배포본이며 현재 개발 인계 대상이 아니다. 사용자가 다른 브랜치를 명시하면 그 지시를 우선한다. 기계 판독용 기준은 루트 `STAM_HANDOFF.json`이다.

1. 현재 저장소·브랜치·미커밋/미추적 파일·원격을 확인하고 `git fetch origin`을 수행한다. 로컬 인계가 오래됐을 수 있으므로 `git show origin/handoff/local-studio-20261110:STAM_HANDOFF.json`과 원격 `PROJECT_STATUS.md` 최상단을 먼저 확인한다. 문서에 적힌 옛 SHA로 되돌리지 않는다.
2. 깨끗한 새 이력 사본에서 해당 브랜치로 전환한 뒤 `git pull --ff-only`한다. 로컬 브랜치가 없으면 확인된 원격 브랜치를 추적해 만든다. 미커밋/분기/예전 재작성 이력이 있으면 강제 reset·clean·덮어쓰기·자동 stash 없이 기존 작업을 보존하고 별도 새 폴더에 최신 사본을 받아 진행한다. 이전 Git 객체를 새 이력에 합치지 않는다.
3. 받은 뒤 이 파일 → `docs/DEVELOPMENT.md` → `PROJECT_STATUS.md` 최상단 → `docs/LOCAL-CODEX-HANDOFF.md` 최상단 → `docs/CONSOLE-TRAVEL-PRODUCTION.md` 순서로 읽는다. GitHub에 코드·자산·영상 입력 자료가 모두 있다. ZIP 다운로드/재적용이나 사용자에게 브랜치·이전 대화를 다시 설명하라는 요청은 필요 없다.
4. Node 22.12 이상과 의존성을 확인하고 기존 실행 중인 서버가 있으면 재사용한다. 아니면 저장소 루트의 `start-control-room-preview.cmd` 또는 `npm run dev:control-room`으로 미리보기를 연다. 의존성이 없거나 lockfile이 변경된 경우에만 `npm ci --prefix apps/control-room`을 실행한다. 확인 URL은 `http://127.0.0.1:5173/#/bridge?lang=ko`다.
5. 받은 브랜치·커밋, 미리보기 상태와 다음 작업을 짧게 보고한다. 다음 작업은 로컬 Gen Studio 연결·최근 결과·끝 프레임 지원 확인 후 콘솔 이동 영상 제작이다. “최신으로 받아와”만으로 영상 생성·모델 설치·기능 개발·커밋·푸시·배포를 시작하지 않는다. 영상은 로컬에서 만들고 Runway는 사용하지 않는다.

작업 시작 시 아래 문서를 순서대로 읽는다.

1. [공통 개발 지침](docs/DEVELOPMENT.md): 제품 제약, 구조, 실행·검증, Git·AI 인계 규칙의 기준.
2. [현재 작업 상태](PROJECT_STATUS.md): 마지막 작업, 검증 결과, 미해결 문제와 다음 단계.
3. [상세 제품 인수인계](docs/CLOUD-HANDOFF.md), [실행 안내](README.md).

사용자의 현재 요청을 우선하고 Git 상태와 최근 이력을 먼저 확인한다. 다른 AI가 남긴 미커밋 변경을 보존한다. 작업 종료·전환 전에는 변경 검토와 가능한 검증을 수행하고 PROJECT_STATUS.md를 갱신한다. 커밋·푸시는 사용자 승인 후 진행한다.

Cloud 시작 안내는 [docs/CLOUD-START-PROMPT.md](docs/CLOUD-START-PROMPT.md)를 참고한다. 과거 채팅·다른 PC의 파일·로그인·개인 데이터가 자동으로 제공된다고 가정하지 않는다.
