# 퀀텀 드라이브 데이터와 비교

사용자 결정에 따라 모든 드라이브·함선 기본 장착 데이터는 Star Citizen Wiki API만 사용한다.

- 기존 함선 성능·기본 장착: `data/ship-performance.json`, `scripts/refresh-performance.mjs`.
- 전체 드라이브 및 장착 규격: `data/quantum-drives.json`, `scripts/refresh-quantum.mjs`.
- 공개 목록: https://api.star-citizen.wiki/api/items?filter[type]=QuantumDrive . 전체 페이지를 끝까지 읽는다.
- 같은 게임 버전만 결합한다. 목록과 함선 성능 원본의 SHA256, 출처 URL을 보관한다. 목록에 없는 기본 장착품은 같은 버전의 해당 함선 API에서 확인하고 `stockOnly`로 분리한다. 고정 장착은 다른 드라이브를 허용하지 않는다.

초기 선택과 초기화는 기본 장착이다. 명시적으로 저장한 함선별 선택·직접 평균 속도는 보존한다. 과거 ‘자동’ 추천 선택은 같은 규격의 해당 드라이브가 있으면 이어받으며, 잘못된 크기·사라진 ID는 기본 장착으로 표시한다. 사용자 그리드 프로필은 기존 `performanceId`를 따른다.

순위는 이 사이트의 기존 `travel.mjs` 모델을 사용한 1/10/50/100 Gm 예상 이동시간이다. 가속·감속·충전·쿨다운을 포함하며 최고속도만 정렬하지 않는다. 같은 예상 시간은 같은 순위를 사용한다. 제공처의 공식 순위나 실제 비행 시간이라고 표시하지 않는다. 연료·전력·게임 서버 상태를 재현하지 않는다. 비교 거리 변경은 실제 선택이나 운송 계획을 재계산하지 않는다.

갱신: `NODE_USE_ENV_PROXY=1 node scripts/refresh-quantum.mjs`. 기본 함선/게임 버전이 바뀌면 먼저 지도·함선 성능을 같은 위키 버전으로 갱신하고 목록을 다시 만든다. 목록 조회나 기본 장착 확인이 실패하면 기존 파일을 덮어쓰지 않는다.
