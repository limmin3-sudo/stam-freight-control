# 4.10.3 함선 선택·적재 지원 보완

2026-11-14 기능 클라우드 / `integration/freight-division-20261113` / 기준 HEAD `916b067`.
사용자 승인 범위: 신규 함선과 기존 그리드 차이 조사·반영, 두 파트너의 실제 기능 확인. 앞선 미커밋 서비스센터/지도/적재/UI/데이터 작업을 보존했다. 배포·커밋·푸시는 하지 않았다.

## 반영

| 선택 항목 | 적재 용량 | 주요 규칙 |
|---|---:|---|
| Anvil Liberator | 400 SCU | 128·192·80 SCU의 실제 구역 치수; 80 SCU 구역은 상자당 최대 16 SCU |
| RSI Galaxy | 64 SCU | 후방 격납고 좌우 32 SCU; 각 상자는 최대 16 SCU |
| RSI Galaxy (Cargo Module) | 720 SCU | 기본 64 + 좌우 모듈 512 + 모듈 리프트 144 SCU |
| RSI Galaxy (Medical Module) | 68 SCU | 기본 64 + 의료 모듈 보관 4 SCU |
| Aegis Hammerhead | 40 → 64 SCU | 현재 GS 차량의 4×2×8셀 그리드; 32 SCU 상자 2개 적재 가능 |
| Drake Ironclad | 2160 → 2200 SCU | 기존 주 화물칸 유지 + 8 SCU 보관 구역 5개. 보관 구역은 1 SCU 상자만 허용 |

선택 목록은 93 → 97개 구성. 함선을 고르면 해당 구성의 성능·기본 퀀텀·그리드가 함께 선택된다. 별도 모듈 편집기/필수 퀀텀 선택 화면을 만들지 않았다. Galaxy 3구성은 표시 이름이 유사해도 서로 다른 실제 vehicle UUID와 로그 class로 연결한다.

- `scripts/reviewed-fleet-profiles.mjs`: 확인한 6개 구성/변경을 관리한다. Wiki가 보고한 치수·개수·용량을 매번 대조하며 다르면 전체 갱신 전에 중단한다. 같은 UUID의 좌우 그리드 두 개를 하나로 합치지 않는다.
- `scripts/refresh-fleet.mjs`: 위 검증을 기존 자동 갱신에 포함한다. 이미 저장된 새 함선의 배치는 다시 초기화하지 않는다. 기존 보정 `reference-hull` 3종도 유지한다.
- `data/ships.json`, 성능/퀀텀/로그 ID/그리드 감사 자료 갱신. 현재 치수 대조는 97종 중 91종 일치, 나머지 6종은 별도 출처·모듈/분할/부재 기록을 유지한다.
- `CargoWorkspace.tsx`, `cargo-optics.css`: 새 구역 배치는 치수를 실제 자료대로, 구역 간 간격은 개략도로 표현한다. 관제 적재 화면에서도 이 구분이 보이도록 표시한다. 이미지/선체 모델을 새로 만들거나 정확한 부착 좌표라고 표시하지 않는다.
- `flight-engine.mjs`, `use-flight.ts`, `flight-receipts.ts`, `held-cargo.ts`: 진행 중 재계산은 저장된 plan.ship을 사용한다. 일반 재계산·계약 변경 확인·선내 보류 하역 처리에서 갱신된 기본 그리드로 기존 운항을 교체하지 않는다. 새 운항에만 새 기본 그리드가 적용된다.

## 근거와 충돌 해결

