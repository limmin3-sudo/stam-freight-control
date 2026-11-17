# 무역센터·아카데미 로비 배치와 진입·복귀 인계

작업: 연출 Codex, 2026-11-17. 브랜치 `cinematic/trade-academy-lobbies-20261117`.
기준: `handoff/local-studio-20261110` / beta 3.0.0 `2c637afa21c9de904b3ad58b289215f3508670ec`.
최종 SHA와 PR은 이 브랜치의 Git HEAD 및 PR 설명을 기준으로 한다. main/공통 인계 병합·배포는 하지 않았다.

## 최신 — 상단/사이드 버튼 분리와 A 플라이트 콘솔

사용자 최종 조합: 상단바 버튼은 예전 `hologram-button.png` 청록색 사선 유리, 사이드바 버튼은 D 검은 유리/금색, 플라이트 콘솔은 A 금속 매립형 계기판. 아래 D 콘솔 항목은 이전 선택 기록이다.

- `black-gold-shell.css` 신규: 상단바 컨트롤 4종의 프레임·높이·여백 통일. 사이드바 목적지 5종은 동일한 D 프레임·88px 높이·서체로 통일하고 선택/hover 금색 강조. 하위 메뉴/설정/모바일 메뉴도 같은 계열 사용.
- `SpaceExperience.tsx`에는 스타일 import만 추가. 메뉴 이벤트·ID·URL·기능 상태 변경 없음.
- `flight-console-a-frame.png` 신규: 사용자가 고른 A 비교 시안을 이미지 편집해 만든 무광 금속/나사/청록 표시등 프레임. `pilot-desk.css`에서 요약/상세/관리 버튼에 9분할로 적용. PilotDesk.tsx 기능은 그대로다. 시안의 함선 썸네일/예시 수치를 실제 데이터로 오인해 추가하지 않았다.
- **바 몸체 자체는 아직 별도 자산을 적용하지 않았다.** 사용자가 원해 [상단바/사이드바 몸체 3안](shell-review/bar-body-options.png)을 생성했고 선택을 기다린다. 이 파일은 생성 비교 시안이며 실제 구현 캡처가 아니다.

[실제 적용](shell-review/closed-1440-ko.png), [상세 콘솔](shell-review/open-1440-ko.png), [모바일 메뉴](shell-review/menu-ko.png), [검증 결과](shell-review/checks.json).

최종 타입/생산 빌드 및 한국어/영어 1440/390px 검증 통과. 목적지 버튼 높이 일치, 원본 에셋 로드, hover/탭 펼침·Escape 접힘, 기존 4개 관리 버튼·초기화 비활성·함선 변경·운송사업부 이동 확인. 브라우저 오류 0. main/공통 인계 병합·배포 없음.

## 최신 — D 재질 운송사업부·FLIGHT CONSOLE

사용자가 D를 선택하고 플라이트 콘솔도 같은 재질로 지정했다. `assets/navigation/black-gold-d-frame.png`는 선택된 D 시안을 이미지 편집해 글자/아이콘을 제거한 프레임 자산이다. 검은 사파이어 유리·샴페인 금색 림·청록 반사를 유지한다. 원본 생성 비교 시트와 편집 원본은 저장소 밖 `/workspace/generated_images`에 보존한다.

- `SpaceNavigation.tsx`: 표기를 운송사업부 / FREIGHT DIVISION으로 확정, 작은 화물 아이콘. 기존 링크와 콜백 보존.
- `left-space-navigation.css`: 운송사업부 버튼에 D 프레임 자산, hover/선택 시 밝기 강조. 다른 공간 버튼은 보존.
- `pilot-desk.css`: FLIGHT CONSOLE 요약·상세 패널·관리 버튼에 동일 자산 적용. 패널은 9분할 테두리로 모서리를 보존하고 중앙을 늘린다. `PilotDesk.tsx` 및 데이터/함선·파트너·미션/초기화 로직은 수정하지 않았다.
- 표시 글자/수치는 HTML이며 프레임에 굽지 않는다. 모바일 탭·데스크톱 hover/고정·Escape 동작을 유지한다.

