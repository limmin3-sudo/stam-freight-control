# 아카이브 내부 출처 대조 — 2026-11-13

현재 브랜치 `integration/freight-division-20261113`, 기반 보존 커밋 `b1abe51` 위의 미커밋 작업. main/원격 푸시·배포 없음.

## 사용

아카이브 → 미션 자료 → 카드의 **출처·서로 다른 값 대조**를 펼친다. 두 출처 일치/SCMDB 기준/위키 누락 보완/위키 단독/충돌 미확정/자료 없음으로 구분한다. **서로 다른 값만 보기**로 차이만 남길 수 있다. 긴 원문·화물 규격은 한 번 더 펼친다. 여러 정의가 묶인 카드는 정의를 선택해 각각 대조한다.

## 보존 조건

- 기존 contractInfo의 정확한 정의 UUID 조회와 이미 검증된 sourcePolicy를 사용한다. 새로 자료를 합치거나 SCMDB 기준값을 위키로 덮지 않는다. 같은 유형 카드라도 각 정의의 출처/차이는 따로 읽는다.
- 모든 필드 값과 모든 차이 변형을 보존한다. SCMDB 내부 충돌은 미확정으로 남긴다. 0 보상/false는 유효한 값이며 null/없는 값으로 바꾸지 않는다.
- 화물 상한만 알려진 경우 ‘최대’로 표시한다. 0/0·미확인 하한·음수 상자 규격을 실제 수량/상자 크기로 확정하지 않는다. 고정량의 max=0 센티널은 기존 규칙대로 표시한다.
- 보상은 목록 기본 보상, 시간은 목록 기준 시간으로 표시한다. 실계약 값/경로 ETA와 구분한다. 이 화면은 읽기 전용이며 계약 추가·수량·보상·경로·운항 상태를 변경하지 않는다.
- 출처 버전/확인일과 검증된 원문 URL을 표시한다. 미션 내용은 React 텍스트로 렌더링하며 HTML을 삽입하지 않는다. 알 수 없는 URL은 링크로 만들지 않는다.
- 상세를 열 때만 필드를 만들고 정의별 결과를 캐시한다. 자료 JSON을 추가로 내려받지 않는다. 기존 폰트/유리 테마·상단/사이드바를 유지하고 열린 카드가 옆 카드를 늘리지 않게 했다.

## 검증

- `npm test`: 루트 238개 통과.
- `npm --prefix apps/control-room test`: 18개 테스트 파일 통과. 이 환경의 격리 리포터가 파일 수만 표시해, 앱 폴더에서 `node --experimental-strip-types --test --test-isolation=none tests/*.test.ts`로 개별 사례 **61개 통과**를 확인했다.
- 새 의미 검증 3개: 동일 표시값의 서로 다른 정의 출처, 0/false·누락/충돌·보완, 단위/상한/0 센티널, 원문 URL 제한, 현재 snapshot의 모든 정의/필드/차이 원문 보존.
- `npm --prefix apps/control-room run build`: TypeScript/Vite 통과. 기존 큰 번들 경고는 유지한다.
- 실제 production preview Chromium: 정확한 값/변형·정의 변경·출처 링크·차이 필터·ko/mix/en·390px·Esc 계층 복귀 통과. 22 SCU/12,345 aUEC의 합성 계약을 저장해 둔 상태로 조회 전후 저장 값 불변 확인. [결과](report.json).
- [데스크톱](source-comparison-desktop.png) / [모바일](source-comparison-mobile.png). 실제 앱 캡처이며 개인 로그를 사용하지 않았다.

브라우저 재현: preview 5188 실행 후 `STAM_QA_OUTPUT=/tmp/stam-archive-reference node --experimental-strip-types scripts/check-archive-reference-browser.mjs`.

## 남은 범위

운송 팁/가이드 본문과 시설 입체 허브는 별도다. 아카이브에서 수주 계약을 자동 생성하거나 자료의 값을 실계약에 적용하는 기능은 추가하지 않았다. 자료 정확도는 해당 snapshot/게임 버전에 한정되며 실제 게임에서 지급된 보상을 검증한 것이 아니다.
