## 2026-11-17 PR40→41 통합·배포 완료 — 웹3.2.0 / 앱1.5.1

사용자 지정 순서 #40(0d963d5)→#41(8109510)로 병합하고 배포했다. 배포 소스 `32982eb2df108c2fea634c30ef714a4b9ea132e7`, Pages 실행44102694815 성공. PR40/41 모두 MERGED이며 #39 메뉴는 중복 반영하지 않았고 #35/37/38은 제외·보존했다. 기존 미커밋 자료120경로 보존 확인. 충돌은 PROJECT_STATUS 문단뿐으로 양쪽을 보존했다.

사이트 https://limmin3-sudo.github.io/stam-freight-control/ 에 웹3.2.0과 앱1.5.1 설치 링크 공개 확인. 앱 https://github.com/limmin3-sudo/stam-freight-control/releases/tag/app.1.5.1 은 Windows 네이티브·폰트·연결/오버레이·설치/재설치/제거 및 공개 ZIP/설치 EXE 무결성 검사 통과(44101585501). 기존 app.1.5.0은 덮어쓰지 않았다.

CI 루트283+앱173=456개, 타입·빌드 통과. 통합 브라우저 KO/EN/MIX·모바일·단계 잠금/초기화/뒤로·Escape/포커스·메모리 연습과 기존 저장값 보존 통과. 공개14항목·리소스96개 오류0; 무역 연습6작업→5,400순이익→실제 개인 계획 연결 및 앱1.5.1 다운로드 확인. 마지막 함대 보기를 사용했어도 연습 완료 시 개인 계획으로 들어가도록 탭 보기만 보완했다. 연습값은 실제 장부에 넘기지 않는다.

실제 게임·마이크 입력·다중 모니터 고배율은 미검증이다. 계정/로그 파서/API/실제 운송·무역 계산/운영 규칙은 기준434b50e와 동일하며 취소5개·과금 불허는 유지한다. 결과: docs/release-320-20261117/DEPLOYED.md 및 deployment-verification.json. 완료 증거만 [skip ci]로 보존하며 추가 배포하지 않는다. 아래의 통합/배포 대기 표시는 당시 기록이다.


통합 참고: integration.json. 튜토리얼 검증: tutorial-review/checks.json. 앱 실제 공개 정보: companion-publication.json. 공개 화면: runtime-review/. 공개 브라우저는 원래 URL/origin에서 TLS 검증된 Node HTTPS 응답을 전달했으며 실제 Google 로그인/게임 검증을 포함하지 않는다.
