# 라운지 전체 가이드 투어 · 2026-11-14

새로 제작한 투명 가이드 자세 5종을 사용해 **데스크 → 시네마 → 아카이브 → 서비스센터 → 게이트**로 이어지는 독립 2.5D 검토본이다. 기존 두 자세를 크롭·반전해서 새 자산이라고 세지 않았다. 새 PNG는 전부 887×1774 RGBA이며, 생성 원본은 별도 제작 폴더에 보존했다.

이번 작업은 별도 브랜치 `cinematic/lounge-tour-20261114`에만 있다. 제품 TSX/CSS·계약·계산·저장 기능은 수정하지 않았다. main/공통 인계 브랜치 병합·배포 대상에 자동 포함하지 않는다. **새 얼굴·비율의 시각 검토와 실제 앱 통합은 아직 남아 있다.**

## 보기

```sh
# 저장소 루트. 기존 앱 빌드와 의존성이 있을 때:
node docs/cinematics/lounge-tour-20261114/server.mjs
# http://127.0.0.1:5197/
# http://127.0.0.1:5197/docs/cinematics/lounge-tour-20261114/assets.html
```

실제 메뉴는 `/live/`에서 `apps/control-room/dist`를 그대로 서비스한다. 빌드가 없다면 저장소의 앱 빌드 절차를 따른다. 검수 당시에는 이전 연출 작업의 로컬 빌드가 존재했으며, 해당 번들의 UI를 연결했다. **이 빌드를 현재 main의 산출물이나 공개 배포본으로 간주하지 않는다.** 앱을 새로 빌드하면 그 빌드의 메뉴가 표시되므로 정지 메뉴 이미지를 다시 제작할 필요는 없다.

- [전체 브라우저 녹화](review/lounge-tour-preview.mp4) · 약59초, 무음. 실제 재생 기록이며 보간 프레임을 생성하지 않았다.
- [새 자산 5종과 승인 기준 비교](assets.html): 전신/얼굴, 어두운/밝은/라운지 배경을 전환할 수 있다.
- [데스크 전체 화면](review/desktop-desk.png)
- [시네마 도착 후 실제 메뉴](review/desktop-cinema-screen.png)
- [아카이브 도착 후 실제 메뉴](review/desktop-archive-screen.png)
- [서비스센터 도착 후 실제 메뉴](review/desktop-service-screen.png)
- [게이트 도착](review/desktop-gate.png)
- [모바일 안내](review/mobile-archive.png)

## 새 자산과 사용자 정정

| 파일 | 자세 / 사용 위치 |
|---|---|
| `assets/guide-escort.png` | 뒤·측면으로 돌아보며 인솔 / 이동 구간 |
| `assets/guide-cinema.png` | 손바닥으로 장소 소개 / 시네마와 해당 실제 화면 |
| `assets/guide-archive.png` | 자료 방향을 가리키며 설명 / 아카이브와 해당 실제 화면 |
| `assets/guide-service.png` | 손을 모으고 응대 / 서비스센터와 해당 실제 화면 |
| `assets/guide-waiting.png` | 머리를 정리하며 기다리기 / 게이트 |

다리가 짧아 보인 첫 설명 자세, 보정하다 다리를 과하게 길게 만든 버전, 얼굴이 달라진 첫 머리 정리 자세는 사용하지 않는다. 설명 자세는 승인 전신을 베이스로 팔 자세만 바꾸는 방식으로 다시 편집했고, 머리 정리 자세는 승인 얼굴을 참조해 얼굴을 다시 편집했다. 응대 자세의 배경 잔상도 정리했다. **생성본의 얼굴이 원본과 픽셀 단위로 동일하거나 사용자가 새 자세들을 승인했다고 보고하지 않는다.** 제외한 파일과 사용한 최종 파일·프롬프트·해시를 [source-record.json](source-record.json)에 구분했다.

원본 종횡비를 유지하며 CSS나 메시로 몸통·다리를 따로 늘리지 않는다. 앞선 보행 리깅 실험 PR #33은 포함하지 않는다. 이 버전은 정지 자세와 깊이 카메라·짧은 디졸브를 연결하는 제한된 사진 기반 2.5D이며 자연 보행, 자유 3D 복도, 립싱크가 아니다.

## 구성과 연결

