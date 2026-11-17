# 추가 5개 항목 제외 후 검증 — 2026-11-17

사용자 결정: 함대 조직/공개 모집, 오피서 위임 및 새 승인/정산 구조, 종료 후 가격 알림, 참여/정산 푸시, UEX 직접 제출은 추가하지 않는다. 기존 초대 공동 교역과 함장 승인/정산은 유지한다.

- 타입 검사와 배포용 빌드 통과.
- 취소 기능 차단/패키징 및 기존 공동 교역 단위 검사 8개 통과.
- 실제 Firestore 에뮬레이터 9개 흐름 통과: 초대/승인, 원장 접근, 배정 일괄 처리, 대화/공지/게시판 권한, 보고 단일 승인, 동시 변경 충돌, 정산 보존, 지급 확인, 계정 전환 방어. `crew-firestore.json` 참고.
- Chromium 합성 2계정 검증 통과: 기존 초대 참여/함장 승인/대화, 제외 메뉴 부재, 시세 조회 및 화면 내 관심가격 유지, 모바일 너비, 저장 표식 보존. `browser.json` 및 캡처 참고.
- Functions 호출 0, 운영 데이터 쓰기 0. 실제 사용자 계정/게임/공개 운영 배포 검증을 뜻하지 않는다.
- `git diff --check` 통과. 빌드의 기존 청크 크기 경고는 남아 있다.

실행: `npm run check:control-room`, `npm run build:control-room`, `node --test --test-isolation=none tests/cancelled-extensions.test.mjs tests/crew-trade.test.mjs`, `node scripts/check-retained-trade-firestore.mjs`, `node scripts/check-cancelled-extensions-browser.mjs`.

기본 배포에서 Functions와 취소 모듈/푸시 워커를 제외했다. 일부 초안 소스는 자료 보존을 위해 남지만 활성 화면에는 연결하지 않는다. 작업 전 주요 소스 백업은 로컬 `/workspace/stam-cancelled-scope-20261117/`에 있다. 운영 규칙·웹·앱 배포 및 결제 변경은 하지 않았다.