[실제 요약 화면](d-material-review/closed-1440-ko.png), [상세 화면](d-material-review/open-1440-ko.png), [모바일 요약](d-material-review/closed-390-ko.png), [모바일 상세](d-material-review/open-390-ko.png), [모바일 메뉴](d-material-review/menu-ko.png), [검증](d-material-review/checks.json).

타입·생산 빌드, 한국어/영어 1440/390px, 자산 로딩·접힘/펼침·Escape·4개 관리 버튼·초기화 비활성 조건·기존 함선 변경 진입·운송사업부 이동 통과. 브라우저 오류 0건. 서버/저장 로직 무변경. main/공통 인계 병합·배포 없음.

## 라운지·관제센터 제목 패널

`SpaceExperience.tsx`의 기존 `space-title`/heading ref를 사진 왼쪽 위 제목 패널로 옮겼다. `space-location-heading.css`로 무역센터와 동일한 반투명 어두운 그라데이션·황금 코드명·Barlow/SUIT 장소명·설명을 적용했다. 모바일은 사진 내부의 작은 패널로 배치하고 클릭을 가로채지 않는다. 기존 확대 중 제목 숨김과 프레임 캡처 제외 규칙을 재사용한다. 파트너 선택 흐름/저장/버튼 동작은 수정하지 않았다.

타입·생산 빌드, 1440/390px 한국어/영어 양쪽 장면, 기존 제목 ID 유일성·패널 넘침·포인터 통과·서비스센터 이동을 확인했다. 브라우저 오류 0건. [라운지](heading-review/lounge-1440-ko.png), [관제센터](heading-review/bridge-1440-ko.png), [모바일](heading-review/lounge-390-ko.png), [검증](heading-review/checks.json).

운송사업부 버튼과 플라이트 콘솔은 위의 최신 D 재질 항목으로 반영됐다.

## 최신 배치·명칭·사업부 이동

- 무역 계획실 점은 실제 안쪽 방 위치 `[42,53]`로 복구하고 명칭은 `[42,34]`에 배치했다. 위층 난간에 붙였던 `[50,32]`는 사용하지 않는다.
- 수석 무역관/링 가문 중개인은 오른쪽 `55%/67%`에 나란히 배치한다. 바닥 기준은 bottom 8%, 높이는 무역관 42%·중개인 40%·교수 40%다. 모바일은 이름 겹침을 피하도록 `44%/77%`로 재배치한다. 원본 PNG의 2:3 비율을 보존하고 신체나 얼굴은 변형하지 않는다.
- 로비 인물 위에는 이름만 표시한다. 행성계 범위 등 역할 설명은 인물 이름 아래에서 제거하되 기존 담당 범위 연결은 유지한다.
- UI 전체의 '교역'을 '무역'으로 통일했다. 안내·계획·관제·장부·계정 알림·아카데미 학습·한국어 번역 사전까지 포함하며 기능 식별자/저장 키/URL은 변경하지 않았다.
- 라운지 위에 `사업부` 버튼을 추가했다. 기존 공간 버튼과 다른 `ops-glass-key.png` 에셋을 쓰고 hover/선택은 `ops-glass-key-amber.png`다. 라운지·관제센터와 각 내부 화면에서 기존 사이드바 즉시 이동 콜백으로 사업부 전경에 연결한다.

최종 화면: [무역센터](placement-review/trade-1440.png), [아카데미](placement-review/guide-center-1440.png), [모바일 무역](placement-review/trade-390.png), [모바일 아카데미](placement-review/guide-center-390.png), [라운지 사업부 버튼](placement-review/lounge-division-button.png), [관제센터 사업부 버튼](placement-review/bridge-division-button.png), [모바일 사이드바](placement-review/mobile-navigation.png), [무역 계획 콘솔](placement-review/planning-console.png). [검증 결과](placement-review/checks.json), 재현 `verify-placement.mjs`.

