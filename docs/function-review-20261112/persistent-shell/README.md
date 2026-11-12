# 공통 상단바·사이드바 고정 검토

미션 / 지도 / 관제는 SpaceExperience 공통 틀 안에서 콘텐츠만 교체한다. 승인된 사이드바 소스와 외형을 바꾸지 않았다. 캡처는 1920×1080 합성 계약 2개/40 SCU 데이터다. 미션의 영문/숫자는 새 비교 후보 01(Roboto Condensed Light) 예시이며 최종 서체 확정이 아니다.

- `mission.png`, `map.png`, `operations.png`: 실제 작업 화면.
- `browser-check.txt`: 세 화면의 동일 DOM/위치·내부 스크롤·지도 드래그·운항/언어/저장/새로고침·모바일 검사 통과.
- `app-tests.txt`: 앱 테스트 12개 파일 통과.

재실행: `STAM_MISSION_URL=http://127.0.0.1:5186/ node scripts/check-persistent-console-shell-browser.mjs`.

과거 독립 전체 화면을 가정한 mission-screen/navigation 브라우저 스크립트의 `.monitor-navigation` / `.chart-navigation` 언어 선택 및 viewport 전체 크기 단언은 공통 틀 기준으로 후속 정비가 필요하다. 이번에는 새 공통 틀 검사를 실행했으며 구형 검사까지 전부 통과했다고 보고하지 않는다. 공개 배포는 아직 하지 않았다.
