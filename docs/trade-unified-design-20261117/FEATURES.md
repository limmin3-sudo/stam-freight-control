# 통합 기능 대장

2026-11-17 구현 후 갱신. 기존 조사45행 + 추가27행 + 구성 제안12행 + 사용자 결정4행 = 88행이며 독립 기능88개를 뜻하지 않는다. 공개 기능/작업본/외부 연결·실환경 미검증을 구분한다. 상세 결과: [구현·검증 기록](IMPLEMENTED.md).

| ID | 기능 | 현재 상태 | 배치 | 보존할 동작·제약 | 근거 / 코드 |
|---|---|---|---|---|---|
| T01 | 함선·출발/목적지·자본·적재 한도 / 공통 | 기존 구현 · 공개 | 계획실 / 세부 조건 | 계획실 기본 입력 / 실제 함선 그리드, 공급·수요·자본 한도 검사 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T02 | 예비금 / STAM 사용자 정책 | 기존 구현 · 공개 | 계획실 / 세부 조건 | 켜기/끄기, 비율, 기본 10% / 끔=0 확보, 다시 켬=직전 비율. 예비금은 비용이 아님 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T03 | 순이익·시간당 수익·적은 자본·ROI / SCT·StarHead | 기존 구현 · 공개 | 계획실 / 세부 조건 | 정렬 4종 / 주어진 비용·시간 가정과 함께 계산. 실제 수익 보장 아님 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T04 | 이미 실은 화물 판매처 / SCT Best Buyer | 기존 구현 · 공개 | 계획실 / 세부 조건 | 복수 품목·복수 상자 규격·서로 다른 원가/소유권 묶음 / 원가 미확인은 순이익으로 확정하지 않음. 신규 매입금 불필요 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T05 | 도난·소유권 미확인 / SCT | 기존 구현 · 공개 | 계획실 / 세부 조건 | NQA 표기 판매처 조건, 별도 소유권 입력 / 게임 관할별 실제 수락 가능성을 보장하지 않음 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T06 | 부분 판매·여러 판매처·잔량 / SCT·Arkanis | 기존 구현 · 공개 | 계획실 / 세부 조건 | 수요별 분할 경로, 대안 판매처, 잔량 원가 / 같은 재고나 수요를 경로에서 두 번 사용하지 않음 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T07 | 목적지 경유 / SCT En Route | 기존 구현 · 공개 | 계획실 / 세부 조건 | 목표 거점·허용 우회 비율·최대 구간 / **거리** 우회 기준. 마지막 빈 이동도 비용·시간 포함 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T08 | 왕복·연속 교역 / UEX·Gallog | 기존 구현 · 공개 | 계획실 / 세부 조건 | 선택형 왕복, 연속 최대 5거래 / 기본 강제 귀환 없음. 재방문 때 이미 사용한 공급/수요 차감 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T09 | 직접 방문 순서 / CitizenPad·SC Cargo | 기존 구현 · 공개 | 계획실 / 세부 조건 | 최대 5개 거점 추가·순서 변경·제거, 자동 탐색과 선택 / 지정 순서를 끝까지 도달한 경로만 반환. 거래 없는 구간도 이동 비용·시간 포함 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T10 | 재투자 / Gallog | 기존 구현 · 공개 | 계획실 / 세부 조건 | 켜기/끄기 / 매 구간 실제 예상 현금 흐름, 최초 예비금 확보. 끄면 최초 매입 한도 유지 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T11 | 인근 출발지 / StarHead | 기존 구현 · 공개 | 계획실 / 세부 조건 | 입력한 반경 Gm 내 매입 거점 탐색 / 현재 위치→매입지의 빈 이동도 포함 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T12 | 혼합 품목 / Gallog | 기존 구현 · 공개 | 계획실 / 세부 조건 | 한 구간 복수 품목 바구니 / 자금·수요·전체 용량 공유, 탐색된 실행 가능한 후보 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T13 | 혼합 상자·3D / StarHead·SC Cargo | 기존 구현 · 공개 | 계획실 / 세부 조건 | 1/2/4/8/16/24/32 SCU, 그리드 실제 점유 검사 / 겹침·경계·상자 단위·세로 제한 검사. 전역 최적 적재 보장 아님 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T14 | 화물에 맞는 함선 / SC Cargo | 기존 구현 · 공개 | 계획실 / 세부 조건 | 실제 상자 규격·그리드 기반 함선 목록, 함선 선택 연결 / 보유 화물 또는 첫 거래 화물 기준. 전체 함선 적재의 전역 최적해 보장은 아님. 선택 후 경로 재계산 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T15 | 수동 상자 배치·사용자 정의 그리드 / SC Cargo | 작업본 구현 · 위치 버튼/회전/되돌림 · 그리드 편집 제외 | 계획실 / 적재 상세 | 자동 배치 + 기존 그리드 안의 상자 선택·위치 이동·90도 회전·되돌림 / 수량/소유권/실제 장부 불변. 겹침·경계·지지 검사. 드래그와 그리드 자체 편집은 없음 | docs/trade-suite-20261116/README.md / `CargoLayoutEditor.tsx; cargo-layout-edit.ts` |
| T16 | 최대 상자·시설 / 공통 | 기존 구현 · 공개 | 계획실 / 세부 조건 | 도킹·하역 도크·엘리베이터·자동 적재·급유·NQA·지상/우주·플레이어 소유 / 알려진 필드만 필터. Hull C는 양 끝 하역 도크 필수 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T17 | 품목 포함/제외·거점 제외 / SCT·Gallog | 기존 구현 · 공개 | 계획실 / 세부 조건 | 다중 선택 / 정확한 ID로 제한 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T18 | 행성계·행성권·세력 조건 / UEX·SCT | 기존 구현 · 공개 | 계획실 / 세부 조건 | 포함 행성계/세력, 제외 행성계/행성권/세력 / 수집 원천의 분류가 없는 값은 추정하지 않음 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T19 | 합법성·화물 위험·거점 감시 / UEX·SCT | 기존 구현 · 공개 | 계획실 / 세부 조건 | 독립 위법/위험 선택 + 설비 감시 옵션 / 거점 보안은 항로 전체 위험 점수가 아님 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T20 | 최대 거리·최소 공급량 / UEX·Gallog | 기존 구현 · 공개 | 계획실 / 세부 조건 | 구간 거리·보고 공급 기준 / 미확인 수량을 무제한으로 바꾸지 않음 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T21 | 재고 보충 대기 / SCT·Gallog | 기존 구현 · 공개 | 계획실 / 세부 조건 | 대기 허용·보충률·최대 대기 / 보충률은 **사용자 가정**. 실제 구매에 필요한 부족분만 대기에 반영 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T22 | 자동 상하역·양 끝 비용 / SCT | 기존 구현 · 공개 | 계획실 / 세부 조건 | 자동 적재 설비 필수, SCU당 비용·각 거점 시간 / 수수료는 입력한 가정. 보유 화물은 판매처 하역만 계산 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T23 | 연료·수리 등 비용 / SCT | 기존 구현 · 공개 | 계획실 / 세부 조건 | Gm당 연료 예산·구간 기타 비용·실제 비용 원장 / 소모량 실측 아님. 비용 미입력은 미차감이라고 명시 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T24 | 드라이브별 ETA / StarHead | 기존 구현 · 공개 | 계획실 / 세부 조건 | 호환 드라이브 선택, 가감속·스풀/쿨다운·경유 점프 / 접근·보행·상하역·점프는 조정 가능한 시간 가정. 성능 없으면 ETA 미확인 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T25 | 가격 최대 경과·현재 패치 / 공통 | 기존 구현 · 공개 | 시장정보실 / 품목·거점 상세 | 시간 단위 제한·LIVE 패치 일치 / 오래된 가격을 몰래 포함하지 않음 | docs/trade-suite-20261116/README.md / `TradePriceDesk.tsx` |
| T26 | 평균 가격·수량 / UEX | 기존 구현 · 공개 | 시장정보실 / 품목·거점 상세 | 최근 기록 / UEX 주간 평균 별도 선택 / 평균값 누락 시 최근값으로 대체하지 않음. 평균은 현재 유동성 보장 아님 | docs/trade-suite-20261116/README.md / `TradePriceDesk.tsx` |
| T27 | 주간 최저/최고·가격 이력 / UEX | 기본 공개 · 실제 시계열 작업본 | 시장정보실 / 품목·거점 상세 | 원천 주간 범위·현재 탭의 조회 이력 그래프 / 실제 UEX 보고 시계열 작업본 추가 / 조회하지 않은 과거 시계열을 만들지 않음 | docs/trade-suite-20261116/README.md / `TradePriceHistory.tsx` |
| T28 | 가격 재조회·자동 갱신 / 공통 | 기존 구현 · 공개 | 시장정보실 / 품목·거점 상세 | 계획 선택 품목 재조회, 시장 화면 자동 순회, 기존 일별 수집기 / API 실패 시 마지막 데이터와 날짜 보존. 일별 워크플로 변경은 아직 미배포 | docs/trade-suite-20261116/README.md / `TradePriceDesk.tsx` |
| T29 | 즐겨찾기·가격 알림 / UEX·CitizenPad | 기존 구현 · 공개 | 시장정보실 / 품목·거점 상세 | 소유자별 저장, 임계가 비교 / 알림은 열린 화면에서 동작. 서버 푸시/닫힌 앱 알림 아님 | docs/trade-suite-20261116/README.md / `TradePriceDesk.tsx` |
| T30 | 저장 경로·계획 내보내기 / StarHead | 기존 구현 · 공개 | 계획실 / 세부 조건 | 조건 불러오기·이름 저장·JSON / 저장값은 예상 사본. 현재 시세 재계산 안내 | docs/trade-suite-20261116/README.md / `trade-suite.ts` |
| T31 | 위치별 개인 재고 / Arkanis | 기존 구현 · 공개 | 관제실 / 거래·재고·기록 | 묶음별 창고 보관·회수·소유권·원가 / 이동 중 거래 금지, 다른 거점의 보관 화물 원격 회수 금지 | docs/trade-suite-20261116/README.md / `trade-expedition.ts` |
| T32 | 재고 태그·그룹 / Arkanis | 기존 구현 · 공개 | 관제실 / 거래·재고·기록 | 매입/기존 화물 등록에 태그, 품목·위치·태그 검색, 위치/품목/소유권별 그룹 / 부분 판매·보관·회수·되돌리기 뒤 태그 보존. 검색은 화물 수량·손익에 영향 없음 | docs/trade-suite-20261116/README.md / `trade-expedition.ts` |
| T33 | 실제 손익·진행 / CitizenPad | 기존 구현 · 공개 | 관제실 / 거래·재고·기록 | 매입/판매/비용/손실/출발/도착/마감 / 센트 단위 잔여 원가 배분, 미확인 원가와 실현 이익 분리 | docs/trade-suite-20261116/README.md / `trade-expedition.ts` |
| T34 | 외부 수입·자본 변경 | 기존 구현 · 공개 | 관제실 / 거래·재고·기록 | 잔액 보정과 사유 기록 / 교역 이익으로 더하지 않음. 되돌리기 가능 | docs/trade-suite-20261116/README.md / `trade-expedition.ts` |
| T35 | 계획 변경·남은 경로 | 기존 구현 · 공개 | 관제실 / 거래·재고·기록 | 확인 후 경로 변경, 이전 경로 이력 / 선내 화물·원가·거래는 보존. 실제 수량과 다른 계획은 거부 | docs/trade-suite-20261116/README.md / `trade-expedition.ts` |
| T36 | 감사·백업·CSV | 기존 구현 · 공개 | 관제실 / 거래·재고·기록 | 마지막 이벤트 취소 표시, JSON 백업, 거래 CSV / 동일 소유자·빈 장부로만 복원, 기존 이력 덮어쓰기 금지 | docs/trade-suite-20261116/README.md / `trade-expedition.ts` |
| T37 | 모바일 / CitizenPad | 기존 구현 · 공개 | 공통 / 반응형 | 반응형 화면·영문·동작 줄이기 / 390px 실제 브라우저 흐름 확인 | docs/trade-suite-20261116/README.md / `trade-monitor.css` |
| T38 | 키오스크 스크린샷 OCR / Companion·Datarunner | 기존 구현 · 공개 | 시장정보실 / 품목·거점 상세 | 기존 Tesseract 재사용, 원본·원문·명확한 라벨 값 제안·수정·선택 확인 / 실제 OCR 엔진+합성 스크린샷 검증. 실게임 OCR 정확도 검증 아님 | docs/trade-suite-20261116/README.md / `TradePriceDesk.tsx` |
| T39 | CSV 시세 수집 / Companion | 기존 구현 · 공개 | 시장정보실 / 품목·거점 상세 | 단위 필수·ID 필수·인용/줄바꿈 지원·검토 후 반영 / UNIT 가격×100, SCU 수량. 원본 UEX 자료와 구분 | docs/trade-suite-20261116/README.md / `TradePriceDesk.tsx` |
| T40 | 외부 공개 시세 제출 / Companion·Datarunner | 사용자 확정 제외 · 추가하지 않음 (2026-11-17) | 활성 화면 연결 제외 | 추가 구현/연결/무료 대체 재개 안 함 / 기존 로그인·운항·개인 교역·초대 코드 공동 교역과 함장 승인/정산 유지; 초안 보존 | docs/trade-suite-20261116/README.md / `TradeExternalReport.tsx; uex-submit.mjs; server/cloud/index.mjs` |
| T41 | 서버 예측 수요 / UEX Predicted | 원천 미확인 · 동등 모델 없음 | 계획실 / 수급 가정 | **같은 예측 모델 미연결** / 원천 예측 알고리즘·보장 가능한 최신 예측값 없음. 주간 평균/가정한 보충률로 명시적 시나리오 비교 가능 | docs/trade-suite-20261116/README.md / `trade-suite.ts (가정 비교만)` |
| T42 | 비공개·미표시 거점 / SCT·Gallog | 가용 근거 미확인 · 유효 거점으로 노출하지 않음 | 시장정보실 / 출처·제외 자료 | **수집 대상 아님** / LIVE·공개 거래소 카탈로그만 사용. 실제 원본 161개 중 LIVE이면서 is_visible=0인 거점은 0개였다. 비활성 거점을 활성 거래소로 위조하지 않음 | docs/trade-suite-20261116/README.md / `trade-data.ts` |
| T43 | 게임 내 오버레이·전역 F3·음성/키 입력 / Arkanis·Wingman·Companion | 웹/앱 구현 · 실제 Windows 오버레이/단축키 통과 · 마이크/게임 미검증 | 공통 / 로그 앱 연동 | STAM 조회·화면·오버레이 제어. 게임 키 전송 없음 / 웹의 기능 이식과 별도 Windows 앱·게임 제어 기능. 실제 게임 실행 검증도 현재 불가 | docs/trade-suite-20261116/README.md / `CompanionDisplay.tsx; desktop/CompanionOverlay.cs` |
| T44 | 교역 로그 자동 거래 확정 | 미구현 · 실제 로그 근거 필요 | 관제실 / 거래 제안 수신함 | **미연결** / Game.log가 전체 가격·수량·체결·소유권을 제공한다는 근거 없음. 임의 거래 확정 금지 | docs/trade-suite-20261116/README.md / `별도 앱 + 실제 거래 검토` |
| T45 | 교역 장부 클라우드 동기화 | 기존 구현 · 공개 | 공통 / 저장 상태 → 계정 저장 | 개인 무역 계정 저장·충돌 비교·복원 공개, 운영 확인 완료 / 별도 trade namespace, 두 장부 함께 저장, 충돌 비교·교체 전 백업. [현재 상태](../academy-cloud-20261117/README.md). 운영 계정 검증은 남음 | docs/trade-suite-20261116/README.md / `use-trade-cloud.ts` |
| X46 | 한글·영문 품목/거점 검색 보완 | 작업본 구현 | 시장/계획/관제 공통 검색 | 원문·번역·별칭을 함께 검색; 선택과 필터 보존 / 기존 저장·사용자 결정 보존 | docs/trade-workflow-audit-20261117/README.md / `trade-labels.ts` |
| X47 | 함선·모듈 검색과 실제 용량 | 작업본 UI · 프로필은 공개 | 계획실 / 함선 선택 | Galaxy64/720/68과 Liberator400 등 기존 프로필 재사용; 모듈별 설명 / 기존 저장·사용자 결정 보존 | docs/fleet-catalogue-20261117/README.md / `ShipSelect.tsx` |
| X48 | 현재 방문 잔여 매입·다음 작업 | 작업본 구현 | 관제실 / 현재 할 일 | 부분 매입·재방문·재계획을 반영하고 실제 거래는 확인 후 기록 / 기존 저장·사용자 결정 보존 | docs/trade-workflow-audit-20261117/README.md / `trade-workflow.ts` |
| X49 | 개인 정산·전체 기록 검색 | 작업본 구현 | 관제실 / 기록·정산 | 현금흐름·실현손익·남은 원가 분리, 품목/거점/상태/정렬/CSV / 기존 저장·사용자 결정 보존 | docs/trade-workflow-audit-20261117/README.md / `TradeRunReview.tsx` |
| X50 | 가격 중심 관제·작은 비교 그래프 | 기존 구현 · 공개 | 관제실 / 가격 비교 | 품목25%·가격표75%, 차익/수요/주간 범위와 정확한 숫자 / 기존 저장·사용자 결정 보존 | docs/trade-price-console-20261117/README.md / `TradeControlPrices.tsx` |
| X51 | 파트너 호출·행성계 내부/간 역할 | 기존 구현 · 공개 | 계획실 / 범위 선택, 관제 / 담당자 호출 | 수석 교역관=내부, 링 가문 중개인=행성계 간. 큰 초상으로 가격표를 가리지 않음 / 기존 저장·사용자 결정 보존 | docs/trade-planning-20261116/README.md / `TradeSuite.tsx` |
| X52 | 파트너별 별도 추천 전략 | 작업본 구현 · 명시적 추천 조건 적용 | 계획실 / 추천 이유 | 현재 범위 필터와 구별. 내부는 반복/접근 부담, 행성계 간은 점프/대체 판매처를 설명; 정렬은 사용자가 선택 / 기존 저장·사용자 결정 보존 | docs/trade-tools-benchmark-20261116/README.md / `TradeSuite.tsx` |
| X53 | 공동 교역 개설·초대·참여 승인·폐기 | 작업본 UI · 운영 서버 검증 완료 | 함대 / 교역 선택·참여 | 비공개7일 초대, 승인 전 읽기 차단, 목록/새 로그인 복원 / 기존 저장·사용자 결정 보존 | docs/crew-production-20261117/README.md / `CrewTradePanel.tsx + crew-cloud.mjs` |
| X54 | 함대원 함선·용량·참여 관리 | 작업본 UI · 운영 서버 검증 완료 | 함대 / 구성원 관리 | 함선·적재 한도·활성 상태; 화물과 거래가 남은 사람 제거 방어 / 기존 저장·사용자 결정 보존 | docs/trade-workflow-audit-20261117/README.md / `CrewTradePanel.tsx + crew-trade.mjs` |
| X55 | 함대 담당 화물·경로 배정 | 작업본 UI · 운영 서버 검증 완료 | 함대 / 배정 | 품목·출발/판매처·수량·상자·담당자; 선택 개인 계획의 첫 매입 참조 / 기존 저장·사용자 결정 보존 | docs/trade-workflow-audit-20261117/README.md / `crew-trade.mjs` |
| X56 | 함대원 진행 상태·문제 메모 | 작업본 구현 | 함대 / 내 작업, 함장 / 진행 현황 | 준비/적재/출발/이동/하역/완료/문제; 본인 상태만 변경 / 기존 저장·사용자 결정 보존 | docs/trade-workflow-audit-20261117/README.md / `CrewTradePanel.tsx` |
| X57 | 공동 출자·매입·판매·비용·손실 보고 | 작업본 UI · 운영 서버 검증 완료 | 함대 / 거래 보고 | 확인한 실제 총액/수량만 제출; 승인 전 공동 장부 미반영 / 기존 저장·사용자 결정 보존 | docs/crew-production-20261117/README.md / `crew-cloud.mjs` |
| X58 | 함장 보고 승인·반려·취소 이력 | 작업본 UI · 운영 서버 검증 완료 | 함대 / 승인 대기 | 중복 반영 방지, 반려 사유·승인취소 보존; 동시 수정 충돌 / 기존 저장·사용자 결정 보존 | docs/crew-production-20261117/README.md / `crew-cloud.mjs + crew-trade.mjs` |
| X59 | 공동 원금·손실·이익 정산 | 작업본 UI · 운영 서버 검증 완료 | 함대 / 마감·정산 | 출자 비례 기본, 이익만 사용자 비율. 잔여 화물/보고 차단. 확정 원장 잠금 / 기존 저장·사용자 결정 보존 | docs/crew-production-20261117/README.md / `crew-trade.mjs` |
| X60 | 공동 실제 지급·수령 확인·내보내기 | 작업본 UI · 운영 서버 검증 완료 | 함대 / 정산 결과 | 게임 송금과 별개, 함장 지급과 당사자 수령 분리, JSON/CSV / 기존 저장·사용자 결정 보존 | docs/crew-production-20261117/README.md / `crew-cloud.mjs` |
| X61 | 모집·함대 검색 | 사용자 확정 제외 · 추가하지 않음 (2026-11-17) | 활성 화면 연결 제외 | 추가 구현/연결/무료 대체 재개 안 함 / 기존 로그인·운항·개인 교역·초대 코드 공동 교역과 함장 승인/정산 유지; 초안 보존 | docs/trade-workflow-audit-20261117/README.md / `신규` |
| X62 | 공동 교역 대화 | 작업본 구현 · 2계정 대화/권한 검증 | 함대 / 대화·공지 보조 영역 | 작전별 대화/공지. 거래 보고·승인을 채팅 메시지로 대체하지 않음 / 기존 저장·사용자 결정 보존 | docs/trade-workflow-audit-20261117/README.md / `CrewGovernance.tsx` |
| X63 | 오피서 권한 위임 | 사용자 확정 제외 · 추가하지 않음 (2026-11-17) | 활성 화면 연결 제외 | 추가 구현/연결/무료 대체 재개 안 함 / 기존 로그인·운항·개인 교역·초대 코드 공동 교역과 함장 승인/정산 유지; 초안 보존 | docs/trade-workflow-audit-20261117/README.md / `server/freight-domain.mjs; CrewGovernance.tsx` |
| X64 | 함대 전체 화물·경로 추천 배정 | 작업본 구현 · 제한 탐색/공동 자금·공급·수요 검사 | 함대 계획 / 배정안 비교 | 공유 자금/공급/수요와 각 함선/시설 제약; 제안 검토 후 적용 / 기존 저장·사용자 결정 보존 | docs/trade-workflow-audit-20261117/README.md / `fleet-allocation.ts; FleetAllocation.tsx` |
| X65 | 공개 거래 게시판 | 작업본 구현 · 로그인 제안/24시간 만료 · 미배포 | 시장정보실 / 거래 게시판 | 품목·수량·거점·만료·연락 조건. 게임 거래 실행/가격 검증과 분리 / 기존 저장·사용자 결정 보존 | docs/trade-workflow-audit-20261117/README.md / `TradeBoard.tsx; server/freight-domain.mjs` |
| X66 | 앱 종료 후 가격·작전 알림 | 사용자 확정 제외 · 추가하지 않음 (2026-11-17) | 활성 화면 연결 제외 | 추가 구현/연결/무료 대체 재개 안 함 / 기존 로그인·운항·개인 교역·초대 코드 공동 교역과 함장 승인/정산 유지; 초안 보존 | docs/trade-workflow-audit-20261117/README.md / `server/price-alerts.mjs; FreightPushSettings.tsx` |
| X67 | 운송 정보실·아카이브 자료 재사용 | 기존 구현 · 공개 | 아카데미 / 운송 정보실 | 미션·함선·화물·패치·출처를 공통 카탈로그로 재사용 / 기존 저장·사용자 결정 보존 | docs/academy-cloud-20261117/README.md / `FreightArchive.tsx` |
| X68 | 초반 평판 계약 유형·미션 조합 비교 | 기존 구현 · 공개 | 아카데미 / 교육실 | 발주처/수량/상자/공통 거점 비교; 실측 없는 평판/시간 순위 금지 / 기존 저장·사용자 결정 보존 | docs/academy-cloud-20261117/README.md / `AcademyEducation.tsx` |
| X69 | 운송·무역 강의·노하우·읽음 | 7개 공개 · 2개 작업본 추가 | 아카데미 / 교육실 | 검색·주제·현재 탭 읽음, 가격 신뢰도와 부분 정산 추가 / 기존 저장·사용자 결정 보존 | docs/academy-cloud-20261117/README.md / `academy-lessons.ts` |
| X70 | Hull B 6계약/363SCU 사례 연구 | 기존 구현 · 공개 | 아카데미 / 작전 연구실 | 실제 비식별 예시; 통합/계약별 경로·지도·적재 비교; 실제 운항 불변 / 기존 저장·사용자 결정 보존 | docs/academy-cloud-20261117/README.md / `AcademyStudy.tsx` |
| X71 | 새 통합 둘러보기·운송/무역 튜토리얼 | 후속 구성 대상 · 사용자 확정 | 전 시설 가이드 / 분리 연습 | 라운지 패널·확대 강조; 아카데미→무역→라운지→셔틀→관제. 실제 기록과 연습 분리 / 기존 저장·사용자 결정 보존 | docs/academy-cloud-20261117/README.md / `가이드 레지스트리 · 연출 인계 필요` |
| X72 | 시설 진입·복귀 연출·파트너 배치 | 연출 담당 범위 | 각 시설 로비 → 기존 모니터 | 새 기능 URL/방 ID 연결; 승인 인물·배경·패널 보존 / 기존 저장·사용자 결정 보존 | docs/academy-cloud-20261117/README.md / `FacilityLobby.tsx / SpaceExperience.tsx` |
| N01 | 개인/함대 작업 전환 | 작업본 구현 · 모드 전환/장부 보존 검증 | 관제실 / 모드 | 같은 프레임에서 활성 교역만 표시. 장부 혼합 없이 개인/함대 교역ID 복원 / 구성 확정 후 구현; 기능 삭제 없이 재배치 | 이번 사용자 관점 설계 / `TradeWorkspace.tsx` |
| N02 | 현재 할 일과 막힌 이유 | 작업본 연결 · 잔여 작업/입력·권한 오류 안내 | 관제실 / 상단 작업 요약 | 다음 위치·행동·남은 수량·승인 필요를 짧게. 제안이며 자동 실행하지 않음 / 구성 확정 후 구현; 기능 삭제 없이 재배치 | 이번 사용자 관점 설계 / `TradeSuite.tsx; CrewTradePanel.tsx` |
| N03 | 시장→계획→관제의 조건 인계 | 작업본 구현 · 품목/출발지 조건 전달 | 각 방 연결 | 품목/거점/함선/위험/가격 시각 전달, 되돌아오면 검색·스크롤·선택 복원 / 구성 확정 후 구현; 기능 삭제 없이 재배치 | 이번 사용자 관점 설계 / `MarketInformation.tsx; FacilityLobby.tsx` |
| N04 | 선택 후보 비교 | 작업본 구현 · 최대 3후보 비교 | 계획실 / 결과 상단 | 최대3후보의 자본·이익·시간·잔량·자료 시점·시설 제약을 같은 조건으로 비교 / 구성 확정 후 구현; 기능 삭제 없이 재배치 | 이번 사용자 관점 설계 / `TradeRouteCompare.tsx` |
| N05 | 필터 요약·조건별 해제 | 작업본 구현 · 활성 조건별 해제 | 시장·계획 / 검색 옆 | 활성 조건 개수와 요약; 결과0이면 어떤 조건을 풀지 제안, 자동 완화 금지 / 구성 확정 후 구현; 기능 삭제 없이 재배치 | 이번 사용자 관점 설계 / `TradeConditionSummary.tsx` |
| N06 | 거래 입력 한곳으로 통합 | 작업본 구현 · 개인 거래 공통 입력/미리보기 | 관제실 / 선택 행 옆 거래 영역 | 가격 선택→수량/단가/총액→기록. 독립 수동 입력도 같은 폼 재사용 / 구성 확정 후 구현; 기능 삭제 없이 재배치 | 이번 사용자 관점 설계 / `TradeSuite.tsx; TradeControlPrices.tsx` |
| N07 | 가격 변경·수요 부족 영향 비교 | 작업본 구현 · 첫 거래 가격/부분 판매 민감도 | 계획 검토 / 현재 작업 알림 | 현재 참고가와 이전 계획 차이, 유지/재계산 선택. 실제 원가와 장부 불변 / 구성 확정 후 구현; 기능 삭제 없이 재배치 | 이번 사용자 관점 설계 / `TradePriceScenario.tsx` |
| N08 | 함대 내 작업 우선·승인 수 표시 | 작업본 구현 · 내 담당 우선/승인 대기 표시 | 함대 관제 / 기본 화면 | 함대원은 본인 배정/보고, 함장은 병목/미승인 중심. 전체 현황은 접근 가능 / 구성 확정 후 구현; 기능 삭제 없이 재배치 | 이번 사용자 관점 설계 / `CrewTradePanel.tsx` |
| N09 | 저장 상태·문제 한곳 안내 | 기존 저장 진입점 재사용 · 오류는 해당 작업에 표시 | 모니터 공통 상태 영역 | 저장됨/기기만/충돌/오프라인. 계정 설정·백업은 동일 상세 진입점 / 구성 확정 후 구현; 기능 삭제 없이 재배치 | 이번 사용자 관점 설계 / `TradeWorkspace.tsx; TradeCloudPanel.tsx` |
| N10 | 설명에서 실제 기능으로 이동 | 작업본 구현 · 공동 교역/시장 판단 수업→도구 | 아카데미 / 관련 기능 | 예비금·분할판매·가격시점·미션조합 설명에서 해당 화면 조건만 제안 / 구성 확정 후 구현; 기능 삭제 없이 재배치 | 이번 사용자 관점 설계 / `academy-lessons.ts; AcademyLessons.tsx` |
| N11 | 닫았다 돌아와도 입력 유지 | 작업본 구현 · 계정/탭별 계획·보기·검색 조건 복원 | 모든 내부 화면 | 검토 중 초안/필터 유지, 계정별 분리. 외부 제출과 거래는 자동재실행 금지 / 구성 확정 후 구현; 기능 삭제 없이 재배치; 목록 스크롤과 거래 미확정 확인창은 복원하지 않음 | 이번 사용자 관점 설계 / `use-trade-view.ts; TradeControlPrices.tsx; TradePriceDesk.tsx` |
| N12 | 자금/손익·보고 수급의 의미 통일 | 기존 계산 재사용 · 원금/미판매 원가/실현 손익 검증 | 가격표·결과·정산 공통 | 단위와 출처·보고시각 함께. 실제/예상/가정·0/미확인 일관 표시 / 구성 확정 후 구현; 기능 삭제 없이 재배치 | 이번 사용자 관점 설계 / `crew-trade.mjs; trade-expedition.ts` |
| A01 | 함대 디렉터리·함대 개설·가입/초대/승인 | 사용자 확정 제외 · 추가하지 않음 (2026-11-17) | 활성 화면 연결 제외 | 추가 구현/연결/무료 대체 재개 안 함 / 기존 로그인·운항·개인 교역·초대 코드 공동 교역과 함장 승인/정산 유지; 초안 보존 | 이번 사용자 답변 / desktop/Launcher.cs / desktop/bridge.mjs / `FleetDirectory.tsx; server/freight-domain.mjs` |
| A02 | 로그 앱 현재 작업·오버레이 표시 | Windows 요약/클릭 통과/만료 삭제/복원 통과 · 미배포 | 로그 앱 / 표시할 작업 | 운송·개인·함대 요약, 창 크기/위치/투명도·클릭 통과·최종 수신 시각 / 기존 기능·자료 보존 | 이번 사용자 답변 / desktop/Launcher.cs / desktop/bridge.mjs / `CompanionDisplay.tsx; FlightOperations.tsx` |
| A03 | STAM 전역 단축키·명령 음성 | Windows 전역 단축키 통과 · 음성 허용 명령 검사 · 실제 마이크 미검증 | 로그 앱 / 단축키·음성 | 사용자 확정: STAM 조회/화면만. 거래 확정과 게임 입력 없음 / 기존 기능·자료 보존 | 이번 사용자 답변 / desktop/Launcher.cs / desktop/bridge.mjs / `desktop/CompanionOverlay.cs` |
| A04 | 앱·웹 버전 협상·연결 복원 | protocol1/표시2/세션 만료·Windows 재시작/설치 복원 검증 · 미배포 | 공통 / 앱 연결 상태 | 기존 로그 수신·트레이·재연결 유지, 새 기능은 capability 협상 후 사용 / 기존 기능·자료 보존 | 이번 사용자 답변 / desktop/Launcher.cs / desktop/bridge.mjs / `integration/log/companion-state.mjs; integration/log/live-server.mjs` |
