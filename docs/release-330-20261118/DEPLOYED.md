# 웹3.3.0 공개 배포 결과

## 2026-11-18 웹3.3.0 누락 연출 통합·배포 완료

최신86f1a39에서 별도 integration/web-cinematics-20261118 브랜치로 #35→#37→#38을 통합했다. 통합·배포 SHA `9ed183a8d58e964ab0a1dc4a757143a6b6bdf328`, Pages 실행44112353830 성공. main·공통 인계에 반영했고 기존 미커밋120경로를 보존했다. #40 튜토리얼과 #41 앱1.5.1·공개 다운로드 메타데이터는 그대로다. #39 전체·#36·#33은 추가하지 않았다.

공개 사이트 https://limmin3-sudo.github.io/stam-freight-control/ 에서 버전/SHA 일치, 승인 검은 유리·금색 셸/A콘솔·함선 이미지, 시설/관제 파트너 근접 대화와 담당 범위 연결, 가격 중심 개인/함대 무역, 아카데미, #40 실제 저장값 불변 연습, 영어390px와 기존 운송 진입을 확인했다. 공개16항목·리소스111개 오류0, CI 루트283+앱175=458개·타입·빌드 통과. 로컬36개 흐름도 통과했다.

최종 실제 화면과 결과는 docs/release-330-20261118/DEPLOYED.md 및 deployment-verification.json. 실제 게임·로그인 계정·iOS 실기기는 새로 검증하지 않았다. 기존 큰 JS 청크 경고와 별도 후속인 자유 대화/립싱크/자연 보행은 남는다. 계산·저장·계정·API·운영 규칙 변경 및 유료 배포 없음.

PR35는 자동 MERGED, 원래 연출 부모 브랜치를 대상으로 한 PR37/38은 OPEN이다. 두 PR의 정확한 최종 SHA는 배포 커밋의 조상으로 모두 포함됐다. 추가 PR 닫기는 자동 승인 검토가 요청 밖의 수명주기 변경으로 거절해 실행하지 않았다. 이 상태는 코드 미통합을 뜻하지 않는다. 이 완료 증거 커밋은 [skip ci]로 저장하며 웹을 재배포하지 않는다. 아래 준비/미배포 기록은 과거 상태다.

## 실제 최종 공개 화면

- [사업부·공용 셸](runtime-review/division-public.png)
- [무역센터 로비](runtime-review/trade-lobby-public.png)
- [수석 무역관 대화](runtime-review/senior-trade-officer-public.png)
- [링 가문 중개인 대화](runtime-review/ling-broker-public.png)
- [지도 교수 대화](runtime-review/academic-advisor-public.png)
- [관제 오퍼레이터](runtime-review/operator-public.png) / [항해사](runtime-review/navigator-public.png)
- [가격 중심 무역 관제](runtime-review/trade-control-public.png) / [모바일 영어](runtime-review/trade-mobile-public.png)
- [아카데미 내부](runtime-review/academy-public.png)
- [기존 무역 튜토리얼](runtime-review/trade-tutorial-public.png)

## 검증 범위와 재현

[공개16항목 상세](deployment-verification.json), [통합 보존/PR 기록](integration.json), [CI 실행](https://github.com/limmin3-sudo/stam-freight-control/actions/runs/44112353830).

로컬 shell5 + details4 + facility5 + bridge5 + tutorial3 + trade4 + academy7 + division3 = 36개 흐름. 각 하위 폴더의 checks.json/report.json과 verify-*.mjs 참고. 공개 확인은 실제 공개 HTTPS 응답을 인증서 검증된 Node 프록시로 받아 원래 브라우저 출처를 유지했다. Firebase 외부 인증은 실행하지 않았다. 연습·합성 장부로 저장 불변과 거래 확인을 검증했으며 실제 사용자 계정/운항 데이터를 읽거나 수정하지 않았다.

PR35의5개 무역 충돌 파일은 최신 기능 코드 위에 교역→무역 표시 치환만 적용했으며 전체 Trade*/MarketInformation도 이 치환 외 변경이 없음을 비교했다. FacilityLobby는 최신 시장정보→개인 계획 콜백을 보존했다. SpaceExperience는 부분 병합했다. 취소5개·무료 정책을 보존했다.