타입 검사·생산 빌드 통과. 1440/1366/390px, 이름만 표시/원본 종횡비/넘침, 두 담당자의 내부·행성계 간 계획 연결, 교수 세 방, 6개 내부 화면의 명칭, 라운지·관제센터/모바일 사업부 버튼을 확인했다. 브라우저 오류 0건. 배치 파일 외 13개 변경 파일은 기존 파일에서 '교역'→'무역' 치환만 했음을 비교 검증했다. 기존 전체 기능·서버 검증을 반복한 것은 아니다.

`review/`, `scale-review/`, `layout-review/`는 이전 배치 기록이다. `layout-review/facility-common-arrival.mp4`는 현재도 유지한 공통 연출을 보여주지만 인물 배치·명칭은 이전 버전이다.

## 유지한 공통 진입·복귀 연출

전경→로비와 로비→내부 화면은 라운지·관제센터의 `ConsoleArrival` 컴포넌트와 공통 키프레임을 사용한다. 배경 5.2배 접근 697ms, 점등 333ms 안에 80ms 지연 후 250ms 파지직. 로비 복귀는 암전 333ms→축소 697ms다. 장소·인물 클릭은 연출, 사이드바는 즉시 이동이다. 기존 [전환 검증](layout-review/checks.json)을 유지하며 이번 배치 수정에서는 전환 로직을 바꾸지 않았다.

## 완료 동작

- 승인된 노신사·링 가문 중개인·지도 교수 PNG를 비율 그대로 로비에 배치. 새 이미지 생성·얼굴/신체 수정 없음. 여성의 다리를 모은 원본 자세 유지. 그림의 투명 여백이 장소 버튼을 가로채지 않도록 클릭 영역을 좁혔다.
- 노신사 직접 클릭 → 인물 확대/주변 음영 → 기존 `planning`, `advisor=intrasystem`. 링 중개인 → `advisor=interstellar`. 별도 운송 파트너 선택/저장 없이 기존 교역 범위를 전달한다.
- 교수 클릭 → 확대·승인 유리 안내 → 운송 정보실/교육실/작전 연구실 선택. 운송 정보·교육·연구 화면 자체는 기능 담당 구현을 그대로 사용한다.
- 금색 장소 점/선/명칭, 기존 윤곽 hover 음영 보존. 장소 이미지 영역과 명칭 모두 진입 가능.
- 직접 진입은 배경 5.2배 접근 + 별도 인물 레이어 2.3배 확대(697ms), 공통 STAM 점등(333ms, 파지직 자체는 250ms). 총 1030ms 연출이다. 교수 안내창을 닫는 기존 420ms 수납은 별도다.
- 로비 복귀는 333ms 암전 → 697ms 역방향 축소. 인물/장소 버튼으로 포커스 복원. 진입이 끝나면 실제 기능 화면 제목으로 포커스 이동.
- 사이드바는 즉시 이동한다. 같은 로비를 다시 눌러도 이전 접근 타이머를 취소한다. 브라우저 뒤로/앞으로, 직접 링크/새로고침은 주소의 실제 화면을 바로 연다.
- OS/앱 동작 줄이기는 이동·점등 없이 즉시 연결한다. 진행 중 취소/Escape/시설 변경/언어 변경/언마운트는 지연 이동을 남기지 않는다. 실제 거래 확인 dialog의 Escape 우선순위를 유지한다.
- 모바일은 410px 높이 로비 장면에 인물 전신과 명칭을 배치하고 장소 목록/교수 안내는 아래로 재배치한다. 비율을 늘려 맞추거나 화면 폭을 넘기지 않는다.

## 변경 파일과 공유 지점

