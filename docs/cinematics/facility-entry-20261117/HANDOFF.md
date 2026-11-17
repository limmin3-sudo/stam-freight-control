# 무역센터·아카데미 로비 배치와 진입·복귀 인계

작업: 연출 Codex, 2026-11-17. 브랜치 `cinematic/trade-academy-lobbies-20261117`.
기준: `handoff/local-studio-20261110` / beta 3.0.0 `2c637afa21c9de904b3ad58b289215f3508670ec`.
최종 SHA와 PR은 이 브랜치의 Git HEAD 및 PR 설명을 기준으로 한다. main/공통 인계 병합·배포는 하지 않았다.

## 최종 배치·공통 연출 보정

교역 계획실 표식을 `[50,32]`로 올렸다. 인물 높이는 장면의 34%를 유지하면서 바닥 여백을 18%→8%로 줄여 앞으로 옮기고 이름·역할을 머리 위에 배치했다. 선택 확대는 1.10이며 원본 체형·얼굴·자세·자산 바이트는 바꾸지 않았다.

시설 전경→로비에 빠졌던 확대·점등을 연결했다. 로비→내부 화면의 별도 약한 효과는 제거하고 라운지·관제센터의 `ConsoleArrival` 컴포넌트와 공통 키프레임을 그대로 사용한다. 배경 5.2배 접근 697ms, 점등 333ms 안에 80ms 지연 후 250ms 파지직. 로비 복귀는 암전 333ms→축소 697ms다. 장소·인물 클릭은 연출, 사이드바는 즉시 이동이다.

[최종 무역센터](layout-review/trade-desktop.png), [아카데미](layout-review/guide-center-desktop.png), [교수 선택](layout-review/professor-selected.png), [모바일 무역](layout-review/trade-mobile.png), [모바일 아카데미](layout-review/guide-center-mobile.png), [실제 브라우저 왕복 영상](layout-review/facility-common-arrival.mp4), [검증 결과](layout-review/checks.json).

타입 검사·생산 빌드 및 `verify-common-arrival.mjs` 통과. 두 시설 전경/로비/내부 왕복, 실제 공통 키프레임 `stam-contact-arc`의 0.25초/0.08초 지연, Escape·사이드바 중단, 중개인 범위/복귀 포커스, 교수 3개 방, 390px 배치·동작 줄이기를 확인했다. 브라우저 오류 0건. 아래 최초 기능 검증은 보존한 기록이며 전체 서버 검증을 다시 수행했다는 뜻이 아니다. `review/`와 `scale-review/`는 이전 배치 기록이다.

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
