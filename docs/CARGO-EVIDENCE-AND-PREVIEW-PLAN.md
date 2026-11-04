# 화물 구성 관측과 예상 적재: 조사 및 구현 인계

> **현재 상태:** 3D·예상 경로 미리보기는 `f2cd0d8`로 복원·검증됐으며 CI 보완 `666d12e`까지 원격 반영됐다. 아래 중단 당시 기록은 현재 미커밋 상태를 뜻하지 않는다. 최신 상태는 [PROJECT_STATUS.md](../PROJECT_STATUS.md), 재개 절차는 이 문서 마지막 절을 따른다.

2026-11-03 · `rebuild/log-evidence-foundation` 전용. 사용자 요청: 개발을 계속하면서 화물 구성을 읽는 방법도 조사한다. 미확인 구성은 품목별 최대 상자로 예상 배치하고, 실제 구성이 확인되면 보정하는 방향을 승인했다.

## 이번에 새로 확인한 범위

공개 도구의 **소스를 읽어 확인한 파서 동작**이다. 사용자의 현재 실게임 로그에서 같은 이벤트를 재현했다는 뜻이 아니다. 도구가 제공하는 기능이나 코드의 공개 여부만으로 CIG의 허용을 주장하지 않는다. 외부 도구 코드는 복사하지 않았다.

