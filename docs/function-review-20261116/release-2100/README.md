# beta 2.10.0 배포

사용자 승인: 완료된 변경을 먼저 배포한 뒤 STAM FREIGHT DIVISION 상위 시설 메뉴 작업으로 전환.

## 포함 범위

- 이용안내 5개 주제, 실제 화면 캡처, 한국어/한영/영어, 모바일, 안내데스크/서비스센터/아카이브 진입.
- 게임 실행 → STAM 로그 앱 실행 → 미션 콘솔 연결 순서.
- Firebase 인증·Google 기본 프로필/이메일 사용·계정 저장에 대한 로그인/회원가입 안내.
- 첫 입장 종료/마우스 건너뛰기의 불필요한 사이드바 포커스 제거. 키보드 포커스 유지.
- 기존 검증/배포 기록과 남은 목록 정리. 로그 앱 설치본은 1.4 유지.

## 검증

이번 릴리스에서 루트 271개·앱 88개 모두 통과. TypeScript/생산 빌드 통과. 실제 Chromium에서 이용안내 9개 그룹과 문제 해결 4개 그룹 통과. 이미지 대응·언어·뒤로가기/새로고침·390px·고정 메뉴·선택 계약 보존 확인. JSON 기록 참고.

안내데스크의 운송 안내/기존 첫 운송·정보 버튼 및 실행 순서 3그룹은 ../manual-entry/report.json, 로그인 문구는 ../login-info/report.json, 오프닝 포커스는 ../../function-review-20261115/opening-focus/report.json의 관련 변경 후 검증을 따른다. 실게임 또는 사용자 PC 장시간 검증은 이번 범위가 아니다. 사용자 계정 서버 쓰기 없음.

개발 integration/freight-division-20261113 → 인계 handoff/local-studio-20261110/main에 같은 커밋을 반영한다. 공개 Actions·HTML/version.json·실제 경로 확인 결과는 배포 완료 후 기록한다.

상위 시설 메뉴는 다음 작업이며 이 릴리스의 기본 진입이나 기존 라운지·관제센터를 바꾸지 않는다.

## 공개 확인 완료

- 최종 SHA: `9ae749824e76b67fdbfcb5785fa03ec05fe2bd76`.
- [Pages 실행](https://github.com/limmin3-sudo/stam-freight-control/actions/runs/43785929975): 성공.
- [공개 사이트](https://limmin3-sudo.github.io/stam-freight-control/).
- `published-check.json`: 공개 version.json/HTML의 SHA와 beta 2.10.0 일치, 5개 안내 주제/실제 이미지 경로/앱 1.4 설치 링크/안내데스크 진입/인증 설명/업데이트/고정 메뉴·390px 확인. 페이지 오류·누락 응답 0건.
- 클라우드 Chromium의 프록시 인증서 신뢰 경계 때문에 공개 HTTPS 응답을 환경 프록시와 CA를 검증하는 Playwright API 요청으로 받아 실제 공개 origin에서 렌더링했다. TLS 검증을 끄지 않았다. 첫 직접 요청의 IPv6 접근 오류와 Chromium 인증서 오류는 검사 환경 문제였으며 이 경로로 해소했다.
- 사용자 계정 로그인/서버 데이터 쓰기 없음. 이번 배포 후 문서/캡처만 로컬에 추가했으며 문서만을 위한 재배포는 하지 않는다.
