# STAM 로컬 작업과 Windows 검증 인계

2026-11-10 KST · Codex. 최신 전달·실행 지침은 [LOCAL-CODEX-HANDOFF.md](LOCAL-CODEX-HANDOFF.md)를 먼저 따른다. 기존 문서 경로는 링크 호환을 위해 유지한다. **관제실 전체 3D 모델링과 Blender 제작 준비 지시는 폐기하고 제거했다.** 현재 기준은 [최종 구성 계획](STAM-EXPERIENCE-ROADMAP.md)과 [화면 연결 구조](CONTROL-ROOM-ARCHITECTURE.md)다.

## 현재 방향

지상기지/관제실은 고화질 이미지 기반 2.5D로 만들고 콘솔 확대를 실제 기능 화면에 연결한다. 중앙 지도는 클릭해 실제 지도로 진입한다. 별도 지도 콘솔/모니터와 뒤편 회전은 없다. 실제 지도·적재 3D는 기존 데이터와 계산 규칙을 보존하며 개선한다.

집 GPU/Blender는 공간 제작의 필수 조건이 아니다. 집 PC는 선택적인 Gen Studio 이미지 제작과 Windows 연결 앱·실제 게임 오버레이 검증에 사용한다. Cloud의 `127.0.0.1`은 집 PC가 아니다. Gen Studio 저장소를 읽는 것과 실행 중인 로컬 MCP에 연결하는 것은 다르다.

## 로컬 준비

- Node.js 22.12 이상과 Codex 로컬 작업 환경. Git 원격 연결이 필요하면 Git을 설치한다.
- 현재 GitHub의 새 이력을 사용하는 사본. 예전 체크아웃 객체/브랜치를 합치지 않는다.
- Windows 앱 검사 시 실제 설치/로그 채널·모니터/DPI·게임 표시 모드를 확인한다. 개인 경로/실제 로그를 Git에 넣지 않는다.
- Gen Studio는 이미 사용자 별도 저장소에 있다. 중복 설치나 전체 모델 다운로드를 실행하지 않는다. 필요할 때 연결/선택 모델/공개용 출력 조건을 확인한다.

## 미리보기 실행

현재 프로젝트 사본에서:

```powershell
npm ci --prefix apps/control-room
npm run dev:control-room
```

별도 미리보기는 `http://127.0.0.1:5173`이다. `start-control-room-preview.cmd`도 같은 개발 미리보기 용도다. 현재 소스의 과거 3D 실험은 최종 방향이 아니며, 새 계획 구현 상태는 PROJECT_STATUS.md에서 확인한다.

검사 명령:

```powershell
npm run check:control-room
npm run test:control-room
npm run build:control-room
npm test
```

이번 문서 정리에서는 앱 실행/Windows 검사/새 화면 테스트를 수행하지 않았다. 과거 검사 기록은 현재 방식의 완료 증거가 아니다.

## 기존 전달 ZIP 주의

`STAM-HOME-20261110.zip`, `STAM-HOME-20261110-updated.zip`은 새 계획 확정 전 스냅샷이다. 폐기한 모델링 지시와 미승인 모델이 들어 있으므로 현재 작업 지시로 사용하지 않는다. 이번 문서 변경은 이 ZIP에 반영하지 않았다. 원본 제작 자료는 보존하지만 재제작 작업은 재개하지 않는다.

미커밋 변경은 다른 PC에 자동 전달되지 않는다. 최신 문서/소스를 옮길 때는 승인된 커밋·푸시 또는 새 전달 패키지를 사용한다. `scripts/package-home-transfer.py`는 현재 2.5D 소스와 명시적으로 지정한 비교 자료를 묶도록 갱신됐다. Blender 파일을 필수로 요구하지 않는다. 최신 묶음은 `STAM-LOCAL-2D-20261110.zip`이며 동명의 과거 HOME 묶음과 구분한다. 예전 ZIP을 무조건 덮어쓰거나 Git 객체를 옮기지 않는다.

## 다음 PC에 전달할 지시

> AGENTS.md, docs/DEVELOPMENT.md, PROJECT_STATUS.md, docs/STAM-EXPERIENCE-ROADMAP.md를 읽고 현재 파일과 도구를 확인해. 관제실/밝은 지상기지는 고화질 이미지 기반 2.5D이며, 전체 3D 모델링·자유 이동·지도 후면 콘솔·180도 회전·Blender 준비 계획은 폐기됐어. 실제 지도·적재 3D와 기존 좌표/소유권/SCU/적재 방향/저장을 보존해. 첫 산출물은 관제실 전경과 콘솔 하나의 확대·실제 UI 전환·복귀야. 연결 앱은 Gen Studio처럼 설치 후 STAM 아이콘으로 쓰는 구조를 목표로 하고 검증된 로그 파서는 재사용해. 앱 설치/로그 자동 탐색과 게임 오버레이는 최종 계획 순서에 따라 별도로 검증해. 새 결제·커밋·푸시·배포는 실행하지 마.
