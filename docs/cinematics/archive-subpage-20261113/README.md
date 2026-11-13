# 아카이브 → 미션 자료: 첫 내부 하위 화면

브랜치 `cinematic/archive-subpage-20261113`. PR #30 `053963d715f168cffd3d2356bac044da206d8376`에서 분기했다. 최신 원격 확인 시 main/공통 인계는 `fa647d0a6077c200897eb1a43e4b4bb5f2242eec`이며, 기능 담당의 미푸시 작업은 포함/검증했다고 가정하지 않는다. main/공통 인계 병합·배포는 하지 않는다.

## 완료한 실제 동작

- `#/information?lang=ko&view=missions`를 같은 창에 표시한다. 상단바·FLIGHT CONSOLE·승인 사이드바를 유지한다.
- 아카이브 아래 미션 자료 하위 메뉴가 슬라이드로 펼쳐지고 선택 항목은 금빛이다. 다음 메뉴를 아래로 민다. 기존 버튼 자산·폰트·표현을 래퍼 구조에 그대로 적용했다.
- 아카이브 개요↔미션 자료는 본문만 기존 전류 자산으로 250ms 전환한다. 전체 공간 확대를 반복하지 않는다. 음소거/음량/동작 줄이기를 존중한다. 주소 직접 진입, 새로고침, 뒤로/앞으로, Esc 복귀를 지원한다.
- 회사/평판/유형/검색/정렬, 24개씩 추가 표시, 화물 규격·후보 장소·원문·정의 ID 상세, 빈 결과/초기화, 자료 로딩 실패/재시도를 연결했다. 선택 계약 추가나 운항 변경 기능은 넣지 않았다.
- 로딩/자료 오류가 발생해도 고정 메뉴는 남는다. 선택적 페이지 번들 오류는 새로고침 안내를 보여준다.

## 자료와 기능 경계

기존 루트 `intel-model.mjs`의 `intelRecords`, `filterIntel`, 수량·보상·상자·장소 조회 함수를 그대로 사용한다. SCMDB 우선/동일 정의 Wiki 보충의 기존 캐시를 읽는다. 새 수집·병합·계산 정책은 만들지 않았다. 실제 검수 데이터는 1,274개 유형 / 1,396개 정의다. 자료의 기본 보상/가변 수량과 실제 수주 증거를 구분한다. 원본 출처만 외부 링크로 제공한다.

JSON 4개는 Vite의 해시 자산 URL로 지연 로드한다. 자료 화면에 들어갔을 때 미리 가져오며 앱 첫 진입 전체에 강제 로드하지 않는다. 표시 모델을 캐시해 필터마다 다시 해석하지 않는다. 캐시 갱신은 기존 데이터 갱신/빌드 파이프라인이 담당한다. 큰 원본 JSON 때문에 최초 자료 진입의 네트워크/해석 비용은 남는다.

ko는 기존 품목 한글 라벨, mix/en은 영어 품목을 표시한다. 미션 제목·회사·유형·후보 장소·원문은 원본 기준이며 완전 한글화는 하지 않았다. 외부 사이트를 iframe으로 표시하지 않는다.

## 이번 변경 파일

- `apps/control-room/src/SpaceExperience.tsx`: 하위 화면 진입/복귀·본문 전류/음향·초점·지연 로드. 기존 운항 훅/미션/지도/파트너 선택·가이드 흐름을 유지한다.
- `apps/control-room/src/SpaceNavigation.tsx`: optional view, 아카이브 하위 메뉴, 모바일 선택 후 닫힘. 버튼 식별/기존 이벤트/해시를 유지한다.
- `apps/control-room/src/space-navigation.ts`: 기존 경로에 optional `view=missions`. 다른 공간/알 수 없는 view는 무시한다.
- `apps/control-room/src/MissionArchive.tsx`, `mission-archive.css`: 공통 Barlow 500/SUIT·균일 투사 유리·금빛 수치의 본문/반응형/하위 메뉴.
- `apps/control-room/src/mission-archive-data.mjs`, `mission-archive-data.d.mts`: 읽기 전용 기존 모델 어댑터/타입.
- `apps/control-room/src/ArchiveBoundary.tsx`: 선택적 번들 오류 격리.
- `apps/control-room/tests/space-navigation.test.ts`, `mission-archive.test.ts`: 경로와 실제 자료 모델 필터/정렬 검증.
- `PROJECT_STATUS.md`, 이 문서·review 폴더: 인계/검증.

