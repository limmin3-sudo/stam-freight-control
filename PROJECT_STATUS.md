# 현재 프로젝트 상태

마지막 갱신: 2026-10-30 (KST) · 마지막 작업 AI: Claude Code (Cloud) · 브랜치 `main`

## 현재 인계 상태

- 마지막 작업 AI: Claude Code (Cloud). Codex `86e439e` 이후 이어서 작업했다. Codex는 사용 한도로 현재 작업하지 않는다.
- **저장소·Pages 경로 변경 완료:** `verse-hauler` → `stam-freight-control`. 이름 변경은 사용자가 GitHub Settings에서 수행했다(이 Cloud 프록시는 저장소 설정 변경을 403으로 차단).
- 저장소: https://github.com/limmin3-sudo/stam-freight-control
- 사이트: https://limmin3-sudo.github.io/stam-freight-control/
- 기존 Pages 주소 `…/verse-hauler/`는 404다. GitHub는 Pages 경로를 리디렉션하지 않는다. 저장소 Git 주소는 GitHub가 리디렉션하지만 각 PC에서 origin을 갱신한다.
- 각 PC의 브랜치·미커밋 상태·원격 최신성을 시작 시 다시 확인한다.

## 저장소 이름 변경 작업 결과 (`013c63f`)

- README, docs/DEVELOPMENT.md, docs/CLOUD-HANDOFF.md, docs/CLOUD-START-PROMPT.md, location-manager.mjs(Actions 링크)의 주소를 새 이름으로 변경.
- `.github/workflows/pages.yml`: 비교 URL을 새 Pages 경로로 변경, `--fallback-file .github/pages-baseline/locations.json` 추가.
- `scripts/refresh-data.mjs`: `--fallback-file` 옵션. 이전 배포가 **404일 때만** 기준 스냅샷과 비교하고 그 밖의 오류는 기존처럼 실패한다.
- `.github/pages-baseline/locations.json`: 이름 변경 직전 기존 사이트 스냅샷(4.10.2-LIVE.12881860, 좌표 731·점프 2). 공개 파일 묶음에는 포함되지 않는다.
- 실제 첫 배포에서는 GitHub가 기존 Pages 배포를 새 경로로 옮겨 두어 새 URL 비교가 바로 성공했고 기준 스냅샷은 사용되지 않았다. 이제 404 대비용으로만 남아 있으며 삭제 여부는 사용자 판단(별도 승인).
- package.json 이름, wrangler worker 이름, IndexedDB 이름, localStorage 키는 기존 개인 데이터 보존을 위해 유지했다.
- 검증: Node 22.22.0 `npm test` 32개 통과, `git diff --check` 통과, 404/200/기준 파일 없음 세 경우 수동 확인. Actions `41021935133` 성공(추가·변경·삭제 0, 테스트 32 통과). 새 사이트의 index·스크립트·좌표·Three.js·파트너 사진 200, 브라우저에서 사진 3장 표시·페이지 오류 없음.
- 브라우저 콘솔의 `data/ko-names.json` 404는 기존부터 있던 선택 파일 부재다(한글 패치 추출 백로그, 코드가 없으면 무시).

## 2026-10-30 Claude Code — UI 문구·OCR 해석 (이번 작업)

