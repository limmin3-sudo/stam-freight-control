# 4.10.3 적재 구역 차이 정리 — 2026-11-14

작업 기준: `integration/freight-division-20261113`, HEAD `916b067` 위의 미커밋 작업. 앞선 기능·연출 변경을 보존했다. 커밋·푸시·배포하지 않았다.

## 이번 수정

| 함선 | 변경 | 총용량 |
| --- | --- | --- |
| Caterpillar | 앞칸 60/20 SCU 치수를 원본에 맞추고 최대 16 SCU 제한. 주 화물칸은 24, 통로/좁은 구역은 2 SCU 제한 | 576 유지 |
| Idris-P | 합쳐진 보조 구역 두 개를 네 개로 분리. 소형 저장칸은 1 SCU, 중간 저장칸은 2 SCU 제한 | 1,374 유지 |
| Syulen | 합쳐진 6 SCU 공간을 독립된 1 SCU 슬롯 6개로 수정. 긴 냉동 포드를 슬롯 사이에 걸쳐 넣는 계산 방지 | 6 유지 |

`reviewed-fleet-profiles.mjs`에 보정을 두어 다음 자동 갱신에도 유지한다. 원본 치수/용량이 달라지면 검증을 실패시켜 임의 덮어쓰기를 막는다. 구역 사이 간격은 실측 선체 좌표가 아닌 개략 배치이며 화면에도 구분한다. Caterpillar 앞칸 두 구역은 새 치수가 겹치지 않도록 개략 위치를 분리했다. Idris 새 구역은 기존 인덱스 뒤에 추가했다.

진행 중 운항은 앞선 저장 함선 사본 보존 로직을 그대로 사용한다. 새 기본 자료로 이미 실린 상자의 위치를 바꾸지 않는다. Hull/RAFT/Golem의 부착 방향과 기존 선체 보정 세 종류도 유지한다.

## 근거

Wiki의 버전 고정 `4.10.3-LIVE.13165946` 차량 자료에서 용량과 구역별 치수·최대 상자 크기를 대조했다. API의 단순 `max_scu_box` 값만 믿지 않고 `max_size`와 치수·외부 도표를 함께 확인했다.

- [Caterpillar](https://api.star-citizen.wiki/api/vehicles/dc39ca6b-1d76-4db5-9346-356f49954978?version=4.10.3-LIVE.13165946)
- [Idris-P](https://api.star-citizen.wiki/api/vehicles/4b0585b0-b60b-4c52-a744-d812e5e9ad58?version=4.10.3-LIVE.13165946)
- [Syulen](https://api.star-citizen.wiki/api/vehicles/11ebc47d-4763-4faa-9020-171cf6c2651f?version=4.10.3-LIVE.13165946)
- [Ratjack 4.10.3 적재 도표](https://ratjack.net/Star-Citizen/Cargo-Grids/CargoGrids4103.pdf): Caterpillar 앞칸 24 SCU 수동 적재 문제와 16 SCU 조합 참고.
- [SC Cargo](https://sc-cargo.space/): 구역 구성 대조. 외부 구현 코드는 제품에 복사하지 않았다.

## 그대로 둔 세 예외

총 97개 구성 중 94개는 구역 치수·용량 대조가 일치한다. 이것은 선체 부착 좌표까지 실측했다는 뜻이 아니다. 아래 세 구성은 `data/ship-grid-audit.json`에서 예외로 유지한다.

1. **Retaliator 화물 모듈 74 SCU:** Wiki 기본 차량은 빈 모듈을 장착해 0 SCU다. [앞 모듈](https://api.star-citizen.wiki/api/items/4cd10ac0-2c15-4753-9284-fafe5e8fa7db?version=4.10.3-LIVE.13165946)과 [뒤 모듈](https://api.star-citizen.wiki/api/items/429ea43c-5157-4617-bc13-23ca093cc678?version=4.10.3-LIVE.13165946)의 설명은 각각 36 SCU이며, 기존 커뮤니티 그리드/적재 도표의 36+38=74와도 차이가 있다. 기본형 0을 화물 모듈 구성에 덮어쓰거나, 설명만으로 72로 줄이지 않았다. 모듈별 현재 실제 그리드가 확보될 때 다시 확인한다.
2. **Hull C 4,608 SCU:** Wiki는 384/192 SCU 구역을 각각 8개로 나누고, 기존 배치는 이를 576 SCU씩 8개로 묶는다. 용량은 일치한다. 내부 경계·부착 좌표를 확정하지 않고 임의 분할하면 바깥으로 붙는 방향을 손상할 수 있어 기존 배치를 유지한다.
3. **Phoenix Emerald:** 해당 변형의 4.10.3 원본 부재. 이전 자료와 버전 표시를 보존한다.

## 검증

- 루트 테스트 262개 통과. 앞칸 24 SCU 거부/16 SCU 조합, 구역 겹침 방지, Idris 소형 상자 제한, Syulen 6×1 적재 및 긴 포드 거부 포함.
- 앱 테스트 85개 통과. 기존 운항 사본/재계산 보존 테스트 포함.
- TypeScript 검사·생산 빌드 통과.
- 실제 앱 Chromium 세 함선의 미션 선택→계산→관제, 용량/구역 수, 적재 표시, 저장 운항 보존 모두 통과했고 페이지 오류가 없었다. 결과는 `browser-report.json`, 실제 화면은 `syulen-navigator.png`에 저장했다. 명령: `STAM_QA_GRID_RECONCILE=1 node scripts/check-fleet-support-browser.mjs`.
- 브라우저 확인은 별도 테스트 컨텍스트의 예시 계약이다. Syulen에는 상세 수정 화면으로 1 SCU 상자 6개를 입력한다. 기존 16 SCU 예시는 함선 용량을 넘으므로 그대로 사용하지 않는다. 실제 게임 실시간 검증으로 간주하지 않는다.
