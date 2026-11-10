# STAM 외부 미술 자산 — 로컬 제작용

2026-11-10 · 공개 앱에 연결하지 않은 제작/검토 자료. 다운로드 여부와 최종 디자인 승인은 별개다.

## 확보한 CC0 자료

| 자산 | 제작자 | 파일/용도 |
|---|---|---|
| [Rubber Tiles](https://polyhaven.com/a/rubber_tiles) | Amal Kumar | 2K 색상·OpenGL 노멀·거칠기 JPG. 콘솔 발밑 등 제한적인 미끄럼 방지 구역 후보. 승인 함교 전체 바닥을 고무로 대체하지 않는다. |
| [Studio Small 08](https://polyhaven.com/a/studio_small_08) | Sergej Majboroda | 2K HDR. 금속/유리/화물 재질 테스트용 중립 조명·반사. 우주 배경이나 완성 관제실 조명으로 취급하지 않는다. |

[Poly Haven의 공식 라이선스](https://polyhaven.com/license)는 자산에 CC0를 적용하고 수정·상업 이용·재배포를 허용한다. 사이트의 썸네일/예시 렌더는 이 허가와 별개이므로 포함하지 않았다. `manifest.json`에 원본 URL, 제작자, 크기와 SHA-256을 기록했다. 다운로드 파일은 API 제공 크기/MD5와 대조했다.

Blender에서 색상은 sRGB, 거칠기와 노멀은 Non-Color로 읽는다. 노멀은 Normal Map 노드를 거쳐 연결한다. 현재 노멀 JPG는 용도 검토용이며 최종 근접 표면은 원본 PNG/EXR와 비교해 압축 오차를 확인한다. Three.js 적용 시 색공간·UV/실제 치수·노멀 방향과 GPU 메모리를 다시 검증한다.

## 현재 사용 범위

관제실/지상기지 전체 3D 모델링과 환경·인물 모델 구매 계획은 폐기했다. 이전 구매 후보 목록을 제거했다. 확보한 CC0 파일은 보존하며 실제 지도/적재 재질 검토에 필요할 때 사용 여부를 판단한다. 이 자료가 새 공간 제작의 필수 조건은 아니다. [최종 구성 계획](../docs/STAM-EXPERIENCE-ROADMAP.md)을 따른다.
