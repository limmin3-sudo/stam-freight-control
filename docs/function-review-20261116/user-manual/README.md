# 이용안내 개편 1차 — 2026-11-16 / 미배포

사용자 승인: 파트너 인물·대화 연출 없이 정보 중심 이용안내. 중복·무관한 스크린샷 금지. 기존 상단바·사이드바 보존. 현재 브랜치 `integration/freight-division-20261113`, 기준 HEAD `8c9b06a` 위 미커밋 작업이다.

## 구현

- 서비스센터 → 이용안내 및 아카이브 → 운송 이용안내를 동일한 사이트 내부 안내에 연결했다.
- 첫 화면은 첫 운송 / 미션 가져오기 / 운항 중 조작 / 저장하고 이어하기 / 문제 해결 5개 주제다.
- 첫 운송은 준비 → 가져오기 → 선택 → 계산 → 첫 픽업 확인 5단계. 각 단계에 해당하는 실제 DOM 요소를 별도로 캡처했다. 스크린샷 확대, 단계 바로가기, 상·하단 이전/다음 안내, URL 새로고침/뒤로가기를 제공한다.
- 나머지 4개 주제는 현재 구현 기준의 짧은 텍스트 안내다. 옛 이용안내 55개 슬라이드 전체 재작성 완료를 뜻하지 않는다. 기존 guide.html은 구형 진입 호환을 위해 유지한다.
- 인물/대화/영상 없음. 역할에 따른 기능 차이는 설명한다. 미래 운송 팁 센터와 연출 담당의 가이드/투어는 이번 범위가 아니다.
- 기존 Barlow Medium/SUIT·균일한 투사 프레임·금색 강조 유지. 안내 컴포넌트는 지연 로딩, 단계 이미지는 lazy loading한다.

## 실제 캡처 근거

`capture-provenance.json`에 locale·단계·선택자·URL·당시 텍스트를 저장했다. 한국어/영어/한영 각 5장, 총 15개 원본. 격리된 브라우저에서 예시 계약 두 개를 선택해 실제 계산/운항 버튼을 눌렀다. 사용자 로그·계정·운항 자료는 사용하지 않았다. 캡처는 요소 영역만 자른 실제 화면이며 합성 이미지나 DOM 조작으로 만든 시안이 아니다.

한영/한국어 import 단계는 실제 표시 내용이 같아 파일 바이트가 같다. 빌드 도구가 같은 자산을 합치므로 언어 확인은 파일 이름만이 아닌 원본 SHA256으로 수행한다. 한 안내 안에서 5단계 스크린샷은 모두 다르다.

## 검증

- `npm test`: 271개 통과.
- `npm run test:control-room`: 88개 통과.
- `npm --prefix apps/control-room run build`: 타입 검사 및 생산 빌드 통과.
- 실제 생산 빌드 Chromium 확인: [browser-report.json](browser-report.json). 진입 두 곳, 고정 상단바/사이드바, 5단계 이미지, 단계 이동/포커스, 새로고침/뒤로가기, 3개 언어, 390px 모바일 가로 넘침, 계약 저장 값 보존. 페이지 오류/로컬 자산 누락 0건.
- 이번 변경은 안내 화면 검증이다. 실제 게임 로그, OCR 정확도, 계정 서버 저장을 다시 검증한 것이 아니다. 기존 완료 기록은 별도 보존한다.

## 재현

생산 빌드 미리보기를 실행한 뒤 아래 명령을 사용한다. 기본 URL은 `http://127.0.0.1:5174/`이며 하위 경로도 포함할 수 있다.

```sh
npm --prefix apps/control-room run build
npm --prefix apps/control-room run preview
STAM_MANUAL_URL=http://127.0.0.1:5174/ node scripts/check-user-manual-browser.mjs
```

캡처를 갱신할 때는 `scripts/capture-user-manual.mjs`를 사용한다. 기본 저장 위치는 소스 자산 폴더이므로 의도적으로 갱신할 때만 실행한다. Vite 개발 서버 HMR이 캡처를 중단하지 않도록 생산 빌드 미리보기를 사용한다. `STAM_PLAYWRIGHT_MODULE`, `STAM_CHROMIUM`, `STAM_QA_OUTPUT`, `STAM_MANUAL_ASSETS`, `STAM_CAPTURE_REPORT`로 환경/출력 경로를 지정할 수 있다.

## 검토 화면

- [첫 화면](home-desktop.png)
- [첫 운송 안내](first-flight-desktop.png)
- [계약 선택 단계](contract-step.png)
- [모바일 첫 화면](home-mobile.png)
- [모바일 첫 운송](first-flight-mobile.png)

커밋·푸시·배포하지 않았다. 다음은 사용자 디자인 검토 후 필요한 내용만 수정하는 단계다. 기존 OpeningFilm 포커스 수정 및 배포 완료 문서의 미커밋 변경을 보존했다.
