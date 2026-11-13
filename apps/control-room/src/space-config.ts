import lounge from './assets/lounge-original-composite.png';
import bridge from './assets/control-room-empty-seats-reference.png';
import type { SpaceScreen } from './space-navigation';
import { sceneContours } from './space-contours';

// Coordinates belong to the artwork, never to mission/route data. Change these
// alongside a replacement scene; selection regions and leader endpoints share its view box.
export type SceneTarget = {
  id: string; to: SpaceScreen; label: readonly [string, string];
  detail: readonly [string, string]; x: number; y: number;
  focus: readonly [number, number]; anchor: readonly [number, number]; marker: readonly [number, number]; contour: string;
};
export const spaceConfig = {
  approachMs: 850,
  approachScale: 5.2,
  // Travel video is being made separately. No paid service or placeholder video.
  scenes: {
    lounge: { image: lounge, targets: [
      { id: 'desk', to: 'guide', label: ['안내 데스크', 'Welcome desk'], detail: ['첫 운송 튜토리얼', 'First haul tutorial'], x: 22, y: 73, focus: [32.9, 57], anchor: [32.9, 55], marker: [27.5, 47], contour: sceneContours.desk },
      { id: 'gate', to: 'bridge', label: ['탑승 게이트', 'Boarding gate'], detail: ['CONTROL CENTER', 'CONTROL CENTER'], x: 47, y: 76, focus: [37, 49], anchor: [42.3, 62], marker: [42.3, 62], contour: sceneContours.gate },
      { id: 'service', to: 'service', label: ['서비스센터', 'Service centre'], detail: ['계정 · 운송기록 · 이용안내', 'Account · History · Help'], x: 63, y: 62, focus: [55, 47], anchor: [55.6, 51.1], marker: [55.6, 51.1], contour: sceneContours.service },
      { id: 'information', to: 'information', label: ['아카이브', 'Archive'], detail: ['함선 · 미션 · 화물 자료', 'Ships · Missions · Cargo'], x: 72, y: 76, focus: [75, 50], anchor: [74.4, 62.2], marker: [74.4, 62.2], contour: sceneContours.information },
      { id: 'cinema', to: 'cinema', label: ['시네마', 'Cinema'], detail: ['STAM 소개영상', 'Discover STAM'], x: 88, y: 82, focus: [91, 48], anchor: [91.3, 68.1], marker: [91.3, 68.1], contour: sceneContours.cinema },
    ] satisfies SceneTarget[] },
    bridge: { image: bridge, targets: [
      { id: 'mission', to: 'mission', label: ['미션 콘솔', 'Mission console'], detail: ['함선 · 출발지 · 계약', 'Ship · Departure · Contracts'], x: 12, y: 73, focus: [8, 55], anchor: [8, 55], marker: [8, 48], contour: sceneContours.mission },
      { id: 'map', to: 'map', label: ['항로 지도', 'Star map'], detail: ['스탠턴 · 항성계 탐색', 'Stanton · System navigation'], x: 50, y: 83, focus: [50, 33], anchor: [50, 40], marker: [50, 72], contour: sceneContours.map },
      { id: 'operations', to: 'operations', label: ['관제 콘솔', 'Control console'], detail: ['현재 작업 · 화물 적재', 'Current task · Cargo'], x: 88, y: 77, focus: [95, 55], anchor: [95, 55], marker: [95, 50], contour: sceneContours.operations },
    ] satisfies SceneTarget[] },
  },
} as const;
