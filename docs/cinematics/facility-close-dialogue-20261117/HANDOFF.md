# 시설 담당자 근접 대화 인계 — 2026-11-17

- 브랜치: `cinematic/facility-close-dialogue-20261117`
- 기반: PR #37의 `af78d482437b61ec9cf6e3d2130f7bd76d75b28c`.
- 기능 원격 기준: `handoff/local-studio-20261110` / `2c637afa21c9de904b3ad58b289215f3508670ec` 재확인.
- 적용 순서: **#35 → #37 → 이번 PR**. 이번 PR은 #37 대상의 누적 후속이다. #36 네이티브 앱 디자인은 제외/보류.
- main/공통 인계 브랜치 병합·배포 없음. 기능 담당이 최신 기능을 보존하며 통합한다.

## 실제 연결

로비 인물 클릭 → 클릭 위치에서 근접 인물로 접근 → 기존 소개와 선택 버튼 → 기존 내부 화면 진입. 대화 마치기는 인물 위치로 축소 복귀한다. 장소 표식 클릭은 기존대로 대화를 거치지 않는다.

| 인물 | 기존 기능 연결 |
| --- | --- |
| 수석 무역관 | `planning`, `intrasystem` |
| 링 가문 중개인 | `planning`, `interstellar` |
| 지도 교수 | `freight-information`, `education`, `operations-study` |

`LobbyStaff.onRoom(room, scope, person, point)` → `FacilityLobby.enter` → 기존 `useLobbyTravel`과 `onRoom`을 사용한다. 담당 범위·계산·장부·저장 코드는 바꾸지 않았다. 인물과 대화해도 운항 파트너를 변경하지 않는다. 기존 확대/250ms 파지직 및 내부 모니터를 유지한다.

## 변경 파일과 병합 주의

- `apps/control-room/src/CrewEncounter.tsx`: #37 대화 표시를 공용으로 분리. 이미지 접근/복귀, 선택 버튼, 포커스 복원, 전환 중 중복 클릭 방지와 취소 처리. 포털로 배경 inert/overflow와 분리하고 상단바·사이드바를 계속 사용할 수 있게 했다.
- `PartnerConversation.tsx`: 기존 관제 파트너 인터페이스와 인사말을 보존하는 래퍼. 관제 회귀 검증 포함.
- `LobbyStaff.tsx`: #37의 근접 PNG 세 장 재사용, 담당별 기존 콜백 연결. 기존 전신 자산/배치/이름 유지.
- `FacilityLobby.tsx`: 대화 중 배경 조작 차단 상태와 props 연결만 변경. 기능 측 최신 변경과 함께 병합한다.
- `partner-conversation.css`: 방 선택과 모바일 대화 영역, 화면 진입 시 퇴장 표현 추가.
- `PROJECT_STATUS.md`, 이 폴더: 인계, 실제 화면, 재현 스크립트.

**이번 차이에는 SpaceExperience.tsx 변경이 없다.** 전체 파일을 이전 버전으로 덮어쓰지 않는다. 새 자산 생성/중복 복사는 없으며 #37의 `assets/*-close.png` 세 장을 import한다.

## 검증

- TypeScript 검사, Vite 생산 빌드 성공. 기존 500KB 청크 경고 있음.
- 앱 테스트 34개 통과.
- 생산 빌드 Chromium: 두 무역 범위, 교수 세 방 진입/복귀, 장소 직접 클릭, 대화/내부 화면 종료 시 원래 인물 포커스 확인.
- 사이드바·뒤로 가기 및 선택 직후 다른 장소 이동 시 늦은 이동 취소 확인.
- 390px 모바일에서 버튼/닫기 표시, 메뉴 Escape 우선 처리 확인.
- 영어·동작 줄이기, 관제 오퍼레이터/항해사 기존 대화 회귀 확인.
- 시설 대화 전후 운항 저장 보존, 브라우저 오류/로컬 자산 누락 없음.
- 재현: `node docs/cinematics/facility-close-dialogue-20261117/verify-browser.mjs` (기본 생산 서버 5201 필요). [결과](review/checks.json).

## 실제 화면

- [수석 무역관](review/senior-trade-officer-desktop.png)
- [링 가문 중개인](review/ling-broker-desktop.png) / [모바일](review/ling-broker-mobile.png)
- [교수](review/professor-desktop.png) / [모바일](review/academic-advisor-mobile.png)
- [행성계 내부 계획](review/intrasystem-planning.png) / [행성계 간 계획](review/interstellar-planning.png)
- [영어·동작 줄이기](review/professor-mobile-en-reduced.png)

## 남은 사항

가이드의 데스크 영상/홀로그램과 근접 대화 연결은 후속 작업이다. 이번 세 인물은 기존 고정 소개와 기능 선택이며 자유 대화·음성·립싱크는 구현하지 않았다. 실계정/실게임/iOS 실기기 검증은 하지 않았다. 모바일의 긴 소개는 본문 안에서 스크롤하며 선택 버튼과 닫기는 보인다. 새 얼굴은 #37 제작 자산을 사용하며 원본과 픽셀 동일하다고 주장하지 않는다.
