# Codex 개발 지침

작업 시작 시 아래 문서를 순서대로 읽는다.

1. [공통 개발 지침](docs/DEVELOPMENT.md): 제품 제약, 구조, 실행·검증, Git·AI 인계 규칙의 기준.
2. [현재 작업 상태](PROJECT_STATUS.md): 마지막 작업, 검증 결과, 미해결 문제와 다음 단계.
3. [상세 제품 인수인계](docs/CLOUD-HANDOFF.md), [실행 안내](README.md).

사용자의 현재 요청을 우선하고 Git 상태와 최근 이력을 먼저 확인한다. 다른 AI가 남긴 미커밋 변경을 보존한다. 작업 종료·전환 전에는 변경 검토와 가능한 검증을 수행하고 PROJECT_STATUS.md를 갱신한다. 커밋·푸시는 사용자 승인 후 진행한다.

Cloud 시작 안내는 [docs/CLOUD-START-PROMPT.md](docs/CLOUD-START-PROMPT.md)를 참고한다. 과거 채팅·다른 PC의 파일·로그인·개인 데이터가 자동으로 제공된다고 가정하지 않는다.