| 파일 | 책임/통합 주의 |
|---|---|
| `apps/control-room/src/FacilityLobby.tsx` | 기존 방 분기·기능 컴포넌트는 보존. 직접 클릭을 연출 hook으로 보내고 완료 후 기존 `onRoom` 호출. 내부 TradeWorkspace의 `onRoom`은 즉시 연결을 그대로 사용. |
| `apps/control-room/src/LobbyStaff.tsx` | 무역 담당자 직접 연결, 교수 3개 방 선택. 기존 인물 ID·역할·이미지 사용. |
| `apps/control-room/src/lobby-staff.css` | 전신 크기/반응형 위치/선택 확대/투명 이미지 여백 클릭 영역. |
| `apps/control-room/src/use-lobby-travel.ts` | 일회성 진입·복귀 타이머, 외부 경로 변경 취소, 포커스 복원. 저장소 쓰기 없음. |
| `apps/control-room/src/facility-travel.css` | 시설 내부에 한정한 배경/인물/암전/공용 자산 점등. |
| `apps/control-room/src/SpaceExperience.tsx` | `facilityNavigationKey`/motion 전달과 사이드바 취소 유지. `enterDivisionFacility`로 전경/로비 직접 클릭에 기존 전역 전환 연결, 같은 division 화면 내 도착 시설까지 비교, Escape 취소 및 시설별 확대 기준 전달. 사이드바는 기존 즉시 이동 함수 유지. 공유 파일 전체 덮어쓰기 금지. |
| `apps/control-room/src/console-arrival.css` | 기존 공통 연출은 유지하고 `data-facility-travel` 범위의 전경 확대/복귀만 추가. |
| `apps/control-room/src/facility-lobby-content.ts` | 교역 계획실 표식 좌표만 위로 이동. 기존 방 ID/윤곽/연결 유지. |
| `apps/control-room/src/SpaceNavigation.tsx`, `left-space-navigation.css` | 기존 공간 버튼 앞에 별도 에셋 사업부 링크 추가. 다른 버튼 디자인/연결 유지. |
| `TradeCloudPanel.tsx`, `TradeControlPrices.tsx`, `TradeOperations.tsx`, `TradePlanning.tsx`, `TradeSuite.tsx`, `TradeSuiteVisuals.tsx`, `TradeVisuals.tsx`, `TradeWorkspace.tsx`, `MarketInformation.tsx`, `trade-messages.ts`, `academy-lessons.ts`, `division-facilities.ts` | src 내부 표시 문자열만 교역→무역. 최신 기능 수정 위에 문구 변경만 적용. |
| `data/ai-korean-lexicon.mjs` | 한국어 번역 사전의 표현만 무역으로 통일. 원문 키/식별자 유지. |
| `PROJECT_STATUS.md` | 이번 인계 기록 추가. 기능 담당의 후속 기록 보존. |
| `docs/cinematics/facility-entry-20261117/` | 이 문서, 재현 스크립트, 검증 결과/화면/실제 브라우저 영상. |

기존 `TradeWorkspace`/`useTradeCloud`는 한 번만 마운트한다. `TradeSuite`, 시장 정보, 장부/가격/계정 저장/계산, 아카데미 내부 구성, 고정 상단바·사이드바 디자인, 운송 로직/키/서버 규칙은 변경하지 않았다. 기능 코드의 callback 의미와 URL 키도 그대로다. 기능 담당이 추가로 구현해야 하는 연결은 없다.

## 승인 자산 재사용

- `assets/facility-lobbies/{trade,academy}-lobby-approved.png`
- `assets/facility-staff/{senior-trade-officer,ling-broker,academic-advisor}.png`
- `ApprovedGlass`의 `assets/division/glass-ui-approved.png`
- `assets/arrival/stam-standby.png`, `assets/arrival/ignition-plasma.png`
- 기존 내부 모니터 `assets/console-screen-only.png`, Barlow Medium 500 / SUIT 500

위 자산은 모두 `apps/control-room/src/` 기준. 원본 파일 바이트 변경 없음.

## 검증과 재현

