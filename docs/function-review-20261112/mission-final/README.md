# 미션 콘솔 기능 마감 검수 — 2026-11-12

기능 클라우드 / `feature/mission-intake-flow-20261112` / 현재 미커밋·미푸시 작업본. 공개 main 배포는 하지 않았다. 기존 미커밋 UI와 연출 통합 상태를 보존했다.

## 고친 문제

1. **OCR·텍스트의 배송 합계 누락:** 한 미션에서 픽업 2곳이 배송지 하나에 22 SCU를 보내는 경우, 기존 OCR 파서는 임시 분배량을 만들었고 앱 변환은 그 분배량만 0으로 지워 배송 총량도 잃었다. 파서가 배송지 총량 근거를 별도로 반환하고 앱이 이를 목적지별 `reservations`로 유지하도록 수정했다. 픽업별 양은 0(미확인), 최종 예약은 22 SCU 한 번이다. 한글·영문 모두 적용한다. 배송 수량이 일부만 읽힌 곳은 다른 목표의 수량으로 채우지 않는다.
2. **검토·보완 경로:** 스크린샷/원문 검토에 배송 총량을 표시하고 수정할 수 있다. 목적지가 같은 픽업이 여럿이면 총량을 직접 보완할 수도 있다. 0·음수·소수·알려진 픽업 합계와 맞지 않는 총량은 저장을 막는다. 실제 픽업 분배를 임의로 확정하지 않는다.
3. **한글 OCR의 줄 분할 누락:** 자동 페이지 분석이 선명한 한글 테스트 이미지도 여러 조각으로 잘못 나눠 계약명·화물·픽업을 누락했다. 한국어 모드에서는 단일 블록 분석도 비교하고, 계약 파서가 더 많은 유효 필드를 얻은 결과를 검토창에 넘긴다. 이전 실패와 같은 이미지로 재확인했다. 더 긴 문자열이라는 이유만으로 선택하지 않는다. 인식 결과를 자동으로 계약에 추가하지 않는다.
4. **보상:** 명시된 0 aUEC를 보상 미확인과 구분한다. 실제 OCR에서 확인한 `Areal8` 오독은 알려진 `Area18` 표기로 한정해 정규화한다.
5. **실제 기본 화면:** 축소한 입력 패널, 균일한 유리 테두리, Barlow Medium 500이 시안 URL 없이 미션 기본 화면에 적용된다. 칩형 등 대안 시안은 DEV 전용 매개변수로만 남긴다. 승인된 상단바/사이드바는 변경하지 않았다.

주요 변경: `ocr.mjs`, `contract-intake.mjs`, `ContractFields.tsx`, `ScreenshotIntake.tsx`, `MissionConsole.tsx`, `ControlRoom.tsx`. 계산 엔진/운항 저장 형식은 변경하지 않았다.

## 현재 통과한 검증

| 검사 | 실제 확인한 범위 | 기록 |
| --- | --- | --- |
| 루트 Node 테스트 | 232/232. 로그 파싱, SCMDB, 수량·배송 총량, 경로·적재 등 회귀 | root-tests.txt |
| 앱 Node 테스트 | 45/45. 신규 OCR/텍스트 배송 총량 회귀 3개 포함 | app-tests.txt |
| 배포용 빌드 | TypeScript/Vite 성공. 기존 청크 크기 경고 있음 | build.txt |
| 배포용 미션 브라우저 | 직접 선택/새로고침 유지, 오퍼레이터 경로 전용, 항해사 적재, 최대치 제외/포함, 32→22 총량 수정, 픽업 2곳 유지, 잘못된 총량으로 기존 계획 훼손 방지, 운항 중 편집 잠금, ko/mix/en, 390/1366px | mission-production.txt |
| 고정 메뉴/화면 이동 | mission→map→operations 동일 상단바/사이드바 DOM·위치, 내부 스크롤, 지도 조작, 출발 처리, 운항 상태 보존, 모바일 메뉴 | persistent-shell.txt |
| 실제 로그 Worker + 현재 SCMDB | 합성 Game.log를 파일 선택기로 읽음. 정의 ID로 3곳 8/4/4 SCU, 같은 파일 재수신 시 한 계약 유지, 합계 16 SCU 계산, 완료된 선택 계약 재계산 차단 | log-production.txt |
| 실제 영문 Tesseract + 배포용 UI | 생성한 테스트 이미지를 실제 엔진으로 인식→검토창→수량 0 거부→22 SCU 저장→동일 ID 중복 차단→항해사 경로. 픽업 양은 미확인 유지, 배송 합계 22/보상 73,500 | ocr-production-en.txt |
| 실제 한글 Tesseract + 배포용 UI | 동일 흐름과 모바일 검토창 가로 넘침 없음. AUTO 누락을 단일 블록 비교로 보완한 같은 이미지 사용 | ocr-production-ko.txt |

