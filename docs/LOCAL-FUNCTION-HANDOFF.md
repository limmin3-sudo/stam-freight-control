# 기능 로컬 인계 — STAM FREIGHT CONTROL

2026-11-12 KST · 작성: 기능 클라우드 Codex · 이번 요청은 **인계 문서와 보존 브랜치 커밋·푸시까지**다. main 병합·푸시·배포는 하지 않는다. 아래 우선순위는 로컬에서 이어갈 작업이며 이 문서 작성 과정에서 구현 완료한 것으로 읽지 않는다.

## 1. 먼저 받을 것과 현재 기준

| 구분 | 브랜치 / 고정 커밋 | 의미 |
| --- | --- | --- |
| 최신 통합 기준 + 이 인계 문서 | `handoff/local-studio-20261110` | 이번 문서 작성 시작 시 코드는 `4990780702b2ff56290aca884b9b749b3ddf7a90`. 이 문서가 포함된 최신 커밋을 받는다. |
| 아직 통합하지 않은 기능 작업 | [`handoff/function-ui-20261112`](https://github.com/limmin3-sudo/stam-freight-control/tree/handoff/function-ui-20261112) · [`de2042f3920e77aab43618786682a366489710fb`](https://github.com/limmin3-sudo/stam-freight-control/commit/de2042f3920e77aab43618786682a366489710fb) | 클라우드 폴더에만 있던 미션 콘솔·입체지도·적재 작업/자산/재현 검사를 이번에 저장했다. 기준은 **e1d9f0d**이며 셔틀 연결 **4990780은 포함하지 않는다**. |
| 별도 연출 PR | [PR #23](https://github.com/limmin3-sudo/stam-freight-control/pull/23) · `cinematic/guide-restoration-20261112` · `3c6f2822574c518fe4e52f22da584b7c7409c838` | 조회 시 open·미병합, `mergeable:false`. 안내데스크/라운지 원본 복원 작업. 셔틀 탑승 영상은 여기에 없다. 상태는 로컬 시작 시 다시 확인한다. |
| 공개 사이트 | `main` · `4990780702b2ff56290aca884b9b749b3ddf7a90` · beta 2.2.0 | 셔틀 연결까지 배포된 상태. **이 문서 작성으로 공개 버전은 바꾸지 않는다.** |

“최신으로 받아와”의 기본 대상은 개발 인계 브랜치다. **그 브랜치를 받는 것만으로 별도 기능 작업본이 자동 통합되지는 않는다.** 위 두 브랜치를 비교한 뒤 별도 통합 작업 브랜치에서 진행한다. 기존 로컬 변경/브라우저 데이터는 보존한다. 폐기된 다른 체크아웃이나 재작성 전 Git 이력을 합치지 않는다.

## 2. 최신 개발 인계에 이미 있는 기능

아래는 4990780의 실제 코드/기존 검증 기록을 기준으로 한 목록이다. 이 문서 작성 때 모든 실게임·계정 기능을 다시 시험했다는 뜻은 아니다.

| 영역 | 이미 있는 것 | 주요 파일 / 주의 |
| --- | --- | --- |
| 미션 입력·운송 초안 | 로그 수신/편집, 수신 카드, 수동 입력, 스크린샷 검토, 기존 백업, 계약을 운송에 담고 계산 | `MissionConsole.tsx`, `use-log-receipts.ts`, `receipt-edit.mjs`, `use-flight.ts`. 최신 별도 시안의 **카드 직접 선택 흐름**과 구분. OCR 경로가 아직 있어 §5에서 처리 필요. |
| 총량·적재 엔진 | 미션·배송지별 배송 총량 예약, 여러 픽업 유지, 상자 소유권과 실제 선적 위치 유지, 그리드 제외/부착 방향 | 루트 `delivery-totals.mjs`, `engine.mjs`, `ships.mjs`, 앱 `cargo-plan.mjs`, `flight-session.ts`. 엔진이 있다고 새 React 화면의 최대치/입력 전달 문제까지 해결된 것은 아니다. |
| 파트너별 경로 | 오퍼레이터 간편 경로, 항해사 상세 적재; 행성권 픽업/배송, 재방문·이동 비용을 고려하는 기존 탐색 | `route-only.mjs`, `route-cost.mjs`, `route-regions.mjs`, `route-departure.mjs`, `travel.mjs`, `flight-engine.mjs`. 최적해 보장/실제 운항 시간 보장 없음. |
| 실제 운항 진행 | 출발→픽업→배송/점프, 시작·일시정지·완료·직전 작업 되돌리기·재개, 선적 위치 보존, 완료 기록 | `FlightOperations.tsx`, `RunDetails.tsx`, `flight-session.ts`, `use-flight.ts`, `flight-history.mjs`. 기능은 있으며 **사용자가 원하는 진행 중심 화면 재배치**는 미완료. |
| 미션 자료 | SCMDB만으로 미션 유형·설명·보상·수량 규칙 보완, 검증된 LIVE 일일 갱신/실패 시 이전 스냅샷 유지 | `scripts/refresh-missions.mjs`, `.github/workflows/pages.yml`, [자료 정책](MISSION-DATA-RECONCILIATION.md). 목록의 기본값/범위는 수주별 실제 보상이나 수량의 확정값이 아니다. |
| 함선·퀀텀 | 기본 장착 적용, Wiki 기반 같은 규격 드라이브 비교/기존 명시적 선택 보존 | `quantum.mjs`, `performance.mjs`, `data/quantum-drives.json`, [퀀텀 자료](QUANTUM-DRIVE-DATA.md). 미션 자료의 SCMDB 정책과 분리한다. 새 기본 미션 흐름에 퀀텀 선택을 다시 요구하지 않는다. |
| 계정·서비스 | 게스트/계정 분리, 기존 로그인/동기화·충돌 선택, 운송 완료 기록·서비스센터 | `ServiceAccountHistory.tsx` 및 기존 계정 모듈. 실계정/다른 기기 검수는 별도. |
| 이용안내·정보 | 기존 전용 안내의 빠른 시작 기본값, 수량 근거/적재/경로 설명, 기존 자료 화면 | `guide-page.mjs`, `guide-data.mjs`, `operations-intel.html`, `operations-intel.mjs`, `intel-model.mjs`. 새 공간의 정보실은 아직 자료 링크 중심이며 완성된 새 정보 UI가 아니다. |
| 공간·영상 | 라운지/관제센터, 안내데스크 접근·대기·복귀, 승인 셔틀 탑승→관제센터 | `SpaceExperience.tsx`, `GuideDesk.tsx`, `ShuttleBoarding.tsx`. 최신 셔틀은 공개 원본을 사용자 제공 편집 사양으로 재현한 9.208초 파일. 승인 클라우드 파일과 바이트 해시가 다름. [영상 상세 인계](cinematics/shuttle-boarding-20261112/HANDOFF.md). |

## 3. 별도 기능 보존 브랜치에만 있는 작업

모두 `de2042f`에 있다. 최신 개발 인계나 main에 병합했다고 오해하지 않는다.

| 작업 | 구현 상태 | 주요 파일 |
| --- | --- | --- |
| 모니터 내부 미션 콘솔 | 실제 화면 구현. 전체 화면의 내부 UI, SUIT/유리 패널, 함선·출발지·파트너, 카드 직접 선택, 접힌 보완 입력. 사용자에게 보여준 첫 미션 시안은 긍정 피드백을 받음. | `MissionConsole.tsx`, `mission-screen.css`, `ControlRoom.tsx` |
| 미션 수량 연결 보완 | 최대치 기본 포함 버튼, 배송지 총 SCU 즉시 반영, 계산 직전 입력 적용, 실제/총량/최대치 구분, 다중 픽업의 임의 분배 없이 한 번 예약, 종료·충돌/운항 중 편집 보호 | `mission-quantities.mjs`, `flight-engine.mjs`, `use-flight.ts`, `use-log-receipts.ts`, `mission-screen.test.ts` |
| 독립 입체지도 | **왼 지도 / 오른 방문 순서**, 구 `starmap.mjs` 조작 엔진 재사용, 방문-지도 선택 연결, 출발 구간 포함, 항성계/거점 탐색, 관제 지도 어댑터 공유 | `MapConsole.tsx`, `NavigationChart.tsx`, `chart-appearance.ts`, `OperationsMap.tsx`, `starmap.mjs` |
| 천체·배경 표현 | 구체 행성 표면·구름·대기, 항성계별 성운, 별 가림. Stanton 파랑 / Pyro 호박빛 / Nyx 청록. 생성 표면 1774×887이며 게임 지형 원본/4K가 아님. 일부 천체는 공용 질감. | `celestial-materials.ts`, `assets/celestial/manifest.json` |
| 마지막으로 선택한 항성 | **개편 후 중간 버전의 `assets/stellar-plasma.png`**. 실제 3D 위치의 정면 VFX 스프라이트. 사용자가 “저게 제일 낫다”라고 선택. 개편 전 셰이더와 반려된 신규 플라스마/튜브 홍염으로 되돌리지 않는다. | `starObject` 어댑터, [승인 표현 캡처](https://github.com/limmin3-sudo/stam-freight-control/blob/de2042f3920e77aab43618786682a366489710fb/docs/function-review-20261112/star-approved.png) |
| 적재 3D 후속 | 실제 그리드·금색 부착면, 도색 면/금속 프레임/잠금봉/별도 SCU 명판, 프레임 포함 실제 상자 선택, 같은 그리드 갱신 시 카메라 유지, 방문 작업 후 배치 미리보기. **마지막 적재 후속 표현은 아직 사용자 최종 승인 없음.** | `cargo-scene.ts`, `cargo-look.ts`, `cargo-workspace.css`, `CargoWorkspace.tsx`, `MapConsole.tsx` |
| 비교/보존 자료 | 테마 3종·서체 3종·버튼/화면 시안, 합성 계약과 실제 앱 캡처, 기존 guide/intro 준비·폐기 자료 | `docs/function-design-archive-20261112/`, `docs/function-review-20261112/`, `prototypes/`. 시안의 도식/가상 격납고 제안을 제품 기능으로 복구하지 않는다. |

자세한 구현 기록은 보존 브랜치의 [미션](https://github.com/limmin3-sudo/stam-freight-control/blob/de2042f3920e77aab43618786682a366489710fb/docs/MISSION-CONSOLE-SCREEN.md), [지도·적재](https://github.com/limmin3-sudo/stam-freight-control/blob/de2042f3920e77aab43618786682a366489710fb/docs/NAVIGATION-AND-CARGO-REVIEW.md), [천체 재질](https://github.com/limmin3-sudo/stam-freight-control/blob/de2042f3920e77aab43618786682a366489710fb/docs/CELESTIAL-MATERIALS-REVIEW.md)을 참고한다. 과거 “미커밋·미푸시”나 최초 항성 실험 문장은 작업 당시 기록이다. 이 인계와 각 문서의 최신 정정이 우선한다.

### 통합 전에 이미 확인한 문제

1. **셔틀 연결 누락 위험:** 보존본은 e1d9f0d 기반이다. `SpaceExperience.tsx` 통째 덮어쓰기는 최신 `ShuttleBoarding` import, `boarding` 분기, 종료·취소 연결을 잃게 한다.
2. **정정 — 지도 라우트 교체와 관제센터 전경을 구분:** 보존본에서 `<StantonHologram .../>`와 `mapDock`을 제거한 것은 확인했으나, 기준 코드의 `StantonHologram.tsx`는 `if(!expanded)return null`이며 `expanded`는 `route.screen === 'map'`일 때만 참이다. 따라서 호출 제거만으로 `#/bridge` 전경의 홀로그램이 사라졌다고 판단한 앞선 인계는 잘못됐다. **테이블 홀로그램 복원 지시는 철회한다.** 기존 지도 라우트를 `MapConsole`로 교체한 흐름과 셔틀 연결을 확인한다. 전경 배경은 두 브랜치 모두 `space-config.ts`의 `control-room-empty-seats-reference.png`이며 인물·안내 문구도 공통이다. 기능 브랜치 통합만으로 전경이 새 디자인으로 바뀌지 않는다. 사용자에게 전경 스크린샷이 기대와 다르다는 지적을 받았으므로 이 전경을 최종 승인본으로 취급하지 않는다. 연출 로컬의 실제 실행 경로·커밋·승인 캡처를 대조하기 전 임의 복원/교체하지 않는다.
3. **OCR 요구 불일치:** 최신 통합본과 보존본 모두 `ScreenshotIntake.tsx` → `contract-intake.mjs` → `ocr.mjs/createOCRReader` 경로가 있다. 사용자는 OCR로 글자/숫자를 읽는 것을 원하지 않았다. 수동 검토 버튼이 있다는 이유로 이 요구를 충족했다고 보고하지 않는다.
4. **관제·서체 통일 미완료:** `FlightOperations`의 진행 기능은 있지만 현재 4패널/적재 비중을 사용자 최종 의도대로 정리하는 작업은 남아 있다. 보존 미션/지도/적재는 SUIT, 기존 `operations-glass.css`는 Pretendard Desk라 전체 서체가 통일된 상태가 아니다.

## 4. 유지해야 할 마지막 사용자 요구사항

- 개편 목적은 잘 쓰던 도구를 보존하면서 입력 단계와 중복 버튼을 줄이는 것. 미션 수주→수량 보완→경로/적재 계산→운항 진행이 한 계획을 사용해야 한다. 그래픽 변경을 이유로 기능을 삭제하지 않는다.
- 기능 담당은 **모니터 안의 실제 UI·기능**, 연출 담당은 장소·인물·이동 영상. 영상 마지막에는 화면 내용만 브라우저 전체에 차게 이어진다. 메뉴 바로가기와 공간 이동 두 경로를 유지한다. UI를 정지 이미지 속 글자로 대체하지 않는다.
- 전체 분위기는 실사 SF + 입체 홀로그램. 단순 사무용 표/버튼으로 끝내지 않는다. 마지막 미션 구현의 SUIT 방향을 다른 화면에도 일관되게 적용하되 전체 디자인 최종 승인을 받았다고 주장하지 않는다.
- **오퍼레이터는 경로 안내, 적재는 사용자가 직접 한다.** 행성권에서 픽업 후 그 권역을 떠나면 실은 묶음의 배송을 먼저 마친다. 수량/상자 자동 배치를 필수 단계로 넣지 않는다.
- **항해사는 여러 계약의 경로+적재.** 불필요한 같은 거점/행성권 재방문을 줄이는 것을 거리보다 우선한다. 용량·픽업 선행·배송 조건 때문에 필요한 재방문은 남을 수 있으며 “항상 무재방문/전역 최단”으로 표시하지 않는다.
- 수량 정보는 **상자 크기별 개수 확인 / 실제 총 SCU 확인 / 최대 SCU 기준 예상** 세 단계다. 최대치 예상 기본 포함 버튼을 제공하며 실제 수량과 구별한다. 최대치도 모르면 항해사 자동 계산에서 제외/보완 사유를 표시한다. 모든 계약에 상한이 있다고 단정하지 않는다.
- 배송지 총 SCU는 **미션별·배송지별 한 번 예약**한다. 여러 픽업을 방문해도 22를 32로 되돌리거나 픽업마다 22씩 중복 예약하지 않는다. 픽업 분배·상자 구성이 불명확하면 확인된 사실처럼 만들지 않는다. 동일 품목/규격도 계약·운송 항목·상자 ID를 섞지 않는다.
- 가변 계약의 과거 수량을 다음 수주에 자동 재사용하는 기록/학습 기능은 제외한다. 이것은 **완료 운송 기록·계정 이력 삭제 요청이 아니다**. 실제 수량은 현재 로그 근거 또는 사용자의 입력을 우선한다.
- 미션 유형·내용·보상·규칙은 **SCMDB만** 사용하고 Wiki 미션 fallback을 복구하지 않는다. 자동 갱신 실패 시 이전 검증 자료를 보존한다. 함선/퀀텀 자료의 Wiki 출처는 별도이며 erkul과 섞지 않는다. 기본 준비에서 퀀텀 선택을 요구하지 않는다.
- 대기권 상승→퀀텀 가능 고도, 접근 NAV→약 10km SCM→저속 착륙의 계산은 근사다. 함선별 성능/가속 정보와 가정을 구분하고 무거운 함선의 실제 질량·중력·항력까지 정확히 계산했다고 주장하지 않는다. 출발 도시부터 첫 픽업까지 방문/운항 순서에 포함한다.
- 적재는 **실제 함선 그리드만**, 한 3D 화면에서 회전. Hull B/C 바깥쪽, RAFT/Golem OX 아래쪽, 일반 그리드 위쪽. 임의 함선 외형/방 전체 바닥 금지. 부착면은 은은한 균일 금색, 적재 용적은 3D 경계로 표시. 실체 상자 넓은 면은 배송지 색, 프레임은 중립 금속. 이미 실린 위치를 재배치하지 않는다.
- 예측 상자와 실제 확인 상자를 구별한다. 카드/경로/3D/안내에서 같은 근거를 표시한다. 숫자 입력칸을 매번 펼치지 않고 계산 결과를 먼저 보여주고 ‘수정’으로 편집한다.
- 지도는 기존 좋은 조작을 유지하고 **왼쪽 입체지도 / 오른쪽 방문 순서**. 새 항성 버전 선택은 위 §3을 따른다. 별도의 “개편 전 항성” 복구는 반려됐다.
- 튜토리얼과 무역 브로커의 실제 기능은 아직 준비 중. 튜토리얼 담당은 운항 파트너가 아니라 향후 튜토리얼 진입이다. 소개만 있는 상태를 완성 기능으로 보이지 않게 한다. 최신 인물/초상·배경은 연출 담당의 승인 자산을 따른다.

## 5. 남은 작업 — 우선순위 / 보류 / 결정

| 우선순위 | 작업 | 완료 기준 |
| --- | --- | --- |
| **P0 첫 작업** | 최신 통합본과 보존 기능 작업을 별도 로컬 통합 브랜치에서 연결·대조 | §6의 사용자 흐름 통과. 셔틀 연결 유지 및 관제센터 전경과 독립 지도 라우트 구분. 전경 디자인은 연출 담당의 승인 자료와 대조. 공개/main은 변경하지 않는다. |
| **P1** | 관제 콘솔을 운항 진행 중심으로 정리 | 현재 위치·다음 거점·이번 픽업/배송·주요 완료/되돌리기가 중심. 적재 3D는 필요할 때 상세 보기. 미션·지도·관제·새로고침에서 같은 세션/선적 좌표 유지. |
| **P1** | OCR 경로 제거/비사용 흐름 정리 | 로그/SCMDB/직접 입력만으로 수주·보완 가능. OCR 글자·숫자가 자동 채움/확정 근거로 들어오지 않음. 기존 스크린샷은 필요 시 수동 참고로 보존. 대체 자동 읽기 방식을 임의 도입하지 않음. |
| **P1** | 수량 근거·예약·상자 수정의 화면 간 일치 | 아래 합성 32→22 테스트와 다중 미션·다중 픽업·운항 중 재계산/되돌리기 검수. 미확인 상자 구성을 실제처럼 표시하지 않음. |
| **P2** | 적재/지도 품질·성능·접근성 마무리, 서체 통일 | 실제 GPU에서 프레임 시간/메모리/선택/가독성 확인. 마지막 항성 유지. 적재 후속 화면과 관제 배치 사용자 검토. 테마 전체 재설계부터 다시 시작하지 않음. |
| **P2** | 새 정보실/이용안내의 가독성과 최신 화면 일치 | SCMDB 유형/내용/보상 범위 설명, 빠른 시작 기본, 사진 늘림 없음, 수량 세 단계/예약/경로 가정 설명. 기존 자료 링크를 “새 정보실 완성”으로 보고하지 않음. |
| **실사용 검수** | 실제 Game.log 자동 수신, Windows 연결 앱, 실계정/다른 기기 기록 | 실제 사용자 환경에서 계약 갱신·중복/종료·새로고침·권한·계정 충돌 확인. 현재 합성 브라우저 검사로 대체하지 않는다. |
| **연출 담당 대기** | 이륙 영상·최종 엔진/이륙/착륙음, 나머지 공간/콘솔 왕복 영상 | 승인 자산과 첫·끝 프레임/오디오 사양 수령 후 기능 담당이 연결. 미확정 자료를 현재 흐름에 붙이지 않는다. |
| **나중에** | 실화면 단계별 튜토리얼, 브로커 무역, 본격 AI 대화 | 현재는 소개/대화 준비 틀. 새로운 기능 사양과 착수 지시 이후 구현. |

**제외/되돌리지 않을 것:** erkul 혼합, Wiki 미션 fallback, 수주 간 가변 수량 자동 재사용, 필수 퀀텀 선택 단계, 오퍼레이터 자동 적재 강제, 가상 함선/방 바닥, 반려 항성/초상/이륙 영상, 사진/영상 프레임을 실제 UI로 위장하는 전환, 큰 bloom으로 표면을 하얗게 만드는 표현.

**아직 결정/승인 필요한 것:** 마지막 적재 후속 표현과 관제 최종 배치의 사용자 수락, 추가 자동 입력 방식, 미완성 연출 자산. 입체지도 이름은 코드에서 ‘입체 항로지도’를 쓰지만 사용자가 정확한 최종 명칭을 확정했다고 단정하지 않는다. 전체 테마/모든 행성 품질·실제 GPU 성능 승인은 아직 아니다. GitHub Contributors에 도구 이름을 넣는 별도 운영 요청은 기능 구현 완료로 처리하지 않았으며 허위 커밋 저자를 만들지 않는다.

## 6. 로컬에서 바로 시작할 첫 작업

**목표: 새 기능을 더 추가하기 전에, 최신 셔틀/전경을 잃지 않고 미션→입체지도→관제 흐름을 통합 검증한다.**

### A. 최신 통합본 동작부터 확인

1. 현재 폴더의 `git status --short --branch`와 로컬 변경을 먼저 확인한다. 깨끗하면 `git fetch origin` 후 `handoff/local-studio-20261110`에서 `git pull --ff-only`. 변경/분기가 있으면 reset/clean/stash 자동 실행 없이 별도 폴더에 최신 사본을 받는다.
2. `AGENTS.md` → 이 문서 → `PROJECT_STATUS.md` 최상단 → [셔틀 인계](cinematics/shuttle-boarding-20261112/HANDOFF.md)를 읽는다.
3. Node 22.12 이상. 의존성이 없거나 lockfile이 달라졌을 때만 `npm ci --prefix apps/control-room`. `npm run dev:control-room` 또는 `start-control-room-preview.cmd`. 기본 `http://127.0.0.1:5173/#/lounge?lang=ko`.
4. 기존 사용자 계약에 테스트를 섞지 않도록 별도 브라우저 프로필/시크릿 창에서 확인한다. 라운지 **탑승 게이트 원형 표식** → 9.208초 셔틀 → 자연 종료 후 관제센터. 바로가기·취소/Esc도 확인한다. `#/bridge?lang=ko` 전경의 기준 캡처를 남긴다. 배경에 보이는 홀로그램과 실제 지도 렌더러를 혼동하지 않는다.
5. `#/mission?lang=ko`에서 ‘계약 가져오기’ → ‘예시 계약 …건 보기’ → 카드 선택 → ‘이번 운송에 담기’ → ‘항로 계산’의 현재 흐름을 확인한다. 바로 선택만으로 담기는 새 흐름은 아직 이 기준본에 없다.

### B. 보존본을 가져와 통합 작업 브랜치에서 비교

```sh
git fetch origin handoff/function-ui-20261112:refs/remotes/origin/handoff/function-ui-20261112
git show --stat de2042f3920e77aab43618786682a366489710fb
git switch -c work/function-integration-20261112
# 위 switch는 최신 개발 인계에서 시작. 기존 동일 이름이 있으면 덮어쓰지 않는다.
git merge --no-commit --no-ff origin/handoff/function-ui-20261112
```

충돌을 자동으로 한쪽 선택하지 않는다. 아직 main이나 개발 인계에 병합하는 명령이 아니다. 충돌 목록/변경 내용을 확인하고 `SpaceExperience.tsx`의 최신 셔틀 분기와 관제센터 전경을 유지하면서 `#/map` 독립 화면을 연결한다. AGENTS/PROJECT_STATUS 같은 인계 문서는 최신 통합 기록과 보존본 기록을 둘 다 남긴다. PR #23은 별도 범위이므로 이때 자동 병합하지 않는다.

먼저 볼 파일 순서:

1. `SpaceExperience.tsx` / `ShuttleBoarding.tsx` / `StantonHologram.tsx`: 셔틀·전경·전용 지도 라우트와 Escape 소유권.
2. `ControlRoom.tsx` / `MissionConsole.tsx` / `mission-quantities.mjs` / `use-flight.ts`: 단일 초안과 선택·총량 전달.
3. `MapConsole.tsx` / `NavigationChart.tsx` / `OperationsMap.tsx`: 왼 지도/오른 순서, 지도 어댑터 공유.
4. `FlightOperations.tsx` / `flight-session.ts` / `cargo-plan.mjs` / `cargo-scene.ts`: 진행/되돌리기·실제 선적 위치·예상 배치 구분.

### C. 버튼 단위 수락 검사

- `#/mission?lang=ko` → **예시 계약 보기** → 카드 두 개 선택. 별도 담기 버튼 없이 선택 계약이 저장되어야 한다. 출발지와 함선 선택, 파트너 ‘브리지 오퍼레이터’ → **선택한 계약으로 경로 계산**: 경로만 생성하고 적재 3D를 요구하지 않는다. 항해사로 바꿔 **선택한 계약으로 경로·적재 계산**을 누르면 상세 적재가 있어야 한다.
- **계약 백업 · 불러오기** → 보존본 `docs/function-review-20261112/pooled-reservation.json` 가져오기 → 파트너 항해사. 이 파일은 실제 사용자 계약이 아닌 합성 검사다. 최대치 포함 상태에서 32 SCU, 배송지 입력에 **22**를 넣고 계산하면 예약/최대 적재량이 22가 되어야 한다. Lorville/New Babbage 두 픽업은 모두 유지되고 임의 픽업별 분배를 만들지 않는다. 0 입력은 오류를 표시하며 이전 계획을 보존한다. 최대치 포함 해제 시 미확인 상태로 계산할 수 없어야 한다.
- 계산 후 `#/map?lang=ko`: **왼 지도 / 오른 방문 순서**. 출발지→첫 픽업 포함. 드래그 회전·우클릭/Shift 이동·휠 확대·거점 검색·Stanton/Pyro/Nyx·Esc 상위 보기. 방문 카드를 누르면 해당 구간으로 맞춰진다.
- 항해사 방문에서 **적재 3D 보기** → 상자 클릭: 계약/배송지가 맞아야 한다. 닫기/Esc와 시점 조작만으로 운항 진행이 바뀌면 안 된다. 일반 그리드, Hull B 바깥쪽, RAFT/Golem OX 아래쪽 부착 방향과 비활성 그리드 제외를 확인한다.
- **관제에서 운항 진행** → **운항 시작** → **출발 완료 / 접수 완료 / 배송 완료 / 거점 작업 완료**(현재 거점에 따라 다름) → **직전 작업 되돌리기**. 실제 선적 위치·독립 소유권·방문 단계가 맞고, 미션/지도 왕복 및 새로고침 후 같은 상태가 유지되어야 한다.
- `#/bridge` 전경과 `#/lounge` 셔틀을 다시 확인한다. 이전 지도 컴포넌트를 전경용으로 무조건 복원하지 않는다. 한국어/한영/영어, 390px에서 메뉴·입력·닫기 접근과 가로 넘침도 확인한다.

**첫 작업 완료:** 위 검사와 관련 테스트/빌드 통과, 셔틀·전경·계약·선적 위치 손실 없음, 변경 파일/캡처/잔여 문제 기록. 그 후 P1 관제 배치 작업으로 넘어간다. 첫 통합 검수가 끝났다는 이유로 main 배포하지 않는다.

## 7. 검증된 범위와 미검증 범위

| 대상 | 실제 검증 |
| --- | --- |
| 이번 보존본 인계 재검증 | 루트 `npm test` **232개 통과**, 앱 `npm run test:control-room` **12개 테스트 파일 통과**, TypeScript/Vite 빌드 성공. 기존 큰 chunk 경고 유지. |
| 이번 보존본 브라우저 재검증 | `check-mission-screen-browser.mjs`: 직접 선택, 오퍼레이터/항해사 분리, 새로고침·화면 왕복, 390/1366px 및 KO/mix/EN, 32→22 예약과 다중 픽업 유지, 잘못된 값 보호, 운항 중 편집 잠금. `check-navigation-browser.mjs`: 회전/팬/줌·위성 검색·3항성계·구간 선택·상자 소유권·운항 상태 보존·관제 공용 지도·카메라 유지. [로그/캡처](https://github.com/limmin3-sudo/stam-freight-control/tree/de2042f3920e77aab43618786682a366489710fb/docs/function-review-20261112). |
| 이전 같은 코드 검증 | `check-cargo-detail-browser.mjs`: 실제 상자 선택·Cutlass/Hull B/RAFT·그리드 제외/복구·카메라/상태 보존. `check-celestial-occlusion.mjs`: 전경이 배경 별을 가림. 승인 항성의 자산 요청/렌더러 오류 검사. 이번 문서 작업에서 이 세부 검사를 전부 다시 돌린 것은 아니다. |
| 최신 통합본 4990780 | 셔틀 작업 때 루트 232개, 앱 11개 테스트 파일, 빌드/릴리스 검사와 공개 Pages 배포 성공. 공개 사이트에서 실제 자연 종료·소리·취소/Esc·바로가기·모바일·오류/차단 대응 확인. 운항 데이터 보존의 구체적 합성 계획 검사는 로컬 앱에서 수행. |
| PR #23 | 해당 PR 작성자가 보고한 검증. 기능 클라우드가 이번 인계에서 PR을 병합하거나 전체를 재실행한 것이 아니다. |
| 미검증 | **두 작업본을 합친 결과**, PR #23과의 결합, 전경 홀로그램 복구 후 전체 흐름, 실제 Game.log/Windows 감시/실계정·기기 간 동기화, 실물 모바일, 사용자 GPU 성능/VRAM/장시간 사용, 대기권·중량 실측, 모든 계약의 상한/보상 완전성. |

보존본/통합 작업본에서 재현:

```sh
npm test
npm run test:control-room
npm run build:control-room
node scripts/check-mission-screen-browser.mjs
node scripts/check-navigation-browser.mjs
node scripts/check-cargo-detail-browser.mjs
node scripts/check-celestial-occlusion.mjs
```

브라우저 스크립트는 실행 중인 Vite가 필요하다. 기본 5182이므로 로컬 5173이면 `STAM_MISSION_URL=http://127.0.0.1:5173/`를 설정한다. `STAM_PLAYWRIGHT_MODULE`은 설치한 Playwright의 **실제 index.mjs 경로**, `STAM_CHROMIUM`은 실제 브라우저 실행 파일 경로로 지정한다. `/opt/codex/...` 기본값은 클라우드용이며 Windows에서 그대로 실행되지 않는다. PowerShell은 `$env:STAM_MISSION_URL='http://127.0.0.1:5173/'` 형식을 사용한다. 새 셔틀 검사는 `STAM_SHUTTLE_URL`을 쓴다. 도구 설치/경로를 맞추지 않은 실패를 제품 오류로 단정하지 않는다.

브라우저 지도/적재 검증은 소프트웨어 GPU와 낮춘 DPR을 포함하며 실기기 성능 결과가 아니다. 합성 예시 계약과 실제 UI/계산 엔진을 사용했다. `docs/function-design-archive-20261112`의 SVG 지도/화물 시안은 계산 검증 자료가 아니다.

## 8. 연출 담당과 겹치는 파일 / 전달 경계

| 공유 위치 | 기능 담당이 보존할 것 | 연출 담당과 조율할 것 |
| --- | --- | --- |
| `SpaceExperience.tsx` | `useFlight`, 라우트/모달/키보드, 전경과 전용 지도 분리, 셔틀 종료/취소 | 장면 배경·인물·영상 진입/복귀. **동시에 파일 전체 교체 금지.** |
| `GuideDesk.tsx`, `guide-desk-template.html`, `tools/prepare-guide-desk.mjs`, `assets/guide/*` | 안내→미션/정보 이동, 종료/정리 콜백 | [PR #23 파일별 인계](https://github.com/limmin3-sudo/stam-freight-control/blob/3c6f2822574c518fe4e52f22da584b7c7409c838/docs/cinematics/guide-restoration-20261112/INTEGRATION.md). 생성 파일 수정은 생성기에도 반영. |
| `ShuttleBoarding.tsx`, `assets/travel/shuttle-boarding.mp4` | 승인 재현본·소리/실패/건너뛰기/정리 동작 | 향후 승인된 이륙/도착 구간과 접점. 현재 미확정 자료 연결 금지. |
| `ControlRoom.tsx`, `console-display.css`, `console-hud.css`, `mission-screen.css`, `map-console.css` | 실제 화면 안의 입력/조작·반응형·모니터 내부 탐색 | 영상 마지막 프레임과 화면 좌표/테두리. 외부 방 장면을 UI 안에 다시 넣지 않음. |
| `StantonHologram.tsx`, `hologram-scene.ts`, `hologram-projection.ts`, `celestial-materials.ts` | 위치·선택·항로 데이터와 기존 조작, 승인 항성 자산 | 관제센터 전경 투사광과 독립 지도 표현을 구분. 한쪽 개선 때문에 다른 화면의 호출을 지우지 않음. |

이번 인계에서 PR은 새로 만들거나 병합하지 않았다. 보존 브랜치와 최신 인계 브랜치만 푸시한다. **로컬 기능 담당의 시작점은 최신 인계 문서와 두 브랜치 대조이며, 과거 클라우드 경로나 수동 ZIP 업로드가 필요하지 않다.**
