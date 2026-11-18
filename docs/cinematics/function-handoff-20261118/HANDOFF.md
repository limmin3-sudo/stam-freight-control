# 기능팀 전달 · STAM 웹 연출 통합 후보

2026-11-18 KST. 이 인계본은 기능팀이 통합 브랜치에서 검수하고 배포할 소스와 자산이다. 이번 준비 작업의 공개 배포 상태는 미배포다.

## 받으면 먼저

1. ZIP을 저장소 밖에 풀고 `SHA256SUMS`를 확인한다. `cinematics.patch` 하나에 기준 커밋 이후의 추적 파일 변경, 새 코드·이미지, 무역 로비 검토 자료와 이 문서가 함께 있다. `files.json`에는 전체 변경 경로와 파일별 SHA-256, 기준 커밋과 결과 Git 트리가 있다.
2. 준비 시 원격 조회에서 `main`과 `handoff/local-studio-20261110`은 모두 `1fdce17a94ce8b078a38690541fe05eb9844aa34`였다. 운영 버전은 웹 3.3.0이다. 수신 시 원격을 다시 확인하고, 아래처럼 깨끗한 별도 통합 브랜치에서 재현한다. 패치는 해당 기준에 대한 누적본이다.
3. 기준 이후 기능팀 변경이 있으면 재현한 연출 변경과 최신 기능 작업을 통합 브랜치에서 병합한다. 특히 `SpaceExperience.tsx`, `space-navigation.ts`, `PROJECT_STATUS.md`는 양쪽 변경이 만나는 파일이다.

```sh
# ZIP을 푼 디렉터리에서
sha256sum -c SHA256SUMS
packet="$PWD"
# 새 이력 저장소에서, 작업 중인 파일을 보존한 별도 체크아웃 사용
cd /workspace/stam-freight-control-fresh-20261108
git fetch origin
git switch -c integration/web-cinematics-visit-20261118 1fdce17a94ce8b078a38690541fe05eb9844aa34
git apply --index --check "$packet/cinematics.patch"
git apply --index "$packet/cinematics.patch"
git write-tree
python3 "$packet/verify-files.py" "$packet/files.json" .
```

`git write-tree` 결과는 `files.json`의 `resultTree`와 대조한다. 통합 후 실제 릴리스 이력·버전·KST 배포 시각은 배포 담당자가 기록한다.

## 포함 범위와 실제 진입점

| 범위 | 적용 내용 | 기능 담당 확인 |
| --- | --- | --- |
| 공통 상단바·사이드바 | 샴페인 골드 하우징, 남색 유리 상단, 건메탈 측면과 직선 절삭면. ShellMaterial·CSS와 고정 밀도 재질 파일 3개가 한 세트다. | 시설 지도·라운지·관제센터·안내 데스크를 오가며 검은 여백, 프레임 잘림, 버튼 위치와 인물 클릭 영역을 확인한다. |
| 가이드·관제센터 | 뒤로 묶은 금발 가이드, 라운지 배치와 안내 데스크 초상. 브리지 오퍼레이터·수석 항해사의 검정 금장 제복을 관제센터, 근접 대화, 새 앱 파트너 선택과 운항 화면에 연결했다. | 라운지 가이드 → 안내 데스크. 관제센터의 두 인물을 눌러 대화를 열고 미션·항로·관제 콘솔로 이동한다. |
| 무역센터·아카데미 인물 | 링 가문 중개인, 수석 무역관, 베이지 면 의상 교수. 인물 6명의 자세는 기본 1장과 추가 9장씩이다. `dialogue-poses`의 WebP 54개와 `dialogue-originals`의 보조 원본도 포함한다. | 여섯 명의 근접 대화를 다시 열어 자세 순환과 담당 범위를 확인한다. 교수의 태블릿 컷은 두 손을 분리한 최종 원본이다. |
| 새 가이드 둘러보기 | 라운지 안내 데스크 → ‘가이드와 둘러보기’, 직접 경로 `#/guide?lang=ko&tour=1`. 라운지 → 관제센터 → 무역센터 → 아카데미 → 시설 지도. 한·영 각 52대사, 전용 이미지 33장(기존 9 + 추가 24), 별도 공간 배경 4장에 인물 레이어. | 자동 진행, 다음 대사, 구간 건너뛰기, 키보드, 동작 줄이기, 태블릿·모바일, 마지막 지도 복귀. 자막·버튼은 실제 UI다. 음성은 소리 설정과 기기의 로컬 TTS에 의존한다. |
| 구 연출 퇴역 | 예전 둘러보기·운송/무역 튜토리얼·안내/상영 영상 진입 정리. 기존 비행 도구의 인트로 영상, 파트너 선택·안내 흐름 관련 루트 HTML/JS/CSS와 브라우저 확인 스크립트도 패치에 포함한다. | 공개 루트와 `flight.html` 양쪽에서 확인한다. 기존 실제 운송 준비·장부·이용 설명서가 계속 열리는지도 본다. |
| 무역 로비 두 문 | 새 로비 전경, 두 파트너, 문 강조·진입·복귀, 태블릿 증거 및 직접 조작 가능한 `/review/trade-lobby/` 개발 시안. | 아래 연결표 참조. 현재 제품 `FacilityLobby`는 기존 로비와 방 라우팅을 사용한다. 검토 화면의 가격·장부 이미지는 조작 가능한 실제 기능 화면으로 바꿔야 한다. |

