# Codex Cloud 새 작업에 붙여넣을 내용

아래 내용을 저장소 `limmin3-sudo/stam-freight-control`를 선택한 Cloud 작업에서 사용한다. 이 문서는 새 Cloud 작업을 자동으로 만들거나 기존 로컬 대화를 옮기지는 않는다.

---

최신으로 받고 시작해줘. 이 저장소(limmin3-sudo/stam-freight-control)의 STAM FREIGHT CONTROL 개발을 이어서 할 거야.

1. git status, 현재 브랜치, origin/main 최신 이력을 확인하고 미커밋 작업이 있으면 보존해 줘. 깨끗하면 main을 git pull --ff-only로 받아 줘. 예전 커밋으로 되돌리지 마.
2. AGENTS.md → docs/DEVELOPMENT.md → PROJECT_STATUS.md → README.md 순서로 읽어 줘. 현재 상태의 기준은 PROJECT_STATUS.md야. docs/CLAUDE-HANDOFF.md의 최신 인계도 읽어 줘. docs/CLOUD-HANDOFF.md의 옛 "미구현" 설명(로그인 등)을 현재 상태로 믿고 다시 만들지 마.
3. node scripts/prepare.mjs → npm test로 확인해 줘(마지막 기록 88개 통과). 결과만 짧게 알려 줘.
4. 읽은 뒤 지금 상태와 남은 일을 3~5줄로 요약하고, 내 다음 요청을 기다려 줘. 백로그를 마음대로 시작하지 마.

지켜 줘: 대화는 짧은 한국어 반말, 앱 문구는 존댓말. 계약별 화물 소유권 유지, 목적지별 그리드 모으기(gridWalk·fullLoadLayout) 유지, 상자 구성 유형은 품목·수량 조합 기준, 화면에 계약 코드 표시 안 함. Firebase 로그인은 이미 연결·검증 완료(비밀키 없음, 공개 설정만). 작업 끝나면 PROJECT_STATUS.md에 기록하고, 커밋·푸시(main 푸시 = 사이트 배포)는 내가 승인한 범위에서 해 줘.
