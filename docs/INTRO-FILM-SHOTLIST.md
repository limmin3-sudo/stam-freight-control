# STAM 소개 영상 제작 지시서

현재 확정된 연출·카피를 정리한 제작용 문서입니다. 영상 생성 도구의 이름과 관계없이 장면별 원본 제작에 사용합니다. Sora 웹/앱 및 API는 2026-11-06 확인한 OpenAI 공식 종료 안내에 따라 현재 제작 경로로 사용하지 않습니다.

추천 제작 경로: Google Flow / Veo. 공식 안내의 참고 이미지·장면 연장·시작/마지막 프레임 기능을 사용해 함선 외형과 연결을 제어합니다. https://deepmind.google/models/veo/

먼저 03번 트랙터 적재 한 장면을 시험하고 화물의 강체 형태·이동·그리드 안착이 유지되는지 확인한 뒤 나머지 장면을 제작합니다. 원본은 장면별 파일로 전달하며, 생성 도구에 확정 카피나 한글 자막을 그리도록 요청하지 않습니다. 함선 참고 사진은 해당 장면의 함선만 사용하고, 연결 장면은 앞 클립의 마지막 프레임을 활용합니다. 생성 결과의 외형 일관성은 별도 검수 대상입니다.

## 최종 구성

16:9, 1920×1080 이상 원본. 장면별로 따로 제작한 뒤 편집합니다. 한 장면은 한 가지 주요 동작에 집중하며 최종 길이는 40–55초를 목표로 조정합니다. 사진 확대·이동이나 화면 전환만 있는 슬라이드 영상은 사용하지 않습니다. 함선·화물·카메라·광원 사이의 실제 입체 움직임이 있어야 합니다.

공통: photorealistic cinematic spacecraft footage; physically plausible motion and scale; detailed metal panels, micro-scratches, insulation, engines and cargo fixtures; restrained volumetric lighting; controlled highlights; deep blacks with visible shadow detail; subtle film grain; no video game HUD, no website screenshots, no baked-in captions, no invented logos; no melted geometry, changing engine counts, floating unsupported cargo, excessive lens flares or model-kit appearance. Use the supplied ship reference to preserve the exact silhouette throughout each shot.

아래 영어 프롬프트에 해당 함선의 사용자 제공 참고 사진을 함께 사용합니다. 외형 유지가 실패하면 해당 클립은 사용하지 않습니다. 생성 단계에는 자막·음악을 넣지 않고 편집 단계에서 추가합니다.

### 01 · C2 출항 · 6–8초

Reference: the white Crusader C2 Hercules with its rounded broad flying-wing body, red trim and four rear main engines, two per side. A continuous low rear three-quarter tracking shot as the C2 lifts slowly off a monumental industrial landing pad above a cloud-covered world. Landing gear retracts only after clearing the pad. Four engines brighten with believable heat shimmer and illuminated exhaust, landing dust rolls outward with the thrust, tiny ground crew establish scale. Slow measured acceleration, heavy machinery rather than a fighter launch. Cool blue-grey shadows, warm sunrise grazing the white hull. Lens 40 mm, restrained camera movement. Keep the ship fully coherent and visible; no cuts.

효과음: 무거운 저역 엔진·추력 증가·착륙 장치 유압음. 음악은 낮게 시작합니다.

### 02 · Ironclad 개방 · 5–7초

Reference: the long rectangular dark industrial Drake Ironclad with yellow accents and its real cargo hold. A high front three-quarter continuous shot of the stationary ship inside a vast hangar. Its heavy roof panels slide back on mechanical rails like a sunroof, revealing the detailed cargo hold, while the front ramp lowers to the floor. Preserve the rectangular hull and all reference proportions. Warm practical work lights inside contrast with cool overhead hangar lighting. Visible joints, rails and hydraulics move in a mechanically coherent sequence. No generic spaceship substitution. No sudden camera orbit.

효과음: 레일·모터·유압 작동. 문 열리는 타이밍을 분리합니다.

### 03 · 트랙터빔 적재 · 7–9초

Use the exact same Ironclad, roof fully open and front ramp lowered. Continuous medium-wide view from above the cargo deck. An articulated ship-mounted tractor emitter projects a visible restrained cyan field onto one heavy rectangular cargo container outside the open hold. The single container smoothly rises, translates over the rim, then descends vertically onto a clear cargo-grid position. The container has rigid straight edges and convincing mass; it does not rotate unpredictably or pass through the hull. Four corner locks engage, a short settling vibration follows, and the tractor field switches off after support is established. Cargo, beam and ship remain sharp enough to read. No human hand holding the emitter, no laser weapon.

