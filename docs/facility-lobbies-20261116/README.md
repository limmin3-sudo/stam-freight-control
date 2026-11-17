# 승인 무역센터·아카데미 로비 연결

2026-11-16 기능 Codex, `integration/freight-division-20261113`, 미커밋·미배포. 이 문서는 앞서 완료한 로비 작업의 검증 기록을 정리한다.

## 연결 범위

승인된 신규 로비 원본을 `apps/control-room/src/assets/facility-lobbies/`의 `academy-lobby-approved.png`, `trade-lobby-approved.png`에 복사했다. 아카데미는 자연스러운 동선의 정보실·교육실·운항연구실, 무역센터는 실내 유리벽 안쪽의 관제실을 포함한 시장정보실·무역계획실·무역관제실 구도다.

- `FacilityLobby.tsx`, `facility-lobby-content.ts`, `facility-lobby.css`: 금색 점/선/명칭, 공간 영역 hover 및 주변 음영, 선택 시 확대/소개 패널, 복귀·Escape 동작.
- `SpaceExperience.tsx`, `SpaceNavigation.tsx`, `space-navigation.ts`: 기존 고정 상단바/사이드바 유지, 시설의 3개 방 연결 및 유효한 시설/방 URL 검사, STAM 로고로 전경 복귀.
- `#/division?lang=ko&facility=trade`, `facility=guide-center` 주소 사용. 방 키는 trade의 `market`, `planning`, `trade-operations`; academy의 `freight-information`, `education`, `operations-study`다.
- 현재 방 선택은 공간 소개/확대까지다. 실내 업무 기능·무역 데이터·교수/파트너 선택이 구현됐다는 의미가 아니다.
- 데스크톱 공간 선택과 모바일 목록을 제공한다. 한국어/영어/혼합 표시·동작 줄이기 지원, 패널 퇴장 후 제거 및 포커스 복원.

## 실행한 검증

앞선 구현 완료 시 타입 검사 포함 생산 빌드, 앱 테스트 25개 파일, 루트 테스트 271개 통과. 관련 브라우저 스크립트는 `scripts/check-facility-lobbies-browser.mjs`, `scripts/check-division-hub-browser.mjs`다. 문서/이미지 보관 때 전체 테스트를 반복하지 않았다.

[실제 브라우저 결과](runtime-review/report.json): 로비 2개·방 6개, 소개 패널/사이드바/새로고침/복귀, 1920·1366 데스크톱과 390 모바일, 언어·동작 줄이기·일반 이동 애니메이션, 기존 선택 계약·계정/운항 저장값 보존, 오류/누락 요청 없음. 실제 캡처는 같은 폴더의 `trade-desktop.png`, `guide-center-desktop.png`, 각 `*-detail.png`, `*-mobile.png`다. 실제 게임/실계정/무역 거래는 이번 검증 범위가 아니다.

## 최신 후속 기준

무역·아카데미 실제 기능 구현 후 **전체 둘러보기를 새로 연결**하고 **운송용·무역용 튜토리얼을 별도로 새로 만든다**. 현 투어에 로비 단계를 먼저 추가하지 않는다. 기존 가이드/둘러보기 코드를 이 결정만으로 삭제하지 않는다. 승인 이미지 외 캐릭터 후보는 검토 후 적용한다.

## 지도 교수 확정·담당자 로비 배치

2026-11-16 기능 Codex. `LobbyStaff.tsx`, `lobby-staff.css`와 원본 PNG 3개를 추가했다. 무역센터는 수석 교역관(행성계 내부)·링 가문 중개인(행성계 간), 아카데미는 지도 교수다. 인물 클릭 시 기존 ApprovedGlass 소개 패널이 열리고 실제 계획실/교육실 소개로 연결한다. 방 선택 중에는 인물 UI를 제거한다. 기존 상단바·사이드바·운항 파트너 선택을 보존하며 이 소개는 운항 파트너를 선택하거나 저장하지 않는다.

모바일은 전신 목록과 읽기 쉬운 소개를 제공한다. 소개 제목으로 포커스를 옮겨 첫 문장부터 읽고, Escape/닫기 후 인물로 포커스를 복원한다. 한국어/영어/혼합, OS 및 앱 동작 줄이기, 420ms 닫기 전환을 지원한다. 데스크톱 방 명칭 두 곳은 인물과 겹치지 않도록 조정했다.

타입 검사 포함 빌드·앱 93개·루트 271개 테스트 통과. `scripts/check-lobby-staff-browser.mjs`로 세 인물, 소개 및 실제 방 이동, 1920/1366/390 화면, 언어·동작 줄이기·포커스·저장값 보존을 확인했다. [결과](staff-review/report.json), [무역센터](staff-review/trade-desktop.png), [아카데미](staff-review/guide-center-desktop.png), [모바일 소개 첫 화면](staff-review/trade-390-intro-start.png). 브라우저 외부 Google 요청은 차단한 UI 검증이며 실계정/실게임 검증이 아니다.

실제 교역 계산·시세 자동 갱신·교육 콘텐츠·신규 통합 투어는 후속. 커밋·푸시·배포하지 않았다.

기존 `check-facility-lobbies-browser.mjs`도 통과: 방 6개·사이드바·새로고침·복귀·공간 직접 클릭·일반 확대/닫기 연출. 계획실 직접 클릭 검증은 전경 인물이 차지하는 중앙 대신 옆에 드러난 출입구 좌표를 사용했다.
