# 계약 보상과 시간당 수익

- 보상이 확인된 계약은 합계와 전체 계획의 예상 시간당 보상을 계산한다. 직접 입력은 해당 수주에만 적용한다.
- 기존 `reward:0` 기본값은 금액을 확인했다는 증거가 아니다. 미확인으로 표시하고 부분 합계에는 빠진 계약 수를 표시한다. 직접 확인한0은 `_rewardKnown:true`로 구분할 수 있다.
- 이 값은 보상 기준 수입이다. 연료·수리·보충 비용과 게임 지급 내역을 자동으로 확인한 순이익이 아니다. 예상 운항 시간이 바뀌어도 계약 보상을 늘리거나 줄이지 않는다.

## 자동 산출의 확인 범위

현재 묶음과 같은4.10.2-LIVE.12881860 원본에서 문제의 Red Wind 정의는 `CalculatedReward:true`, 기준 시간25와 Logistics 난이도 정보를 가진다. 고정 aUEC 금액 자체는 없다. [확인한 원본](https://github.com/StarCitizenWiki/scunpacked-data/blob/1340c8303709904165e2da0fa7060bce0624260b/contracts/bc53a9c8-6adf-4f64-9a79-4fccdad4b587.json).

CIG는 보상 산정이 시간과 난이도를 반영하는 Effort vs Reward 방식임을 설명한다. [CIG 월간 보고](https://robertsspaceindustries.com/comm-link/transmission/19999-Star-Citizen-Monthly-Report-May-2024).

[Star Compendium](https://star-compendium.com/en/star-citizen-guide)은 해당 빌드의 게임 매개변수로 지원되는 기본 금액을 산출한다고 설명하지만, 그 안내만으로 STAM이 같은 공식을 검증했다고 할 수 없다. 이번 조사에서는 필요한 금액 계수·반올림·보너스 적용까지 재현하지 못했다. API의 `CalculatedReward` 플래그를 임의 금액으로 바꾸지 않았다. 다른 빌드의 가중치나 옛 계약의 실제 보상을 섞지 않는다.

따라서 현재 자동 수신에서 빠진 aUEC를 SCU×임의 단가 또는 STAM 예상 비행시간으로 만들어 넣지 않는다. 실제 계약 보상 직접 입력은 가능하며, 검증된 자동 보상 산식과 같은 빌드의 입력이 확보되면 확정·기본 산출·미확인 상태를 구분해 추가할 수 있다. OCR로 숫자를 다시 읽어 채우는 방식은 사용하지 않는다.
