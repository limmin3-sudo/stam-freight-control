## 최신 결과 — 2026-11-15 운영 반영 완료

사용자 승인 후 21:41 KST **Firestore 운영 규칙만 게시**했다. 아래 연결 대기·미게시 내용은 이전 단계의 기록이다.

- [게시 결과](rules-publication.json): 서버 규칙 검사 통과 후 새 ruleset 적용, 실제 게시 소스 SHA256 대조 완료. 이전 운영 원문은 `production-rules-before.rules`로 보존했다.
- [실제 브라우저 검증](production-browser-check.json): 실제 Firebase SDK 10.14.1 및 임시 계정으로 현재 앱 저장, 독립 브라우저의 확인 후 복원(화물 좌표·진행·직전 백업), 동시 저장 단일 승자, 다른 계정 접근 차단, 단독 화물 조각 변경 차단, 기존 계정 저장 호환 6항목 통과. 페이지 오류 없음.
- [복원 비교 화면](production-restore.png). 임시 합성 운항만 사용했으며 실제 사용자의 운항 자료는 읽거나 변경하지 않았다. 시험 Auth 계정 2개와 시험 문서는 정리했다.
- 관련 단위 테스트: `node --test tests/flight-cloud.test.mjs tests/account-transport.test.mjs` — 8개 통과.
- 재현 스크립트: `scripts/check-flight-cloud-production.mjs`. 명시적인 `STAM_PRODUCTION_QA=approved`와 저장소 밖 보호된 인증/시험계정 정리 도구가 필요하다. 일반 테스트에서 자동 실행하지 않는다.
- 환경 프록시 인증서 문제를 피하려고 TLS 검증을 유지한 Node 전달을 사용했다. 브라우저→같은 머신 loopback만 HTTP이며 upstream은 실제 Google HTTPS 서비스다. 에뮬레이터·가짜 응답이 아니다.

**사이트·앱 배포, 커밋·푸시는 하지 않았다.** 새 이어하기 UI는 현재 작업본에서 검증했고 공개 사이트에는 다음 웹 배포 때 반영해야 한다. 실제 물리 기기 전환·게임 실행 검증까지 완료했다는 뜻은 아니다.

---

# 계정 이어하기 운영 연결 확인 — 2026-11-15

## 실제 운영 확인 결과

프로젝트 `stam-freight-control`의 실제 Firebase Authentication에 무작위 검증용 임시 계정을 만들고, 같은 계정으로 별도 비밀번호 로그인 요청을 두 번 수행했다. 실제 사용자 계정이나 운항은 사용하지 않았다. 브라우저 UI/Google 팝업 검증이 아니라 실제 운영 Auth·Firestore REST API 확인이다.

| 확인 | 결과 |
| --- | --- |
| 임시 Auth 계정 생성 | HTTP 200 |
| 같은 계정의 두 로그인 요청 | 모두 HTTP 200, 같은 UID |
| 각 토큰으로 본인 `users/{uid}` 조회 | 모두 404 NOT_FOUND: 조회는 허용, 새 계정이므로 문서 없음 |
| 본인 `users/{uid}/flight/current` 조회 | 모두 403 PERMISSION_DENIED |
| 본인 운항 `parts/0` 조회 | 모두 403 PERMISSION_DENIED |
| 미인증 운항 조회 | 403 PERMISSION_DENIED |
| 임시 Auth 계정 삭제 | HTTP 200, 완료 |
| 운영 Firestore 쓰기 | 0회 |

[개인정보·인증정보를 제외한 실제 응답 기록](production-probe.json). 비밀번호/토큰/UID/이메일은 결과 파일에 저장하지 않았다. 삭제 실패 대비 임시 인증 파일도 삭제 완료했다.

**결론:** 사이트 계정 인증 자체는 작동한다. 현재 운영 권한은 운항 이어하기 경로를 허용하지 않는다. 규칙 원문을 관리자 권한으로 조회하지 못했으므로 운영에 어느 규칙 버전이 게시되어 있는지는 확정하지 않는다. 실제 운항 저장·두 기기 복원·동시 수정 검증은 이 차단이 해소되기 전에는 완료할 수 없다.

## 인증 확인과 제한

- 현재 클라우드에 Firebase CLI 로그인·Google Application Default Credentials·Firebase 관리자 비밀값/외부 인증 바인딩이 없다.
- 환경 `ccarenv_b64_Y2NhcmVudl80YmUwZDZmNzJhNDg4MTkxODljMjRhN2Q4Y2NmYzdhMw`의 capabilities가 비어 있고 공유 데스크톱/브라우저 제어 도구가 없어 사용자 관리자 로그인 세션을 이어받을 수도 없다.
- 저장소 workflows에는 Firebase 배포 연결이 없다. GitHub Actions secret **이름 목록** 조회는 연결 앱 권한 403으로 거부됐다. 그러므로 저장소 비밀값 자체가 없다고 단정하지 않는다.
- GitHub 저장소 접근 권한과 Firebase 규칙 관리 권한은 별개다. 일반 사이트 로그인 토큰도 규칙 관리자 권한을 주지 않는다.

## 준비된 변경과 다음 단계

현재 [firestore.rules](../../../firestore.rules)는 기존 계정·완료 기록 권한을 유지하면서 운항 head/parts의 소유자 제한·리비전 증가·크기/형식 제한·트랜잭션 조각 갱신 규칙을 추가한다.

