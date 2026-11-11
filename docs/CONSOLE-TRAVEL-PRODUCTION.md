# 콘솔 이동 영상 제작 — 2026-11-11

## 최신 제작 경로 — Grok으로 전환

사용자가 로컬 영상 시험 대신 Grok을 사용하기로 결정했다. 아래의 로컬 생성 확정은 이전 기록이다. 시작 프레임과 프롬프트를 준비해 Grok 결과를 검수하고 편집·후처리·실제 UI 연결을 진행한다. 새 로컬 Gen Studio 영상 생성·모델 설치는 하지 않는다. 현재 안내데스크 영상 자료는 `cinematics/lounge-guide/`의 첫 프레임·Grok 프롬프트·검토 기록을 참조한다. 홀로그램 디자인과 가까운 벽을 향한 슬라이드 규칙은 유지한다.

## 확정 구도

사용자가 승인한 최종 구도는 배경·책상 없이 얇은 모니터 프레임과 화면만 보이는 정면이다. `apps/control-room/src/assets/console-screen-only.png`가 도착 기준이다. 앞선 독립 대형 모니터 2장 및 창문·책상이 보이는 착석 시안은 반려됐다. 이동은 영상으로 연결하며 정지 이미지 확대를 이동 영상으로 대체하지 않는다.

## 준비된 입력

라운지 시작 프레임을 새로 캡처할 때는 로컬 미리보기 `/?capture=frame#/lounge?lang=ko`에서 오프닝을 건너뛰고 `.space-artwork` 영역만 캡처한다. 이 모드는 하단 바로가기, 장소명, 원형 표식, 안내선과 선택 강조를 숨긴다. 브라우저의 장면 비율과 인물 좌표는 일반 라운지와 같다.

- 시작: `docs/handoff-media/2026-11-11/bridge-video-start.png`. 원본의 단일 행성 홀로그램과 두 파트너가 보이는 1672×941 관제센터 전경이다. 로컬 미리보기 `/?capture=frame#/bridge?lang=ko`에서 `.space-artwork`만 캡처했다. 장소와 인물 이름, 안내선, 표식, 메뉴가 모두 숨겨진다. 이는 생성 시안이 아닌 현재 런타임 장면이며 승인된 이동 영상으로 간주하지 않는다.
- 도착: `apps/control-room/src/assets/console-screen-only.png`. UI를 제외한 승인 모니터 프레임.
- 첫 제작 대상: 왼쪽 빈자리 미션 콘솔 진입 1편. 가로 영상, 짧은 단일 연속 이동, 끝 프레임 고정 후 실제 UI로 연결.

## 첫 영상 프롬프트

Use the supplied start frame as the exact opening shot and the supplied end frame as the exact final composition. One continuous first-person camera movement inside this existing orbital bridge. Move diagonally forward-left from the central aisle toward the empty outer-left console chair, gently lower to seated eye height, then smoothly push toward that station's main embedded display. The final view contains ONLY the thin metal monitor bezel and dark active screen, exactly matching the end frame: no window, planet, desk, person, auxiliary monitor or exterior margin remains visible. Keep the bridge architecture, console bank, window mullions, materials and light positions stable through the movement. The standing partners remain in place as the camera passes; they do not teleport or morph. The central hologram remains located at its pedestal and leaves view through ordinary perspective. Maintain consistent photographic metal and glass detail and restrained cyan/amber lighting. No cuts, dissolves, black fades, magical transformation, extra limbs, captions, logos or UI. Smooth deliberate acceleration and deceleration, no shaking or banking. End with a brief stable hold on the exact supplied monitor frame. Do not invent another monitor floating in front of the camera.

## 후속 제작 및 연결 조건

오른쪽 진입은 같은 원칙으로 우측 빈자리를 향한다. 복귀는 최종 모니터→자리에서 물러남→관제센터 전경으로 각각 제작·검증한다. 단순 역재생을 자연스러운 복귀 영상으로 간주하지 않는다.

검증: 장비 형태 및 창문 연속성, 빈자리 접근 방향, 인물 뒤틀림, 프레임 경계·마지막 색상 일치, 종료 시 UI 위치, 화면 비율·모바일 표시, 건너뛰기·Escape·실패 시 목적지 접근을 확인한다. 하단 버튼은 목적지를 향해 850ms 확대·암전한 뒤 이동한다. 원·장소 클릭은 긴 연출용이며 현재 1.4초 암전으로 연결한다. 제작된 긴 이동 영상은 원·장소 클릭에 연결한다. 연출 끄기는 즉시 목적지로 이동한다.

## 로컬 제작 확정 — 최신 사용자 지시

영상은 나중에 집 PC의 로컬 도구로 제작한다. Runway는 사용하지 않고 외부 업로드 승인을 다시 요청하지 않는다. 앞선 Runway 전송은 자동 승인 검토에서 거절되어 실제 업로드/생성은 실행하지 않았다. 이후 사용자가 로컬 제작으로 경로를 확정했으므로 이 차단은 더 이상 해결 대상이 아니다.

로컬 Codex는 Gen Studio MCP의 현재 연결·진단·최근 결과부터 확인한다. 과거 사용자 진단에서는 RTX 4080 SUPER 16GB, Gen Studio 0.1.0 / ComfyUI 0.44.0, Wan 2.2 I2V 3초·5초와 480p·720p가 보고됐으나 현재 상태를 재확인해야 한다. 과거 공개 MCP에는 끝 프레임 입력이 없었다. 시작/끝 프레임 지원 여부를 도구 스키마에서 확인하고, 없으면 위 프롬프트만으로 끝 프레임이 고정된다고 가정하지 않는다. 새 모델 설치나 다운로드보다 기존 워크플로와 결과를 먼저 확인한다.

실제 UI 프레임은 연결 완료. 이동 영상은 생성 전이며 영상 플레이어·역방향 이동·최종 프레임 UI 전환은 연결 전이다. 왼쪽 진입 하나의 공간 연속성을 먼저 검증하고 오른쪽·복귀·라운지 이동으로 넓힌다. 기존 반려 시안을 도착 프레임으로 재사용하지 않는다.