- `npm run check --prefix apps/control-room` 통과.
- 생산 Vite 빌드 통과. 기존 큰 main chunk 경고는 남아 있으며 신규 오류가 아니다. 로컬 기존 dist를 덮어쓰지 않고 `/tmp/stam-facility-build`에서 검증했다.
- `npm test --prefix apps/control-room`: **33개 테스트 파일 통과**. 저장·서버 로직 무변경이므로 전체 루트/실계정 서버 테스트를 이번에 반복하지 않았다.
- `verify-browser.mjs`: 생산 빌드를 `/stam-freight-control/` 하위 경로에서 실행. 8개 흐름 그룹 통과, 브라우저 오류/로컬 누락 요청 0건. [결과](review/checks.json).
- 기존 `scripts/check-trade-monitor-browser.mjs`: 4개 흐름 그룹 통과. 계획 입력/예비금 유지, 실제 거래 확인 취소/기록, 가격 관제·백업/계정 UI, 모바일/새로고침. [결과](review/trade-regression.json).
- 기존 `scripts/check-academy-browser.mjs`: 7개 흐름 그룹 통과. 자료 검색/학습/읽음, 6계약 363 SCU 실제 사례 계산·지도/적재, 모바일/자료 연결. [결과](review/academy-regression.json).
- [추가 확인](review/additional-checks.json): 공간 영역 직접 클릭, 사이드바 방 바로가기, 앱 자체 동작 줄이기, 접근 중 OS 동작 줄이기 전환.
- 합성 교역 장부 4 SCU로 저장 보존·취소를 검증했다. 실게임/실계정 로그인·계정 동기화를 새로 검증한 결과는 아니다. 실제 사용자 데이터 접근 없음.
- 검증 스크립트는 현재 환경 Playwright 경로를 사용한다. 환경에 맞게 import 경로와 `STAM_FACILITY_URL`을 지정할 수 있다. 기존 기능 회귀는 `STAM_TRADE_URL`/`STAM_TRADE_REVIEW`, `STAM_ACADEMY_URL`/`STAM_ACADEMY_REVIEW`로 대상과 출력 경로를 지정한다.

## 최초 구현 검증 화면 (이전 배치)

- [무역 로비 데스크톱](review/trade-lobby-desktop.png), [1366×768](review/trade-lobby-1366.png), [모바일](review/trade-lobby-mobile.png)
- [공간 hover 강조](review/market-highlight.png)
- [행성계 내부 계획](review/planning-intrasystem.png), [행성계 간 계획](review/planning-interstellar.png), [기존 가격 관제](review/trade-control-existing.png)
- [아카데미 로비](review/academy-lobby-desktop.png), [교수 안내/방 선택](review/academy-advisor-desktop.png), [모바일 안내](review/academy-advisor-mobile.png)
- [기존 교육실](review/academy-education-existing.png), [모바일 교육실](review/academy-education-mobile.png)
- 실제 브라우저 왕복 영상: `review/facility-entry-preview.mp4`. 원본 녹화는 저장소 밖 제작 폴더에 보존한다. 보행/영상 생성 결과가 아니라 CSS 기반 사진 레이어 연출이다.

## 미완료/후속 및 통합

전체 시설을 잇는 새 투어, 운송용/무역용 튜토리얼, 보행·대사·음성은 이번 범위에 추가하지 않았다. 내부 방 진입의 별도 효과음은 추가하지 않았으며 공통 시각 효과 일치만 검증했다. Safari/iOS 실기기 및 실게임은 미검증이다. 좁은 모바일에서 교수 설명은 인물 아래로 스크롤해 읽는다.

기능 담당은 최신 공통 인계와 이 브랜치의 차이를 병합하고 새 기능 작업을 보존한다. `SpaceExperience.tsx`의 시설 전환·사이드바 콜백, `console-arrival.css`의 범위 한정 규칙, FacilityLobby의 기존 기능 분기를 우선 대조한다. 이 PR만으로 기존 연출 PR을 다시 적용할 필요는 없다. 최종 통합본에서 타입/빌드와 관련 브라우저 흐름을 확인한 뒤 기능 담당이 배포한다. main/공통 인계 직접 반영이나 운영 배포는 이 작업에서 수행하지 않았다.
