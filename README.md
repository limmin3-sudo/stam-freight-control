# STAM FREIGHT CONTROL

Star Citizen의 여러 운송 미션을 스크린샷으로 입력하고, 미션별 화물·경로·적재·시간을 정리하는 비공식 팬 도구입니다.

- 사이트: https://limmin3-sudo.github.io/verse-hauler/
- 소스: https://github.com/limmin3-sudo/verse-hauler
- **개발 인수인계:** [docs/CLOUD-HANDOFF.md](docs/CLOUD-HANDOFF.md)
- **Codex Cloud 시작 프롬프트:** [docs/CLOUD-START-PROMPT.md](docs/CLOUD-START-PROMPT.md)

## 현재 되는 기능

- 스크린샷 여러 장·드래그·붙여넣기, 기본 브라우저 OCR, 읽은 값 즉시 수정.
- 미션별 화물 소유권 보존, 배송지별 상자 크기·개수 입력, 같은 미션 유형에 구성 재사용.
- Stanton·Pyro·Nyx의 3D 지도, 천체·정거장·지상 거점 검색, 확인된 게이트웨이 경유.
- 간편 경로 / 상세 적재, 51종 함선 선택과 그리드 수정·등록·백업.
- Hull B 좌현·우현 보기, 평평한 화물칸 보기, 방향 가이드, 거점 작업 전·후 배치와 하역 순서.
- 운항 파트너 선택 후 인사. 수석 항해사·항해 장교·전담 비서의 사진과 말투를 전체 흐름에 적용.
- 함선별 SCM·NAV·드라이브 슬롯 데이터 자동 적용. Atlas S1 / Hemera S2 / Erebos S3, 그 외는 확인된 기본 장착품.
- 초기 함선 선택 단계에서 기본 장착 / 민수 A등급 / 사용자 설정 원클릭 선택. 함선별 수동 속도 저장·복원.
- 거점별 완료 버튼, 되돌리기, 현재 위치 재계산, 실측 시간, 예상 총 수익·시간당 수익.
- 개인 장소·좌표·한글 별칭 관리, 백업, 일일 좌표 검증·배포.

## 아직 없는 기능

**Google 로그인·사용자 계정 저장·다른 PC와의 자동 동기화는 미구현입니다.** 현재 개인 설정·미션·진행 기록은 브라우저에 저장됩니다. Firebase를 이용한 계정별 저장은 다음 우선 작업이며, 연결이나 프로젝트가 확인된 상태가 아닙니다.

실시간 게임 상태·로그 자동 입력, 완전한 연료/대기권/중량 시뮬레이션도 구현되지 않았습니다. 정확하지 않은 함선 외형을 그리는 대신 화물 그리드와 방향을 표시합니다.

## 실행

Node.js 22, 저장소 루트 기준:

```sh
node scripts/prepare.mjs
npm test
npm start
```

기본 주소는 `http://127.0.0.1:4173`입니다. Windows에서는 `start.cmd`도 사용할 수 있습니다. 별도 프레임워크 빌드나 필수 npm 의존성 설치는 없습니다.

깨끗한 체크아웃에서는 고정 버전 Three.js와 공개 좌표를 준비합니다. `vendor/three.module.js`, `data/locations.json`은 Git에서 제외되며 준비 스크립트와 CI가 생성합니다. 이 두 파일이 없다는 이유로 저장소가 불완전한 것은 아닙니다.

32개 테스트로 적재·미션 보존·경로·개인 장소 검증·선택적 AI 서버 보호·비행 시간 근사를 검사한 기능 버전이 배포돼 있습니다. 실제 스샷 OCR 정확도와 실제 AI 호출은 별도 실사용 검증이 필요합니다.

## 시간과 데이터의 범위

퀀텀 이동은 드라이브의 2단계 가감속·스풀·쿨다운 근사입니다. 지상 접근은 기본 30km를 SCM의 65%, 우주 거점 접근은 20km를 NAV 최고속도의 65%로 가정합니다. 실제 대기 밀도·질량·서버 지연을 재현하는 값이 아니며 설정에서 보정할 수 있는 항목과 코드 내부 가정은 인수인계 문서에 구분했습니다.

좌표 스냅샷은 `data/locations.json`의 meta, 비행 성능은 `data/ship-performance.json`의 버전·출처를 따릅니다. 현재 기능 기준은 `4.10.2-LIVE.12881860`, 좌표 731개·점프 연결 2개입니다. 실행 시 최신 파일의 meta를 확인하세요.

```sh
node scripts/refresh-data.mjs
node scripts/refresh-performance.mjs
npm test
```

## 배포

`.github/workflows/pages.yml`은 main push·수동 실행·매일 09:23 KST 예정 실행을 처리합니다. 좌표 검증과 테스트가 통과하면 공개 파일만 GitHub Pages로 배포합니다. GitHub의 스케줄은 지연될 수 있습니다. 소스 업로드와 실제 배포 성공을 구분하고 Actions와 사이트를 확인하세요.

## 선택적 AI 해석 서버

기본 OCR에는 AI API 키가 필요 없습니다. `server/worker.mjs`와 로컬 어댑터는 선택적 비공개 AI 서버 코드입니다. 실제 서버 연결과 API 정확도가 확인됐다는 뜻은 아닙니다.

API 키는 서버 환경 변수에만 설정하고 클라이언트·GitHub·문서에 넣지 않습니다. `.env.example`은 형식 예시이며 실제 `.env`는 커밋하지 않습니다. Cloud 환경이 이전 컴퓨터의 키·로그인·개인 설정을 자동으로 가져오지 않습니다.

## 출처·라이선스

- 게임 좌표·성능: [Star Citizen Wiki API](https://api.star-citizen.wiki/api/locations/positions)
- 그리드 자료 일부: [SuperCargo](https://github.com/AquatikJustice/SuperCargo), `vendor/SUPERCARGO-LICENSE.txt` 유지.
- Three.js: MIT, `vendor/THREE-LICENSE.txt` 유지.
- 참고한 도구와 리뷰 영상: [REFERENCE-NOTES.md](REFERENCE-NOTES.md), [인수인계](docs/CLOUD-HANDOFF.md).
- 파트너 사진: 생성한 가상 성인 인물, `assets/partners/`에 포함.

앱 소스는 MIT이며 게임 데이터·Star Citizen 관련 자산의 권리는 별개로 각 권리자에게 있습니다. Cloud Imperium Games와 무관한 팬 도구입니다.
