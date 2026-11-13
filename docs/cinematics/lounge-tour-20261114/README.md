# 라운지 가이드 투어 · 배포 시험 준비

사용자 요청에 따라 새 가이드 자세5종을 사용하는 **데스크 → 시네마 → 아카이브 → 서비스센터 → 게이트** 투어를 실제 React 앱에 연결했다. 안내데스크의 **‘라운지 투어 · 가이드 따라가기’** 버튼으로 시작한다. 각 장소에서 실제 메뉴로 넘어가도 가이드 안내가 이어진다.

브랜치 `cinematic/lounge-tour-20261114` / [PR #34](https://github.com/limmin3-sudo/stam-freight-control/pull/34). #32 `b0d8bdb` 위의 후속이다. main/공통 인계 병합·배포는 기능 담당이 한다. [인계](HANDOFF.md).

## 실제 앱에서 확인

```sh
npm run build:control-room
npm --prefix apps/control-room run preview
# 안내데스크: http://127.0.0.1:5174/#/guide?lang=ko
```

고정 상단바·사이드바를 유지하며 본문에서만 움직인다. 실제 메뉴는 현재 앱의 라우터가 렌더링한다. iframe, 메뉴 정지 사진, 별도 저장소를 사용하지 않는다. Vite 빌드가 투어를 별도 lazy chunk와 해시 PNG로 묶으므로 일반 라운지 첫 방문에 투어 이미지를 전부 요청하지 않는다. 기존 배포 워크플로를 바꿀 필요가 없다.

기존 데스크 첫 운송/정보/복귀 버튼과 미션·운항 데이터는 보존했다. 각 장소에서 안내를 읽고 다음을 누른다. 일반 메뉴/뒤로가기/언어 변경으로 이탈하면 투어가 종료된다. 정지/계속/이동 건너뛰기/종료/Escape, 모바일·동작 줄이기·WebGL 미지원 대체를 지원한다.

## 최종 실제 앱 화면

- [이동](runtime-review/desktop-travel.png) · [일시정지](runtime-review/desktop-paused.png)
- [시네마](runtime-review/desktop-cinema.png) · [아카이브](runtime-review/desktop-archive.png) · [서비스센터](runtime-review/desktop-service.png) · [게이트](runtime-review/desktop-gate.png)
- [모바일](runtime-review/mobile-archive.png) · [모바일 메뉴](runtime-review/mobile-sidebar.png) · [English](runtime-review/desktop-en.png)
- [실제 앱 전체 재생 녹화](runtime-review/native-tour-preview.mp4)
- [검증 결과](runtime-review/checks.json) · [재현](runtime-review/verify-native-tour.mjs)

캡처는 이번 브랜치의 배포용 앱 빌드다. 기능 쪽의 아직 미통합인 공용 테마/새 이름/FLIGHT CONSOLE 작업을 이 브랜치가 포함했다고 설명하지 않는다. 해당 작업은 기존 인계에 따라 별도로 통합한다.

## 새 자산과 범위

| 파일 | 사용 |
|---|---|
| `assets/guide-escort.png` | 돌아보며 앞에서 인솔 |
| `assets/guide-cinema.png` | 장소 소개 / 시네마 |
| `assets/guide-archive.png` | 자료 설명 / 아카이브 |
| `assets/guide-service.png` | 손을 모은 응대 / 서비스센터 |
| `assets/guide-waiting.png` | 머리를 정리하며 기다리기 / 게이트 |

5개 모두 새로 생성·편집한887×1774 RGBA이며 크롭·반전으로 수를 늘리지 않았다. 사용자가 지적한 짧은 다리·과하게 긴 다리·다른 얼굴의 초기 후보는 적용하지 않았다. 설명 자세는 승인 전신을 베이스로 팔 자세를 다시 편집했고, 대기 자세는 승인 얼굴을 참조해 얼굴을 다시 편집했다. 원본과 픽셀 단위로 같은 얼굴이라고 주장하지 않는다. [전신 비교](review/guide-assets-desktop.png) · [얼굴 비교](review/guide-faces-desktop.png) · [출처·프롬프트·해시](source-record.json).

몸통·다리를 따로 늘리지 않고 원본 종횡비를 유지한다. 배경은 폐기 중앙 키오스크가 없는 현재 `lounge-original-composite.png`다. #33 사진 리깅 보행은 제외했다. 이번 연출은 정지 자세와 깊이 카메라/디졸브를 연결하는 제한된 사진 기반2.5D다. 자연 보행·립싱크·확정 음성은 없다.

게이트 이후 셔틀 영상은 자동 실행하지 않는다. 투어를 마치면 기존 라운지 조작을 사용할 수 있다. 실제 운행 타이머나 진행 저장/재개를 추가하지 않았다. 기존 운항 저장과 별개인 메모리상의 안내 상태만 사용한다.

## 검증 재현

```sh
# 배포 빌드를 정적 서버에서 /stam-freight-control/ 하위 경로로 서비스한 뒤:
STAM_NATIVE_URL=http://127.0.0.1:5198/stam-freight-control/ \
STAM_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs \
STAM_CHROMIUM=/usr/bin/chromium \
node docs/cinematics/lounge-tour-20261114/runtime-review/verify-native-tour.mjs
```

Playwright 녹화용 FFmpeg가 별도 경로라면 `PLAYWRIGHT_BROWSERS_PATH`를 지정한다. 검증한 항목과 결과는 실제 앱 checks.json을 기준으로 한다. 실제 앱 브라우저 검증10항목(실패 응답·페이지 오류 없음), 기존 앱 테스트14파일과 타입 검사/Vite 빌드를 확인했다. 루트 테스트43파일 중41개는 기본 환경에서 통과했고, 로컬 포트 제한으로 실패한2파일은 허용된 실행 환경에서11개 세부 검사를 재실행해 전부 통과했다.

## 이전 독립 시안과 현재 화면 기록

`index.html`/`tour.js`/`assets.html`/`server.mjs`와 `review/`는 이전 독립 검토본을 보존한 자료다. 실제 제품은 `apps/control-room/src/LoungeTour.tsx`를 사용한다. 독립 시안은 iframe으로 이전 로컬 빌드의 메뉴를 표시하므로 현재 제품 검증 결과와 구분한다.

```sh
node docs/cinematics/lounge-tour-20261114/server.mjs
# http://127.0.0.1:5197/ — 이전 독립 시안 / 자산 비교용
```

실제 공개 사이트와 미통합 작업본을 따로 캡처한 기록: [공개 데스크톱](review/deployed-desktop.png) · [공개 모바일](review/deployed-mobile-sidebar.png) · [미통합 작업본](review/working-desktop.png) · [출처](review/current-ui-source.json). 그 시점 공개 사이트에는 이전 장소 이름이 표시됐다. 이 기록을 이번 작업의 공개 배포 완료 증거로 사용하지 않는다.