## 포함 관계와 주의

이 브랜치는 #30을 포함하고 #28/#29는 포함하지 않는다. #30 기준으로 PR을 만들어 새 아카이브 diff만 검토한다. 전체 파일로 최신 기능 담당 파일을 덮어쓰지 않는다. 통합 순서와 공유 파일의 결합 조건은 [전체 인계](../../CINEMATIC-INTEGRATION-HANDOFF-20261113.md)에 기록한다.

특히 #29 없이 이 브랜치만 적용하면 서비스센터 이용안내 중복과 기존 전체 공간 150ms 전류/110ms 음향이 남는다. 이번 본문 전류/음향만 250ms다. #29의 전체 공간 전류/음향 250ms와 서비스 이용안내 제거를 함께 보존해야 한다. #28의 복귀 축소/복귀 음향 억제도 함께 유지한다.

## 검증 및 캡처

- `npm run build --prefix apps/control-room`: TypeScript/Vite 통과. 기존 500kB 초과 번들 경고는 남는다.
- `npm test --prefix apps/control-room`: 15개 테스트 파일 통과.
- `npm test`: 루트 238개 테스트 통과. 샌드박스 안에서는 로컬 소켓 테스트 2개가 실패했고 소켓이 허용된 동일 환경에서 재실행하여 전체 통과했다.
- production preview Chromium: ko/mix/en, 1366×768·390×844, 주소/히스토리/필터/상세/페이징/250ms/메뉴·상단 고정/저장값 불변/모바일 메뉴/동작 줄이기, 차단한 JSON의 실패·재시도 회복 확인. 오류 없음.
- 모바일 캡처는 메뉴 닫힘 애니메이션 완료 후 촬영했다. 처음 중간 프레임의 가림은 최종 화면 문제가 아니었다.
- 실제 OS 파일 권한/계정 로그인·동기화·실게임 계약/OCR 검증은 아니다. #28/#29를 합친 통합본은 기능 담당이 다시 검증한다.

[데스크톱](review/missions-desktop.png) · [상세](review/mission-details.png) · [모바일](review/missions-mobile.png) · [모바일 하위 메뉴](review/submenu-mobile.png) · [실제 전환 영상](review/archive-navigation.webm) · [브라우저 결과](review/checks.json) · [실패/재시도](review/failure-retry.json) · [명령 결과](review/verification.json)

재현 스크립트: `review/verify-browser.mjs`. Playwright가 있는 환경에서 `STAM_PLAYWRIGHT_MODULE`(선택적 모듈 경로), `STAM_CHROMIUM`(선택적 실행 파일), `STAM_PREVIEW_URL`(기본 5185)을 지정해 실행한다. 새 브라우저 컨텍스트와 합성 상태만 사용한다.

## 완료되지 않은 것

이 PR은 아카이브→미션 자료 한 경로다. 이용안내 본문은 #29에 원고 구성안만 있으며 현재 기준의 실제 내부 페이지는 미구현이다. 원본 자료 자체의 native 페이지, 서비스센터 계정/기록/피드백/업데이트 하위 메뉴, 시네마 하위 메뉴·내부 페이지는 후속 작업이다. 기존 안내/출처/지원 외부 링크는 연결된 동등 기능이 없는 상태에서 제거하지 않았다. 전체 튜토리얼·최종 2.5D 파트너 클릭 선택도 이번 범위가 아니다.