효과음: 트랙터 장의 저역 진동 → 내려놓는 중량감 있는 충격 → 잠금음. 착지 순간 음악을 잠깐 낮춥니다.

### 04 · C2 퀀텀 · 5–7초

Return to the exact reference C2 with four rear main engines. Continuous rear-quarter exterior shot in the cold blue space of Stanton. Quantum energy builds in a controlled blue-white field around the ship, small light filaments converge along the flight axis, then the intact C2 accelerates forward into a long directional quantum stream. The camera remains behind, allowing a clear sense of the ship moving away in depth. Starfield streaks follow the travel direction; avoid hyperspace tunnels or jump portals here because this is intra-system quantum travel. No exploding ship or uncontrolled spin. Cinematic 50 mm lens, realistic metal and bright but non-clipped energy.

효과음: 퀀텀 충전의 상승음 → 출발 순간의 강한 저역·공간감. 엔진음과 구분합니다.

### 05 · Hull C 점프 진입 · 6–8초

Reference: the MISC Hull C with massive cruciform cargo spindle, fully loaded container arms and the correct front and aft body sections. Continuous rear three-quarter tracking shot. In cold teal-blue Stanton space, the ship approaches a vast turbulent natural jump-point mouth. The portal is a luminous irregular spatial throat rather than a flat circular gate. The Hull C enters nose-first, its cargo cross and aft engines progressively passing through the threshold. The ship silhouette, cargo and engine arrangement remain identical. Camera follows from behind at a measured pace and crosses the mouth with the ship. No abrupt teleport and no cut to a different spacecraft.

### 06 · 터널 통과와 Pyro 출구 · 8–12초

Continue the preceding Hull C shot and preserve the same vessel and cargo. Tracking behind the ship as it travels through a deep irregular spatial tunnel. Luminous currents sweep past and the ship makes a small smooth course correction without spinning. Ahead, an opening grows and warm amber light replaces the cool teal illumination. The ship exits completely into Pyro: rusty orange stellar light, dusty amber haze and rough scattered rocks, distinctly warmer and harsher than Stanton. Show the entire ship clearing the exit, with the portal still visible behind it for a moment. Maintain readable geometry and consistent cargo. No text and no combat.

효과음: 진입·터널 공명·출구를 각각 나눕니다. 진입 전 잠깐 저음을 줄이고 통과 때 공간감을 넓힙니다. 터널에는 카피를 넣지 않습니다.

### 07 · Hull B 격납고 진입 · 7–9초

Reference: the MISC Hull B with its long rounded split forebody, dark cockpit band, narrow central spindle carrying externally mounted containers and two principal aft engines. Wide rear three-quarter shot of the intact loaded Hull B slowly entering an enormous open station hangar. The station opening genuinely surrounds the moving ship, creating foreground occlusion and strong depth parallax. Amber guide lights lead into a detailed steel interior, cool exterior space remains visible behind. Articulated landing gear deploys after the ship clears the entrance. The Hull B settles gently toward its marked landing zone; engines dim and service lights remain. End on the ship safely inside the hangar, with clear breathing room for the final brand card. Do not retract the cargo spindle through attached containers. No generic three-engine freighter.

효과음: 바깥의 낮은 추진음에서 격납고 내부의 잔향으로 바뀝니다. 착지 후 엔진을 낮추고 마지막 화음을 남깁니다.

## 확정 카피 — 영어 본문 / 한국어 자막

장면을 그대로 설명하지 않고 툴을 짧게 소개합니다. 자막은 원본에 굽지 않고 편집 단계에서 넣습니다.

1. **Bring your hauling contracts together.** / 받은 운송 미션을 한 번에 정리합니다.
2. **Plan your route around your ship and cargo.** / 함선과 화물에 맞춰 경로를 짭니다.
3. **Preview your cargo layout in 3D.** / 적재 계획은 3D로 확인합니다.
4. **Know what to pick up and deliver at every stop.** / 거점별 픽업과 배송을 한눈에 확인합니다.
5. **STAM FREIGHT CONTROL** / 복잡한 미션도 한 번에.

음악: 웅장한 저역·현악 또는 신스 패드·절제된 타악. 효과음에 맞춰 음악 볼륨을 조절하고 마지막은 격납고의 공간감과 잔향으로 마무리합니다. 음성 내레이션은 넣지 않습니다. 실제 사이트 캡처는 사용하지 않습니다.

검수: 함선별 외형/엔진 수, 화물의 독립 이동, 램프/천장 개폐, 빔 종료 전 지지, 점프 진입/출구의 연속성, Stanton/Pyro 색 변화, Hull B 격납고 내부 진입을 프레임 단위로 확인합니다. 영상 생성만으로 외형과 물리 일관성이 보장된다고 설명하지 않습니다.
