# 유효 적재 용량 검증 — 2026-11-13

작업자: 기능 클라우드. 브랜치 `integration/freight-division-20261113`, 기준 HEAD `b1abe51` 이후 미커밋 작업. 배포하지 않았다.

- 공통 프로필: `ship-profile.mjs`. 미션·미리보기·실제 Worker가 같은 그리드/치수 기준 사용.
- 미션: 사용 가능한 적재 용량. 그리드 토글 즉시 반영, 운항 중에는 현재 계획의 함선 사용.
- 미리보기: 이번 운송 함선으로 시작, 별도 함선 비교 시 구분 안내. customShip 호환 유지.
- 경로 정책·상자 소유권·현재 선적 좌표·진행 기록은 변경하지 않는다. 오퍼레이터는 기존 경로 전용.

## 검증

- `npm test`: 루트 238개 통과. 최초 네트워크 제한 셸에서는 서버를 여는 2개 파일 실패; 네트워크가 허용된 실행에서 전체 통과.
- `node --experimental-strip-types --test --test-isolation=none tests/*.test.ts` (apps/control-room): 앱 64개 통과. 이번 회귀 3개는 비활성/재활성/복원 설정, customShip 치수/부착 프레임, 실제 선적 후 재계산 소유권·좌표 보존을 확인.
- `npm run build --prefix apps/control-room`: TypeScript/Vite 통과. 테스트 추가 시 발견한 기존 context 선언의 disabledGrids 누락을 선언에 반영 후 통과. 기존 큰 청크 경고는 남아 있다.
- `node --experimental-strip-types scripts/check-cargo-capacity-browser.mjs`: 빌드 미리보기 5188에서 통과. [결과](report.json).
- 화면 조작: 46→40→46→40, 새로고침, 별도 C2 미리보기, 실제 함선 C2(696)↔Cutlass(40), Worker 계획40, 운항 시작/선적 후 다른 미리보기 설정과 새로고침에도 선적·진행 보존. 390px 가로 넘침 없음, pageerror 없음.
- [데스크톱](mission-capacity-desktop.png) · [모바일](mission-capacity-mobile.png). 합성 예시 계약이며 개인 로그/스크린샷을 포함하지 않는다.

실게임/계정/실제 모바일 장치 검증은 이번 범위가 아니다. 수신함 연속성 및 운항 중 계약 변경 대응은 별도 미완료 작업이다.
