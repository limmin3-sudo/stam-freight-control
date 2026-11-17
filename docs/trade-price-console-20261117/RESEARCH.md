# 가격 관제 구성 조사와 적용 판단

2026-11-17 공개 페이지를 다시 조회했다. [요청 결과/원문 해시](research/sources.json). 11월 16일의 [UEX·SC Trade Tools·Gallog·StarHead 실제 조작/계산 기록](../trade-tools-benchmark-20261116/README.md)도 대조했다. 오늘의 단순 HTML 확인을 새 실사용 검증으로 바꾸지 않는다.

| 근거 | 확인 내용 | 적용 |
|---|---|---|
| [UEX price finder](https://uexcorp.space/trade/price_finder) | SCU당 가격, 매입/판매 구분, 재고의 last/users/avg/min/max, 가격 통계, 버전·갱신·보고자 열을 실제 HTML에서 확인 | 단가/수요/자료 날짜를 같은 행에서 비교. 집계와 현재 보고값을 구분하고 모든 통계 열을 처음부터 복제하지 않음 |
| [SC Trade Tools Best buyer](https://sc-trade.tools/best-buyer) | 오늘 응답은 SPA 셸만 확인. 16일의 일반/도난 32 SCU 판매처 비교 및 En route 3거래 기록에 의존 | 보유 화물 판매와 새로 매입하는 흐름 분리. 판매 총액을 순이익으로 부르지 않음 |
| StarHead·Gallog 이전 실행 기록 | StarHead의 가격 경과일과 상자 구성, Gallog 표본의 시간/거리 0·단위 차이 | 이동 미확인을 0시간으로 표시하지 않음. 출처 숫자를 단위 변환 없이 섞지 않음 |
| [IBM Carbon data table](https://carbondesignsystem.com/components/data-table/usage/) | 비교표에 충분한 폭, 검색/정렬, 단일 행 선택, 보조 정보 펼치기, 필요한 시점에 조회하라는 지침 | 가격표에 75% 공간. 상세 거래처/그래프 설명은 선택 후 표시, 20행씩 렌더링 |
| [NN/g Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | 자주 쓰는 기능은 첫 화면, 덜 쓰는 기능은 명확한 이름으로 접근. 과도한 다단계 접기는 피함 | 가격·보유 화물·거래 입력은 본문. 지도·적재·기록은 한 단계 펼치기로 유지 |
| [WCAG Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) | 색만으로 의미를 전달하지 말고 문자·형태를 함께 제공 | 차익 양/음 방향·0선·정확한 숫자, 수량 비율 숫자, SVG 접근성 이름 |

ONS의 추정한 titles-and-text URL은 404였다. 확인된 자료로 인용하지 않는다. 추가 API/플러그인 설치·로그인·외부 시세 제출·계정 정보 열람은 하지 않았다.

## 사용자가 빠르게 판단할 순서

1. 무엇이 얼마나 실려 있고 내 매입 원가는 얼마인가?
2. 어디에서 얼마에 팔며, 보고 수요가 내 물량을 얼마나 받는가?
3. 가격이 언제 수정됐고 이동 부담은 어느 정도인가?
4. 실제 거래한 수량·단가를 확인하고 기록했는가?

사용 빈도 측정이나 실사용자 테스트를 했다는 뜻은 아니다. 위 순서는 사용자가 지정한 가격 우선 목적과 경쟁 도구 관찰에 따른 구현 판단이다. 이번 브라우저 확인은 그 흐름의 기능/배치 검증이다.
