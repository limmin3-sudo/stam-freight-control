# 가이드 투어 자산 · 파트너 근접 대화 인계

작업자: 연출 Codex / 2026-11-17. 브랜치 `cinematic/guide-close-dialogue-20261117`. 최종 SHA는 이 브랜치/PR의 HEAD를 사용한다. **main·공통 인계 브랜치 병합 및 배포 없음.** 기능 담당이 기존 작업을 보존하며 통합한다.

## 적용 순서

- 원격 기능 기준을 작업 시작/마감 시 확인: `handoff/local-studio-20261110` = `2c637afa21c9de904b3ad58b289215f3508670ec`.
- **PR #35** `cinematic/trade-academy-lobbies-20261117` / `3d628877e7c2b0b08e8db484d74b81a958f22e15` 위에서 분기했다. #35의 승인 바·버튼·플라이트 콘솔·시설 연결을 보존했다. **#35 → 이번 PR** 순서로 적용한다. 이번 PR의 base는 #35 브랜치다.
- #36 네이티브 앱 디자인은 보류 상태이며 이 브랜치에 포함하지 않았다. 앱 확장 후 재설계한다.
- 과거 #32/#34 투어 연결은 현재 기능 기준에 이미 포함돼 있다. 이를 되돌리거나 이전 파일 전체로 교체하지 않는다. 새 전체 시설 투어·기능 튜토리얼을 만들지 않았다.

## 제작/연결 구분

| 대상 | 새 자산 | 연결 상태 |
|---|---|---|
| 오퍼레이터 | 정면 근접 PNG | 관제센터 실제 인물 클릭 → 약 780ms 접근 → 기존 인사말 / 종료 → 420ms 복귀 |
| 항해사 | 정면 근접 PNG | 동일. 원래 위치에서 접근, 동일 눈높이/화면 크기 배치 |
| 가이드 | 근접 PNG | 준비만 완료. 기존 데스크 영상·통합 홀로그램·가이드 연결 유지 |
| 수석 무역관 / 링 가문 중개인 | 각각 근접 PNG | 준비만 완료. 기존 담당 범위별 무역 계획실 연결 유지 |
| 지도 교수 | 근접 PNG | 준비만 완료. 기존 교수 안내·방 선택 유지 |
| 가이드 투어 | 앞서서 뒤돌아보는 자세 / 시네마 소개 자세 | 기존 Three 투어의 escort/cinema import 교체. 화면 도착 후 소개 자산에도 같은 이미지 사용 |

총 새 PNG 8종. 원본 전신/이전 포즈/생성 원본은 보존했다. `source-record.json`에 참조·프롬프트·원본 파일명·해시·규격·알파를 기록했다. **생성된 새 외형은 검토 대상이며 원본과 픽셀 단위로 같은 얼굴이라고 주장하지 않는다.** 가이드 자세는 정지 자산과 깊이 카메라 연출이며 자연 보행/립싱크/영상 프레임이 아니다.

## 코드 변경과 공유 파일

- `apps/control-room/src/PartnerConversation.tsx`: 기존 인사말 데이터/방문 순서 유지. 실제 고해상도 인물 PNG와 기존 관제센터 clean plate, 승인 유리 패널을 조합. 전경 영역 안의 non-modal dialog; 아래 전경은 inert, 상단바/사이드바는 조작 가능. 인물 이미지 로드 실패 시에도 인사말/닫기 가능.
- `apps/control-room/src/partner-conversation.css`: 기존 hitbox/이름 규칙 유지. 새 대면 화면·접근/복귀·모바일·reduced-motion 전용 스타일 추가. `hologram-glass.css`의 실제 frame/face PNG를 재사용하며 가짜 선 프레임을 새로 그리지 않았다.
- **`SpaceExperience.tsx` 공유 파일은 4곳만 변경**: conversation에 클릭한 HTMLElement 보관, 전경 inert 조건에 대화 추가, 클릭 시 origin 전달, 컴포넌트에 origin/motion 전달. hashchange/사이드바/계정/저장/선택/상단바 연결은 기존 함수 그대로. 통합 시 전체 파일로 덮어쓰지 않는다.
- `lounge-tour-renderer.ts`: 자산 import 2개만 교체. 카메라/경로/화면 준비/투어 단계/정리 로직은 그대로.
- `apps/control-room/src/assets/partner-close/`: operator/navigator/director PNG. director는 향후 대면 화면용으로 준비돼 있지만 현재 데스크 경로에서 사용하지 않음.
- 이 폴더: 나머지 5종 PNG, 원본 대조 `index.html`, 재현 `verify-browser.mjs`, 실제 캡처/영상/검증 JSON.
- `PROJECT_STATUS.md`: 이번 상태만 위에 추가.