인식 엔진·언어 모델은 실제 외부 Tesseract 자산이다. OCR 응답/텍스트를 모의 주입하지 않았다. Cloud Chromium이 프록시 CA를 신뢰하지 못해 최초 CDN 로드가 실패했다. `STAM_OCR_SYSTEM_FETCH=1`은 테스트에서만 공개 OCR 자산을 시스템 CA로 검증하는 curl로 그대로 중계한다. TLS 검증을 끄거나 실제 앱의 네트워크 동작을 변경하지 않았다.

## 재현

현재 개발 서버는 5186, 배포용 빌드 미리보기는 5188을 사용했다. 별도 서버가 이미 있으면 재사용한다.

```sh
npm test
npm run test:control-room
npm run build:control-room
STAM_MISSION_URL=http://127.0.0.1:5188/ node scripts/check-mission-screen-browser.mjs
STAM_MISSION_URL=http://127.0.0.1:5188/ node scripts/check-mission-log-browser.mjs
STAM_MISSION_URL=http://127.0.0.1:5188/ STAM_OCR_SYSTEM_FETCH=1 node scripts/check-mission-ocr-browser.mjs
STAM_MISSION_URL=http://127.0.0.1:5188/ STAM_OCR_SYSTEM_FETCH=1 STAM_OCR_LANGUAGE=ko node scripts/check-mission-ocr-browser.mjs
```

시스템 CA 중계는 해당 Cloud 인증서 문제에만 사용하며 일반 환경에서는 생략할 수 있다. 브라우저 스크립트는 저장소의 합성 계약/이미지/현재 카탈로그를 사용한다. 위 두 OCR 명령은 결과 폴더가 같으므로 비교 보존 시 `STAM_QA_OUTPUT`을 각각 지정한다.

## 검증 자료와 실제 사용의 경계

- `synthetic-contract-ko.png`, `synthetic-contract-en.png`는 테스트 코드가 그린 이미지이며 실제 게임 스크린샷이 아니다. 인식 결과와 검토/계산 화면을 함께 보존했다. 실제 Game.log 원본이나 사용자 이미지를 Git에 넣지 않았다.
- 실제 게임의 해상도/언어 패치/배경 대비/잘린 글자마다 OCR 정확도는 달라진다. 읽은 내용을 사용자가 검토·수정하고 확인하는 단계는 유지한다. 실게임 자료가 없으므로 실제 운항/원본 Game.log·SCMDB 전 미션·실물 휴대폰·OS 파일 권한을 동반한 실시간 감시는 이번 완료 주장에 포함하지 않는다.
- 실제 SCMDB 카탈로그를 현재 로그 Worker가 사용함은 확인했지만, 로그에 없는 임의 정보나 미확정 수량을 만들어 낸다고 안내하지 않는다. 좌표/연결이 불명확한 계약은 검토가 필요하다.
- 공개 사이트는 그대로다. 다음 작업은 사용자가 지정하는 지도/관제/적재 3D의 후속 정비다. 미완성 연출 영상·음향은 이번 범위에 넣지 않았다.
