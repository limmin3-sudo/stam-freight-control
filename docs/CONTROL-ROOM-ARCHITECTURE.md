# STAM 이미지 기반 공간과 실제 기능 연결 구조

2026-11-10 KST · Codex. 최종 사용자 지시에 따라 관제실 전체 3D 모델링 계획과 자유 이동·지도 후면 콘솔·180° 회전 계획을 폐기했다. 이 문서에서 해당 설계와 제작 지시를 제거했다. **최종 제품 구성과 실행 순서는 [지상기지와 관제실 및 연결 앱 계획](STAM-EXPERIENCE-ROADMAP.md)을 따른다.**

## 현재 제품 구조

- 밝은 지상기지: 첫 방문 로비, 이용안내, 소개영상, 정보실, 관제실 연결. 재방문 작업 계속과 직접 링크를 제공한다.
- 이미지 기반 관제실: 중앙 스탠턴 홀로그램, 왼쪽 미션 콘솔, 오른쪽 운항 관제, 기존 두 파트너.
- 콘솔 접근: 고해상도 전경/근접 이미지와 웹 확대·원근 보정·실제 기능 UI의 연결.
- 지도 접근: 중앙 홀로그램 클릭 → 확대 → 실제 지도와 UI. 지도용 모니터는 없다.
- 실제 지도/적재: Three.js 회전·확대와 기존 데이터·계산 규칙을 유지한다. 적재는 운항 관제와 출항 전 검토에서 공유한다.
- 공통 UI: 원본 STAM 로고, A 글라스 함교 테마, 상단 공간 전환과 상태/설정, 하단의 공간별 간단한 바로가기.

## 화면과 계산 경계

React/TypeScript/Vite가 새 화면을 담당하고 기존 JavaScript ESM 계산 엔진을 재사용한다. 새 UI 때문에 저장 형식이나 계약별 소유권을 바꾸지 않는다.

| 기능 | 기존 소스 | 연결 기준 |
|---|---|---|
| 경로/적재 계산 | `engine.mjs`, `route-only.mjs`, `route-*.mjs`, `packing-*.mjs` | 검증된 계산 재사용 |
| 함선·부착 방향 | `ships.mjs`, `fleet.mjs`, `performance.mjs` | ID/그리드/방향과 사용자 선택 보존 |
| 계약 수신 | `integration/inbox-core.mjs`, `integration/log/live-client.mjs` | 증거·정규화 보존, 화면 교체 |
| 저장·계정 | `app.mjs`, `workbench.mjs`, `sync.mjs`, `account.mjs` | 기존 저장 책임을 분리한 뒤 연결. 옛 UI와 새 UI가 동시에 쓰지 않음 |
| 운항 | `execution.mjs` | 기존 상태 전이와 aboard 위치 보존 |
| 지도/적재 | `starmap.mjs`, `scene.mjs` | 실제 좌표·box ID/SCU, 생성/갱신/해제 책임 보존 |
| 앱 로그 연결 | `desktop/Launcher.cs`, `desktop/bridge.mjs`, `integration/log/live-server.mjs` | 검증된 파서/토큰 경계 재사용 |

`app.mjs` 전체 import는 DOM 초기화/저장 부작용이 있으므로 피한다. 읽기 스냅샷부터 연결하고 쓰기는 기존 검증된 상태 전이로만 보낸다. 임의 축약 타입으로 계약의 증거/예상 플래그/소유권을 잃지 않는다.

## 표현 설정과 접근성

이미지·클릭 영역·전환 설정을 기능 상태와 분리한다. 기존 `visual-config.ts`, `tokens.css`, `theme.css`, `glass-navigation.css`, `InterfaceGlyph.tsx`를 검토해 재사용한다. 한글 SUIT와 영문/숫자 Oxanium의 로컬 글꼴/라이선스를 보존하고, 현재 선 아이콘을 유지한다. 과거 이미지 아이콘 제작은 재개하지 않는다.

실제 링크/버튼, 직접 주소, 뒤로/앞으로, 포커스 복원, Escape, 44px 이상 모바일 조작 영역을 제공한다. reduced-motion과 즉시 기능 열기를 지원하고 전환 중 반복 입력을 정리한다. 상하단 고정 UI를 제외한 작업 영역을 지도/콘솔 UI가 채운다. 기능 이름을 항상 알아볼 수 있게 하고 hover에 의존하지 않는다.

지연 로딩과 화면 밖 효과 중단을 적용한다. 고해상도 배경 교체와 영상을 이유로 실제 지도/적재의 렌더 루프가 중복되지 않게 한다. 배경 속 행성 그림을 정식 좌표로 사용하지 않는다. 기존 예시 지도는 실제 계약 경로를 연결할 때 대체한다.

## 파트너와 후속 튜토리얼

왼쪽은 기존 튜토리얼 파트너 고정, 오른쪽은 기존 오퍼레이터/항해사의 대화·응답·대화 중 변경이다. 인물 외형/의상 변경과 역할 로직을 분리한다.

[Bokoko33의 방 포트폴리오](https://room.bokoko33.me/), 제작자 https://bokoko33.me/ 는 공간 안의 사물을 선택하며 배우는 경험의 참고다. 이미지 기반 공간과 실제 기능 위에서 전담 파트너가 안내하고 예시 상태를 실제 운항과 분리한다. 건너뛰기/종료/재진입을 제공하며 핵심 업무 화면 이후 구현한다.

## 현재 소스와 실행

`apps/control-room/`에는 React 시안과 과거 미승인 3D 실험 코드가 남아 있다. 기존 모델·코드를 삭제하거나 새 방식으로 전환하는 구현은 이번 계획 정리에 포함하지 않았다. 해당 실험은 제품 방향에서 제외하며 새 기능/메뉴/초기 로딩으로 연결하지 않는다. 공개 앱의 실제 업무 데이터 연결과 교체는 아직 하지 않았다.

Node 22.12 이상:

```sh
npm ci --prefix apps/control-room
npm run dev:control-room
npm run check:control-room
npm run test:control-room
npm run build:control-room
npm test
```

별도 미리보기는 `http://127.0.0.1:5173`이다. `apps/`의 빌드는 기존 공개 묶음과 별개다. 배포 전 대표 이미지/콘솔 전환 → 공간 이동 → 기존 업무 연결 → 앱/오버레이 검증 순서를 따른다. 과거 3D 실험 검사 통과를 새 방식의 검증으로 보고하지 않는다.

### 2026-11-10 시제품 진입점 변경

`main.tsx` → `SpaceExperience.tsx`가 기본 라운지와 관제센터 전경을 담당한다. `space-navigation.ts`는 라운지/안내/정보/영상관과 기존 콘솔 hash 주소를 보존하고, `space-config.ts`는 이미지 좌표에 대응하는 SVG 윤곽과 접근 연출을 분리한다. `ControlRoom.tsx`는 기존 미션/지도/운항 디자인 화면에 사용한다. 취소된 `CameraStudy`는 새 경로에서 import하지 않는다. 기존 실제 사이트의 저장소와 DOM 초기화는 연결하지 않았다.

현재 브라우저 검사: `node scripts/check-space-experience-browser.mjs` (먼저 `npm run build:control-room`). 이전 `check-control-room-browser.mjs`는 폐기한 3D 동선을 요구하는 과거 검증이라 현재 진입점의 합격 기준으로 사용하지 않는다.
