# 무역 데이터 조사 / 기능 설계 기준

2026-11-16 읽기 전용 조사 결과다. 자동 갱신 작업이나 실제 무역 기능이 연결됐다는 의미가 아니다. 요청 시간·주소·응답 메타데이터는 [probe-results.json](probe-results.json), 추가 대조는 [probe-details.json](probe-details.json)에 보관했다.

## 사용자 확정

- 시장정보실: 품목·가격·수급과 루트 정보. 루트 정보를 별도 방으로 만들지 않는다.
- 무역계획실: 함선·자본·출발지에 맞는 매입/매도 경로 계획.
- 무역관제실: 거래 진행·목적지·화물·실제 손익. 기존 운송 관제와 구분한다.
- 노신사 = 행성계 내부, 치파오 여성 = 행성계 간. 외형과 역할은 분리해서 유지한다.
- 위험도와 위법 정도를 사용자가 **독립적으로** 선택. 합법·낮은 위험 기본. 구체적인 단계/문구는 구현 시 정리한다.

## 확인한 출처

| 출처 | 실제 확인 | 연결 경계 |
|---|---|---|
| [UEX API](https://uexcorp.space/api/documentation/) | 공개 commodity 205행, commodity terminal 161행 HTTP 200. LIVE+visible 조건은 각각 204/114행 | 모든 행이 유효한 매입/매도 후보인 것은 아님. 서버별 실제 시세/재고 보장 아님 |
| [UEX 가격](https://uexcorp.space/api/documentation/id/get_commodities_prices/) | commodity 1 가격 33행, 4.10.2와 4.10.3 혼재 | 버전·갱신 시점·터미널 유효성 필터 필요 |
| [UEX 경로](https://uexcorp.space/api/documentation/id/get_commodities_routes/) | origin terminal 1 표본 35행 HTTP 200 | 보고 자료 기반 후보이며 현재 사용자 조건의 수익/안전을 보장하지 않음 |
| [UEX 터미널](https://uexcorp.space/api/documentation/id/get_terminals/) | 도킹·상자 크기·로딩 등 메타데이터 문서 | 시세는 시간 단위, 정적 자료는 더 긴 캐시를 고려 |
| [Star Citizen Wiki API](https://api.star-citizen.wiki/) | default version `4.10.3-LIVE.13165946` HTTP 200 | 기존 함선·위치·퀀텀 자료와 ID 대조에 사용 |
| [SC Trade Tools](https://github.com/EtienneLamoureux/sc-trade-tools) | README에 REST/API 토큰 및 MCP 지원 명시. Swagger config는 200, `/v3/api-docs`는 403 | 토큰 없음. 인증 API·MCP는 미연결/미검증. 오래된 버전 조회 URL은 JSON이 아닌 HTML 반환 |
| [Gallog](https://gallog.co/trading) | 웹 교역·품목 조회 후보 | 지원되는 공개 API 미확인. 자동 수집 완료로 보고하지 않음 |

## 구현 권장 순서

1. 출처·버전·관측 시각·수량/통화 단위가 포함된 공통 데이터 형식과 읽기 전용 캐시부터 만든다. 실패 시 마지막 검증 자료 유지. 토큰이 필요한 API는 서버 비밀값으로 처리한다.
2. 시장정보실에 품목/거래소/루트 조회, 갱신 시각·출처·알 수 없는 값 표시를 연결한다.
3. 함선·자본·출발지 입력을 이용한 계획과 위험/합법성 필터를 연결한다. 법규 정보는 관할에 따라 달라질 수 있으므로 단일 illegal 플래그만으로 위법 정도를 수치화하지 않는다. 미확인은 안전/합법으로 분류하지 않는다.
4. 사용자 확인 후 매입/매도 진행·실제 수량/가격·손익을 별도 무역 운항에 기록한다. 가격 변동이나 재고 변화로 기존 운항을 조용히 덮어쓰지 않는다.

추천 수익은 예상치와 가정을 표시하고 실제 거래 기록과 구분한다. 실시간 해적 위치나 위험 확률을 보유한 것처럼 표현하지 않는다. 시세·재고의 오래됨, 불확실한 경로 및 화물 특성은 설명 가능한 근거로 제공한다. 현재는 조사/설계 단계이며 외부 갱신 스케줄·생산 API 어댑터·무역 관제는 미구현이다.