| 공개 근거 | 확인한 동작 | 우리 앱에서의 판정 |
|---|---|---|
| [sc-overlay trade-log.ts](https://github.com/SubliminalsTV-Projects/sc-overlay/blob/41c153d3261f7bf71b585aedecce9b347ca2f341/src/trade-log.ts) | 구매/판매 요청에서 resourceGUID, boxSize, unitAmount, 수량과 단위를 파싱. 요청 거절 응답과 빈 상자 명세도 별도 취급 | 구매 **요청 구성**의 근거 후보. 요청을 실제 소유/적재/거래 성공으로 확정하지 않는다 |
| [StarCitiSync CommodityTransactionTracker.cs](https://github.com/JiyanDev/StarCitiSyncPublic/blob/63a6c4621ce069eab0a92c5277160781c28b6df7/Backend/StarCitiSync.Client/Services/CommodityTransactionTracker.cs) | Cargo Box Data 안의 여러 boxSize / unitAmount 쌍을 순회하고 누락 시 null 저장 | 단일 크기만 읽으면 여러 크기가 섞인 줄을 놓칠 수 있다는 구현 참고. 운송 계약 소유권은 별도 필요 |
| [Bedrock TradeBook.h](https://github.com/SC-Ravaxx/Bedrock/blob/cf6b13d7d435c151bc89d1ef55ea3f4d148e7422/include/TradeBook.h) | 무역 요청·거절과 터미널 공급 상자 크기를 구분 | 상점의 Available Box Sizes는 내가 가진 실제 상자 목록이 아님 |
| [Wingman instructions.json](https://github.com/ShipBit/wingman-ai/blob/6a1f33b00d2e7600f2a09843e2d6bc241d3bc6b0/services/sc_gamelog/data/instructions.json) | cargo_transfer 규칙은 FillUnstowRequest에서 kiosk, entity_count, location_id, request_id를 추출 | 이벤트 이름이 cargo_transfer여도 품목별 크기·개수 명세는 없음 |
| [StarTracker commodityHaul.js](https://github.com/BeansOnToastBruh/StarTracker/blob/c8006423a3857026fbe3de9c875d4b770a498c9b/StarTracker/electron/commodityHaul.js) | AddingCommodityBox / AddPlayerCommodityItem은 GUID와 이름 힌트 학습. 무역 매입 lot와 매도를 연결 | 운송 계약의 실제 상자 자동 판별 기능으로 해석하지 않음. modern 요청에서 즉시 verified를 내보내는 동작도 그대로 채택하지 않음 |
| [basetool 로그 조사](https://github.com/krt-profit/basetool/blob/ea9970c5248b968dd9586419e76ca414fddbabcd/docs/research/game-data-and-game-log-findings.md) | AddPlayerCommodityItem의 품목명이 비는 사례, 함선 화물 조회 이벤트와 실제 내용의 차이, 드문 아이템 생성 기록을 기술 | 다른 작성자의 관측 보고서로 구분. 사용자의 운송 실물 명세 확인을 대체하지 않음 |

sc-overlay의 거절 미관측 시간창을 거래 성공으로 처리하는 휴리스틱은 이 앱의 **확정** 근거로 채택하지 않는다. 실패가 안 보이는 것과 성공·소유권이 입증된 것은 다르다. 무역 구현은 원래 범위 밖이므로 이번에 추가하지 않는다.

### 읽기 전용 로그에서 더 대조할 대상

- `SendCommodityBuyRequest` / `SendCommoditySellRequest`: 모든 상자 쌍과 수량 단위, 거래 실패 응답, 출처를 보존. **운송 missionId 연결은 아직 미확인**.
- `AddingCommodityBox` / `AddPlayerCommodityItem`: 상품 GUID/이름/크기/개수/컨테이너 ID가 실제 어느 조합으로 함께 기록되는지 확인. 공개 파서가 어떤 정규식을 지원한다는 이유만으로 실제 필드가 항상 존재한다고 보지 않는다.
- `LoadSelectedShipBindings` / `RmToken_VehicleCargoDataResponse`: 조회 대상 함선과 요청 결과만 나오는지, 품목별 본문도 나오는지 확인.
- `SMarkerHandler_Hauling::OnItemRegistered`: 개별 아이템→계약→목표 연결을 일반 SCU 상자에도 확보할 수 있는지 확인. 현재 사용자 자료의 소형/특수 물품을 일반 SCU로 확대하지 않는다.
- `FillUnstowRequest` / `UnstowPendingEntities`: 요청 ID·아이템 ID로 직접 연결되는 경우만 근거로 사용. 가까운 시각이나 entity 개수만으로 연결하지 않는다.

원문 로그의 추가 검색은 작업 환경이 복구된 뒤 진행해야 한다. 이번에는 연결 장애로 사용자 로컬 자료를 다시 읽지 못했다. 게임 파일·메모리·패킷을 읽거나 게임 입력을 자동화하는 우회는 사용하지 않는다.

## 예상 적재를 막지 않는 데이터 구분

하나의 `verified` 플래그로 계약 전체를 확정하지 않는다.

- **확인된 계약 정보:** 실행 계약 ID, 품목, 총량, 실제 선택된 픽업/배송지. 각 필드의 근거/빌드/시점을 유지한다.
- **예상 구성:** 품목별 **주문 단위** 상자 상한을 적용한 미리보기. 실제 상자 명세·인벤토리·배송 완료와 별도 저장한다.
- **확인된 원래 상자 구성:** 현재 구현된 대형 고정형처럼 근거가 있는 조합. 예상으로 덮어쓰지 않는다.
- **현재 적재/남은 화물:** 최초 요구량과 별개다. 실제 aboard 위치와 진행 상태를 보존한다.

경로와 품목·수량 안내는 필요한 지점/수량이 확인된 범위에서 진행할 수 있다. 상자 개수가 미확인이라는 이유만으로 모든 경로 기능을 막지 않는다. 반대로 상자 상한을 안다는 이유로 랜덤 총량이나 미확인 배송지를 채우지 않는다. 중형의 두 픽업별 할당은 확인된 것으로 균등 분배하지 않는다.

### 예상 영역과 실제 상자

예약 영역의 키는 `실행 계약 → 배송지 → 품목 → 픽업/주문(확인된 경우)`다. 총량만 같다고 다른 계약의 상자를 합치지 않는다. 목적지가 미확인이면 임의의 목적지 색상/영역을 부여하지 않는다.

- 예상 분해는 품목별 확인된 상한 아래에서만 큰 상자부터 수행한다. 함선 최대 상자 크기나 계약 전체 최대값을 모든 품목에 적용하지 않는다.
- 사용자에게 **예상 상자 배치 / 실제 상자 구성 미확인**이라고 표시한다. `적재 가능 확정`과 구분한다.
- 같은 부피가 같은 형태의 적재를 보장하지는 않는다. 24 SCU 그리드와 8 SCU 그리드에는 24+8 상자가 들어가지만 16+16은 들어가지 않는다. 냉동포드의 반 높이/불균일 지지면도 별도 규칙이다.
- 실제 구성이 확인되면 기존 예약 영역부터 재배치한다. 들어가지 않으면 남은 빈 공간 전체에서 계산하고 변경된 위치를 표시한다.
- 이미 실은 상자는 고정한다. 기존 배치를 바꿔야만 적재 가능한 경우 이를 알리고, 자동으로 aboard 위치를 삭제하거나 옮기지 않는다.
- 여러 크기의 입력, 중복 이벤트, 부분 반출, 같은 유형 여러 계약, 변경 전후 총량 보존을 검증한 뒤 원자적으로 적용한다.
- 예상 상자 개수에 의존하는 하역 시간·적재 횟수 역시 추정 표시가 필요하다. 최초 총량과 남은 총량을 혼동하지 않는다.

## 이전 중단 당시의 3D 구현 재개 지점 (역사 기록)

마지막 확인된 시험 브랜치 기능 커밋은 `8143a1e`다. 이후 아래 파일 쓰기 도구는 성공했지만 실행 환경이 끊겨 현재 디스크 재확인·전체 테스트·브라우저 검증·업로드를 하지 못했다. **이번 문서 커밋에 이 코드가 포함된 것은 아니다.**

작성 중이던 범위:

- `cargo-scene.mjs`: 기존 화물 렌더러를 분리. `scene.mjs`는 기존 API(createCargoView, setup, clearGroup, line, PALETTE, createStarMap)를 재수출하여 지도/기존 앱 호환 유지.
- `integration/log/preview-view.mjs`, `preview-packing.mjs`, `preview-worker.mjs`, `preview.css`: 확인된 대형 원래 명세, 함선 선택, 그리드 제외, 목적지 색상, 작업 스레드 계산, 닫을 때 자원 해제.
- `preview-assets-node.mjs`: 사용자가 3D를 열 때만 고정 버전 Three.js를 준비하는 코드. 다운로드 시간/크기 제한과 SHA-256 검증, 로컬 캐시. 아직 실행 검증 전이다.
- `live-server.mjs` / `live-client.mjs`: 인증된 준비 요청, 명시적 정적 파일 목록.
- `view.mjs` / `log-link.html`: 3D 열기 버튼, 별도 미리보기 영역, import map과 CSP hash.

재개 순서:

1. 남아 있는 작업 파일과 이 목록을 대조한다. 로컬 변경을 버리지 말고 이 문서 커밋을 반영한다.
2. renderer API 재수출, CSP import map hash, Worker 모듈 경로, 명시적 파일 허용 목록, 라이브러리 첫 다운로드 실패 시 로그 감시 지속을 검사한다.
3. Worker의 오래된 결과 폐기·8초 제한·그리드 변경·함선 변경, 미리보기 닫기와 스냅샷 갱신 때 자원 해제를 검증한다.
4. Node22/26 전체 테스트 및 Chromium 실로그 재생. 28개/168 SCU, 두 목적지, 미적합 함선, 꺼진 그리드, 카메라 이동, 유휴/숨김 렌더링 정지, 모바일 넘침, 외부 로그 전송 없음 확인.
5. 그 다음 예상 구성 UI/필드별 근거 상태와 경로 연결을 구현한다. 현재 미커밋 3D 초안은 검증된 대형만 대상으로 하며 예상 구성까지 완성된 것이 아니다.

원본 로그/사용자 식별자/화면/한글 패치 파일은 포함하지 않는다. 추가 로그가 없어도 공개 규칙 조사와 예상/확정 분리 구현은 진행 가능하지만, 일반 운송 상자 실물 자동 관측의 성공을 주장하려면 추가 근거가 필요하다.

## 2026-11-03 재개 구현과 추가 소스 점검

- 새 클라우드 체크아웃에는 미커밋 초안이 없었고 `work`의 `e4c744d`에서 시작했다. 원격 `ecb5087`을 명시적으로 fetch한 뒤 시험 브랜치로 전환해 위 목록을 기준으로 복원했다. 다른 오프라인 원격 환경의 미커밋 원본 존재 여부는 확인하지 못했다.
- `cargo-scene.mjs`로 기존 렌더러를 분리하고 `scene.mjs`에서 기존 API를 재수출한다. 로그 화면에서만 별도 미리보기를 연다. 함선/그리드/출발지/방문 후 배치를 선택하며 기존 엔진으로 경로를 계산한다. 라이브 수집기의 인증된 준비 요청은 고정 Three.js 버전을 15초/3MB 제한 및 SHA-256 검증 후 캐시한다. 실패해도 로그 감시를 중단하지 않는다.
- Worker는 새 계산/닫기/스냅샷 변경 시 종료하고 오래된 응답을 폐기한다. 계산 상한은 8초다. 실제 로그 매칭의 부모 상대좌표를 경로 거리로 쓰지 않으며 공개 목록의 월드 좌표를 사용한다. 행성계 간 연결은 기존 저장소 `.github/pages-baseline/locations.json`의 2026-10-30 연결을 재사용한다. 연결 날짜와 좌표의 미확인 게임 버전을 구분한다.
- 검증된 대형은 원래 구성 그대로 계산한다. 그 밖의 Resource 주문은 주문별 상한을 유지한 예상 구성으로 계산하며 **주문별 실제 수량과 픽업·배송지 확인이 필요**하다. 공개 단일 경계를 자동 실물 수량으로 확정하지 않는다. 중형의 미확인 픽업별 배분을 자동 균등 분배하지 않는다. 선택형/개체 주문/상한 누락/마커 충돌은 보류한다.
- 미리보기는 실제 운항 저장소에 쓰지 않는다. 현재 aboard, 배송 진행, 로그인 데이터는 보존된다. 실제 명세의 자동 수집·운항 가져오기 및 실제 상자로 예약 영역을 보정하는 흐름은 아직 연결하지 않았다. 이미 실린 상자를 임의 이동시키는 우회는 없다.

### 공개 파서의 추가 한계 확인

[StarCitiSync의 고정 소스](https://github.com/JiyanDev/StarCitiSyncPublic/blob/63a6c4621ce069eab0a92c5277160781c28b6df7/Backend/StarCitiSync.Client/Services/CommodityTransactionTracker.cs)를 다시 읽었다. 구매 분기는 Cargo Box Data의 복수 쌍을 순회하지만 판매 분기의 바깥 정규식은 첫 `[` 앞에서 끊긴다. 따라서 그 안에서 `boxSize[...]`를 찾는 후속 정규식과 맞지 않는다. 해당 버전 코드에 판매 처리 분기가 있다는 사실만으로 판매의 복수 상자 목록 판독을 입증할 수 없다. 또한 크기의 소수 부분을 버리는 코드가 있어 단위·정수 여부를 확인하지 않고 그대로 채택하면 안 된다. 이는 소스의 정적 분석이며 현재 게임의 실제 출력 재현 결과는 아니다.

이번 환경의 제공 파일에서 사용자 원본 `.log`는 찾지 못했다. 신규 검증은 합성 로그/공개 좌표로 수행하며 이전 34개 사용자 로그를 재검증했다고 주장하지 않는다. 일반 운송 상자와 missionId·목표·소유권을 직접 연결하는 실로그 근거는 계속 미확인이다. 구매 요청·터미널 공급·무응답을 현재 소유 또는 운송 완료로 승격하지 않는다.


## 환경 소실 후 재개 및 체크포인트

지속 저장 위치는 GitHub `limmin3-sudo/stam-freight-control`의 **`rebuild/log-evidence-foundation`**이다. 기능 `f2cd0d8`, CI 준비 보완 `666d12e` 및 후속 문서 커밋을 모두 포함한 최신 브랜치에서 재개한다. main으로 병합하지 않는다. 미커밋 원본·개인 로그·브라우저 로그인·운항 저장소가 GitHub에 함께 보관된다고 가정하지 않는다.

### 새 환경의 시작 순서

1. 기존 체크아웃이 있으면 `git status --short --branch`, `git log -5 --oneline`, `git remote -v`부터 확인한다. 미커밋/미추적 변경을 보존한다. 다른 오프라인 환경의 미커밋 원본이 나중에 발견되면 최신 코드와 비교하고 덮어쓰지 않는다.
2. 체크아웃이 없을 때만 `git clone --branch rebuild/log-evidence-foundation https://github.com/limmin3-sudo/stam-freight-control.git`으로 받는다. 기존 폴더에서는 명시적으로 `git fetch origin refs/heads/rebuild/log-evidence-foundation:refs/remotes/origin/rebuild/log-evidence-foundation`을 실행하고 로컬/원격 차이를 확인한다. main만 가져오는 설정일 수 있다. 깨끗하고 올바른 브랜치에서 분기 없이 갱신할 때만 `git merge --ff-only refs/remotes/origin/rebuild/log-evidence-foundation`을 사용한다. 충돌·분기는 강제 reset/push 없이 보고한다.
3. `AGENTS.md` → `docs/DEVELOPMENT.md` → `PROJECT_STATUS.md` → 이 문서와 관련 `.agents/skills`를 읽는다. 이미 복원한 3D를 이전 중단 기록만 보고 다시 작성하지 않는다.
4. Node22 이상에서 아래 검사를 실행한다. 새 환경에 없는 테스트 좌표만 저장소의 공개 기준 파일로 준비하며, 기존 좌표 파일을 덮어쓰지 않는다.

```sh
node -e "const fs=require('node:fs');if(!fs.existsSync('data/locations.json'))fs.copyFileSync('.github/pages-baseline/locations.json','data/locations.json')"
npm test
```

UI 검증은 `node scripts/prepare.mjs` 후 `npm start`로 파일 재생 화면 `/log-link.html`을 열거나, 읽을 수 있는 로그가 있는 기기에서 `node scripts/log-link-server.mjs --file <Game.log>`를 실행한다. Windows는 `start-log-link.cmd`도 지원한다. 서버가 표시하는 연결 키 포함 URL은 공유/커밋하지 않는다. 현재 로그가 없으면 커밋된 `tests/helpers/log-preview.mjs` 및 `tests/log-preview*.test.mjs`의 합성 자료로 엔진 검증부터 진행한다. 합성 검증을 실게임 수락 확인이라고 보고하지 않는다.

### 다음 구현 지점

1. `preview-packing.mjs`의 예상/원래 명세 분리를 유지하면서, 로그에 직접 나타나는 품목·크기·개수·계약/목표 식별자의 동시 출현을 조사한다. 소스 정규식 지원과 실제 출력 관측을 구분한다. 기존 34개 개인 로그는 이번 GitHub 자료에 포함되지 않는다.
2. 실제 구성 보정은 별도 증거와 입력 검증부터 설계한다. 계약/배송지/품목/주문별 소유권과 총량, 중복·부분 반출을 검증한 뒤 예약 영역 우선 재배치를 수행한다. 실제 aboard 상자는 고정하며 재배치가 필요하면 사용자에게 보여 주고 원자적으로 적용한다. 현재는 이 보정이 구현됐다고 주장하지 않는다.
3. 기존 실운항 가져오기는 진행 상태와 중복 계약을 보존하는 별도 어댑터로 연결한다. 현재 `preview-view.mjs`는 독립 미리보기이며 운항/로그인 저장소를 쓰지 않는다. 이 경계를 우회해 원래 수요 전체를 현재 aboard로 넣지 않는다.
4. 변경 범위에 맞는 검사 + 전체 Node 테스트 + 가능한 Chromium 검증을 수행한다. 현재 기준은 로컬 Node22/26 각각 203건 중 202통과/Windows 전용1건너뜀, Chromium 확인/예상 28개·168SCU/모바일/그리드/닫기·스냅샷 해제/오류·외부 요청0, 라이브 준비 실패·Worker8초 제한에도 감시 지속이다. `666d12e`의 push/PR CI는 Windows/Ubuntu × Node22/24/26 모두 성공했다.

### 작업 중 지속 저장

사용자는 환경이 사라져도 이어갈 수 있게 코드와 진행 상황을 주기적으로 남기길 요청했다. 작업 단위 완료 시와 장시간 작업의 안전한 중간 지점에 변경을 검토하고 관련 검사를 실행한 다음, 이 두 인계 문서를 갱신해 **시험 브랜치에 커밋·푸시**한다. 검증을 못 한 중간 저장은 미완료/미검증 범위와 정확한 다음 명령을 명시한다. 끝날 때만 저장하거나 모든 완료까지 로컬에만 쌓아 두지 않는다. 기존 승인 범위에서 반복 승인 요청 없이 진행하되, 충돌·파괴적 변경은 중단해 보고한다.

각 체크포인트에는 작업자/브랜치/완료·미완료/변경 파일/검증 결과/막힌 이유/다음 단계/원격 반영 여부를 남긴다. 푸시 후 `git ls-remote`로 원격 해시와 해당 커밋의 CI를 확인하고 결과를 보고한다. 자신의 문서 커밋 해시를 기록하기 위해 끝없이 새 커밋을 만들지는 않는다. 최종 문서 커밋의 해시는 브랜치 이력을 기준으로 한다. 임시 스크린샷·서버 프로세스·로컬 도구 경로는 재개 필수 조건으로 삼지 않는다. 개인 로그/식별자/인증정보는 체크포인트에 포함하지 않는다.
