# 재조사 근거 · 2026-11-18 KST

공개 UI/공식 설명을 다시 읽고 현재 STAM 빌드와 비교했다. 경쟁 도구에 로그인해 게임 거래를 실행하거나 모든 계산을 검증한 것은 아니다. 아래 ‘적용 판단’은 STAM 설계 추천이다.

| 출처 | 직접 확인한 구성 | STAM 적용 판단 |
| --- | --- | --- |
| [UEX Price Finder](https://uexcorp.space/trade/price_finder) | 품목·거래소·매입/판매 구분·가격·수량 통계·패치·갱신 시점 표 | 데이터의 출처/시점을 유지하되 기본 열은 목적별로 줄인다. 종목 시세판은 사용자 첨부와 같은 탐색 역할로 사용한다. |
| [Schaulers Guide](https://schaulers.space/guide) | 자가 자본 무역과 운송 계약/공동 운송을 구분. 경로 목록과 선택 상세, 진행 과정 설명 | 계획과 실행을 같은 조건으로 이어가되 STAM의 실제 거래 명시 확인과 기존 권한을 유지한다. |
| [Schaulers Features](https://schaulers.space/features) | 부분 판매·거점 변경, 함선·자본 기반 경로, 상자/자료 시점 등 조건 설명 | 가격만 높은 후보보다 실제 처리량과 잔량을 보여준다. 여기 있는 모든 자동화/제출 기능을 복제하지 않는다. |
| [Citadel Routes](https://www.citadelsc.com/en/routes) | 함선 검색, 자본, 지역 계층, 품목/장소 검색, 행/카드 보기 | 외워야 하는 거점 드롭다운을 검색·계층 제안으로 대체. 각 도구의 함선 수치를 검증 없이 STAM에 덮어쓰지 않는다. |
| [Gallog Trading](https://gallog.co/trading) | 함선·자본·출발/목적지, 방문 수/복귀 조건 | 경유·연속 거래는 유지하되 기본 화면의 필수 입력으로 만들지 않는다. |
| [SC Trade Tools](https://sc-trade.tools/) | 공식 검색 노출에서 Best Buyer/En Route 도구 확인; 직접 페이지는 JS 셸만 읽힘 | 보유 화물 판매와 목적지 경유를 별도 사용 의도로 유지. 오늘 실사용 검증 완료라고 표시하지 않는다. |
| [UEX 가격 이력 API](https://uexcorp.space/api/documentation/id/get_commodities_prices_history/) | 공개 읽기·커뮤니티 보고 가격/수량·시간 자료 | 보고 시세를 서버 실시간 보장으로 표현하지 않는다. 그래프는 실제 관측만 사용한다. |
| [NN/g 검색 제안](https://www.nngroup.com/articles/site-search-suggestions/) | 제안과 분류가 검색어 선택을 돕는 원칙 | 품목·거점·함선을 구분한 제안, 한영/코드 검색. |
| [Carbon Data Table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) | 표의 검색·정렬·선택·행 세부 구성 | 비교는 정렬된 행, 상세는 선택 후. 모든 조건/상세를 첫 화면에 넣지 않는다. |
| [NN/g Information Scent](https://www.nngroup.com/articles/information-scent/) | 링크 문맥과 명칭이 목적지 예측에 영향을 줌 | 아카데미의 장소명과 함께 ‘무엇을 알 수 있는지’를 노출한다. |

현재 재고나 수요를 외부 사이트만으로 확정할 수 없으며, 순위/시간당 이익에는 시설·적재·대기/비용 가정이 개입한다. 새 UI가 ‘거래 가능 확정’처럼 오인시키면 안 된다.

한국어 표기 추가 확인: 현재 저장소 `data/stam-korean.json`에 Titanium=티타늄, Beryl=베릴, Gold=금, Laranite=라라나이트, Agricium=아그리슘, Distilled Spirits=증류주, Aluminum=알루미늄, Medical Supplies=의료 물자가 있다. 시안은 이8명칭을 사용했다. 한글패치 전체의 최신성 검증을 마친 것은 아니다.
