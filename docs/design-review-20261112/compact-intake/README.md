# 입력 패널을 줄이고 미션 카드에 공간 확보

2026-11-12 기능 클라우드 / feature/mission-intake-flow-20261112 / 미커밋 검토본.

장식 행성을 제거하고 입력 경로 3개를 가로 그룹으로 묶었다. 미션 카드의 위치를 약 240px 위로 이동했다. 1920×1080 합성 계약 2개 선택 / 40 SCU / 73,500 aUEC. 실제 앱 캡처 projection.png / chip.png. 모바일은 1열이다.

상단바·승인 사이드바·Barlow Medium 500·기능/저장/계산 로직은 유지한다. 공개 사이트 미배포. 이전 큰 입력 패널은 ../even-edges/mission.png에서 비교할 수 있다.

검증 명령:

STAM_MISSION_URL='http://127.0.0.1:5186/?material=projection' node scripts/check-mission-intake-flow-browser.mjs

chip도 동일. Game.log 파일 선택/읽기, 계약 선택/직접 입력 취소 후 보존, 원문 입력 포커스, 스크린샷 파일 선택 후 OCR 검토 창, ko/mix/en 모바일 가로 넘침 확인. 실제 게임 스크린샷 OCR 정확도 검사는 포함하지 않는다.
