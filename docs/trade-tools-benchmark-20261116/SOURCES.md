# 조사 출처와 확인 범위

확인일: 2026-11-16 UTC. 아래는 조사 때 실제로 열린 URL과 문서다. 개인 계정 로그인 없이 공개 정보만 읽었다. 가격/패치/제품 상태는 이후 변경될 수 있다.

| 출처 | 읽은 자료 | 확인 수준 |
|---|---|---|
| UEX | https://uexcorp.space/trade/routes | 실제 입력/필터/결과/툴팁 |
| UEX | https://uexcorp.space/trade/price_finder | 공개 HTML의 가격 찾기 화면 확인; 별도 계산 미검증 |
| UEX | https://uexcorp.space/api/documentation/ | API 2.0·제한·인증·데이터 성격 설명 |
| UEX | https://uexcorp.space/api/community_made | 공식 커뮤니티 도구 목록 |
| UEX | https://uexcorp.space/about/terms | API 조항·데이터 검증 책임·웹사이트 이용 범위 |
| SC Trade Tools | https://sc-trade.tools/trade-routes | 실제 계산·조건 변경·대형 함선 표본 |
| SC Trade Tools | https://sc-trade.tools/best-buyer | Laranite 32 SCU 일반/도난 조건 계산 |
| SC Trade Tools | https://sc-trade.tools/en-route | Everus→Seraphim 우회 25% 실제 3거래 결과 |
| SC Trade Tools | https://sc-trade.tools/help | 커뮤니티 자료/재고/대기 한계 설명 |
| SC Trade Tools | https://github.com/EtienneLamoureux/sc-trade-tools | README·토큰/MCP 연결 요건, 디렉터리 목록 |
| SC Trade Tools | https://github.com/EtienneLamoureux/sc-trade-tools/blob/master/CHANGELOG.md | 11.5.1 이하 변경 기록; 제품 코드의 게임 패치 버전과 별개 |
| SC Trade Tools | https://github.com/EtienneLamoureux/sc-trade-tools/blob/master/api-docs/11.5.0.json | 공개 OpenAPI 모델/옵션 설명. 내부 최적화 구현 미검증 |
| Gallog | https://gallog.co/trading | 실제 함선/자본/방문 수/필터/재투자 버튼 확인 |
| Gallog | https://gallog.co/trading/freight | Hull C/D/E 및 전용 거점 선택 공개 HTML 확인; 실제 대형 운송 미검증 |
| Gallog | https://gallog.co/trading/projections | URL 조회 시 계산 가능한 Projection 화면 확인 못함 |
| StarHead | https://www.star-head.de/ | 제품 설명·실제 도구 링크 |
| StarHead | https://www.star-head.de/tools/routes | 실제 고급 조건 및 아래 evidence 계산 기록 |
| SC Cargo | https://sc-cargo.space/ | 실제 Cutlass Black 그리드와 혼합 상자 기본 배치 |
| SC Trade Companion | https://github.com/EtienneLamoureux/sc-trade-companion | README; Windows 실행 미검증 |
| SC Datarunner UEX | https://github.com/Shebuka/SC-Datarunner-UEX | README; Windows 실행 미검증 |
| Arkanis | https://arkanis.cc/overlay/ | 공식 설명. https://overlay.arkanis.cc/search 는 환경 인증서 오류로 실제 데모 미검증 |
| CitizenPad | https://citizenpad.com/ | 공개 화면·공식 기능 소개; Bridge/게임 키 실행 안 함 |
| Wingman AI | https://www.wingman-ai.com/ | 현재 공식 제품 소개. /skills/uexcorp 링크는 홈페이지로 리디렉션 |
| Regolith | https://regolith.rocks/ | 실제 END OF OPERATIONS 화면 |

## 확인 실패를 해석하는 기준

- SC Trade Tools circular 요청: 조사용 전송 브리지의 25초 제한. 해당 도구 전체 실패로 간주하지 않는다.
- Gallog 2 stops: 이번 입력의 실제 결과를 기록한다. 모든 왕복 조건을 검사했다는 뜻이 아니다.
- StarHead API 루트 및 추측한 /swagger/index.html 404: 브라우저에서 실제 /vehicle, /shop, /location 등의 200 응답을 확인했으므로 API가 없다는 결론을 내리지 않는다.
- sc-trader.com / sc-trading.app: 환경에서 연결 실패. 운영 종료 여부는 미확정.
- Regolith: 단순 연결 실패가 아니라 서비스 자체 종료 안내를 실제로 확인했다.

## 독립성

SC Trade Tools는 UEX와 파트너십을 표시하고 여러 부가 앱은 UEX API 재사용을 명시한다. 같은 보고가 여러 도구에 나타난 것을 독립 검증 2~3건으로 세지 않는다. 게임 실제값의 독립 검증은 해당 패치의 사용자 거래·화면·로그 근거가 있어야 한다.