- `index.html`: 미션 접수 문구 교체(사용자 선택 B안) → "출항 준비를 시작합니다. / 미션만 알려 주시면 됩니다." + "미션 화면을 올리시면 방문 순서와 화물 적재 위치를 계산합니다." 모바일에서 `<br>` 숨김 시 마침표 뒤 공백 누락도 수정.
- `style.css`: `.mission-pane` 제목·설명에 `word-break:keep-all`(“맞추/겠습니다”식 단어 중간 줄바꿈 방지). 이 파일은 줄바꿈이 섞여 있으므로 편집 시 기존 줄바꿈을 보존할 것.
- `ocr.mjs`·`aliases.mjs`: 한국어 미션 화면 해석 보완. `KO_TERMS`(채광 시설→Mining Facility, 함선 폐기장→Breaker Yard, 슈빈, 아크코프, 노가드, 브리오/브레오, 선셋 메사)로 번역어를 영어 지명과 비교. "행성의 장소"는 장소 우선, 실패 시 유사 발음 매칭, 끝으로 고유한 영문·숫자 꼬리(“Mining Area 056”)로 식별. 보상 `보상 ¤ 476,500`, 한국어 제목(“…운송 - … [100 평판]”) 인식. 적용 범위는 OCR 해석뿐이며 지도 검색 매칭은 바꾸지 않았다.
- `tests/ocr.test.mjs` 신규: 사용자 제공 링 가문 미션 화면(옮겨 적은 텍스트) 회귀 테스트. `npm test` 33개 통과.
- 브라우저 확인: 로컬 서버에서 1440px·390px 문구 캡처, 페이지 오류 없음.
- **브라우저 OCR 실험(사용자 스크린샷 5장, 대화 업로드로 2000×563 축소본):** 현재 코드 그대로는 0~24자만 인식(사실상 실패). 한국어·영어 언어 데이터 로드와 단순 문장 인식은 정상(“SCU”를 “504”로 읽는 사례 있음). 원인은 고르지 않은 반투명 배경 때문에 전역 이진화가 실패하는 것. 가운데 자르기 + 확대 + 채널 최대값 반전 + 지역 평균 이진화를 실험하자 약 2,700자로 늘었으나 축소본이라 대부분 깨진 글자였다. 전처리는 아직 앱에 넣지 않았다(실험 스크립트만, 저장소 밖).
- 원본 해상도 검증 필요: 게임 전체 화면에서 Win+Shift+S가 막힘(테두리 없는 창 모드도 동일). PrtSc → `StarCitizen\LIVE\ScreenShots`에서 열어 미션 창만 잘라 2000px 미만으로 업로드하는 방법을 안내했다.
- 사용자가 선택적 AI 해석 서버(`server/worker.mjs`, OpenAI) 도입을 검토 중. 필요: OpenAI API 키·결제, Cloudflare 계정, worker 배포와 비밀값 등록, 사이트 설정에 서버 주소·APP_TOKEN 입력. 실제 API 호출·모델명(`gpt-6.1-sol`) 사용 가능 여부·요금은 미확인. 키를 채팅·저장소에 넣지 않는다.
- **미검증:** 실제 스크린샷 이미지의 OCR 글자 인식 정확도. 사용자 화면은 32:9 초광폭·반투명 패널·작은 밝은 글씨라 Tesseract 전처리(관심 영역 자르기·확대·반전) 개선이 필요할 수 있다. 원본 이미지 파일로 검증해야 한다.

## 2026-10-30 Claude Code — 구독 AI 앱 글자 붙여넣기 입력

- 사용자 결정: API 요금 대신 ChatGPT·Claude 구독 앱으로 스샷 글자를 옮겨 적고 사이트에 붙여 넣는 방식부터 사용.
- `index.html`·`style.css`: 업로드 영역 아래 접이식 "AI 앱으로 읽은 글자 붙여넣기"(요청 문장 복사 버튼, 입력 칸, "글자로 미션 만들기").
- `app.mjs`: `AI_PROMPT`(화면 표기 그대로·대괄호 영문 유지·주 목표 한 줄씩·미션 사이 `---`), `importText()`가 `---`로 나눠 미션별 `parseMissionText` → 기존 OCR과 같은 미션 구조·`workbench.apply`로 추가. 배송 문장 없는 묶음은 건너뛰고 알림. 클립보드가 막히면 문장을 입력 칸에 넣어 직접 복사하게 한다.
- `ocr.mjs`·`aliases.mjs` 추가 보완: `[English]` 괄호 이름 우선, "…에 있는 X", 두 줄로 나뉜 접수 문장, `[200-4,000 평판]`·다음 줄 평판 제목·Cargo Haul/Run 제목, OCR "504"→SCU, 파이로 5a/5b(Ignis/Vatra), 섈로우 필즈·스테이션·시어스 캐니언·에쉬랜드·오비츄어리·티사 스페이스포트.
- 검증: `npm test` 35개 통과(OCR 해석 3개 포함). 로컬 브라우저에서 미션 2개 붙여넣기 → 제목·보상·픽업/배송 정상 입력, 페이지 오류 없음(ko-names 404는 기존).
- 미검증: 실제 ChatGPT/Claude 앱의 옮겨 적기 결과 형식. 사용자 테스트 후 형식 차이를 보완한다.

