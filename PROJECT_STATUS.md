# 현재 프로젝트 상태

마지막 갱신: 2026-10-30 (KST) · 마지막 작업 AI: Claude Code (Cloud)

## 현재 인계 상태

- 마지막 작업 AI: Claude Code. Codex의 `86e439e`(main)를 이어받았다. 작업 중 Codex와 동시 수정 없음.
- 저장소·Pages 경로 `verse-hauler` → `stam-freight-control` 변경: **링크·배포 수정은 준비 완료, GitHub 이름 변경과 푸시는 사용자 최종 승인 대기**.
- 이 Claude Cloud 세션에서는 GitHub API·Actions·Pages 사이트 접근이 가능했다. 최근 Pages 배포 4건(`a445f8f`~`86e439e`) 성공을 확인했다.
- 이름 변경 전까지 유효한 저장소: https://github.com/limmin3-sudo/verse-hauler · 사이트: https://limmin3-sudo.github.io/verse-hauler/
- 변경 후 주소: https://github.com/limmin3-sudo/stam-freight-control · https://limmin3-sudo.github.io/stam-freight-control/
- 이름이 바뀌면 기존 Pages 주소는 리디렉션되지 않고 꺼진다. 저장소 Git 주소는 GitHub가 리디렉션하지만 각 PC에서 origin을 갱신한다. 절차는 [이름 변경 인계](docs/REPOSITORY-RENAME.md).
- 각 PC의 브랜치·미커밋 상태·원격 최신성을 시작 시 다시 확인한다.

## 이번 Claude 작업 (미커밋)

- README, docs/DEVELOPMENT.md, docs/CLOUD-HANDOFF.md, docs/CLOUD-START-PROMPT.md, location-manager.mjs(Actions 링크)의 저장소·사이트 주소를 새 이름으로 변경.
- `.github/workflows/pages.yml`: 비교 URL을 새 Pages 경로로 변경하고 `--fallback-file .github/pages-baseline/locations.json` 추가.
- `scripts/refresh-data.mjs`: `--fallback-file` 옵션. 이전 배포가 **404일 때만** 기준 스냅샷과 비교하고, 그 밖의 오류는 기존처럼 실패한다.
- `.github/pages-baseline/locations.json` 신규: 이름 변경 직전 기존 사이트에서 받은 스냅샷(4.10.2-LIVE.12881860, 좌표 731·점프 2). 공개 파일 묶음에는 포함되지 않는다. 새 경로 첫 배포 성공 후에는 404 경로가 쓰이지 않으므로 삭제해도 된다(삭제는 별도 승인).
- package.json 이름, wrangler worker 이름, IndexedDB 이름, localStorage 키는 의도적으로 유지했다.
- 검증: Node 22.22.0, `npm test` 32개 통과, `git diff --check` 통과. 새 주소 404 + 기준 파일 → 성공(추가·변경·삭제 0), 기존 주소 200 → 성공, 기준 파일 없이 404 → 실패 확인.

## 완료된 제품 기능

- 스크린샷 OCR·수정, 미션·배송·상자별 독립 소유권과 구성 재사용.
- Stanton·Pyro·Nyx 지도, 게이트웨이 경유, 간편 경로와 상세 적재.
- 51종 함선·개인 그리드·비행 성능·드라이브 설정.
- 파트너 3명, 운항 진행·되돌리기·재계산, 개인 장소와 별칭 관리.
- 상세 제약과 저장 키는 [CLOUD-HANDOFF.md](docs/CLOUD-HANDOFF.md) 참조.

## 이번에 완료한 개발 환경 작업

- `docs/DEVELOPMENT.md` 신규: 공통 제품 규칙·구조·실행·검증·작업 인계·Git 승인 절차.
- `AGENTS.md` 정리 및 `CLAUDE.md` 신규: 동일 공통 지침과 상태 문서 연결.
- `README.md` 보완: Windows 준비, PC·AI 전환 및 GitHub 동기화 범위.
- `docs/CLOUD-HANDOFF.md`, `docs/CLOUD-START-PROMPT.md`: 새 문서 연결, 현재 요청 우선 및 커밋·푸시 승인 규칙 정합성 보완.
- `start.cmd`: 개인 PC 전용 Node 경로 제거, PATH의 Node 22 확인, 준비 실패 시 서버 실행 중단, 서버 종료 코드 보존.
- 앱 기능 코드·의존성·배포 설정은 변경하지 않았다. 새 프로젝트나 worktree를 만들지 않았다. 환경 설정 변경이나 환경 게시도 수행하지 않았다.

## 검증 결과와 범위

- Node.js 22.23.4, `NODE_USE_ENV_PROXY=1` 환경에서 `node scripts/prepare.mjs` 성공. 이전 좌표 API 네트워크 차단은 해소됐다.
- 좌표 버전 `4.10.2-LIVE.12881860`, 731개 좌표·2개 점프 연결을 생성했다. 생성 파일은 기존 Git 무시 대상이다.
- 공동 개발 구성 완료 시 `npm test`: 32개 통과, 실패·건너뜀 0개.
- 공동 개발 구성과 이번 최종 인계 문서는 `git diff --check` 및 문서 내부 상대 링크 확인 완료. 이번 최종 인계는 문서 변경만 있으므로 앱 테스트를 반복하지 않았다.
- Windows CMD 실제 실행, 두 Windows PC의 도구·GitHub 인증, Claude Code의 지침 인식은 미검증이다. 이 Cloud는 Linux 환경이다.
- 브라우저 화면·실제 OCR·실제 AI 호출은 이번 세션에서 재검증하지 않았다. GitHub Actions API와 배포 사이트 요청도 프록시 403으로 차단되어 최근 배포 성공은 확인하지 못했다.

## 미해결 문제와 백로그

- Google 로그인·계정별 저장·PC 간 앱 데이터 자동 동기화는 미구현. Firebase 프로젝트·연결은 확인되지 않았다.
- 앱 개인 데이터는 브라우저 localStorage에 있으며 GitHub와 AI 대화 인계 문서로 동기화되지 않는다.
- 실제 OCR 정확도, AI 해석 시 독립 미션 보존, 상자 템플릿 변형 사례 등 추가 검증이 필요하다.
- 연료·대기권·중량·게임 실시간 상태는 완전 시뮬레이션 대상이 아니다.

## 다음 작업 우선순위

1. 사용자 승인 후 GitHub 저장소 이름 변경 → 위 미커밋 작업 커밋·main 푸시 → Actions와 새 사이트 확인.
2. 각 PC에서 미커밋 작업을 보존하고 `git remote set-url origin https://github.com/limmin3-sudo/stam-freight-control.git` 후 `git pull --ff-only`.
3. 새 경로 첫 배포 성공 후 `.github/pages-baseline/` 정리 여부 결정.
4. 두 Windows PC의 Git·Node 22·인증, start.cmd 실행, Claude Code의 지침 인식은 각 PC에서 확인한다.
5. 이후 제품 개발은 사용자의 다음 요청에 따른다. 로그인·동기화는 백로그이며 자동 착수하지 않는다. 이후 커밋·푸시는 해당 사용자 승인 범위에서 진행한다.

## 다음 AI가 처음 확인할 명령

저장소 루트에서 `git status --short --branch`, `git log -5 --oneline`, `git diff --stat`을 확인하고 [공통 지침](docs/DEVELOPMENT.md)을 읽는다. 기존 변경과 인계 문서를 보존한다. 실행 확인이 필요하면 Node 22에서 `node scripts/prepare.mjs`, `npm test`, `npm start`를 사용한다.
