# 저장소 이름 변경 인계

## 현재 상태

사용자가 `verse-hauler` → `stam-freight-control` 변경을 승인했고 2026-10-30에 변경을 완료했다. 아래는 당시 기록이다. Cloud의 HTTPS Git 읽기·푸시는 가능하지만 `api.github.com` 접근이 프록시 정책으로 403 차단되어 이름 변경 API를 실행할 수 없다. GitHub CLI의 인증 오류만으로 Git 인증이 없다고 판단하지 않는다.

사용자가 저장소 소유자 계정으로 아래 설정에서 Repository name을 `stam-freight-control`로 바꾸는 단계가 필요하다.

https://github.com/limmin3-sudo/verse-hauler/settings

새 주소(변경 완료 전에는 사용하지 않음):

- 저장소: https://github.com/limmin3-sudo/stam-freight-control
- Pages: https://limmin3-sudo.github.io/stam-freight-control/

## Claude Code 진행 결과 (2026-10-30)

- 3·4번(링크 변경, 첫 배포 비교 검증 보존)은 준비 완료. 4번은 `.github/pages-baseline/locations.json` 기준 스냅샷과 `refresh-data.mjs --fallback-file`(404일 때만 사용)로 해결했다.
- 사용자가 GitHub Settings에서 이름을 변경했고 `013c63f`를 새 origin의 main에 푸시했다. Actions 성공과 새 사이트를 확인했다. **변경 완료.**
- 남은 일: 각 PC 체크아웃의 origin 갱신(2번). 이 Cloud 체크아웃은 갱신했다.

## 다음 AI의 후속 작업

검토용 링크 변경 패치는 이전 Cloud의 임시 파일에만 준비했으며 GitHub에 포함되지 않는다. 임시 파일에 의존하지 말고 아래 목록과 실제 Git 차이를 기준으로 수정한다.

1. 변경이 완료됐는지 확인하고 GitHub 저장소의 동일성을 확인한다. 다른 저장소를 새로 만들거나 기존 저장소를 삭제하지 않는다.
2. 각 체크아웃에서 기존 미커밋 작업을 보존하고 `git remote set-url origin https://github.com/limmin3-sudo/stam-freight-control.git`로 갱신한다. 로컬 폴더 이름은 그대로여도 된다. Cloud의 체크아웃 폴더를 무조건 변경하지 않는다.
3. README, docs/DEVELOPMENT.md, docs/CLOUD-HANDOFF.md, docs/CLOUD-START-PROMPT.md의 저장소·사이트·clone 예시와 location-manager.mjs의 Actions 링크를 갱신한다.
4. .github/workflows/pages.yml의 이전 배포 비교 URL을 점검한다. 새 Pages 경로가 아직 없으면 `--previous-url`이 404로 실패한다. 이전 배포의 검증된 스냅샷을 확보하거나 첫 배포용 명시적 준비 절차를 마련해 기존 좌표·점프 손실 검증을 보존한다. 단순 URL 교체 후 배포 성공을 가정하지 않는다.
5. `package.json`의 내부 패키지 이름, Cloudflare worker 이름, IndexedDB 이름, localStorage 키는 사이트 경로 변경에 필수적이지 않다. 특히 저장 키를 바꿔 기존 개인 데이터를 잃게 하지 않는다.
6. Node 22에서 전체 테스트·차이 검증 후 승인된 이름 변경 범위의 커밋·푸시를 진행한다. Actions와 새 사이트·데이터·상대 경로 리소스를 확인하고 PROJECT_STATUS.md를 갱신한다.
7. Cloud 환경의 저장소 연결이 새 이름을 인식하는지 확인한다. 환경 게시나 별도 설정 변경을 자동으로 수행하지 않는다.

## Claude Code에 전달할 말

“저장소 이름을 stam-freight-control로 변경하는 중입니다. 먼저 docs/REPOSITORY-RENAME.md와 PROJECT_STATUS.md를 읽고 실제 변경 완료 여부를 확인해 주세요. 완료 후 origin을 새 주소로 갱신하고 최신 변경을 확인해 주세요. 미커밋 작업과 기존 개인 저장 키를 보존해 주세요.”

같은 브라우저에서는 Pages 경로만 바뀌고 origin(스킴·호스트·포트)은 같으므로 localStorage와 IndexedDB는 일반적으로 유지된다. 다른 PC·브라우저와의 자동 동기화는 별개이며 미구현이다.