## 사용자 요청 대기 — 지도 개선 (다음 작업)

1. 라그랑주 정거장·스테이션이 작은 점으로만 보여 볼품없음 → 더 세련된 마커.
2. 지도 영역 자체를 크게 보는 기능(확장/전체 화면). 확대해도 답답한 경우가 있음.
3. 파이로(빨강)·스탠턴·닉스(파랑) 배경이 "이상하게 깨져" 보임 → 그라데이션 띠(밴딩)·노이즈 확인 필요. 배경색 방향 자체(파이로 붉은색, 스탠턴 청록, 닉스 남보라)는 기존 확정 규칙이므로 유지.

## 보류된 파트너 사진 작업 (Codex에서 진행 예정)

- 사용자 지적: 선택 화면에서 장교가 멀리, 항해사·비서는 가깝게 보인다(눈~턱 길이 약 57/100/70px). Claude가 장교 1.38배·비서 1.08배 확대 시안을 만들었으나 적용하지 않았다. 사용자는 세 장을 같은 구도로 새로 만드는 방식도 고려 중.
- `aide` 표시 이름 변경 원함("전담 비서"가 별로). 후보: 함장 부관(추천)·통신 담당관·브리지 오퍼레이터·운항 보좌관. 미정. 저장 ID `aide`는 유지.
- 비서 사진 교체 원함: 사무실 정장 대신 함선 승무원 제복, 더 깊은 브이넥, 볼륨감 있는 성인 체형, 다른 두 명과 같은 구도. Claude Cloud 환경은 이미지 생성 불가 → Codex 한도 회복 후 진행.

## 원클릭 업데이트 (`update.cmd`)

- 사용자 요청으로 추가. Git 확인 → origin이 `verse-hauler`면 새 주소로 변경 → `git fetch` → 미커밋 파일이 있으면 목록만 보여 주고 중단 → `git pull --ff-only`(분기 시 중단) → 최근 커밋 3개 표시.
- 강제 동기화·초기화·삭제를 하지 않는다. 한국어 출력을 위해 `chcp 65001`과 UTF-8·CRLF로 저장했다.
- **Windows 실제 실행은 미검증**(이 Cloud는 Linux). 글자가 깨지거나 오류가 나면 다음 AI가 출력 문구를 영어로 바꾸는 등 보완한다.

## 완료된 제품 기능

- 스크린샷 OCR·수정, 미션·배송·상자별 독립 소유권과 구성 재사용.
- Stanton·Pyro·Nyx 지도, 게이트웨이 경유, 간편 경로와 상세 적재.
- 51종 함선·개인 그리드·비행 성능·드라이브 설정.
- 파트너 3명, 운항 진행·되돌리기·재계산, 개인 장소와 별칭 관리.
- 상세 제약과 저장 키는 [CLOUD-HANDOFF.md](docs/CLOUD-HANDOFF.md) 참조.

## 이번에 완료한 개발 환경 작업

