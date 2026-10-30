# STAM FREIGHT CONTROL

Star Citizen의 여러 운송 미션을 스크린샷으로 입력하고, 미션별 화물·경로·적재·시간을 정리하는 비공식 팬 도구입니다.

- 사이트: https://limmin3-sudo.github.io/stam-freight-control/
- 소스: https://github.com/limmin3-sudo/stam-freight-control
- **공통 개발 규칙:** [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **현재 작업 상태:** [PROJECT_STATUS.md](PROJECT_STATUS.md)
- **저장소 이름 변경 기록(완료):** [docs/REPOSITORY-RENAME.md](docs/REPOSITORY-RENAME.md)
- **AI 시작 지침:** [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md)
- **개발 인수인계:** [docs/CLOUD-HANDOFF.md](docs/CLOUD-HANDOFF.md)
- **Codex Cloud 시작 프롬프트:** [docs/CLOUD-START-PROMPT.md](docs/CLOUD-START-PROMPT.md)

## 현재 되는 기능

- 스크린샷 여러 장·드래그·붙여넣기, 기본 브라우저 OCR, 읽은 값 즉시 수정.
- 미션별 화물 소유권 보존, 배송지별 상자 크기·개수 입력, 같은 미션 유형에 구성 재사용.
- Stanton·Pyro·Nyx의 3D 지도, 천체·정거장·지상 거점 검색, 확인된 게이트웨이 경유.
- 간편 경로 / 상세 적재, 51종 함선 선택과 그리드 수정·등록·백업.
- Hull B 좌현·우현 보기, 평평한 화물칸 보기, 방향 가이드, 거점 작업 전·후 배치와 하역 순서.
- 운항 파트너 선택 후 인사. 수석 항해사·항해 장교·전담 비서의 사진과 말투를 전체 흐름에 적용.
- 함선별 SCM·NAV·드라이브 슬롯 데이터 자동 적용. Atlas S1 / Hemera S2 / Erebos S3, 그 외는 확인된 기본 장착품.
- 초기 함선 선택 단계에서 기본 장착 / 민수 A등급 / 사용자 설정 원클릭 선택. 함선별 수동 속도 저장·복원.
- 거점별 완료 버튼, 되돌리기, 현재 위치 재계산, 실측 시간, 예상 총 수익·시간당 수익.
- 개인 장소·좌표·한글 별칭 관리, 백업, 일일 좌표 검증·배포.

## 아직 없는 기능

**Google 로그인·사용자 계정 저장·다른 PC와의 자동 동기화는 미구현입니다.** 현재 개인 설정·미션·진행 기록은 브라우저에 저장됩니다. Firebase를 이용한 계정별 저장은 다음 우선 작업이며, 연결이나 프로젝트가 확인된 상태가 아닙니다.

실시간 게임 상태·로그 자동 입력, 완전한 연료/대기권/중량 시뮬레이션도 구현되지 않았습니다. 정확하지 않은 함선 외형을 그리는 대신 화물 그리드와 방향을 표시합니다.

## 실행

Node.js 22, 저장소 루트 기준:

```sh
node scripts/prepare.mjs
npm test
npm start
```

기본 주소는 `http://127.0.0.1:4173`입니다. Windows에서는 `start.cmd`도 사용할 수 있습니다. 별도 프레임워크 빌드나 필수 npm 의존성 설치는 없습니다.

깨끗한 체크아웃에서는 고정 버전 Three.js와 공개 좌표를 준비합니다. `vendor/three.module.js`, `data/locations.json`은 Git에서 제외되며 준비 스크립트와 CI가 생성합니다. 이 두 파일이 없다는 이유로 저장소가 불완전한 것은 아닙니다.

32개 테스트로 적재·미션 보존·경로·개인 장소 검증·선택적 AI 서버 보호·비행 시간 근사를 검사한 기능 버전이 배포돼 있습니다. 실제 스샷 OCR 정확도와 실제 AI 호출은 별도 실사용 검증이 필요합니다.

## 시간과 데이터의 범위

퀀텀 이동은 드라이브의 2단계 가감속·스풀·쿨다운 근사입니다. 지상 접근은 기본 30km를 SCM의 65%, 우주 거점 접근은 20km를 NAV 최고속도의 65%로 가정합니다. 실제 대기 밀도·질량·서버 지연을 재현하는 값이 아니며 설정에서 보정할 수 있는 항목과 코드 내부 가정은 인수인계 문서에 구분했습니다.

좌표 스냅샷은 `data/locations.json`의 meta, 비행 성능은 `data/ship-performance.json`의 버전·출처를 따릅니다. 현재 기능 기준은 `4.10.2-LIVE.12881860`, 좌표 731개·점프 연결 2개입니다. 실행 시 최신 파일의 meta를 확인하세요.

```sh
node scripts/refresh-data.mjs
node scripts/refresh-performance.mjs
npm test
```

## 배포

`.github/workflows/pages.yml`은 main push·수동 실행·매일 09:23 KST 예정 실행을 처리합니다. 좌표 검증과 테스트가 통과하면 공개 파일만 GitHub Pages로 배포합니다. GitHub의 스케줄은 지연될 수 있습니다. 소스 업로드와 실제 배포 성공을 구분하고 Actions와 사이트를 확인하세요.

## 선택적 AI 해석 서버

기본 OCR에는 AI API 키가 필요 없습니다. `server/worker.mjs`와 로컬 어댑터는 선택적 비공개 AI 서버 코드입니다. 실제 서버 연결과 API 정확도가 확인됐다는 뜻은 아닙니다.

API 키는 서버 환경 변수에만 설정하고 클라이언트·GitHub·문서에 넣지 않습니다. `.env.example`은 형식 예시이며 실제 `.env`는 커밋하지 않습니다. Cloud 환경이 이전 컴퓨터의 키·로그인·개인 설정을 자동으로 가져오지 않습니다.

## 출처·라이선스

- 게임 좌표·성능: [Star Citizen Wiki API](https://api.star-citizen.wiki/api/locations/positions)
- 그리드 자료 일부: [SuperCargo](https://github.com/AquatikJustice/SuperCargo), `vendor/SUPERCARGO-LICENSE.txt` 유지.
- Three.js: MIT, `vendor/THREE-LICENSE.txt` 유지.
- 참고한 도구와 리뷰 영상: [REFERENCE-NOTES.md](REFERENCE-NOTES.md), [인수인계](docs/CLOUD-HANDOFF.md).
- 파트너 사진: 생성한 가상 성인 인물, `assets/partners/`에 포함.

앱 소스는 MIT이며 게임 데이터·Star Citizen 관련 자산의 권리는 별개로 각 권리자에게 있습니다. Cloud Imperium Games와 무관한 팬 도구입니다.

## Windows 두 PC와 Codex · Claude Code

각 PC에 Git for Windows와 Node.js 22를 설치하고 `git --version`, `node --version`, `npm --version`으로 확인합니다. GitHub 인증은 각 PC에서 설정합니다. 두 PC의 폴더 경로는 달라도 됩니다. 각 AI의 코드 작업 기능에서 실제 저장소 폴더를 열어야 하며, 앱 설치나 같은 계정 로그인만으로 작업 폴더·대화가 공유되지는 않습니다.

처음에는 원하는 부모 폴더의 PowerShell에서 실행합니다. 이미 체크아웃이 있으면 새로 만들지 말고 기존 폴더와 미커밋 작업을 먼저 확인합니다.

```powershell
git clone https://github.com/limmin3-sudo/stam-freight-control.git
cd stam-freight-control
node scripts/prepare.mjs
npm test
npm start
```

프로젝트 폴더에서 `start.cmd`를 실행해도 됩니다. Node.js 22가 PATH에 있어야 합니다. 개인 API 키 없이 기본 앱을 사용할 수 있습니다. 선택적 AI 서버를 쓸 경우 각 PC에서 비밀값을 별도로 설정하고 GitHub에 올리지 않습니다.

### 최신 받기 — `update.cmd` 더블클릭

PC를 바꿔 작업을 시작할 때 프로젝트 폴더의 `update.cmd`를 더블클릭합니다. 예전 저장소 주소(`verse-hauler`)면 새 주소로 바꾸고, 최신 변경을 받습니다. 수정 중인 파일이 있거나 기록이 갈라졌으면 아무것도 덮어쓰지 않고 멈추며 이유를 보여 줍니다.

### 작업을 시작할 때

```powershell
git status --short --branch
git fetch origin
git branch -vv
git log -5 --oneline
```

현재 브랜치와 원격 차이를 확인합니다. 미커밋 작업이 있으면 그대로 보존하고 먼저 정리 방법을 결정합니다. 깨끗한 작업 폴더이고 현재 브랜치의 upstream이 의도한 대상일 때만 `git pull --ff-only`로 갱신합니다. Cloud의 브랜치는 `work`처럼 다를 수 있으므로 `main`이라고 추측하거나 강제로 전환하지 않습니다. 충돌이나 분기가 생기면 강제 푸시·초기화로 해결하지 않습니다.

Codex에는 `AGENTS.md`, Claude Code에는 `CLAUDE.md`를 읽게 하고, 두 AI 모두 공통 지침과 `PROJECT_STATUS.md`를 확인하게 합니다. 한 체크아웃에서 한 AI씩 작업합니다.

### 작업을 마치고 PC 또는 AI를 바꿀 때

변경 검토 → 가능한 테스트 → `PROJECT_STATUS.md` 갱신 → Git 상태 확인 순서로 마칩니다. 다음 AI가 필요한 결정·수정 파일·실패 원인·다음 명령을 알 수 있게 기록합니다. 커밋과 푸시는 사용자가 승인한 후 진행하며, `main` 푸시는 GitHub Pages 배포를 실행합니다. 승인 대상 파일을 확인해 개별적으로 스테이징하고 비밀값·개인 파일을 포함하지 않습니다.

같은 PC의 같은 폴더에서 AI를 바꾸면 미커밋 파일도 보이지만, 다른 PC와 Cloud로 옮기려면 승인된 변경을 GitHub에 커밋·푸시하고 다음 환경에서 가져와야 합니다. 한도에 도달하기 전에 인계 기록을 남기는 것이 좋습니다. 한도 때문에 기록이 불가능하면 다음 AI가 Git 차이를 먼저 검토하고 사용자가 마지막 요청을 알려줍니다.

GitHub는 코드와 개발 문서를 공유합니다. AI 채팅 전체·설치된 도구·실행 중 서버·`.env`·앱의 브라우저 저장 데이터는 공유하지 않습니다. 기존 미션·함선 설정은 사용했던 브라우저에 남아 있으며 계정 동기화는 미구현입니다. Google Drive는 사용하지 않습니다.