- [CIG 4.10.3 패치 노트](https://robertsspaceindustries.com/en/comm-link/Patch-Notes/21429-Star-Citizen-Alpha-4103), [CIG 개발 소식/담당자 글](https://robertsspaceindustries.com/en/community/devtracker): Galaxy·Liberator LIVE 출시 근거. Wiki API의 ship-matrix `in-concept` 표시가 여전히 남아 있으므로 이 오래된 항목만 보고 출시 함선을 제외하지 않았다.
- [Wiki Liberator 현재 버전](https://api.star-citizen.wiki/api/vehicles/609ce4ca-0f46-44a5-b6d3-2c2f87417126?version=4.10.3-LIVE.13165946)
- [Wiki Galaxy 기본](https://api.star-citizen.wiki/api/vehicles/01051d26-084e-4b4f-9566-ebd2251db0aa?version=4.10.3-LIVE.13165946), [화물 모듈](https://api.star-citizen.wiki/api/vehicles/e50eb3fc-bbc1-4baf-8878-8e8ca7e832ce?version=4.10.3-LIVE.13165946), [의료 모듈](https://api.star-citizen.wiki/api/vehicles/42724505-2d5b-41ec-adb1-e4c2ee4e855c?version=4.10.3-LIVE.13165946)
- [Wiki Hammerhead](https://api.star-citizen.wiki/api/vehicles/395f30ae-f930-4929-b881-d711fde7e70f?version=4.10.3-LIVE.13165946), [Ironclad](https://api.star-citizen.wiki/api/vehicles/c42bf65e-f3f2-4234-8c19-8276bfd5de3a?version=4.10.3-LIVE.13165946)
- [Ratjack 4.10.3 화물 도해](https://ratjack.net/Star-Citizen/Cargo-Grids/CargoGrids4103.pdf), [SC Cargo 그리드 참조](https://sc-cargo.space/): 치수·상자 조합·구역 구성을 교차 확인했다. 외부 앱 코드나 도해 이미지를 제품에 복사하지 않았다. 사실 자료의 구역 치수/관계를 참고한 개략 배치다.
- Wiki의 `max_scu_box` 파생 값이 실제 `max_size`와 일치하지 않는 경우가 있다. 예: 2.5×10×2.5m는 32 SCU 형상인데 파생 값은 16으로 나온다. Hammerhead/Liberator/Galaxy 화물칸은 도해의 실제 32 SCU 적재 조합과 교차 확인했다. Ironclad 주 화물칸의 1 SCU 기본값도 그대로 최대치로 적용하지 않았다.
- Ironclad 커뮤니티 자료의 2216은 주 화물칸 2160 + 보관 구역 40 + 이동용 승강기 16이다. 현재 Wiki 정식 화물 그리드 총량은 2200이다. 보관 구역 40은 복구하되 이동용 승강기 16을 계획 용량에 추가하지 않았다. 보관 구역 최대 상자는 Wiki `max_size`, SuperCargo의 `maxSize:1`, Ratjack의 40×1 SCU 조합을 사용한다.
- 기존 SuperCargo의 Ironclad `autoLoad:false` 보관 구역은 원래 기능 누락의 원인이었다. 이번에는 위 세 근거로 제한을 확인한 5구역만 명시적으로 추가했다. 다른 함선의 제외 구역을 일괄 활성화하지 않았다.

## 남겨둔 범위

- **Gatac Hyun**: LIVE 파일에 차량·32 SCU 그리드가 있지만 현재 날짜 기준 공식 출시/사용 가능 근거가 부족하다. [Wiki 항목](https://starcitizen.tools/Hyun)에 미래 출시일이 있어 현재 운항 가능 근거로 쓰지 않는다. 선택 목록에 추가하지 않고 로그 식별 자료는 유지한다. 그리드의 최소·최대 상자가 8 SCU로 동일하므로 향후 추가 시 일반 상자를 무조건 허용하면 안 된다.
- Phoenix Emerald: 이전 작업과 동일하게 현재 Wiki 변형 부재. 4.10.2의 해당 변형 자료를 명시 유지한다.
- Idris-P/Caterpillar/Syulen/Hull C의 분할 그리드 차이, Retaliator의 모듈 차이는 기존 사용 가능한 배치를 유지했다. 모양 배열이 다르다는 이유만으로 사용자의 부착 방향을 바꾸지 않았다.
- 실게임 적재·Hyun 출시 확인·실물 GPU 장시간 확인은 수행하지 않았다.

## 검증

- 루트 259개 + 앱 85개 통과. TypeScript 및 생산 빌드 통과.
- 문서화된 최대 적재 조합을 실제 packBoxes로 계산: Liberator 400, Galaxy 64/720/68, Hammerhead 64 SCU.
- Ironclad 보관 구역만 켠 경우 1 SCU 40개 적재 성공, 2 SCU 상자 거부; 이동 승강기 미포함 확인.
- Galaxy 모듈별 로그 class → 서로 다른 선택 ID 확인.
- 신규 4구성에서 오퍼레이터/항해사 계산 모두 확인. 오퍼레이터는 경로 전용, 항해사는 올바른 용량과 16 SCU 배송 총량 유지.
- 현재 기본 Hammerhead 64와 과거 저장 40 SCU를 함께 재현하여, 재계산 후 과거 그리드 치수·좌표·선내 상자 소유권/위치 보존을 확인.
- Chromium 실제 생산 빌드에서 신규 4구성 × 2파트너 = 8개 흐름 통과. 선택→예시 계약→Worker 계산→관제 이동, 항해사 적재 상시 표시/오퍼레이터 미마운트, 이동 전후 저장 상태 일치, 페이지 오류 없음 확인. 결과 및 캡처는 같은 폴더의 `browser-report.json`과 PNG에 기록했다. 브라우저 예시 계약 확인은 실제 게임 로그 실시간 연결 검증과 구분한다.

커밋·푸시·배포 없음. 이전 4.10.3 인계의 “신규 선택 함선 미추가 / Hammerhead·Ironclad 유지”는 이번 작업으로 갱신된다. 앞선 UI 작업을 함께 보존한 상태에서 이어갈 것.
