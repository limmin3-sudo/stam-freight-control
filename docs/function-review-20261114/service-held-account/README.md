# 계정 저장 · 보류 후처리 · 서비스센터 마감

2026-11-14 KST. `integration/freight-division-20261113`, `b1abe51` 이후 기존 작업을 보존한 미커밋 변경. 이번 사용자 범위는 F1/F2/F5 구현이며 배포 승인은 아니다.

## 변경

- **F1 계정 저장:** Firestore가 소유자·리비전 증가·원자적 상태 저장을 강제한다. 타임스탬프만 있는 기존 계정은 첫 새 트랜잭션에서 이동한다. 구버전의 무조건 덮어쓰기와 단독 상태 삭제는 거부한다. SDK가 동시 쓰기를 permission-denied로 반환하면 서버 리비전을 재확인해 충돌로 안내하며 새 리비전으로 자동 재시도하지 않는다.
- **F2 보류 후처리:** 항해사 관제의 ‘보류 화물 하역 확인’에서 실제로 내린 상자만 선택하고 게임에서 내렸다는 확인을 받는다. 나머지 상자의 위치/소유권/완료 기록을 유지하고 남은 경로를 계산한다. 작업 전 운항 백업과 하역 내역을 남긴다. 취소 계약 배송/보상을 만들지 않는다. 마지막 보류 상자가 없어지고 다른 방문도 없으면 운항을 종료할 수 있다. 오퍼레이터에 적재를 추가하지 않는다. 이미 하역 확인한 계약의 로그 재활성화는 자동 적용하지 않는다.
- **F5 서비스센터:** 계정·운송기록은 기존 컨트롤러를 내부 화면에 장착한다. 피드백·오류 신고와 기존 배포 기록 검색도 내부 화면으로 연결한다. 피드백 입력은 서비스센터 하위 메뉴 전환과 전송 실패 때 보존한다(공간 이탈/새로고침까지 보존하는 별도 기능은 추가하지 않음). 고정 상단바·승인 사이드바 유지. 신규 연출/고객지원 체계는 만들지 않는다.

## 확인 범위

- TypeScript + 생산 빌드 통과. 기존 대형 JS 청크 경고는 남는다.
- 변경 관련 테스트 4개 파일: 보류 화물, 계약 변경, 서비스 경로, 계정 트랜잭션. 부분 하역/최종 하역/보상 제외/백업 검증 포함. 전체 테스트를 반복하지 않았다.
- 실제 Firebase SDK + 로컬 Firestore 에뮬레이터 9개 시나리오 통과. `scripts/check-firestore-rules.mjs`. 운영 요청 0회.
- 기존 계정 브라우저 8개 시나리오 재확인: 계정 교체/저장 실패/늦은 응답/동시 저장. 모의 SDK이며 실제 로그인 아님.
- 서비스센터·보류 버튼 생산 빌드 브라우저 확인은 `scripts/check-service-held-browser.mjs`와 첨부 결과를 기준으로 한다. 합성 운항/피드백 모의 전송만 사용하며 실제 게임 하역·실제 신고 전송을 하지 않는다.

## 운영 반영의 경계

운영 Firebase 인증/배포 자격증명이 제공되지 않아 **규칙 게시와 운영 계정 검증은 하지 않았다**. 향후 승인된 배포 시 새 트랜잭션 클라이언트를 먼저 게시하고 `firestore.rules`를 해당 프로젝트에 게시한다. 기존 열린 구버전은 저장을 거부당할 수 있으므로 새로고침 안내를 유지한다. 규칙을 느슨하게 되돌려 구버전의 무조건 덮어쓰기를 허용하지 않는다. 실제 배포 후 본인 계정 로그인/저장/충돌 동작을 확인한다.

새 콘솔 운항의 기기 간 클라우드 이어하기(E1), 지도/적재 그래픽(F3/F4), 안내 개편·로그 앱 등은 이번 범위에 추가하지 않았다. 기존 전체 운항 JSON 백업 이동은 유지한다.

## 바로 확인

- `http://127.0.0.1:5188/#/service?lang=ko&section=account` → 계정/운송기록/피드백/업데이트.
- 항해사 운항에서 취소 계약을 확인해 선내 보류가 있으면 관제 → 보류 화물 하역 확인. 선택 전/확인 전에는 운항을 수정하지 않는다.
- 관련 파일: `firestore.rules`, `account-sync-transport.mjs`, `account.mjs`, `history.mjs`, `feedback.mjs`; 앱 `ServiceCenter.tsx`, `service-center.css`, `space-navigation.ts`, `HeldCargoReview.tsx`, `held-cargo.ts`, `use-flight.ts`, `flight-backup.ts`, `flight-receipts.ts`, `flight.worker.mjs`.

## 에뮬레이터 재현

Java 21 및 별도 임시 npm 프로젝트에 `firebase-tools@14 @firebase/rules-unit-testing@4 firebase@11` 설치. 로컬 프로젝트 ID `demo-stam-sync`, Firestore `127.0.0.1:8089`, UI 비활성으로 실행한다. `STAM_FIREBASE_QA_ROOT`를 임시 npm 프로젝트 경로로 설정하고 `node scripts/check-firestore-rules.mjs` 실행. 운영 프로젝트 ID/실사용 계정은 사용하지 않는다.

서비스센터/보류 버튼 브라우저 7개 확인 통과, 페이지 오류 0. 결과: [browser-result.json](browser-result.json), [에뮬레이터 결과](firestore-emulator-result.json). [데스크톱](service-desktop.png), [모바일](service-mobile.png), [보류 처리 후](held-finished.png). 데스크톱 배포 목록 버튼의 높이 축소도 수정하고 재캡처했다.
