# 문제 해결 안내 마감 — 2026-11-16 / 미배포

`TroubleshootingGuide.tsx`를 추가해 이용안내의 기존 짧은 문제 해결 설명을 4개 증상으로 구성했다. 로그 연결, 미션/SCU 누락, 계산/완료 버튼 제한, 브라우저/계정 저장 실패를 구분한다. 각 항목은 먼저 확인 → 해결 순서 → 실제 화면/관련 안내 링크다. 기본 첫 항목이 펼쳐져 있으며 여러 항목을 펼칠 수 있다. 별도 스크롤 영역이나 중복 스크린샷은 추가하지 않았다. 제목은 “연결이 안 될 때”에서 “문제 해결”로 바꾸고 기존 topic=trouble URL은 유지한다.

실제 코드 근거: `MissionConsole.tsx`의 카드 편집/선택·routeOnly·계산 버튼, `use-flight.ts`의 계산/다른 탭/저장 오류 보호, `FlightOperations.tsx`의 계약 변경 완료 제한, `FlightCloudPanel.tsx` 및 `use-flight-cloud.ts`의 다시 확인/저장 방향, `FlightBackup.tsx`의 백업/복구. 기능 로직과 저장 정책은 수정하지 않았다. 지원 링크는 피드백 화면만 열고 제출하지 않는다.

## 검증

- 생산 빌드/타입 검사, JS 구문, git diff --check 통과.
- 실제 Chromium: 4개 항목·키보드 조작·3언어, 안내 링크 4개/실제 화면 링크 4개, 피드백 진입, 기존 선택 계약 보존, 390px 모바일 펼침/가로 넘침 확인.
- [결과](report.json): 페이지 오류/누락 자산 0건, 운영 서버 쓰기 0건.
- [데스크톱](troubleshooting-desktop.png), [모바일](troubleshooting-mobile.png).
- 재현: 생산 미리보기에서 `STAM_MANUAL_URL=http://127.0.0.1:5189/ node scripts/check-manual-troubleshooting-browser.mjs`.

안내 문구/링크만 변경하여 직전 통과한 루트 271개·앱 88개 전체 테스트는 반복하지 않았다. 실제 게임 수신/운영 계정/네트워크 오류 전체를 새로 재현했다는 뜻은 아니다.

첫 운송·미션 가져오기·운항 중 조작·저장하고 이어하기·문제 해결의 이번 5개 주제 이용안내 개편을 마무리했다. 기존 guide.html 전체 슬라이드를 일대일 이식한 것은 아니며 구형 경로는 보존한다. 승인 상단바/사이드바·다른 미커밋 작업 보존. 커밋·푸시·배포 없음.