- 작업본 규칙 SHA256: `f0fdadb9b8cbe1a3ab453c7e0128a50831222a4b895feef452951dedddcadf17`.
- [마지막 공개 코드 HEAD 916b067 대비 변경](proposed-rules-vs-release.patch). **이 파일은 현재 운영 규칙과의 diff가 아니다.**
- 앞선 실제 SDK/에뮬레이터 12항목 통과 기록: [로컬 규칙 검증](../../function-review-20261114/continue-archive-map/firestore-report.json). 이번 운영 테스트로 대체하거나 다시 통과한 것처럼 기록하지 않는다.

관리자 인증 연결 후에는 다음 순서로 진행한다.

1. [Firebase 콘솔의 Firestore 규칙](https://console.firebase.google.com/project/stam-freight-control/firestore/rules)에서 현재 운영 규칙/버전 원본을 먼저 확인·백업하고 작업본과 대조한다. 저장소 파일을 운영 원문으로 가정해 전체 덮어쓰기하지 않는다.
2. 기존 서비스 권한을 보존해 검토한 규칙 변경만 반영한다. 웹·앱 배포와 별개인 운영 권한 변경임을 명확히 한다.
3. 정리 가능한 전용 검증 계정으로 현재 앱의 실제 SDK를 이용해 저장→다른 브라우저 복원, 오래된 리비전 거부, 두 동시 수정 중 한쪽만 수락, 다른 계정 접근 거부를 확인한다. 임의의 기존 사용자 운항을 시험값으로 덮어쓰지 않는다.
4. 검증 데이터는 관리자 권한으로 확인한 정확한 시험 경로만 정리한다. 규칙은 정상 앱에서 운항 head 삭제를 거부하므로 데이터 정리 방법을 확보한 뒤 운영 쓰기 테스트를 시작한다.

현재 사이트·앱·운영 규칙은 배포하지 않았다. 기존 로컬 기능 작업과 저장 운항은 변경하지 않았다. 관리자 인증 연결 또는 사용자의 Firebase 콘솔 진행 선택을 기다린다.

## 2026-11-15 관리자 연결 진행

사용자가 클라우드 관리자 인증 연결을 선택했다. Firebase CLI 14.27.0의 원격 PKCE 로그인 절차에 따라 실제 로그인 주소를 발급했다. 아직 로그인/관리자 권한 확인 전이다.

- 사용자만 Google 로그인과 권한 승인을 수행한다. 승인 코드는 채팅/저장소에 넣지 않고 실행 환경의 비밀값 `STAM_FIREBASE_AUTH_CODE`로 전달받는다.
- 인증 보조 도구와 PKCE 상태는 저장소 밖 `/workspace/.stam-firebase-auth/`에 보관한다. 디렉터리 0700, 상태/향후 인증 파일 0600, Git 무시 규칙 적용. 로그인 URL/검증자/토큰은 이 문서에 넣지 않는다.
- 환경 비밀값 적용 후 새 프로세스에서 `NODE_USE_ENV_PROXY=1 node /workspace/.stam-firebase-auth/connect.cjs complete`로 공식 CLI 토큰 교환·자격증명 저장을 마친다. 코드는 명령 인자/출력으로 전달하지 않는다.
- 로그인 주소 발급 후 30분이 지났거나 서버가 코드를 거부하면 새 로그인 절차를 시작한다. 재발급 전에 사용자가 이전 절차를 끝내는 중인지 확인한다.
- 이어서 해당 프로젝트의 현재 운영 규칙 원문을 읽기 전용으로 조회·백업한다. 인증 연결만으로 규칙/사이트/앱을 게시하지 않는다.
- 성공 뒤 일회용 비밀값은 환경 설정에서 삭제하도록 안내한다. 현재 인증/규칙 접근 성공으로 보고하지 않는다.

## 2026-11-15 관리자 연결 완료 — 비밀값 입력 불필요

사용자가 Firebase Google 로그인·승인을 완료했다. 완료 콜백의 세션 state를 보존한 PKCE 요청과 대조했고 일회용 코드를 비반향 입력으로 전달해 토큰 교환을 마쳤다. 코드/토큰을 문서·명령 인자·출력에 기록하지 않았다. pending PKCE 상태는 제거했고 인증은 저장소 밖 전용 CLI 설정에 0600으로 보관한다. **추가 환경 비밀값 입력은 필요 없다.**

- 실제 STAM 프로젝트의 운영 release/ruleset 조회와 원본 백업 완료. [인증·프로젝트 권한 결과](admin-connection.json).
- 운영 규칙의 마지막 갱신은 2026-11-02 18:44 KST. 운항 이어하기 head/parts 경로가 실제로 빠져 있다. 기존 계정 동기화의 서버 리비전 강제도 아직 반영되지 않았다.
- [현재 운영 규칙 원본](production-rules-before.rules), [현재 작업본과 운영 원본의 실제 차이](proposed-rules-vs-production.patch). 앞선 HEAD 대비 패치는 운영 원문을 모를 때의 참고이며 이번 대조를 우선한다.
- 규칙 생성/게시 및 검증 데이터 정리에 필요한 IAM 권한을 읽기 전용 testIamPermissions로 확인했다. 권한을 추가하거나 규칙을 게시한 것은 아니다.
- 연결 완료 뒤 규칙/운항 쓰기는 0회. 사이트/앱 배포도 없다. 다음 단계는 준비된 운영 규칙 변경 검토·반영 및 실제 저장/복원/동시 수정 검증이다.
