# 공개 운송 도구 비교 — 2026-11-06

공개 문서와 실제 구현을 구분해 확인했다. 도구 실행·실게임 성능 비교나 전역 최적성 검증은 수행하지 않았다. 아래 알고리즘은 확인한 파일 시점 기준이며 외부 코드를 복사하지 않았다.

| 도구 | 확인한 방식 | 이번 요구와의 차이 |
|---|---|---|
| [SC Hauling Manager](https://github.com/c0p3y/SC-HaulingManager) | 실제 RouteOptimizer.cs는 화물을 용량 단위로 나누고, 여러 초기 순서에서 가능한 최소 비용 픽업·배송 삽입 후 제거·재삽입 개선을 반복한다. LocationDb.cs의 기본 이동 비용은 같은 천체1 / 같은 행성권2 / 같은 항성계5 / 다른 항성계20이다. | 행성권 이동을 비용에 반영하지만, 확인한 최적화 함수는 행성권 재방문 횟수를 거리보다 우선하는 목적함수가 아니다. 다중 픽업의 실제 분배가 없으면 예상 분배를 보여주고 픽업 때 실제량을 받아 나머지를 재분배한다. |
| [Hauler Ops](https://github.com/SC-Kayinco/hauler-ops-star-citizen) | routeOptimizer.ts에서 가까운 다음 행성·거점을 고르는 탐욕 방식으로 모든 픽업을 먼저 돌고, 이후 모든 배송지를 정렬한다. 배송 순서는 LIFO 적재에 연결된다. README는 2D/3D·그리드 편집을 설명한다. | 모든 픽업 후 배송이 기본이므로 같은 행성권의 배송을 먼저 끝내는 방식과 다르다. 확인한 경로 함수 인자에는 화물량·함선 용량이 없으며 적재 계산은 별도다. |
| [SC Hauling Planner](https://github.com/FSCSOFT-Official/SCHaulingPlanner) | README 기준 미션 목록 필터·보상/SCU 정렬·함선 적합 여부·한 배송지 필터를 제공한다. | 계약 고르기에 유용하다. 공개 README만으로 여러 계약의 픽업·배송 순서와 실제 그리드를 함께 최적화한다고 단정하지 않았다. |
| [SC Trade Tools](https://github.com/EtienneLamoureux/sc-trade-tools) | README 기준 시장 가격·예산·함선 용량·다중 항성계 무역 경로를 다룬다. | 화물을 구매·판매하는 무역 문제이며, 이미 수락한 계약의 화물 소유권·픽업 선행·미확인 분배 예약과는 입력 조건이 다르다. 내부 최적화 알고리즘은 이 비교에서 검증하지 않았다. |

## STAM에 적용한 정책

- **수석 항해사**: 거점 재방문과 불필요한 항성계 왕복을 줄이는 기존 조건에 행성권 재방문 비교를 추가했다. 행성권 재방문 횟수를 먼저 비교하고 예상 비행·착륙 부담, 이동거리 순으로 비교한다. 픽업 선행·실제 적재 가능성 때문에 필요한 복귀는 허용한다. 큰 문제의 제한된 후보 탐색은 전역 최적을 보장하지 않는다.
- **브리지 오퍼레이터**: 한 행성권에서 가까운 화물을 모은 뒤 배송한다. 떠난 뒤 실은 화물을 다 배송하기 전 다른 행성권의 픽업을 하지 않는다. 기존 간단한 계약 우선·가까운 추가 픽업의 시간 예산을 함께 적용한다.
- **배송 총량만 확인된 계약**: 외부 도구의 예상 분배를 그대로 채택하지 않는다. 미션ID×배송지의 확인한 총량을 첫 픽업부터 한 번만 예약하고, 모든 픽업을 방문한 뒤 배송지에서 해제한다. 픽업별 실제 수량·상자 개수를 지어내지 않는다. 별도 계약의 화물·진행·예약은 합치지 않는다.
- 행성·위성 계층으로 권역을 나누며, 항성이 부모인 정거장은 좌표상 가장 가까운 행성의 **인접권**으로 구분한다. 실제 궤도 소속을 새로 주장하지 않는다.

## 확인 근거

- [SC Hauling Manager 실제 경로 구현](https://github.com/c0p3y/SC-HaulingManager/blob/main/src/RouteOptimizer.cs): 함수 본문을 확인했다. 파일 맨 위의 과거 beam search 주석 대신 실제 삽입·재삽입 구현을 기준으로 기술했다.
- [SC Hauling Manager 위치·비용](https://github.com/c0p3y/SC-HaulingManager/blob/main/src/LocationDb.cs), 확인 blob `7c2833ae44f6fe456ad5d2751d7b6c732f3af0b1`.
- [SC Hauling Manager 미확인 픽업 수량 안내](https://github.com/c0p3y/SC-HaulingManager/blob/main/docs/USER_GUIDE.md#pickups-with-unknown-amounts).
- [Hauler Ops 경로 구현](https://github.com/SC-Kayinco/hauler-ops-star-citizen/blob/main/src/lib/routeOptimizer.ts), 확인 blob `1705a25cbacf63dbf32a18be5f25a49dd098077f`.
- [SC Hauling Planner README](https://github.com/FSCSOFT-Official/SCHaulingPlanner/blob/main/README.md).
- [SC Trade Tools README](https://github.com/EtienneLamoureux/sc-trade-tools/blob/master/README.md), 확인 blob `39a37fe847586db0dd8ff471f88695e9209f975c`.

대기권 계산에 초점을 둔 StarLane·Cargo Deck·Schaulers의 추가 확인은 [대기권 계산 안내](ATMOSPHERIC-ROUTING.md)에 기록했다.
