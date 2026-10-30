# 현재 프로젝트 상태

마지막 갱신: 2026-10-30 (KST) · 마지막 작업 AI: Codex

## 현재 인계 상태

- 작업: 사용자가 승인한 Codex · Claude Code 공동 개발 문서 및 Windows 실행 경로 정리 완료. 사용자 승인에 따라 GitHub 반영 진행.
- 기준 브랜치: Cloud의 `work`, 기준 HEAD `f83432a`. 분석 시 원격 `main`과 일치했으며 이후 원격 최신성은 다시 확인해야 한다.
- 사용자가 이번 변경의 커밋·푸시를 승인했다. 이 문서를 포함한 커밋을 원격 `main`에 일반 푸시한다. 실제 반영 여부와 최종 커밋은 Git 이력 및 원격 HEAD로 확인한다. 이 기록만으로 푸시·배포 성공을 가정하지 않는다.
- 동시 수정 작업자는 없음. 다음 AI는 시작 시 Git 상태와 사용자 요청을 다시 확인한다. 이 문서는 동시 작업 잠금을 제공하지 않는다.

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

## 이번 검증 결과

- Node.js 22.23.4, `NODE_USE_ENV_PROXY=1` 환경에서 `node scripts/prepare.mjs` 성공. 이전 좌표 API 네트워크 차단은 해소됐다.
- 좌표 버전 `4.10.2-LIVE.12881860`, 731개 좌표·2개 점프 연결을 생성했다. 생성 파일은 기존 Git 무시 대상이다.
- `npm test`: 32개 통과, 실패·건너뜀 0개.
- `git diff --check` 및 문서 내부 상대 링크 확인 완료.
- Windows CMD 실제 실행, 두 Windows PC의 도구·GitHub 인증, Claude Code의 지침 인식은 미검증이다. 이 Cloud는 Linux 환경이다.
- 이번 작업에서 브라우저 화면·실제 OCR·실제 AI 호출·배포 사이트는 재검증하지 않았다.

## 미해결 문제와 백로그

- Google 로그인·계정별 저장·PC 간 앱 데이터 자동 동기화는 미구현. Firebase 프로젝트·연결은 확인되지 않았다.
- 앱 개인 데이터는 브라우저 localStorage에 있으며 GitHub와 AI 대화 인계 문서로 동기화되지 않는다.
- 실제 OCR 정확도, AI 해석 시 독립 미션 보존, 상자 템플릿 변형 사례 등 추가 검증이 필요하다.
- 연료·대기권·중량·게임 실시간 상태는 완전 시뮬레이션 대상이 아니다.

## 다음 작업 우선순위

1. 이번 변경의 커밋·푸시는 사용자 승인됨. 최종 차이·대상 파일 확인 및 원격 main이 기준 HEAD와 같은지 재확인했다. 일반 푸시 후 원격 HEAD와 Actions·사이트 결과를 확인한다.
2. 다음 작업의 커밋·푸시는 해당 사용자 승인 범위에서 진행한다.
3. GitHub 반영 후 두 Windows PC에서 Node 22·Git·인증과 실행을 확인한다. Codex/Claude Code가 동일 저장소 폴더와 공통 문서를 읽는지 확인한다. 한 AI씩 사용한다.
4. 이후 제품 개발은 사용자의 다음 요청에 따른다. 로그인·동기화는 백로그이며 자동 착수하지 않는다.

## 다음 AI가 처음 확인할 명령

저장소 루트에서 `git status --short --branch`, `git log -5 --oneline`, `git diff --stat`을 확인하고 [공통 지침](docs/DEVELOPMENT.md)을 읽는다. 기존 변경과 인계 문서를 보존한다. 실행 확인이 필요하면 Node 22에서 `node scripts/prepare.mjs`, `npm test`, `npm start`를 사용한다.