## 검증

- TypeScript 검사 및 Vite 생산 빌드 통과. 기존 500KB chunk 크기 경고는 남아 있음.
- 앱 테스트 34개 파일 통과 (`npm run test --prefix apps/control-room`).
- 생산 빌드 Chromium: 오퍼레이터/항해사 양쪽 접근 중 실제 scale 변화, 기존 인사말 순환, 닫기/Escape 후 포커스, 복귀 애니메이션, 사이드바/브라우저 뒤로/언어 변경 중단, 모바일 메뉴, 390/768px 가독성·얼굴 잘림·수평 넘침, 동작 줄이기, 운항 저장값 유지 확인.
- 새 가이드 이미지로 실제 투어 시작 및 시네마→아카이브→서비스센터→게이트, 기존 메뉴 마운트, 종료/캔버스 정리 확인.
- 8종 자산 원본 비교 및 밝은 배경 알파 확인. 브라우저 pageerror/로컬 실패 응답 0. `review/checks.json`.
- 실계정·실게임·iOS 실기기 검증은 아니다. 외부 계정 SDK는 로컬 화면 검증에서 차단했다.

## 실제 화면/영상

- [오퍼레이터 대면](review/desktop-operator.png) / [항해사 대면](review/desktop-navigator.png) / [영어](review/desktop-en.png)
- [390px](review/mobile-390.png) / [768px](review/mobile-768.png) / [동작 줄이기](review/mobile-reduced-motion.png)
- [앞서 안내](review/tour-lead.png) / [시네마 도착](review/tour-cinema-arrival.png)
- [실제 클릭·접근·복귀 녹화](review/partner-approach-return.mp4)
- [원본 대조 페이지](index.html) / [교수 대조](review/asset-comparison-5.png) / [가이드 대조](review/asset-comparison-6.png)

## 남은 연결

- 가이드/무역관/중개인/교수의 근접 자산은 준비됐으나 현재 담당 범위별 기능 흐름에 대면 단계를 추가하지 않았다. 후속에서는 기존 계획실 인수 `room/scope/person.id`와 교수의 세 방 선택을 보존한 채 대면 패널의 선택지로 연결하면 된다. 별도 대화/파트너 변경 기능이 자동 완성된 것은 아니다.
- 관제센터는 기존 로컬 인사말만 제공한다. 자유 입력/AI 대화/새 주제 선택/새 음성은 구현하지 않았다.
- 정지 자세에서 자연스러운 보행/연속 표정·립싱크는 별도 제작 범위다.
- 새 얼굴·포즈의 최종 외형 승인은 사용자 검토 후 결정한다. 기존 원본을 교체하지 않았으므로 개별 신규 자산 수정/교체 가능.

## 로컬 재현

`node apps/control-room/node_modules/vite/bin/vite.js build apps/control-room --outDir /tmp/stam-facility-build --emptyOutDir` 후 생산 빌드를 `/stam-freight-control/`에서 제공한다. 자산 대조 HTML은 저장소 docs/assets 경로도 제공하는 로컬 검토 서버용이며 앱 제품 화면에 iframe으로 넣지 않는다.

`STAM_REVIEW_URL=http://127.0.0.1:5201/stam-freight-control/ node docs/cinematics/guide-close-dialogue-20261117/verify-browser.mjs` (Playwright 모듈/Chromium 경로는 로컬 환경에 맞춘다.)
