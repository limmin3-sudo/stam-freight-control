# Windows 로그 앱 1.5 검증 — 2026-11-17

[Windows 실행 결과](https://github.com/limmin3-sudo/stam-freight-control/actions/runs/44060734263)는 성공했다. 검증 소스는 `3ddc89bf8c62f6cb68b63b59d19b63a1035f727b`, 별도 브랜치는 `verify/log-companion-v15-20261117`이다. 주 작업 브랜치 HEAD와 기존 index/미커밋 작업을 보존했고 공개 웹·앱을 배포하지 않았다. [로컬 파일 일치 대조](windows-source.json), [실행 메타데이터](windows-run.json), [판정과 제한](windows-verification.json).

실제 Windows에서 C# 컴파일, 동봉 Node 실행, 언어 변경, 창 닫기/재열기, 전역 단축키, 오버레이 표시/숨김, 클릭 통과, 오래된 표시 삭제, 설정 복원을 확인했다. 설치·덮어설치·제거와 기존 설정 보존도 통과했다. 검사는 임시 설정/합성 요약을 사용하며 실제 게임을 실행하지 않는다. 음성은 허용 명령/신뢰도 제한과 설치된 엔진의 문법 모의를 검사하고 마이크를 사용하지 않는다. 설치된 언어 엔진 목록은 아티팩트 JSON에 있으며 현재 로컬에서 읽지 못했으므로 특정 언어의 음성 인식 성공을 단정하지 않는다.

첫 실행은 `System.Speech.dll`의 단순 참조 이름을 컴파일러가 찾지 못해 실패했다. .NET Framework4.8 참조 어셈블리의 실제 경로를 사용하도록 수정한 두 번째 실행이 통과했다. 한국어/영어 캡처와 `overlay-native-check.json`, `installer-check.json`, 설치 EXE·ZIP·해시/파일 목록은 [검증 아티팩트](https://github.com/limmin3-sudo/stam-freight-control/actions/runs/44060734263/artifacts/14318252376)에 14일 보관된다.

GitHub 업로드 보고값은 64,159,210 bytes, SHA256 `4f0f40317d6f66756fb52ee49338c684de710e68536818f22ffd2b92bed86750`이다. 이것은 ZIP/설치 EXE 개별 해시가 아닌 전체 검증 아티팩트 해시다. 이 환경에서 저장소 호스트로의 다운로드 CONNECT가403으로 차단됐다. 따라서 로컬 다운로드·해시 대조·Windows 캡처 시각 검토는 완료라고 표시하지 않는다. 설치 파일은 서명하지 않았으며 공개 릴리스도 만들지 않았다. 빌드 출력의 `desktop-release.json`은 후속 게시 입력이지 공개 성공의 증거가 아니다.