- 장소별 이동/소개 구간14초. 도착 소개 후 기본값은 대기하며 사용자가 다음 장소를 선택한다. 자동 진행은 검토 편의 옵션이다.
- 시네마·아카이브·서비스센터는 STAM 대기 화면 → 250ms 플라스마 → **현재 앱의 실제 메뉴**로 전환한다. 안내 인물·자막은 실제 메뉴에서도 이어진다.
- 일반 메뉴 사용을 막지 않는다. 실제 사이드바를 누르면 투어 오버레이를 종료하고 기존 동작을 따른다. 처음부터를 누르면 데스크로 복귀한다.
- 실제 고정 상단바와 사이드바를 iframe에서 유지한다. 메뉴 내부 구조·설명 대상 버튼 좌표를 대사에 고정하지 않았다.
- 게이트는 기존 둥근 출입구를 향한 전경으로 끝낸다. 셔틀 출발 시간은 안내 설정이며 실제 카운트다운이 아니다. 기존 영상·관제센터 이동을 자동 실행하지 않는다.
- 전경은 현재 런타임의 `lounge-original-composite.png`만 쓴다. 폐기된 중앙 키오스크가 있는 `lounge-original.png`는 요청하지 않는다.

## 현재 전체 화면 / 사이드바

공개 사이트를 실제 브라우저로 확인하고 로컬 빌드와 따로 캡처했다. 원격 main은 확인 시점 `fa647d0`이며 공개 화면에는 아직 ‘라운지·정보실·영상관’이 표시됐다. FLIGHT CONSOLE·SPACEPORT LOUNGE·아카이브·시네마는 미통합 로컬 작업본에 표시된다. 두 캡처를 같은 상태라고 설명하지 않는다.

| 상태 | 데스크톱 | 모바일 | 모바일 메뉴 펼침 |
|---|---|---|---|
| 현재 공개 사이트 | [화면](review/deployed-desktop.png) | [화면](review/deployed-mobile.png) | [메뉴](review/deployed-mobile-sidebar.png) |
| 미통합 작업본 | [화면](review/working-desktop.png) | [화면](review/working-mobile.png) | [메뉴](review/working-mobile-sidebar.png) |

실제 URL·제목·사이드바 텍스트는 [current-ui-source.json](review/current-ui-source.json)에 기록했다. 로컬 번들에는 버전 증명 파일이 없으므로 특정 Git SHA의 빌드라고 단정하지 않는다.

## 검증

[검증 결과](review/checks.json), [재현 스크립트](review/verify-preview.mjs).

```sh
STAM_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs \
STAM_CHROMIUM=/usr/bin/chromium \
node docs/cinematics/lounge-tour-20261114/review/verify-preview.mjs
```

기존 환경에서 Playwright 녹화용 FFmpeg가 별도 경로에 있으면 `PLAYWRIGHT_BROWSERS_PATH`를 그 경로로 지정한다. 검수는1280px 데스크톱·390px 모바일, 시작/정지/재개, 바로 도착, 다음 장소, 실제 메뉴 준비 대기, 사이드바 일반 이동, 가로 넘침, 종횡비, 동작 줄이기, 전체 실제 재생을 포함했다. 페이지 오류·실패 HTTP 응답·폐기 전경 요청은 없었다. 타임라인 콜백 통계에는 정지 메뉴 안내 구간도 포함되므로 움직이는 렌더링의 FPS로 해석하지 않는다. 얼굴 유사성·자연스러운 보행은 자동 검사로 보장하지 않는다.

원본 녹화는 별도 제작 폴더 `stam-intro-production/lounge-tour-20261114/lounge-tour-realtime-original.webm`에 보존했다. 전달 MP4는 그 녹화를 H.264로 인코딩한 파일이며 제품 런타임이 재생하는 영상 자산이 아니다.

## 기능 담당 인계

[인계 문서](HANDOFF.md). 이 PR은 #32 위에 쌓은 검토용 후속이며 #33은 제외했다. 기능 담당이 공용 테마·하위 메뉴를 마친 뒤 도착 메뉴/준비 신호/오버레이 범위를 현재 코드에 맞게 연결해야 한다. 미완료 기능을 이 연출 시안으로 대체하거나 이전 SpaceExperience.tsx 전체를 덮어쓰지 않는다.
