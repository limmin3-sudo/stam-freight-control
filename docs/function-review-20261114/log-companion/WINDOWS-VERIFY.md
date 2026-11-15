# Windows 로그 앱 검증 — 2026-11-14

현재 작업본의 앱과 필수 의존 파일만 별도 `verify/log-companion-windows-20261114` 브랜치에 보존했다. 기존 `integration/freight-division-20261113`의 HEAD/인덱스/나머지 미커밋 작업은 바꾸지 않았다. 이 검증 브랜치는 웹 UI 변경 전체를 포함한 통합 릴리스가 아니다.

`.github/workflows/desktop-verify.yml`은 Windows에서 앱을 빌드하고 검사 산출물만 보관한다. 읽기 권한만 사용하며 Pages/Release 게시 작업은 없다. main·공통 인계 브랜치·공개 앱 메타데이터는 변경하지 않았다.

## 환경과 수정

- GitHub Actions 실제 Windows Server 2025, x64, Node.js 22.23.4, .NET Framework C# 컴파일러, 공식 Inno Setup 7.1.1.
- 첫 실행에서 실제 폼의 언어 전환/로그 API/닫기·복원 검사는 통과했지만, 파일로 등록한 글꼴이 프로세스 종료 후 잠겨 ZIP 압축이 실패했다.
- `HoloFonts`를 파일 등록 대신 메모리 기반 private font 로딩으로 바꿨다. 원본 Barlow/SUIT는 변경하지 않고, 종료 시 폰트 컬렉션/메모리를 해제한다. 다음 Windows 실행에서 ZIP/설치 EXE 생성까지 통과했다.
- 트레이 검사에서는 동일 폼의 Win32 가시성을 직접 확인한다. 숨은 뒤 바뀔 수 있는 Process.MainWindowHandle 값만으로 판정하지 않는다.
- 외부 닫기 검사 실패는 `WM_CLOSE`가 WinForms에서 `TaskManagerClosing`으로 해석된 것이었다. 진단 실행에서 해당 CloseReason과 정상 종료를 확인했다. 검사 명령을 실제 제목 표시줄 X/Alt+F4에 해당하는 `WM_SYSCOMMAND + SC_CLOSE`로 수정했다. 앱의 작업 관리자 종료 동작을 억지로 트레이 숨김으로 바꾸지 않았다.

## 최종 결과 — 통과

- [실제 Windows 검증 실행](https://github.com/limmin3-sudo/stam-freight-control/actions/runs/43597049181), 검증 소스 `66c26ac84d7a22824be7f2bf3794b828482f145f`.
- 관련 Node 5개, native 앱 언어/로그/창 수명주기, 설치된 실행 파일 재실행, 트레이에서 같은 창·watcher 복원, 부모 종료 시 watcher 종료 통과.
- 설치·덮어설치 후 바탕화면 STAM 아이콘 하나, 경로/언어 보존, 제거 후 앱/바로가기 삭제와 설정 보존 통과. [설치 결과](windows-installer-check.json).
- 원격 아카이브 SHA256, ZIP 무결성, 내부 manifest 33파일 용량/SHA256, 설치 EXE·ZIP 메타데이터 일치 확인. 현재 작업본의 검증 대상 39파일은 원격 검증 커밋과 blob 해시 일치. [기계 판독 기록](windows-native-check.json).
- 실제 Windows 기본 배율 캡처: [한국어](companion-ko-windows.png), [영어](companion-en-windows.png). Windows 11 사용자 테마를 재현한 시안이 아니다.

최신 시험 파일은 `dist/native-windows-verified/STAM-app.1.4.0-setup-win-x64.exe`와 같은 폴더의 `STAM-app.1.4.0-win-x64.zip`. 미서명·미게시이며 이전 Mono/Wine `-review-` 산출물보다 우선한다. 산출물 내 `desktop-release.json`은 이후 게시 도구용 메타데이터이며 공개 배포 완료를 뜻하지 않는다.

## 보존/통합

검증 브랜치에 앱/필수 의존 파일만 커밋·푸시했다. 원래 통합 작업본은 HEAD `916b067`, 기존 미커밋 작업과 이번 수정을 유지한다. main/공통 인계 브랜치도 `916b067` 그대로다. 이후 통합 작업본을 커밋할 때 같은 수정을 중복 cherry-pick할 필요는 없다.

## 검증 경계

합성 로그만 사용한다. 사용자 설정/실제 Game.log/게임 계정은 사용하지 않는다. Windows Server 자동 검증과 일반 Windows 10/11 사용자 PC, 125~200% 배율, 실제 게임 수신은 별도다. 사이트의 새 자동 수신 기능은 아직 공개 반영 전이다.
