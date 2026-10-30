# 참고 도구와 반영 내용

이 문서의 비교 표는 초기 구현 때의 조사 기록이다. 현재 구현 범위는 51종 함선과 브라우저 OCR·운항 파트너·함선별 성능 설정까지 확장됐다. 최신 동작과 남은 작업은 [Codex Cloud 인수인계](docs/CLOUD-HANDOFF.md)를 기준으로 확인한다. 색상은 현재 미션별이 아니라 배송 순서의 목적지별이며, 미션 소유권은 별도 ID로 유지한다.

2026-10-30에 공개 화면과 제작자 문서를 확인했다. 각 사이트의 코드를 복사하지 않고 다음 사용 흐름을 독립적으로 구현했다. 공개 설명을 읽은 데스크톱 도구는 실행 파일을 설치하거나 직접 실행하지 않았다.

| 도구 | 확인한 장점 | 이 앱에 반영한 내용 |
|---|---|---|
| [SC Hauling Tools](https://sc-hauling.tools/) | 픽업·배송 통합 경로, 거점별 체크, 3D 화물 계획, 보관 메모 | 거점별 적재 목록, 수량 검증, 실제 위치 메모, 진행 단계 저장 |
| [H.E.L.M.](https://sc-cargo-helper.pages.dev/) | 스크린샷 입력, 미션별 화물 목록, 지도·진행 상태 | 붙여넣기·여러 이미지 입력, 미션 ID별 색상, 수정 가능한 인식 결과 |
| [Freight Planner](https://freightplanner.cipherdispatch.com/) | 제한 시간을 고려한 운송, 분할 운송, 하역 후 납품 확인, 실측 시간 | 제한 시간 우선 고려·초과 위험, 512 SCU 이상 운송 분할, 픽업/하역/납품 체크, 타이머 |
| [GLS Companion](https://github.com/OmegaTron75/GLSCompanion) | Run View, 단계별 Load Sequence / Unload Mode, 현재 화물 강조 | 운송 집중 보기, 작업 전/후 3D 전환, 현재 거점에서 내릴 개별 상자만 강조 |
| [SuperCargo](https://github.com/AquatikJustice/SuperCargo) | 실제 화물판 단위 검사, 단계별 적재, 미확인 수량을 추측하지 않는 흐름 | 독립 그리드 공간 검사, 확정 전 계산 보류, 상자 최대 크기와 실제 개수 구분 |
| [SC DataHub Cargo Planner](https://www.sc-datahub.com/tools/cargo/planner) | 작업별 적재 안내와 실제 배치·경로를 별개로 유지 | 미션을 강조해도 물리 배치와 경로는 유지, 진행 중 계획 변경 방지 |
| [CargoVector 제작자 발표](https://www.reddit.com/r/starcitizen/comments/1x4v7se/cargovector_20_update_multi_crew_hauling/) | 3D Loadmaster, 계약·화물 강조, 실측 기반 시간의 중요성 | 단계와 미션을 연계한 3D 강조, 실측 기록과 가정 ETA를 별도로 표시 |

## Hull B 그리드 확인

공식 [Hull B Q&A](https://robertsspaceindustries.com/en/comm-link/engineering/21085-Q-A-MISC-Hull-B)에서 512 SCU 및 32 SCU 상자를 확인했다. 이후 함선 그리드 데이터 일부를 SuperCargo의 MIT 자료에서 도입했으며 `vendor/SUPERCARGO-LICENSE.txt`를 포함했다. 이는 아래 초기 조사 시점 이후의 확장이다.

SuperCargo의 공개 [cargoGrids.ts](https://github.com/AquatikJustice/SuperCargo/blob/main/src/shared/cargoGrids.ts)에서도 Hull B가 **16개 × 32 SCU, 각 그리드 w=2, l=8, h=2 셀**로 구성됨을 확인했다. 이 수치와 이 앱의 독립 그리드 검사 모델은 일치한다. 해당 파일의 보조 배치 좌표는 정렬된 목록 형태이며, 실제 기체의 X형 부착 방향을 확정하는 근거로 사용하지 않았다. 이 앱의 A1–D4 위치와 X형 모델은 권장 구역 표시다. 원본 코드는 가져오지 않았다.

## 범위

초기 버전은 Hull B 한 대, 브라우저 스크린샷 업로드, 3D 경로와 적재 안내에 집중했다. 현재는 함선 51종을 선택할 수 있다. 게임 메모리·로그 연동, 전역 단축키, Windows 최상단 오버레이, 실시간 팀 공유, 무역·샐비지 계산은 구현하지 않았다. 브라우저의 운송 집중 보기는 다른 앱 위에 고정되는 Windows 오버레이가 아니다.

선택적 AI 서버의 실제 이미지 해석 정확도는 검증되지 않았다. 기본 브라우저 OCR에는 AI API 키가 필요 없지만 실제 스크린샷 사례로 정확도를 추가 검증해야 한다. 지도는 게임 데이터 스냅샷이며, 경로선은 게임 내 퀀텀 경로를 보장하지 않는다.
