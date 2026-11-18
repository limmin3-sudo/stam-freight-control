# 웹 베타 3.4.0 공개 배포

2026-11-18 20:32 KST에 Pages가 배포 SHA `e8bd1a5ca3791ad69e64a97110b14dc564df16d6`를 게시했다. [운영 사이트](https://limmin3-sudo.github.io/stam-freight-control/) · [배포 실행](https://github.com/limmin3-sudo/stam-freight-control/actions/runs/44294882755)

CI에서 테스트 472개, 타입 검사, 생산 빌드를 통과했다. UEX 터미널 114곳에서 받은 시세 2,578건이 공개 데이터에 포함됐다. 20:33 KST에 공개 버전과 HTML을 대조하고 Chromium의 독립 게스트 세션으로 아래 화면을 확인했다. 공개 리소스 221개를 요청했고 검사 중 브라우저 오류는 0건이었다. [검증 기록](public-verification.json)

| 공개 화면 | 확인한 동작 |
| --- | --- |
| [무역 로비](lobby.jpg) | 공통 셸, 두 문과 담당자 두 명 표시 |
| [무역관제실](market.jpg) | 문으로 입장 → TITA 검색 → 터미널별 가격 확인 → 선택 거래로 경로 계획 열기 |
| [거래기록실](records.jpg) | 오른쪽 문으로 기존 게스트 장부 열기 |
| [기존 비행 도구](flight.jpg) | flight.html에서 오퍼레이터·항해사 이미지 응답을 승인 원본과 바이트 단위 대조 |
| [둘러보기 종착지](tour-map.jpg) | 안내데스크에서 한국어 52대사 진행 → 네 시설 방문 → 사업부 지도 복귀 |

실제 게임 거래 및 운영 로그인 계정은 이번 공개 확인 범위 밖이다. 검수본에서 실시한 영문 태블릿 둘러보기와 매입·판매·비용 정산 결과는 [통합 검수 기록](../cinematics/function-handoff-20261118/integration-check/README.md)에 있다.
