# 통합본 검수 — 2026-11-13

대상: `integration/freight-division-20261113`. 기능 보존 `342a5fa` + 연출 #28 → #29 → #30 → #31. 최종 제품 변경은 [통합 인계](../../FUNCTION-CINEMATIC-INTEGRATION-20261113.md)를 참조한다. **공개 배포 아님.**

## 확인한 결과

| 범위 | 증거 |
| --- | --- |
| 루트 238 / 앱 58 테스트, TypeScript/Vite 빌드 | [validation.json](validation.json) |
| 복귀 축소, 진입 250ms 점등음, 가이드 접근/대기/복귀, 모바일/모션 감소 | [cinematic-checks.json](cinematic-checks.json) |
| 내부 아카이브 검색·필터·정렬·상세·페이지 추가·뒤로/앞으로·Esc·언어·390px | [archive-checks.json](archive-checks.json), [오류/재시도](archive-failure-retry.json) |
| STAM 브랜드, 지연 자료 다운로드, 운항 요약, 계정 컨트롤러 재사용, 변경 잠금/초기화 | [pilot-report.json](pilot-report.json) |
| 전체 운항 복원·취소·저장 실패·손상 파일·선적 소유권/위치·다른 탭 보호 | [backup-report.json](backup-report.json) |
| 항해사 상시 지도/적재, 진행·되돌리기·새로고침, 오퍼레이터 적재 없음 | [flight.txt](flight.txt), [partner.txt](partner.txt) |
| 미션 수신/직접 입력/계약 보존, 수량 보완/종료 처리 | [intake.txt](intake.txt), [log.txt](log.txt) |
| 합성 영문 이미지 → 실제 Tesseract → 사용자 검토 → 22 SCU 단일 총량 예약 → 계획 | [ocr.txt](ocr.txt) |
| 세 적재 화면 선택 시 장면 재생성 0회, 저장한 normal 품질 유지 | [performance.json](performance.json) |

실제 개인 로그 37개도 통합 후 다시 처리했다. 중복 파일을 포함한 관찰 378건(ready 7 / incomplete 58 / ended 312 / conflict 1)이며, 확인된 계약 1건의 4항목을 6방문·7완료 동작으로 최종 선적 0까지 진행했다. append/중복 polling/종료/수신 중지와 상단 단건·감시 상태 표시도 통과했다. [익명 집계](private-log-aggregate.json). 실제 게임 실행 중 연결 검증과는 구분한다.

## 화면

- [아카이브 + 운항 요약 / 1920×1080](archive-desktop.png)
- [항해사 관제 / 1920×1080](navigator-desktop.png)
- [영문 서비스센터 + 운항 요약 / 390×844](service-mobile.png)

이는 통합한 실제 앱의 캡처이며 이미지 시안이 아니다. 연출 원본 PR의 검수 이미지/기록은 덮어쓰지 않았다.

## 재현

의존성이 준비된 저장소에서 `npm test`, `npm --prefix apps/control-room test`, `npm --prefix apps/control-room run build`. 빌드한 preview를 5188 포트에서 실행한다.

각 아래 스크립트를 **순서대로** `STAM_MISSION_URL=http://127.0.0.1:5188/ STAM_QA_OUTPUT=/tmp/<검사명> node --experimental-strip-types scripts/<파일>`로 실행한다.

- `check-cinematic-integration-browser.mjs`
- `check-flight-backup-browser.mjs`
- `check-flight-progress-browser.mjs`
- `check-mission-intake-flow-browser.mjs`
- `check-mission-log-browser.mjs`
- `check-mission-ocr-browser.mjs` — 이 환경은 `STAM_OCR_SYSTEM_FETCH=1`도 지정. HTTPS/TLS 검증을 유지하며 시스템 CA로 동일 외부 자산을 가져온다.
- `check-partner-policy-browser.mjs`
- `check-console-performance-browser.mjs`
- `check-pilot-integration-browser.mjs`

아카이브 전체 검사는 `docs/cinematics/archive-subpage-20261113/review/verify-browser.mjs`를 임시 출력 폴더에 복사해 실행했다. 원본 증거를 덮어쓰지 않기 위해서다. `STAM_PREVIEW_URL`과 Playwright 모듈 경로/시스템 Chromium을 지정하며, 이 환경의 녹화는 `/tmp/stam-playwright/ffmpeg-1011/ffmpeg-linux`에 시스템 ffmpeg를 연결했다.

개인 로그는 source Worker를 사용하는 `check-private-game-logs-browser.mjs`에 `STAM_MISSION_URL=http://127.0.0.1:5186/`, `STAM_PRIVATE_LOG_ROOT`를 지정한다. **개인 원본·계정 정보·수주 인스턴스 ID는 저장소에 넣지 않는다.**

## 실패와 검증 한계

- 최초 녹화: ffmpeg 경로 누락 → 시스템 ffmpeg 지정 후 통과.
- 기존 테스트: 하위 메뉴/두 백업 파일 입력으로 부분 선택자가 중복 → 목적 공간/계약 백업으로 범위를 좁혀 통과.
- 백업 최초 실행: summary 클릭 시간 초과 → 제품 코드 변경 없이 전체 재실행 통과.
- OCR 최초 실행: Chromium의 CDN 인증서 신뢰 오류 → 시스템 CA를 쓰는 기존 검수 옵션으로 실제 OCR 통과. 실게임 이미지 정확도까지 검증한 것은 아니다.
- 새 운항 요약 검사: 초기화 후 `reviewed:true` 유지로 잘못 예상했으나 기존 stop 규칙은 `reviewed:false`. 계약/함선/파트너 보존과 재검토 요구를 정확히 검사하도록 고쳤으며 제품 초기화 로직을 변경하지 않았다.
- 실계정 로그인/기기 간 동기화, 실제 Windows 파일 권한/게임 실행 중 감시, 실물 모바일/GPU·장시간 실측은 미검증이다. 미완료 화면/고해상도 원본/전체 튜토리얼도 완료로 표시하지 않는다.