- `docs/DEVELOPMENT.md` 신규: 공통 제품 규칙·구조·실행·검증·작업 인계·Git 승인 절차.
- `AGENTS.md` 정리 및 `CLAUDE.md` 신규: 동일 공통 지침과 상태 문서 연결.
- `README.md` 보완: Windows 준비, PC·AI 전환 및 GitHub 동기화 범위.
- `docs/CLOUD-HANDOFF.md`, `docs/CLOUD-START-PROMPT.md`: 새 문서 연결, 현재 요청 우선 및 커밋·푸시 승인 규칙 정합성 보완.
- `start.cmd`: 개인 PC 전용 Node 경로 제거, PATH의 Node 22 확인, 준비 실패 시 서버 실행 중단, 서버 종료 코드 보존.
- 앱 기능 코드·의존성·배포 설정은 변경하지 않았다. 새 프로젝트나 worktree를 만들지 않았다. 환경 설정 변경이나 환경 게시도 수행하지 않았다.

## 검증 결과와 범위

- Node.js 22.23.4, `NODE_USE_ENV_PROXY=1` 환경에서 `node scripts/prepare.mjs` 성공. 이전 좌표 API 네트워크 차단은 해소됐다.
- 좌표 버전 `4.10.2-LIVE.12881860`, 731개 좌표·2개 점프 연결을 생성했다. 생성 파일은 기존 Git 무시 대상이다.
- 공동 개발 구성 완료 시 `npm test`: 32개 통과, 실패·건너뜀 0개.
- 공동 개발 구성과 이번 최종 인계 문서는 `git diff --check` 및 문서 내부 상대 링크 확인 완료. 이번 최종 인계는 문서 변경만 있으므로 앱 테스트를 반복하지 않았다.
- Windows CMD 실제 실행, 두 Windows PC의 도구·GitHub 인증, Claude Code의 지침 인식은 미검증이다. 이 Cloud는 Linux 환경이다.
- 브라우저 화면·실제 OCR·실제 AI 호출은 이번 세션에서 재검증하지 않았다. GitHub Actions API와 배포 사이트 요청도 프록시 403으로 차단되어 최근 배포 성공은 확인하지 못했다.

## 미해결 문제와 백로그

- Google 로그인·계정별 저장·PC 간 앱 데이터 자동 동기화는 미구현. Firebase 프로젝트·연결은 확인되지 않았다.
- 앱 개인 데이터는 브라우저 localStorage에 있으며 GitHub와 AI 대화 인계 문서로 동기화되지 않는다.
- 실제 OCR 정확도, AI 해석 시 독립 미션 보존, 상자 템플릿 변형 사례 등 추가 검증이 필요하다.
- 연료·대기권·중량·게임 실시간 상태는 완전 시뮬레이션 대상이 아니다.

## 다음 작업 우선순위

1. 각 Windows PC에서 `update.cmd` 더블클릭(origin 갱신 + 미커밋 없을 때만 `git pull --ff-only`). 처음 한 번은 이 파일이 아직 없으므로 그 PC의 AI에게 "최신으로 받아줘"라고 요청하거나 `git pull`을 실행한다. GitHub가 예전 Git 주소를 리디렉션하므로 기존 origin으로도 받아진다.
2. 두 Windows PC의 Git·Node 22·인증, start.cmd 실행, Codex·Claude Code의 지침 인식을 각 PC에서 확인한다.
3. `.github/pages-baseline/` 유지·삭제 결정.
4. 이후 제품 개발은 사용자의 다음 요청에 따른다. 로그인·동기화는 백로그이며 자동 착수하지 않는다. 커밋·푸시는 사용자 승인 범위에서 진행한다.

## 다음 AI가 처음 확인할 명령

저장소 루트에서 `git status --short --branch`, `git log -5 --oneline`, `git diff --stat`을 확인하고 [공통 지침](docs/DEVELOPMENT.md)을 읽는다. 기존 변경과 인계 문서를 보존한다. 실행 확인이 필요하면 Node 22에서 `node scripts/prepare.mjs`, `npm test`, `npm start`를 사용한다.
