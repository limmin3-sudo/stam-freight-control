# beta 2.7.0 통합·배포 인계

사용자가 연출 PR [#26](https://github.com/limmin3-sudo/stam-freight-control/pull/26) → [#27](https://github.com/limmin3-sudo/stam-freight-control/pull/27) 순서 통합·검증·배포를 승인했다. [최종 연출 인계](https://github.com/limmin3-sudo/stam-freight-control/pull/27#issuecomment-6842515275).

## 통합 이력

- 기능 작업 보존: `7e61244` — 지도/관제/적재 테마·서체·조작 및 검증 자료.
- #26 최종 `2484135b54af34c17a3126f50e1b0bbe6be1ec55` → 병합 `116f557`.
- #27 최종 `741ca01b62380043d2f7b0aa5183907a148ede87` → 병합 `e65349e`.
- 공통 기준은 `40c3301`(beta 2.6.0). 실행 코드 충돌은 없었으며 PROJECT_STATUS.md의 독립 추가 내용을 모두 남겼다. 반려 #25와 서비스센터 고정 UI 시안은 포함하지 않는다.

## 결과와 검증

항해사 상시 지도/적재와 현재 목적지, 오퍼레이터 경로 전용, 공통 Barlow/SUIT 500·균일 유리·금빛 강조를 적용했다. 정면 안내데스크·파트너 스킨, 장소명 클릭·hover 금색·5.2배 확대·로고/150ms 전류 점등을 통합했다. 기본 이동 예산 1030ms와 기본 무음, 모션 감소를 유지한다.

루트 테스트 238개, 앱 테스트 48개(14개 파일), TypeScript/Vite 빌드 통과. 실제 배포용 브라우저에서 항해사/오퍼레이터 표시, 실제/계획 화물 분리, 단축키 격리, 언어/설정 왕복/새로고침/되돌리기의 위치·소유권 유지와 모바일 넘침을 확인했다. 연출은 일반 장소명·사이드바·게이트·파트너 Esc, 가이드 접근/대기/복귀 영상, 정면 패널·대화 변경, ko/mix/en 모바일, 모션 감소, 기본 무음/켜짐 시 단일 점등음을 확인했으며 통과했다. 재현 스크립트는 `scripts/check-cinematic-integration-browser.mjs`, 결과는 `release-review-20261113/cinematics.json`이다.

증거는 `release-review-20261113/` 및 각 `function-review-20261113/`, `cinematics/flat-hologram-20261113/`, `cinematics/common-arrival-20261113/`에 있다. 공개 적용은 최종 Git 커밋, GitHub Pages 실행 결과와 공개 `version.json.version`의 일치로 확인한다. `main`과 `handoff/local-studio-20261110`을 같은 통합 커밋으로 올린다.

## 남은 작업

- 전체 튜토리얼 전용 동선에 셔틀 연결. 일반 게이트는 이번 최종 지시대로 확대/점등이며 가이드 접근·대기·복귀는 기존 영상이다.
- 최종 2.5D 관제센터 인물을 클릭하는 파트너 선택. 현재 초상화 선택은 임시 기능 구성이다.
- 미확정 이륙/대기권 탈출 영상과 최종 엔진·이륙·착륙음.
- 추가 지도 표면 디테일/고해상도 원본, 실기기 GPU·터치 성능 검수.

실제 게임 운항, 계정 간 동기화, 실물 기기 검증으로 위 자동/브라우저 검증 범위를 확대해서 보고하지 않는다.
