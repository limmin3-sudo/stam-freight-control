# 미션 콘솔 세 재질 비교 — 사용자 검토용

기준: `feature/mission-intake-flow-20261112` 미커밋 작업본. 아직 어떤 안도 사용자 선택/전체 적용/배포 승인을 받지 않았다.

1. `lumen-1920.png`: 청록 유리, SUIT.
2. `noctis-1920.png`: 훈연 유리·티타늄 마감, Pretendard.
3. `hybrid-1920.png`: 청록 유리 패널 + 어두운 티타늄 요약/주 실행, SUIT.

세 화면은 실제 미션 콘솔 DOM의 동일 상태를 1920×1080, 배율 1 Chromium에서 캡처했다. 예시 두 계약(광석 16 + 기계 부품 24 SCU), 수석 항해사, Cutlass Black, 로빌 출발, 보상 합계 73,500 aUEC. 개인/실게임 계약이 아니다.

Vite 개발 서버에서 `/?material=lumen#/mission?lang=ko`, `/?material=noctis#/mission?lang=ko`, `/?material=hybrid#/mission?lang=ko`로 확인한다. 검토 스타일은 미션 콘솔에만 적용한다. 승인된 사이드바는 변경하지 않았다. 캡처 소스는 새 SVG/CSS 재질이며 이미지 생성 개념도와 구분한다.