## 무역 로비를 배포할 때 연결할 네 지점

- 무역관제실 문 → `facility=trade&room=market`의 시세 검색 → 선택한 거래를 `room=planning`에 전달하고 내 함선·가용 자금으로 경로를 계산한다.
- 거래기록실 문 → `facility=trade&room=trade-operations`. 실제 매입·판매·잔량·비용·정산을 읽는다.
- 수석 무역관과 대화 후 계획 → `room=planning&advisor=intrasystem`. 링 가문 중개인과 대화 후 계획 → `room=planning&advisor=interstellar`.
- 사이드바는 빠른 이동을 유지한다. 문 클릭은 해당 방으로, 인물 클릭은 대화로 연결한다. 실제 거래 입력·저장·계정은 기존 기능을 사용한다. 상세 시안은 `docs/cinematics/trade-lobby-two-doors/HANDOFF.md`에 있다.

## 합칠 때 특히 확인할 차이

- 무역 로비 원격 HEAD는 `22f1bc72c5a97b543e0c7fc353143c5295ae2ec5`이다. 해당 브랜치만 받으면 이후 로컬에서 만든 인물·자세·둘러보기가 빠진다. 패치는 로비 브랜치의 기준 이후 네 커밋 효과도 포함한다.
- 별도 셸 브랜치의 원격 HEAD는 `d015b7ee19ccfc6a77af05957b9d5b1a479c75bf`이다. 확정 런타임 재질과 최신 입체 마감은 이미 이 패치에 들어 있다. 셸 브랜치의 이전 안내 영상용 화면으로 통째로 교체하면 퇴역한 진입점이 되살아난다. 당시 제작 중간 PNG와 검토 이력은 해당 브랜치에 보존돼 있다.
- 기존 `flight.html` 파트너 초상은 루트 `voice.mjs`의 `assets/partners/navigator.jpg`와 `aide-portrait.webp`를 사용한다. 새 관제 앱의 승인 원본은 `apps/control-room/src/assets/partner-close/{navigator,operator}.png`이다. 양쪽 화면까지 같은 외형으로 출시하려면 레거시 매핑도 맞춰 검수한다. 레거시의 밀수 브로커와 무역센터 링 가문 중개인은 서로 다른 역할이다.
- 새 운송·무역 실습 튜토리얼과 자유 질문 API는 후속 작업이다. 이번 52대사 둘러보기는 고정 대본이다.

## 배포 검수

- 테스트 전에 기존 Pages 작업 순서대로 위치 자료와 한국어 라벨을 준비한다. 기존 로컬의 위치 목록에 새 지명이 있고 라벨이 이전 판이면 `tests/ai-labels.test.mjs`가 실패한다. `node scripts/build-ai-korean.mjs`가 실제 사용하는 위치 목록과 라벨을 맞춘다.
- `npm test`, `npm run build:control-room`, `npm run test:control-room` 후 Pages와 같은 순서로 `build-public.mjs`, `build-release.mjs`, `publish-lounge.mjs`를 실행한다. 새 공개 루트와 보존된 비행 도구의 경로가 다르므로 양쪽을 확인한다.
- 실제 배포 시 Actions 완료, 공개 버전/SHA, 새 진입 링크, 이미지 응답, 기존 저장 운항의 이어하기를 확인한 뒤 공개 완료로 기록한다. 미리보기 MP4는 무음 검토 영상이며 앱 런타임 의존 파일은 모두 패치에 있다.
