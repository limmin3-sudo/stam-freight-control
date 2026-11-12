# 게이트 이동 누락 복원 — 연출 클라우드 → 로컬 연출 / 기능 클라우드

기준: `397f19aa418581bbb48be635c676604cd77461c5` (beta 2.4.0).
작업 브랜치: `cinematic/gate-travel-sequence-20261112`.
처음에는 PR 인계만 요청했으나, 사용자가 이후 **“끝나면 배포까지 해줘 로컬연출로 넘어갈게”**라고 승인했다. 이번 작업은 beta 2.5.0으로 통합·배포한다. 최종 SHA/배포 결과는 PR과 GitHub Actions, 공개 `version.json`으로 확인한다.

## 원인과 연결 위치

조사 당시 공개 version.json의 SHA는 기준 커밋과 일치했다. `SpaceExperience.tsx`의 라운지 `gate` 분기는 이미 `ShuttleBoarding`을 열지만, 그 컴포넌트가 9.208초 `shuttle-boarding.mp4`만 가져오고 있었다. 따라서 확정된 **라운지→게이트 접근**, **게이트 밖→셔틀 도착·착륙** 두 구간이 빠지고 바로 계단 앞 탑승으로 시작했다. 원본이 없어진 것이 아니라 재생 자산에 포함되지 않은 상태다.

| 순서 | 확정 원본 | 새 파일 시간 |
| --- | --- | --- |
| 라운지→게이트 | [d6e3405e](https://grok.com/imagine/post/d6e3405e-c32a-4036-9927-78d599afdcc9) | 0–4.625초 |
| 게이트 밖→상공의 셔틀→착륙·계단 | [5db0bbea](https://grok.com/imagine/post/5db0bbea-2b9b-4903-9732-44848db9414a) | 4.625–14.625초 |
| 가이드와 탑승·기존 암전 편집 | [bda90fef](https://grok.com/imagine/post/bda90fef-759b-4dc3-9f06-27f14e91537c), 배포본의 기존 편집 사용 | 14.625–23.833초 |

그 뒤에는 기존 완료 콜백으로 관제센터에 진입한다. 미확정 이륙·대기권 탈출·정거장 도착은 추가하지 않았다. 여기서 복원한 착륙은 **행성 지상에 셔틀이 도착하는 장면**이다.

## 파일과 공유 경계

- `apps/control-room/src/ShuttleBoarding.tsx`: 영상 import와 안내·접근성 문구만 변경. 기능 담당도 사용하는 공유 파일이다. props, 종료·취소·재시도·소리 이벤트, DOM/class는 유지했다. `SpaceExperience.tsx`와 계산·저장·라우팅은 변경하지 않았다.
- `apps/control-room/src/assets/travel/lounge-to-shuttle-boarding.mp4`: 1280×720, 24fps, 572프레임, 23.833초, 약 22.9 MB. 한 파일로 이어 재생하여 구간별 파일 로딩을 없앴다. 느린 네트워크에서는 최초 로딩/버퍼링이 발생할 수 있다.
- `scripts/rebuild-gate-travel.py`: 원본 SHA 검증 후 재생성. 기존 탑승 원본은 덮어쓰지 않는다. 접근 종료의 불필요한 정지를 줄이고 마지막 1초를 1→1.35배로 가속, 착륙 시작 중복 프레임 하나를 제거했다. 탑승 221프레임은 시간·내용을 유지해 다시 인코딩했다. 대사 피치/속도는 유지하고 구간 경계 음향에 60ms 페이드만 적용했다.
- `scripts/check-shuttle-boarding-browser.mjs`: 복원된 앞 두 구간을 자연 재생으로 검증하고 기존 취소·오류·바로가기 검사를 유지했다.
- `record.json`: 원본 주소·해시·편집 시간·최종 파일 해시. `review/`: 브라우저 캡처.
- `data/releases.json`, `PROJECT_STATUS.md`, `docs/LOCAL-CODEX-HANDOFF.md`: 배포/인계 기록.

## 검증

- 루트 테스트 232개, 앱 테스트 12개 파일, TypeScript/Vite 빌드 통과. 기존 JS 청크 크기 경고는 남아 있다.
- 실제 Chromium에서 게이트 클릭→23.833초 자연 종료→관제센터, 복원 구간/탑승 중 취소, Esc, 건너뛰기, 하단 바로가기, 외부 화면 이동, 영상 로드 실패, 자동재생 거부 후 재시도, 소리/볼륨, reduced-motion 우회 통과. 저장된 운항 데이터가 동일함을 확인했다.
- 390px 모바일 에뮬레이션에서 버튼 크기·화면 내 배치와 영어 표시 확인. 실물 모바일 및 저속망은 미검증.
- ffprobe로 572프레임/23.833초 확인, 전체 영상 디코딩 오류 없음. 원본 음향을 유지했으며 최종 음향 제작·청음 승인은 별도다.
- [데스크톱 접근](review/boarding-desktop.png), [게이트 밖](review/gate-exit-desktop.png), [셔틀 착륙](review/shuttle-landing-desktop.png), [탑승](review/shuttle-boarding-desktop.png), [모바일 접근](review/boarding-mobile.png), [모바일 탑승](review/shuttle-boarding-mobile.png).

## 기존 CI 실패 인계

PR 검사 [43192053804](https://github.com/limmin3-sudo/stam-freight-control/actions/runs/43192053804)는 구형 화면의 `check-intro-guide-browser.mjs:21`에서 `Math.abs(map.y-route.y)<2`로 실패했다. 기준 `397f19a`의 [43189683334](https://github.com/limmin3-sudo/stam-freight-control/actions/runs/43189683334)도 같은 위치·조건으로 실패했다. 관련 구형 화면/검사 파일은 이번 변경에 포함되지 않는다. 이후 순차 CI 브라우저 검사는 실행되지 않았으며 전체 CI 통과로 보고하지 않는다. 새 라운지 게이트 검사는 별도로 통과했다. 이 기존 정렬 문제는 기능 담당에게 인계한다.

## 다음 담당자

로컬에서는 미커밋 작업을 보존한 뒤 `git fetch origin`하고 `handoff/local-studio-20261110`의 최신 통합 커밋을 대조한다. 깨끗하고 분기가 없는 작업본에서만 ff-only로 받는다. 이번 연출 브랜치를 이미 포함한 통합본에 다시 cherry-pick하지 않는다. 변경 전체 덮어쓰기, 강제 reset, 이전 폐기 Git 이력 혼합 금지.

이번 연결에는 기능 담당의 추가 API나 이벤트 작업이 필요 없다. 로컬 연출의 다음 작업은 미확정 이륙·대기권 탈출 장면과 최종 엔진/이륙/착륙 음향이다. 왼쪽 창문 시점과 상승 방향이 잘못된 시험 영상은 확정 자산으로 연결하지 않는다. 영상 원본은 기존 별도 제작 폴더에 보존한다.
