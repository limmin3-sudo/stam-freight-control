# 공간별 왼쪽 사이드바 검토

기준 beta 2.5.0 `737b957` + `feature/space-sidebar-20261112` 디자인 승인 후 미배포 작업본. 사용자 브라우저 데이터 없는 별도 Chromium에서 촬영했다. 전경/인물/영상 원본은 변경하지 않았으며 큰 공간 버튼 아래에 하위 메뉴가 펼쳐지면 다음 큰 버튼이 밀려난다.

- `lounge-1920.png`, `bridge-1920.png`: 1920×1080, deviceScaleFactor 1.
- `bridge-1366.png`: 1366×768, 영문 공간/메뉴.
- `mobile-menu.png`, `mobile-scene.png`: 390×844 에뮬레이션.
- `sidebar-check.txt`: 실제 브라우저 크기·이동·메뉴·저장 검사.
- `shuttle-check.txt`: 기존 게이트 영상 회귀 검사.

재실행: 개발 서버 실행 후 `STAM_SIDEBAR_URL=http://127.0.0.1:5186/ node scripts/check-space-sidebar-browser.mjs`.

`sidebar-motion.mp4`: 실제 브라우저에서 라운지 메뉴 접기/펼치기와 관제센터 이동을 녹화한 1280×720 검토 영상.
