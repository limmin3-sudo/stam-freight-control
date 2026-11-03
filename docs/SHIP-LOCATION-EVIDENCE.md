# 함선·위치 자동 채움: 추가 로그 확인

2026-11-04 KST. 이미 제공된 Game.log/백업 34개를 읽기 전용으로 다시 확인했다. 개인 이름/ID·원문 파일은 저장소에 넣지 않았다. 아래 집계는 관측한 형식의 수이며 전체 게임 이벤트의 보장 범위가 아니다.

| 기록 | 관측 수 | 확인한 의미 | 자동 채움에 쓰기 전 남은 조건 |
|---|---:|---|---|
| `Vehicle Control Flow` | 234 | 모두 `CVehicleMovementBase::ClearDriver`의 `Local client node … releasing control token` | 조종권 **해제**를 현재 탑승/조종 확인으로 역해석하지 않는다. 제어 획득 기록은 이 표본에서 확인하지 못함 |
| `RequestLocationInventory` | 782 | 지정 Location의 인벤토리 요청. Player 대괄호 내용은 단순 숫자 ID 형식이 아님 | 본인 식별과 장소 코드 매핑, 현재 위치를 증명하는지 검증 필요. 인벤토리 열람을 연속 함선 위치로 바꾸지 않음 |
| `OnPlayerSelectedQuantumTarget` | 248 | Local 항법 목표 선택, 차량 클래스/엔티티와 목적지 코드 포함 | 함선 후보 근거. 목표는 현재 위치가 아니며 동적 비콘 코드를 알려진 장소로 추정하지 않음 |
| `OnQuantumDriveArrived` | 165 | 퀀텀 최종 목적지 도착 알림, 차량 정보 포함 | 같은 엔티티·세션·항법 목표와 대응 필요. 도착 이벤트만으로 실제 XYZ 추적이나 화물 배송 완료를 만들지 않음 |

항법 선택 기록에 나온 차량 클래스는 `RSI_Constellation_Mk5_Centaurus`(115), `MISC_Hull_B`(73), `RSI_Salvation`(40), `RSI_Aurora_Mk2`(12), `MISC_Starfarer`(8)이다. 클래스 뒤의 개인 엔티티 숫자는 보존하지 않았다. 내부 클래스 이름을 함선 표기명으로 임의 치환하지 않는다. 함선별 공개 정의/검증된 별칭 대응이 필요하다.

## 이번 연결 범위

`navigation.mjs`를 기존 줄 파서·로컬 수집기·출항 준비 카드에 연결했다. 같은 입력 파일/교체 세대 안에서 세션 시작·항법 목표 선택·조종권 해제·퀀텀 도착·창고 조회를 분리한다. 타임스탬프/차량 엔티티 일치 검사를 하며 같은 시각의 서로 다른 차량은 보류한다. 조종권 해제는 동일 차량 후보를 지우며, 세션/캐릭터/빌드 경계에서는 이전 후보를 지운다. 퀀텀 도착은 동일 차량의 선행 목표에만 연결한다. 어느 경우에도 좌표·배송·적재 완료를 만들지 않는다.

출항 준비에는 현재 선택한 로그의 최근 2분 이내 **후보**만 표시한다. 2분은 제안 만료 정책이며 정확도를 보증하는 게임 규칙이 아니다. 과거 파일 재생·이전 교체 세대·미래 시각·감시 중단/실패에서는 적용을 제안하지 않는다. 사용자가 `준비 정보에 적용`을 누를 때만 기존 계획 설정을 변경하며, 이번 운항에 맞는지 확인한다. 운송 안내 중에는 후보 적용을 막아 계획을 덮어쓰지 않는다.

현재 지원은 함선 이름/적재 프로필 4개와 이름만 확인한 Centaurus, 정거장 후보 4곳이다. **전체 함선 자동 감지나 현재 위치 추적 구현 완료가 아니다.** 함선 코드나 거점 이름의 유사도·최근 거리로 대상을 추정하지 않는다.

| 로그 클래스 | 공개 이름 | 준비 화면 연결 |
|---|---|---|
| MISC_Hull_B | [MISC Hull B](https://api.star-citizen.wiki/vehicles/misc-hull-b) | 기존 Hull B 프로필 |
| MISC_Starfarer | [MISC Starfarer](https://api.star-citizen.wiki/vehicles/misc-starfarer) | 기존 Starfarer 프로필; Gemini로 치환하지 않음 |
| RSI_Aurora_Mk2 | [Aurora Mk II](https://api.star-citizen.wiki/vehicles/rsi-aurora-mk2) | 기존 Mk II 프로필; Mk I과 구분 |
| RSI_Salvation | [Salvation](https://api.star-citizen.wiki/vehicles/rsi-salvation) | 기존 Salvation 프로필 |
| RSI_Constellation_Mk5_Centaurus | [Constellation Mk V Centaurus](https://api.star-citizen.wiki/vehicles/rsi-constellation-mk5-centaurus) | 적재 프로필 없음. 다른 Constellation으로 대체 금지 |

위 페이지의 공개 버전은 `4.10.2-LIVE.12881860`이다. 이름/클래스 대응 출처이며 현재 게임의 적재칸 치수가 같다는 보증으로 사용하지 않는다.

정거장 코드 `RR_ARC_LEO`/`RR_CRU_LEO`/`RR_HUR_LEO`/`RR_MIC_LEO`의 이름 대응은 [StarCargoTracker locations.rs](https://github.com/tactilebiscuit4/StarCargoTracker/blob/main/src/locations.rs)의 네 정거장 사실 목록을 참고했다(확인 blob SHA `f62e0d7f9361cd2f71ccc6697d7642f489976b50`, MIT). 각각 Baijini Point/Seraphim Station/Everus Harbor/Port Tressler다. 외부 파서 코드는 복사하지 않았다. 커뮤니티 대응값임을 데이터에 남기고 화면에 출처를 표시한다. 우리 장소 목록에서 이름+행성계가 유일하게 일치할 때만 출발지 후보에 적용한다. `Player[...]`의 이름은 버리며 본인 식별이나 현재 정박 확정에 사용하지 않는다. 미등록 코드/동적 비콘은 원문을 노출하지 않고 미확인으로 둔다.

## 검증과 남은 일

- 제공 34개 로그 재생에서 세션 34·항법 목표 248·도착 165·해제 234·창고 782건을 파싱했다. 첫 확인에서 세션 태그 뒤 공백 차이로 34건이 보류되어 수정했고, 수정 후 해당 형식 오류0이다. 기록 수에는 파일 간 중복이 포함된다.
- 세션 ID·플레이어 이름·차량 엔티티 ID·동적 비콘명은 화면/스냅샷/계정으로 내보내지 않는다. 엔티티 번호는 메모리 내부 대응에만 쓴다. 사용자 확인 전 후보는 계획 설정/클라우드에 저장하지 않는다.
- 단위 검사는 다른 차량/세대/파일 혼합·조종권 해제·오래된/미래 시각·이름 미등록·세션 변경·비공개 값 제외를 확인한다. 브라우저는 적용 전 설정 무변경, 명시 적용, 일시정지/재개, 해제/세션/파일 교체, 미지원 적재칸 차단, 모바일, 연결 해제 후 계획 설정 보존을 확인한다.
- 실제 본인 조종 획득·탑승/파티원 함선 구분·정박·연속 위치와 해당 게임 버전의 정확한 클래스/장소 대응은 최종 실게임 검증 대상이다. 이 단계에서는 사용자에게 추가 운항을 요구하지 않았다.
