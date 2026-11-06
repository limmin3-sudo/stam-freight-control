# 계약 보상과 예상 수입

1. 실제 계약에서 확인·직접 입력한 보상이 우선이다. 직접 확인한0도 `_rewardKnown:true`로 구분한다.
2. 실제 보상이 없으면 정의 ID로 대조한 **목록 기본 보상**을 예상 합계·시간당 수입에 쓸 수 있다. `_rewardReference`에 금액·출처·빌드·정의 ID를 따로 저장하며 실제 `reward`에 쓰지 않는다.
3. 두 값 모두 없으면 보상 미확인으로 표시하고 합계에서 제외한 계약 수를 알린다. 기존 `reward:0` 기본값은 확인된0이라는 증거가 아니다.

기본 보상이 포함된 합계와 완료 기록에는 **목록 기준 예상**임을 표시한다. 보너스·평판·부분 지급·패치 차이로 실제 지급액과 다를 수 있다. 연료·수리 비용을 뺀 순이익은 아니다. STAM의 예상 운항 시간이나 SCU×임의 단가로 보상을 만들어 넣지 않는다. OCR로 빠진 숫자를 채우지 않는다.

## 확인한 자료

[원본 Red Wind 정의](https://github.com/StarCitizenWiki/scunpacked-data/blob/1340c8303709904165e2da0fa7060bce0624260b/contracts/bc53a9c8-6adf-4f64-9a79-4fccdad4b587.json)는 CalculatedReward와 시간·난이도만 있고 고정 금액은 없다. 그러나 이것이 공개 목록에도 금액이 없다는 뜻은 아니다.

[SCMDB 목록](https://github.com/KrovaxCode/SCMDB_DATA/blob/937f66810a392aa5682b9615a1afbff20fe96e3f/data/merged-4.10.2-live.12913470.json)은 같은 정의 UUID를 별칭으로 포함하며 `rewardUEC:215250`을 제공한다. STAM은 이 공개 **기본 보상**을 가져온다. 게임의 전체 보상 산식을 직접 재현했다고 주장하지 않는다.

CIG의 [월간 보고](https://robertsspaceindustries.com/comm-link/transmission/19999-Star-Citizen-Monthly-Report-May-2024)는 시간과 난이도를 반영하는 Effort vs Reward 방식을 설명한다. 특정 수주의 실제 보너스·부분 지급은 별도 확인이 필요하다.

Wiki와 SCMDB의 서로 다른 값은 자동으로 한쪽을 택하지 않는다. 금액 자체가 충돌하면 자동 기본 보상으로 사용하지 않는다. 출처 버전·대조 결과·재생성은 [목록 대조 문서](MISSION-DATA-RECONCILIATION.md)에 기록했다. 직접 입력한 값은 해당 수주에만 적용하며 다음에 같은 유형을 받아도 복사하지 않는다.
