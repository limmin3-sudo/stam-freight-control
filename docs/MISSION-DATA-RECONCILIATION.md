# 미션 목록 대조

`data/mission-details.json`은 실제 수주 ID가 아닌 **정의 UUID**를 기준으로 합친 참고 목록이다. 같은 제목이라는 이유로 합치지 않는다. 수주된 계약·화물·상자 소유권은 독립적이다. 퀀텀·함선 성능 자료에는 SCMDB를 넣지 않는다.

## 대조한 출처

- Star Citizen Wiki API의 공개 미션 스냅샷: `4.10.2-LIVE.12881860`, 1,840개 정의. 각 UUID의 `/api/missions/{uuid}?version=4.10.2-LIVE.12881860` 응답이다. 정렬된 파일 이름·원문 바이트의 SHA256은 데이터 파일 `sources.wiki.snapshotSha256`에 있다.
- [SCMDB_DATA](https://github.com/KrovaxCode/SCMDB_DATA/blob/937f66810a392aa5682b9615a1afbff20fe96e3f/data/merged-4.10.2-live.12913470.json): `4.10.2-live.12913470`, career와 legacy 합계1,856개 목록 레코드. 고정 commit `937f66810a392aa5682b9615a1afbff20fe96e3f`, Git blob `a71db80e033817c8af67b309f825c2f618eb4505`, 원문 SHA256 `72153c1ba58e497549628f134168c2f2c97b342c76e436292a304407a61a5186`. GitHub contents API의 blob/바이트 수와 대조했다.

두 출처는 **빌드가 다르다**. 차이를 최신 정답으로 단정하거나 기존 화물 규칙에 덮어쓰지 않는다. 출처에 없는 미션 종류·배송지·실제 수량을 제목이나 기본 보상으로 추측하지 않는다.

## 합친 결과

| 구분 | 정의 ID 수 |
|---|---:|
| 양쪽 모두 있음 | 1,092 |
| 위키에만 있음 | 748 |
| SCMDB에만 있음 | 1,268 |
| 전체 합집합 | 3,108 |

- 같은 필드6,606건은 값 하나와 양쪽 출처를 보관한다.
- 한쪽에만 있는 필드22,768건은 그 출처를 붙여 보완했다. 값이 없는 보상은0으로 취급하지 않는다.
- 서로 다른 필드2,155건(정의1,034개)은 `differences` 영역에 분리하고 자동 선택하지 않는다. 설명1,029·공유 가능 여부940·화물 규격78·제목60·항성계48건이다. 별칭 UUID도 각각 센 수다.
- `entries`는 동일 참고 내용을 중복 저장하지 않는 배열, `definitions`는 UUID→배열 인덱스다. 동일한 정의를 참조하는 **수주 인스턴스가 합쳐지는 것은 아니다**.
- SCMDB `contractDefinitionIds` 별칭을 정확히 찾는다. 부모의 `subContractIds`에만 등장한 자식은 부모 보상·설명으로 채우지 않는다. 같은 출처의 여러 후보도 다른 값이면 차이로 남긴다.
- HTML 강조 표시는 평문으로 바꾸고 화면 출력 시 이스케이프한다. `[DESTINATION]` 같은 원문의 자리표시자는 실제 수주 장소로 오인하지 않게 안내한다.

카드의 **미션 정보 · 출처 대조**에서 합쳐진 정보와 **서로 다른 값 · 별도 보관**을 펼칠 수 있다. 미션 유형·설명·랭크·공유/불법 여부·목록 기준 시간·항성계·기본 보상 등 출처에 있는 필드만 표시한다. 목록 기준 시간은 STAM의 운항 ETA가 아니다. Resource 화물의 품목·최소/최대 SCU·최대 상자 규격도 대조하되 참고로만 표시한다. 실제 수주 수량을 채우거나 기존 적재 한도를 자동 교체하지 않는다.

## 보상 연결

예시 정의 `bc53a9c8-6adf-4f64-9a79-4fccdad4b587`의 이름·발주처·Hauling - Stellar·랭크2·기준25분은 동일하다. 위키 금액은 비어 있고 SCMDB 기본 보상은215,250 aUEC라서 출처를 붙여 보완했다. 설명과 공유 여부는 다르므로 별도로 표시한다. 기본 보상은 `_rewardReference`이고 실제 입력 `reward`를 덮어쓰지 않는다. 자세한 합계 규칙은 [보상 안내](CONTRACT-REWARDS.md)를 따른다.

## 재생성

공개 Wiki API 응답을 UUID별 JSON으로 저장한 디렉터리와 위 고정 SCMDB JSON을 준비한다. 사용자의 Game.log나 계정 자료를 넣지 않는다.

```sh
node scripts/reconcile-mission-details.mjs WIKI_API_DIRECTORY SCMDB_JSON data/mission-details.json
```

스크립트는 SCMDB 원문 체크섬이 다르면 중단한다. 출처를 갱신할 때는 고정 버전·commit·체크섬과 차이 보고를 함께 검토한다. 기존 `hauling-missions.json`·`log-mission-index.json`의 수량/상자 규칙은 이 스크립트로 바꾸지 않는다.
