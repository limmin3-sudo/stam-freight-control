# beta3.1.0 / 앱1.5 배포 완료

2026-11-17 21:07 KST 공개 검증 완료.

- 사이트: https://limmin3-sudo.github.io/stam-freight-control/
- 배포 소스 SHA: `4da4efeed48318dcd45f339cc9a2e0d964d6a12a`.
- Pages 성공: https://github.com/limmin3-sudo/stam-freight-control/actions/runs/44079377609
- 앱1.5: https://github.com/limmin3-sudo/stam-freight-control/releases/tag/app.1.5.0
- 앱 승격·공개 파일 확인: https://github.com/limmin3-sudo/stam-freight-control/actions/runs/44076038719
- 운영 Firestore 승인 규칙 게시 및 해시 일치, 조회 인덱스 READY. 기존 계정·운항·교역 규칙 보존 대조: rules-preservation.json.
- 루트283개·앱172개·타입·빌드 통과. 공개13항목·리소스79개 오류0. 개인/함대 전환, 취소 항목 부재, 아카데미 안내, 기존 운송 화면,390px 영어, 앱1.5 설치 링크 확인: deployment-verification.json.
- 로그 앱은 기존 검증된 Windows 설치 파일/ZIP을 그대로 승격했다. 앱 소스 확인·파일 무결성·실제 다운로드 검증 완료. 한국어/영어 화면 캡처 확인. 검증 머신 en-US 음성 모의만 통과했으며 실제 마이크/게임 검증은 하지 않았다.

공개 브라우저는 환경 프록시 때문에 Node의 TLS 검증 HTTPS 응답을 원래 브라우저 origin으로 전달했다. Firebase/게임 로그인 실환경 테스트를 새로 수행한 것은 아니다. 과금 전환 없음. 취소한5개 추가 기능 없음. 기존 미승인 연출 후보/제외 초안 파일은 삭제하지 않았다.

배포 소스와 기능이 같은 완료 증거 문서는 [skip ci] 커밋으로 보존하며 추가 웹 배포를 만들지 않는다.
