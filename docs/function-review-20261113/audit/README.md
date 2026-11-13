# 기능·성능 검수 증거

검토 기준과 미이식 기능은 [기능 대조표](../../FUNCTION-AUDIT-20261113.md)를 참조한다. 이번 작업은 `feature/graphics-functional-audit-20261113`의 미배포 검토본이다.

## 수행 결과

| 검사 | 결과 | 근거 |
| --- | --- | --- |
| 루트 단위/통합 테스트 | 238 통과 | `unit.txt` |
| 앱 테스트 | 48 통과 / 14파일 | `app-tests.txt` |
| TypeScript / Vite 배포 빌드 | 통과 | `npm --prefix apps/control-room run build` |
| 미션 입력 / 수정·취소 / 파일·텍스트·OCR 검토 화면 | 통과 | `intake.txt` |
| 파트너 선택 / 미확인 SCU → 경로 전용 / 오퍼레이터에 적재 없음 | 통과 | `partner-policy.txt` |
| 실제 저장 Game.log 37개 처리 | 통과 | `private-log-summary.json`, `private-replay.txt` |
| 실제 저장 운송 → 계획 → 6곳/7단계 완료 / 잔여 화물 0 | 통과 | 위 JSON의 `workflow` |
| 실제 로그 prefix/append, 중복 polling, 종료 관찰, 자동 수신 중지 | 통과 | 위 JSON의 `polling` |
| 합성 운송의 SCMDB 보완·재수신·선택된 종료 계약 보호 | 통과 | `mission-log-synthetic.txt` |
| 지도 조작·계층/순서·미리보기·운항·새로고침·배송 되돌리기 | 통과 | `navigation.txt` |
| 항해사 상시 지도/적재·현재 작업·단축키 격리·모바일, 오퍼레이터 목록 | 개발·최종 배포 빌드 모두 통과 | `flight.txt`, `production-flight.txt` |
| 실제 상자 picking·카메라·선적 불변·Cutlass/Hull B/RAFT/Golem OX·그리드 끄기/복원 | 통과 | `cargo.txt` |
| 3개 화면의 상자 선택 재생성 0회·카메라/진행 보존·실제 시점 갱신 | 통과 | `performance.txt`, `console-performance.json` |
| 서비스/정보실/영상관·고정 메뉴·언어/모바일·클릭 후 실제 영상 | 통과 | `rooms.txt` |
| 실제 Tesseract 엔진 → 합성 이미지 인식·검토·22 SCU 예약·중복 방지 | 통과 | `ocr.txt` |
| 실사/고유 색 홀로그램·항성계 배경·근접/품질/화면 크기 | 배포 빌드 재실행 통과 | `chart-optics.txt` |

처음 실사/홀로그램 외관 검사를 다른 브라우저 검사들과 함께 실행했을 때 Pyro 이후 탐색 버튼 클릭이 90초를 넘었다. 이 실행은 실패로 기록하며 성공에 포함하지 않는다. 최종 배포용 빌드에서 다시 실행한 결과 Stanton/Pyro/Nyx, 근접 실사/홀로그램, 품질 옵션, 1440p/모바일, 저장 상태 불변과 셰이더 오류 없음까지 통과했다. 시간 초과 원인을 확정한 것은 아니며 실제 GPU/장시간 성능은 별도다. 재실행을 위해 제품의 기능·질감·품질 옵션을 줄이지 않았다.

## 재현

Vite 개발 서버를 5186에 실행한 뒤:

```sh
npm test
npm --prefix apps/control-room test
npm --prefix apps/control-room run build
STAM_MISSION_URL=http://127.0.0.1:5186/ node scripts/check-mission-intake-flow-browser.mjs
STAM_MISSION_URL=http://127.0.0.1:5186/ node scripts/check-partner-policy-browser.mjs
STAM_MISSION_URL=http://127.0.0.1:5186/ node scripts/check-navigation-browser.mjs
STAM_MISSION_URL=http://127.0.0.1:5186/ node scripts/check-mission-log-browser.mjs
STAM_MISSION_URL=http://127.0.0.1:5186/ node scripts/check-flight-progress-browser.mjs
STAM_MISSION_URL=http://127.0.0.1:5186/ node scripts/check-cargo-detail-browser.mjs
STAM_MISSION_URL=http://127.0.0.1:5186/ node scripts/check-console-performance-browser.mjs
STAM_MISSION_URL=http://127.0.0.1:5186/ node scripts/check-room-optics-browser.mjs
STAM_MISSION_URL=http://127.0.0.1:5186/ node scripts/check-mission-ocr-browser.mjs
```

Playwright/Chromium 경로가 다르면 기존 스크립트의 `STAM_PLAYWRIGHT_MODULE`/`STAM_CHROMIUM` 환경변수를 사용한다. 관리형 Cloud에서 Chromium이 프록시 CA를 상속하지 않는 경우 OCR 검사의 `STAM_OCR_SYSTEM_FETCH=1`은 동일한 외부 자산을 시스템 CA로 가져온다. OCR 인식을 모의 결과로 바꾸거나 TLS 검증을 끄지 않는다.

개인 로그 재생은 **저장소 밖의 개인 폴더**를 `STAM_PRIVATE_LOG_ROOT`에 지정한 뒤 `node scripts/check-private-game-logs-browser.mjs`를 실행한다. 이 경로/원본은 Git·공개 산출물에 넣지 않는다. `private-log-summary.json`에는 파일 순번과 집계, 동작 결과만 있다. 파일 목록의 순서는 실행마다 다를 수 있다. 수신 기록 378은 중복 파일을 포함하며 고유 계약 수가 아니다.

외관 검사는 빌드 후 Vite preview에서 `STAM_MISSION_URL`을 해당 preview URL로 설정해 `node scripts/check-chart-optics-browser.mjs`를 실행한다. 여러 3D 브라우저를 동시에 돌린 시간은 사용자 기기 벤치마크로 사용하지 않는다.

## 실제 화면

아래는 개인 로그 화면이 아닌 예시 계약으로 찍은 실제 앱이다. 기능 검수 전용 초상화/파트너 선택과 기존 영상은 유지한다.

- [항해사 관제](operations-navigator.png): 지도와 적재 상시 표시, 현재 목적지/작업.
- [오퍼레이터 관제](operations-operator.png): 경로/방문 순서, 적재 렌더러 없음.
- [적재 확대](cargo-detail.png): 실제 상자/카메라/계약 소유권 선택.
- [홀로그램 근접](hologram-microtech-close.png): 고유 색·격자 없는 천체 표면의 현재 비교 화면.

Windows 연결 앱 설치/실게임 감시·실제 계정 제출/기기 간 동기화·실물 모바일/GPU·장시간 VRAM/프레임 시간·실제 대기권 운항 시간 보정은 이번 저장 로그/소프트웨어 Chromium 검수의 범위가 아니다. 기능을 제거하거나 검증 완료로 처리하지 않고 최신 대조표의 남은 항목에 보존한다.
