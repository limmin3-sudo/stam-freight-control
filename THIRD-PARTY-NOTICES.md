# STAM FREIGHT CONTROL — 출처와 배포 고지

STAM은 비공식 비영리 팬 도구입니다. CIG의 공식 제품·승인 도구라고 주장하지 않습니다. Star Citizen, 게임 내 이름·상표·데이터의 권리는 Cloud Imperium Games 및 각 권리자에게 있습니다. 게임 데이터에 STAM 코드의 MIT 라이선스를 적용하지 않습니다.

## 코드와 구성 요소

- STAM 자체 코드: 루트 `LICENSE`의 MIT 라이선스와 기존 저작권 표시를 유지합니다.
- Node.js 22.23.4 Windows x64: https://nodejs.org/dist/v22.23.4/ 에서 배포한 런타임. 공식 SHA-256으로 검증하며 배포 ZIP의 전체 `LICENSE`를 `runtime/LICENSE`에 보존합니다. Node.js 및 내장 구성 요소의 개별 고지는 그 파일을 따릅니다.
- Three.js 0.169.0, OrbitControls: MIT, `vendor/THREE-LICENSE.txt`.
- Tesseract.js 6.0.1 / tesseract.js-core 6.0.0: Apache-2.0 및 내장 Tesseract/Leptonica 고지. `vendor/ocr-LICENSES.txt`에 원문 고지를 보존합니다. 공개 고정 URL·크기·SHA-256은 `data/screen-reader-assets.json`에 있습니다. OCR 자산을 배포해도 사용자가 보조 감시를 켜기 전에는 실행하지 않습니다.
- 기존 SuperCargo 참고/재사용 관련 고지: `vendor/SUPERCARGO-LICENSE.txt`. 저작권 표시를 유지합니다. 이 고지가 그 도구의 모든 기능·데이터를 재사용한다는 뜻은 아닙니다.
- Firebase SDK는 로그인 기능에서 Google 배포 서비스를 통해 불러옵니다. Firebase 계정 동기화와 로컬 게임 로그 수집은 구분합니다.

## 공개 데이터

함선·드라이브·운송 미션·거점 정보는 Star Citizen Wiki API(https://api.star-citizen.wiki/)와 저장소 각 데이터 파일의 출처·빌드를 따릅니다. 공개 목록은 현재 게임의 모든 계약·실제 상자 구성을 보증하지 않습니다. API 데이터 이용 조건 및 원권리자의 권리는 별도입니다.

별도로 사용 중인 게임 한글 패치를 설치·수정하지 않습니다.

## 안내 영상과 음악

`assets/onboarding/briefing.mp4`는 STAM용으로 제작한 도형·화면과 자막을 사용합니다. 음악은 `scripts/make-briefing-audio.py`로 합성한 독자적인 음원입니다. 공식 Star Citizen / Invictus / IAE 영상·음악·음성·로고를 복사하거나 샘플링하지 않습니다. 참고한 분위기를 공식 제작·제휴라고 표시하지 않습니다. 영상은 흐름 소개이며 실게임 자동 연동을 증명하는 기록이 아닙니다.

## 로컬 실행

Windows 실행기는 선택한 Game.log를 읽는 로컬 서비스만 실행합니다. 메모리 읽기·주입·패킷 감청·매크로·게임 파일 수정·EAC 우회는 구현하지 않습니다. 게임 로그 원문과 연결 키를 원격 서버로 자동 전송하지 않습니다. 실행 파일은 현재 코드 서명 전이며 실게임·보안 제품 호환성 확인은 별도 검증 대상입니다.
