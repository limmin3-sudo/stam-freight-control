# 연출 완료본 → 기능 담당 통합 인계 (2026-11-13)

이번 승인은 별도 브랜치의 커밋·푸시·PR 인계까지다. **main과 `handoff/local-studio-20261110`에는 병합·푸시·배포하지 않았다.** 기능 담당이 현재 작업을 보존한 통합 브랜치에서 합쳐 검증하고 배포한다. 기존 파일을 옛 연출 파일 전체로 교체하지 않는다.

## 바로 확인할 브랜치와 PR

최신 인계 브랜치: `cinematic/archive-subpage-20261113`, [PR #31](https://github.com/limmin3-sudo/stam-freight-control/pull/31). 아카이브 구현 SHA는 `ca452e670310c460f6b61a695c8d0841d2c335c0`, 이 문서는 그 위의 문서 전용 커밋이다. **문서 포함 최종 HEAD는 PR #31 본문과 인계 댓글에 전체 SHA로 고정한다.** 아래 구현 SHA를 최종 문서 커밋으로 혼동하지 않는다.

| PR | 브랜치 | 구현 HEAD | 범위 / 포함 관계 |
| --- | --- | --- | --- |
| [#28](https://github.com/limmin3-sudo/stam-freight-control/pull/28) | `cinematic/return-pullback-20261113` | `e78971e355af574eb873a548fc417abfe8a47a6a` | 콘솔→공간 복귀 축소. #29/#30/#31 미포함 |
| [#29](https://github.com/limmin3-sudo/stam-freight-control/pull/29) | `cinematic/guide-library-20261113` | `0bbc5c3601fe7bbceea0a2a3f2e7d3ccabc2e8f1` | 중복 이용안내 제거·전체 공간 전류/음향 250ms·하위 화면/안내 원고 구성. 다른 PR 미포함 |
| [#30](https://github.com/limmin3-sudo/stam-freight-control/pull/30) | `cinematic/pilot-desk-20261113` | `053963d715f168cffd3d2356bac044da206d8376` | FLIGHT CONSOLE·상단 로그인/로그·명칭. #28/#29 미포함 |
| [#31](https://github.com/limmin3-sudo/stam-freight-control/pull/31) | `cinematic/archive-subpage-20261113` | `ca452e670310c460f6b61a695c8d0841d2c335c0` + 인계 문서 | **#30 포함**, #28/#29 미포함. 아카이브→미션 자료 내부 연결 |

원격 fetch 확인 시 main과 공통 인계 HEAD는 모두 `fa647d0a6077c200897eb1a43e4b4bb5f2242eec`였고 #28~#30은 open/unmerged였다. 이는 기능 담당의 현재 미커밋·미푸시 작업 상태를 뜻하지 않는다. 통합 직전 다시 fetch한다.

## 적용 순서와 기능 작업 보존

1. 기능 담당의 현재 브랜치/미커밋·미추적 작업을 확인하고 먼저 별도 커밋/브랜치로 보존한다. 강제 reset/clean/자동 stash 또는 옛 파일 덮어쓰기를 하지 않는다.
2. 최신 기능 작업을 기준으로 통합 브랜치를 만든다. 권장 순서는 **#28 → #29 → #30 → #31**이다. #28~#30은 같은 원격 main에서 분기한 독립 PR이며 이 순서는 의존성이 아닌 검토 순서다. #31만 #30의 실제 후속이다.
3. #31의 PR base는 `cinematic/pilot-desk-20261113`로 두어 아카이브 diff만 보이게 했다. #30이 통합된 뒤 기능 담당이 필요하면 #31 base를 최신 통합 대상/main으로 바꾼다. #31을 통째로 가져오면 #30도 이미 포함되므로 #30을 별도 cherry-pick으로 중복 적용하지 않는다. Git ancestry를 보존하는 병합 시 이미 포함한 #30은 중복되지 않는다.
4. 공유 파일의 충돌은 아래 최종 조건에 맞춰 hunk별로 합친다. 어느 한 PR 전체를 선택하여 최신 기능 코드나 다른 PR을 덮지 않는다. `PROJECT_STATUS.md`는 각 작업 기록을 모두 남기되 최신 통합 결과를 위에 추가한다.
5. 아래 통합 검증을 완료한 뒤 기능 담당이 배포 버전/릴리스와 공통 인계를 갱신한다. 연출 담당은 공개·개발 인계 브랜치를 움직이지 않았다.

## 공유 파일에서 지켜야 할 최종 조건

| 파일 | 겹치는 변경 / 보존 조건 |
| --- | --- |
| `apps/control-room/src/SpaceExperience.tsx` | #28/#29/#30/#31 모두 수정. 최신 고정 상단바·사이드바, 파트너 정책, useFlight/계약·운항·저장 연결, 가이드·셔틀을 보존한다. #28의 `arrivalView`/`arrivalDestination` **객체형**과 복귀 판단을 #31의 예전 문자열 대입으로 되돌리지 않는다. 하위 `view`를 공간 진입 해시에도 전달한다. |
| 같은 파일: 전류/음향 effect | #28 복귀에서는 점등음 억제, #29 전체 공간 음향/전류 250ms, #31 `archivePulse`의 본문 250ms를 함께 유지한다. 점등 가능 조건은 `powerOn && !arrivalView?.returning`, 또는 본문 pulse. 버퍼/감쇠는 둘 다 .25초, 일반 점등은 기존 .08초 지연·본문 pulse는 지연 없음. 의존성에는 powerOn/archivePulse/returning/sound/volume을 함께 반영한다. #31만의 `.11` 일반음 fallback을 최종값으로 채택하지 않는다. |
| 같은 파일: 렌더링 | #29의 서비스센터 이용안내 카드 제거를 유지하면서 #31의 아카이브 개요/미션 자료 분기와 카드 onClick을 합친다. `PilotDesk`, `PilotTopbar`, 현재 기능 콘솔/잠금/계정 컨트롤러를 모두 보존한다. #28의 ConsoleArrival `returning` prop을 유지한다. |
| `SpaceNavigation.tsx` | #30의 확정 명칭과 #31의 optional view/래퍼·하위 메뉴를 함께 유지한다. 기존 href·화면 ID·onclick·모바일 메뉴·펼침 동작을 보존한다. 전역 import된 `mission-archive.css`가 없으면 래퍼 안 기존 버튼 외형이 빠진다. |
| `space-navigation.ts` | 기존 screen/locale 계약에 optional `view=missions`만 추가했다. 기능 담당의 새 경로가 있다면 유효한 view를 확장하되 기존 주소와 알 수 없는 view의 안전한 fallback을 유지한다. |
| `space-config.ts` | #29의 서비스 설명 `계정 · 운송기록 · 고객지원`과 #30의 아카이브/시네마 이름을 함께 유지한다. #29의 옛 정보실/영상관 이름으로 돌아가지 않는다. focus·marker·contour·기존 게이트 목적지는 보존한다. |
| `ConsoleArrival.tsx`, `console-arrival.css` | #28 복귀 curtain/줌아웃과 #29 점등 파지직 250ms를 결합한다. 일반 들어가기와 복귀를 모두 확인한다. #31 본문 pulse는 별도 이름공간이므로 전체 공간 확대를 반복하지 않는다. |
| `ServiceAccountHistory.tsx` | #30은 기존 singleton 계정 컨트롤러를 재사용한다. DOM 버튼을 상단에서 떼어 옮기거나 별도 로그인 인스턴스를 만들지 않는다. 기능 담당의 기록/백업·복원 변경을 우선 보존한다. |

`use-flight.ts`, engine/SCU/적재/경로 계산, 원본 데이터, 인증/저장 알고리즘은 이번 아카이브 변경 대상이 아니다. 기능 담당의 진행 중인 기능 상태를 전달받지 않았으므로 완성/배포됐다고 추측하지 않는다.

## 실제 연결 / 디자인·문서만 완료 / 남은 기능

| 항목 | 현재 상태 |
| --- | --- |
| 일반 공간→콘솔 확대·점등 | 기존 배포본 #27 기반. #29에서 전류/음향 250ms 변경. |
| 콘솔→라운지/관제센터 | #28에 실제 복귀 축소·방향 판단·복귀 점등음 억제 연결. |
| FLIGHT CONSOLE | #30에 실제 함선·선택 파트너·선택 계약 수, 상태/목적지·진행 표시. hover 상세/클릭 고정/키보드/모바일. 상단 기존 계정 모달·로그 훅 연결. |
| 패널의 변경·초기화 | 함선/파트너 변경은 기존 미션 선택 항목에 초점, 기존 운항 잠금 유지. 미션 변경·취소는 기존 준비 화면. 초기화는 확인 후 기존 stop으로 plan/run만 해제하고 계약/함선/파트너 보존. 직접 개별 계약 편집·게임 계약 취소·전체 데이터 삭제 기능으로 설명하면 안 된다. |
| 아카이브→미션 자료 | #31에 실제 같은 창/주소·하위 메뉴/250ms 본문 전환/검색·필터·정렬·상세·24개 추가·실패/재시도 연결. 루트 intel-model과 기존 SCMDB+Wiki 캐시를 읽는 자료 조회. 계약 수주/계획 추가 기능 없음. |
| 이용안내 위치 | #29에서 서비스센터 중복 카드 제거, 아카이브에만 남김. **아직 guide.html 기존 외부 링크**다. |
| 이용안내 본문 | #29 문서에 최신 절차 원고 구성안만 완료. 새 테마의 실제 내부 본문/목차/캡처/하위 경로는 남음. |
| 원본 자료 | 아카이브 기존 출처 링크와 미션 자료 출처 표시만 연결. 외부 원본을 우리 화면으로 구성하는 별도 자료 페이지는 남음. |
| 서비스센터 | 기존 계정·완료 운송기록 기능 유지, #29의 지원 카드 정돈. 계정/운송기록/피드백/업데이트 각각의 내부 하위 메뉴·페이지 이전은 미완료. 기존 외부 링크를 동등 기능 연결 전 제거하지 않음. |
| 시네마 | 기존 소개 영상 재생 유지. 새 하위 메뉴/목록 개편은 미완료. 제공되지 않은 영상 목록을 만들지 않음. |
| 공통 화면 디자인 | Barlow Medium 500 + SUIT 500, 승인 유리/버튼 자산·청록/금빛·고정 공통 틀 재사용. 모든 하위 페이지의 기능 연결이 완료됐다는 의미는 아님. |
| 후속 연출 | 전체 가이드 튜토리얼·최종 이륙/효과음·2.5D 인물 클릭 파트너 선택은 이번 완료 범위 아님. |

아카이브 참고 수치와 실제 수주 수량/보상/상자 증거는 구분한다. 현재 1,274개 유형/1,396개 정의는 검수에 사용한 데이터 버전의 결과이며 영구 고정 숫자가 아니다. mix/en 품목은 영어, ko 품목은 기존 라벨; 제목/회사/후보 장소/원문 전체 번역은 남아 있다. 최초 자료 진입은 큰 JSON 파일 4개를 지연 로드하므로 네트워크·해석 비용이 있다.

## 검증 결과와 최종 화면

이번 #30+#31 검수본: TypeScript/Vite 빌드 통과(기존 큰 번들 경고), 앱 테스트 **15개 파일 통과**, 루트 **238개 테스트 통과**. 루트의 소켓 테스트 2개가 샌드박스에서 실패해 동일 전체 명령을 소켓 허용 환경에서 실행하여 통과했다.

production preview Chromium에서 ko/mix/en, 1366×768·390×844, 같은 창·단일 탭, 상단/사이드바/FLIGHT CONSOLE 유지, 250ms 본문 효과, 필터/검색/빈 결과/초기화/페이징/상세, 주소 재진입·새로고침·뒤로/앞으로·Esc, 저장값 불변, 모바일 메뉴 선택 후 닫기/넘침 없음, 동작 줄이기, JSON 차단 오류 후 Retry 회복을 검증했다. 브라우저 오류 없음. 모바일 최종 화면은 메뉴 애니메이션 종료 후 캡처했다.

- #31 [최종 데스크톱](cinematics/archive-subpage-20261113/review/missions-desktop.png), [상세](cinematics/archive-subpage-20261113/review/mission-details.png), [모바일](cinematics/archive-subpage-20261113/review/missions-mobile.png), [모바일 하위 메뉴](cinematics/archive-subpage-20261113/review/submenu-mobile.png), [실제 전환 영상](cinematics/archive-subpage-20261113/review/archive-navigation.webm).
- #31 [전체 검증/변경 설명](cinematics/archive-subpage-20261113/README.md), [결과 JSON](cinematics/archive-subpage-20261113/review/verification.json), [브라우저 재현 스크립트](cinematics/archive-subpage-20261113/review/verify-browser.mjs).
- #30 [패널 요약](cinematics/pilot-console-20261113/review/desktop-summary.png), [상세](cinematics/pilot-console-20261113/review/desktop-hover.png), [모바일](cinematics/pilot-console-20261113/review/mobile-open.png), [동작/검증](cinematics/pilot-console-20261113/README.md). 실제 OS 권한/계정 로그인 검증은 아니며 합성 운항·파일 선택 모의 검수다.
- #28 [복귀 검증·캡처/영상](https://github.com/limmin3-sudo/stam-freight-control/blob/e78971e355af574eb873a548fc417abfe8a47a6a/docs/cinematics/return-pullback-20261113/README.md).
- #29 [중복 안내/250ms·원고 구성/캡처](https://github.com/limmin3-sudo/stam-freight-control/blob/0bbc5c3601fe7bbceea0a2a3f2e7d3ccabc2e8f1/docs/design-review-20261113/guide-library/README.md).

**#28+#29+#30+#31 전체를 합친 통합본은 아직 검증하지 않았다.** 기능 담당은 통합 후 위 명령과 공간 확대/복귀 축소, 공통/본문 250ms 음향, 계정·로그 상태, 기존 미션/OCR/역할별 관제·저장/복원·진행을 다시 확인한다. 실제 계정·실물 기기·실게임 정확도는 합성 검수로 보장하지 않는다. 구조를 변경한 경우 캡처도 갱신한다.

## 변경 파일 전체 목록

각 목록은 구현 커밋을 지정된 diff 기준과 비교해 생성했다. #31 아래는 #30 대비 아카이브 변경만이다. 이 문서 자체와 파일 목록 JSON은 인계 문서 전용 최종 커밋에서 추가된다. #31 전체 브랜치 대 main은 #30 목록과 합집합이다. 기계 판독 목록: [cinematic-integration-files-20261113.json](cinematic-integration-files-20261113.json).

### PR #28

비교 기준 `fa647d0a6077c200897eb1a43e4b4bb5f2242eec` → `e78971e355af574eb873a548fc417abfe8a47a6a`.

- `PROJECT_STATUS.md`
- `apps/control-room/src/ConsoleArrival.tsx`
- `apps/control-room/src/SpaceExperience.tsx`
- `apps/control-room/src/console-arrival.css`
- `apps/control-room/src/travel-direction.ts`
- `apps/control-room/tests/travel-direction.test.ts`
- `docs/cinematics/return-pullback-20261113/README.md`
- `docs/cinematics/return-pullback-20261113/review/checks.json`
- `docs/cinematics/return-pullback-20261113/review/lounge-mobile.png`
- `docs/cinematics/return-pullback-20261113/review/lounge-pullback.png`
- `docs/cinematics/return-pullback-20261113/review/return-travel.webm`

### PR #29

비교 기준 `fa647d0a6077c200897eb1a43e4b4bb5f2242eec` → `0bbc5c3601fe7bbceea0a2a3f2e7d3ccabc2e8f1`.

- `PROJECT_STATUS.md`
- `apps/control-room/src/SpaceExperience.tsx`
- `apps/control-room/src/assets/arrival/record.json`
- `apps/control-room/src/console-arrival.css`
- `apps/control-room/src/content-optics.css`
- `apps/control-room/src/space-config.ts`
- `docs/cinematics/common-arrival-20261113/README.md`
- `docs/design-review-20261113/guide-library/README.md`
- `docs/design-review-20261113/guide-library/audio-250ms.json`
- `docs/design-review-20261113/guide-library/checks.json`
- `docs/design-review-20261113/guide-library/information-1366.png`
- `docs/design-review-20261113/guide-library/information-390.png`
- `docs/design-review-20261113/guide-library/service-1366.png`
- `docs/design-review-20261113/guide-library/service-390.png`

### PR #30

비교 기준 `fa647d0a6077c200897eb1a43e4b4bb5f2242eec` → `053963d715f168cffd3d2356bac044da206d8376`.

- `PROJECT_STATUS.md`
- `apps/control-room/src/PilotDesk.tsx`
- `apps/control-room/src/PilotTopbar.tsx`
- `apps/control-room/src/ServiceAccountHistory.tsx`
- `apps/control-room/src/SpaceExperience.tsx`
- `apps/control-room/src/SpaceNavigation.tsx`
- `apps/control-room/src/pilot-desk.css`
- `apps/control-room/src/space-config.ts`
- `docs/cinematics/pilot-console-20261113/README.md`
- `docs/cinematics/pilot-console-20261113/review/checks.json`
- `docs/cinematics/pilot-console-20261113/review/desktop-hover.png`
- `docs/cinematics/pilot-console-20261113/review/desktop-summary.png`
- `docs/cinematics/pilot-console-20261113/review/mobile-open.png`
- `docs/cinematics/pilot-console-20261113/review/mobile-summary.png`

### PR #31

비교 기준 `053963d715f168cffd3d2356bac044da206d8376` → `ca452e670310c460f6b61a695c8d0841d2c335c0`.

- `PROJECT_STATUS.md`
- `apps/control-room/src/ArchiveBoundary.tsx`
- `apps/control-room/src/MissionArchive.tsx`
- `apps/control-room/src/SpaceExperience.tsx`
- `apps/control-room/src/SpaceNavigation.tsx`
- `apps/control-room/src/mission-archive-data.d.mts`
- `apps/control-room/src/mission-archive-data.mjs`
- `apps/control-room/src/mission-archive.css`
- `apps/control-room/src/space-navigation.ts`
- `apps/control-room/tests/mission-archive.test.ts`
- `apps/control-room/tests/space-navigation.test.ts`
- `docs/cinematics/archive-subpage-20261113/README.md`
- `docs/cinematics/archive-subpage-20261113/review/archive-navigation.webm`
- `docs/cinematics/archive-subpage-20261113/review/checks.json`
- `docs/cinematics/archive-subpage-20261113/review/failure-retry.json`
- `docs/cinematics/archive-subpage-20261113/review/mission-details.png`
- `docs/cinematics/archive-subpage-20261113/review/missions-desktop.png`
- `docs/cinematics/archive-subpage-20261113/review/missions-mobile.png`
- `docs/cinematics/archive-subpage-20261113/review/submenu-mobile.png`
- `docs/cinematics/archive-subpage-20261113/review/verification.json`
- `docs/cinematics/archive-subpage-20261113/review/verify-browser.mjs`
