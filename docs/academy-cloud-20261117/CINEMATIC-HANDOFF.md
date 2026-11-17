# 무역센터 · 아카데미 연출 연결 준비

2026-11-17 기능 작업, 로컬 미커밋 상태. 이 문서는 인계 준비본이며 외부 전송·PR 생성은 하지 않았다. 최신 기준은 저장소의 현재 작업 전체다. 옛 PR의 SpaceExperience 전체 덮어쓰기는 금지한다.

## 유지할 실제 기능

- 무역센터: `market`, `planning`, `trade-operations`. 시장 자료·CSV/OCR·가격 관심, 계획/비교/경유/혼합/예비금, 실제 교역 장부/지도/적재, 계정 이어받기가 연결되어 있다.
- 아카데미: `freight-information`, `education`, `operations-study`. 자료 검색·학습·미션 조합·실제 사례 연구가 연결되어 있다.
- 경로: `#/division?lang=ko&facility=trade&room=planning` 등. 아카데미 facility는 `guide-center`. 언어 `en`, `mix`와 직접 링크/새로고침/뒤로가기를 보존한다.
- 승인된 배경/파트너/교수·ApprovedGlass·Barlow/SUIT를 사용한다. 기능 입력·검색·동작은 실제 DOM으로 유지하고 이미지에 굽지 않는다. 작은 글자나 인물로 기능 공간을 압축하지 않는다.

## 공유 파일과 책임 경계

- `FacilityLobby.tsx`: 방 선택, 카메라 확대, 닫기/포커스 복원, Worker/패널 수명주기. 방을 로딩할 때 기존 기능 컴포넌트를 연결한다.
- `SpaceExperience.tsx`, `SpaceNavigation.tsx`, `space-navigation.ts`: 기존 상단바/사이드바/파트너/운항/직접 링크를 유지. 연출 연결 부분만 변경한다.
- `TradeWorkspace.tsx`: 확장/이전 장부 전환과 **하나의 useTradeCloud 인스턴스**를 소유한다. 모니터 외형 때문에 이 컨테이너를 중복 마운트하지 않는다.
- `TradeSuite`, `TradePlanning`, `TradeOperations`, `MarketInformation`, `TradePriceIntake`: 내부 기능 및 거래 확인을 보존한다.
- `AcademyRoom`, `AcademyEducation`, `AcademyStudy`, `AcademyLessons`, `FreightInformation`: 외형을 모니터에 넣어도 필터/계산/닫기/스크롤이 그대로 동작해야 한다. `MissionArchive`/`FreightArchive`는 기존 아카이브에서도 쓰는 공용 컴포넌트다.
- `use-trade-cloud`, `trade-cloud-codec`, 두 장부 hook, `account.mjs`, `flight-cloud.mjs`, `firestore.rules`: 저장·소유권 구현이다. 연출 파일로 대체하지 않는다.

## 연출에서 이어갈 부분

사용자 최신 역할 정정: **내부 모니터 화면·테마·구성·기능 연결까지 기능 담당, 그 화면으로 넘어가는 이동·전환만 연출 담당**이다. 무역센터 세 방은 [내부 모니터 화면](../trade-monitor-20261117/README.md)을 기능 쪽에서 적용했다. 아카데미 세 방도 [공용 모니터 화면](../academy-monitor-20261117/README.md)을 기능 쪽에서 적용했다. 두 센터 모두 내부 화면을 보존하고 이 화면까지의 진입/복귀만 연결한다. 연출은 기능 담당의 도착 화면을 보존해 접근/복귀를 연결하며, 내부 화면을 별도로 다시 만들거나 iframe·새 저장 공간으로 옮기지 않는다.

새 전체 둘러보기는 시설들을 이어서 새로 구성하고, 튜토리얼은 운송용/무역용으로 나눈다는 사용자 결정을 유지한다. 기존 투어를 임시로 확장하는 작업은 이번 기능 범위에 넣지 않았다.

## 인계 확인

방 직접 선택/사이드바/새로고침, 닫기·Escape 포커스, 모바일 가독성·스크롤, 영어·동작 줄이기, 실제 운항/거래 저장 보존, 교역 확인창 중 이탈과 인증 변경을 확인한다. 저장/계산 로직을 바꾸지 않는 연출 작업마다 서버 전체 검증을 반복할 필요는 없다.

운영 클라우드 규칙과 웹 배포는 아직 미실시다. 에뮬레이터·모의 계정 결과를 운영 두 기기 성공이라고 표기하지 않는다.

## 2026-11-17 무역 관제 구성 갱신

사용자 승인으로 무역 관제 도착 화면은 [가격 중심 화면](../trade-price-console-20261117/README.md)으로 변경됐다. 보유 화물/거래처 가격표가 기본이며 지도·적재·담당자 안내는 요청 시 펼친다. 이전 지도·적재 상시 배치를 되살리지 않는다. 공간 이동·복귀 연출의 역할은 동일하다.
