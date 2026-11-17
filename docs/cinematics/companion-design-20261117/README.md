# 로그 연결 앱 디자인 시안 — 2026-11-17

브랜치: `cinematic/companion-design-20261117`.
기준: 최신 원격 기능 인계 `handoff/local-studio-20261110`, `2c637afa21c9de904b3ad58b289215f3508670ec` 확인.

**브라우저에서 동작하는 디자인 검토본이다. Windows 앱 실행 화면이나 실제 로그 수신 검증이 아니다.** 실제 `desktop/Launcher.cs`, watcher, 계정, 설치/업데이트/배포 파일은 수정하지 않았다. 사용자는 먼저 현재 앱 구조에 맞춘 시안을 보고 선택하는 흐름을 요청했다.

## 보기

루트 정적 서버에서 `docs/cinematics/companion-design-20261117/index.html`을 연다. 현재 검증 URL은 `http://127.0.0.1:5201/stam-freight-control/docs/cinematics/companion-design-20261117/index.html`이다.

- 기존 앱 ClientSize 920×710을 기준으로 제작. 최소 너비 820px도 확인했다. 390px은 휴대전화에서 시안을 검토하기 위한 반응형 표시이며 모바일 네이티브 앱이 아니다.
- 화면 밖 상태 선택으로 대기/수신/게임 실행 대기/오류/중지 예시를 확인할 수 있다. 한국어/English는 실제 문구 길이 비교용이다.
- 자동 찾기/파일 선택/연결 중지는 예시 상태만 바꾼다. 파일·로그·로컬 연결 API·계정·저장소에 접근하지 않는다. 예시 18.4 MB와 14:32:08은 실제 측정값이 아니다.
- 미션콘솔 열기만 기존 공개 웹의 해당 언어 미션 주소로 이동한다. 계정 로그인은 기존 웹에 있으므로 앱 시안에 로그인 상태를 새로 만들지 않았다. 로그 수신 중을 게임 접속 중이나 웹 연결 완료로 표시하지 않는다.

[연결 대기](review/ko-idle.png) · [수신 중 예시](review/ko-watching.png) · [게임 실행 대기](review/ko-waiting-file.png) · [오류](review/ko-error.png) · [영어](review/en-watching.png) · [820px](review/minimum-width-en.png) · [전체 검토 화면](review/full-preview.png).

## 디자인

- 외곽: 승인 D 검은 유리/금색 PNG. 실제 자산을 9분할로 표시한다.
- 연결 상태: 승인 A 금속 매립 계기판 PNG. 상태/읽은 용량/최근 확인 시각이 먼저 보인다.
- 로그 경로: D 유리 패널, 전체 경로는 툴팁으로 확인.
- 언어/기능 버튼: 기존 청록 사선 `hologram-button.png`. 주 동작과 선택 언어는 금빛 강조.
- 서체: 이미 앱에 포함된 Barlow Medium / SUIT Medium 원본을 로드한다. 폰트나 로고 재생성 없음.
- 장식 자산에는 글자·상태를 굽지 않았다. 화면의 모든 문구와 상태는 HTML로 분리되어 있다.

`assets/`의 세 PNG는 웹 연출 PR #35 최종 커밋 `3d628877e7c2b0b08e8db484d74b81a958f22e15`에서 그대로 가져왔다. 이 시안 브랜치는 기능 인계에서 분기했으므로 PR #35의 웹 코드·함선 이미지·로비 변경을 포함하지 않는다. 시안 폴더의 재사용 PNG만 독립적으로 포함한다. 별도의 바 재생성/선·도형 프레임으로 대체하지 않았다. CSS 선은 정보 구분선과 상태 표시등에만 사용한다.

## 실제 앱 적용 시 연결 지점

| 기존 위치 | 적용 범위 / 보존할 것 |
|---|---|
| `BridgeWindow` 생성자 | 920×710 / 최소 820×700 / DPI 배율 유지. 현재 컨트롤을 재배치하고 배경 자산만 적용. |
| `HoloFonts` / `HoloLabel` | 기존 private font 로딩과 실제 한국어/영어 렌더링 유지. |
| `DeckButton.OnPaint` | 승인 버튼 PNG를 그리고 hover/선택/disabled/focus 상태를 유지. 기존 Click 연결은 변경하지 않는다. |
| `LinkCard.OnPaintBackground/OnPaint` | 연결 카드 A / 경로 카드 D 구분. 이미지의 모서리가 찌그러지지 않도록 9분할 렌더링. |
| `RenderStatus` | phase→문구 매핑, bytesRead, lastReadAt, selected 파일 경로 그대로 사용. 디자인 시안의 예시 수치를 옮기지 않는다. |
| `SelectLog`, `Start`, `Open`, `StopChild` | 동작 보존. 자동 탐색/재시도/토큰/읽기 전용 규칙 수정 없음. |
| 트레이 / `FormClosing` / 설정 | 숨김·복원·명시 종료·재실행·경로/언어 보존 유지. |
| `scripts/build-desktop.mjs` | 실제 앱 적용 때 필요한 PNG만 패키지 목록에 추가. 웹 전체 또는 이 시안 HTML은 설치본에 넣지 않는다. |

실제 적용 후에는 C# 컴파일, 네이티브 언어/창 수명주기 검증, Windows 100/125/150/200% 배율 캡처와 설치본 에셋 포함을 확인해야 한다. 이 시안에서는 실행하지 않았다. 현재 환경에는 Mono/C# 컴파일러가 없으며 브라우저 결과를 Windows 네이티브 결과로 보고하지 않는다.

## 변경 / 검증 / 인계

변경 파일은 이 시안 폴더(HTML/CSS/JS/승인 PNG/캡처/검증 스크립트)와 PROJECT_STATUS.md뿐이다. 본체 기능 변경·main/공통 인계 병합·Windows 패키징·배포 없음.

`verify-preview.mjs`로 실제 Chromium 렌더링 확인: 920×710, 한국어/영어×5상태, 상태/기능 글자 잘림 없음, 예시 중지/재연결, 820px/390px, 로컬 에셋·폰트 로딩. 브라우저 오류/누락 요청 0건. [검증 결과](review/checks.json).

실제 앱 적용 여부가 정해지면 별도 변경으로 Launcher.cs와 패키징만 수정하고 기능 담당의 최신 작업을 보존해 인계한다. 이 시안 PR을 합치는 것만으로 공개 앱 디자인이 바뀌지 않는다.
