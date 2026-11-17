# 가이드 대기 패널 메뉴 개편 — 2026-11-17

브랜치: `cinematic/guide-desk-menu-20261117`. 기반 PR #38 / `4cd203afb6b785da06e4832940c17fec0cc2b317`. 원격 기능 인계는 `2c637afa21c9de904b3ad58b289215f3508670ec`로 유지됨을 fetch 후 확인했다. #35 → #37 → #38 → 이번 PR 순서의 누적 연출 작업이다. #36 앱 디자인은 제외했다. main/공통 인계 병합·배포 없음.

## 사용자에게 보이는 변화

기존 한 장 유리 패널 안에서 왼쪽 메뉴를 선택하고 오른쪽 설명을 읽은 뒤 시작한다. 승인된 접근·대기·복귀 영상, 패널 크기·위치·재질·프레임·청록/호박빛 버튼 PNG를 유지했다.

| 메뉴 | 실제 연결 |
| --- | --- |
| 운송 튜토리얼 | 기존 `GuideJourney`의 `practice`; 별도 버튼으로 `procedure` 안내도 유지 |
| 무역 튜토리얼 | 목적 설명 + 비활성 ‘안내 준비 중’; 실제 무역 기능 자체가 준비 중이라는 뜻은 아님 |
| 시설 둘러보기 | 기존 `onTour` → 시네마·아카이브·서비스센터·게이트 라운지 투어 |
| 라운지로 돌아가기 | 기존 `return-to-lounge` 이벤트, 패널 수납·복귀 영상·건너뛰기 유지 |

원본 이미지에 들어 있던 과거 문구로 새 메뉴를 덮지 않도록 `data-live-ink`를 추가했다. 변경 문구는 실제 Barlow/SUIT 텍스트다. 제목·질문·복귀 버튼의 기존 한국어 래스터 잉크는 유지했다. 글꼴을 픽셀 단위로 새로 복제한 자산이라고 보고하지 않는다.

## 변경 파일 및 연결 지점

- `GuideDesk.tsx`: 새 메뉴 마운트/해제, 기존 튜토리얼 콜백 연결, 모달 정리 후 시작 버튼 포커스 복원.
- `guide-desk-menu.ts` (신규): 메뉴·설명·시작 버튼과 한국어/영어 콘텐츠. 한/영 모드는 기존 규칙대로 한국어 UI.
- `guide-desk-menu.css` (신규): 기존 자산 기반의 새 설명/준비 중/포커스 표시. 모바일은 기존 세로 패널과 페이지 스크롤을 유지. 새 패널 진입과 중복되며 모바일 버튼을 가리던 외부 고정 투어 버튼은 해당 데스크에서만 숨김.
- `guide-raster-skin.ts`: 변경된 문구만 과거 래스터 잉크 적용에서 제외.
- `guide-desk-controller.mjs`, `.d.mts`: `menuManaged` 옵션으로 기존 메뉴의 즉시 이동 이벤트만 중복 등록하지 않는다. 미디어·음소거·수납·복귀·사이드바 navigate 컨트롤러는 유지.
- `PROJECT_STATUS.md`, 이 폴더: 인계와 검증 자료.

`SpaceExperience.tsx`, `GuideJourney.tsx`, 계산/저장/무역 기능, 원본 템플릿과 이미지/영상 바이너리는 수정하지 않았다. 공유 GuideDesk/controller 변경은 기능 담당 최신본에 필요한 부분만 병합한다. `apps/control-room/tools/prepare-guide-desk.mjs`는 예전 시안 추출기이며 현재 튜토리얼/스킨 변경까지 재생성하는 도구가 아니다. 전체 runtime을 그 결과로 덮어쓰지 않는다.

## 검증 자료

생산 빌드와 타입 검사, 앱 테스트 34개. 실제 Chromium 연결 검증 결과는 [review/checks.json](review/checks.json)에 기록한다. `verify-browser.mjs`는 `STAM_REVIEW_URL` 또는 기본 로컬 생산 서버 5201을 사용한다.

- [운송 메뉴](review/freight-desktop.png)
- [무역 준비 중](review/trade-desktop.png)
- [둘러보기 선택](review/tour-desktop.png)
- [실제 시네마 도착](review/tour-cinema.png)
- [모바일 운송](review/freight-mobile.png) / [무역](review/trade-mobile.png) / [영어](review/trade-mobile-en.png)

## 남은 작업

무역 전용 연습 데이터·단계형 튜토리얼은 미구현이다. 현재 지원하는 운송 연습과 라운지 투어를 재사용했고 전체 사업부 신규 투어는 만들지 않았다. API·자유 대화·음성 연결 없음. 실제 계정/게임/iOS 실기기 검증을 의미하지 않는다. 튜토리얼 계산 엔진은 수정하지 않았으며 저장 자료를 변경하지 않는다.
