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
  approachScale: 1.55,
  // Travel video is being made separately. No paid service or placeholder video.
  scenes: {
    lounge: { image: lounge, targets: [
      { id: 'desk', to: 'guide', label: ['안내 데스크', 'Welcome desk'], detail: ['디렉터 · 튜토리얼', 'Director · Tutorial'], x: 23, y: 75, focus: [32.9, 57], anchor: [32.9, 55], marker: [27.5, 47], contour: sceneContours.desk },
      { id: 'gate', to: 'bridge', label: ['탑승 게이트', 'Boarding gate'], detail: ['우주 관제센터로', 'To orbital control'], x: 36, y: 65, focus: [37, 49], anchor: [42.3, 62], marker: [42.3, 62], contour: sceneContours.gate },
      { id: 'service', to: 'service', label: ['서비스센터', 'Service centre'], detail: ['계정 · 운송기록 · 피드백 · 이용안내', 'Account · Flight history · Feedback · User guide'], x: 56, y: 67, focus: [55, 47], anchor: [55.6, 51.1], marker: [55.6, 51.1], contour: sceneContours.service },
      { id: 'information', to: 'information', label: ['정보실', 'Information'], detail: ['함선 · 미션 · 화물 자료', 'Ships · Missions · Cargo'], x: 73, y: 70, focus: [75, 50], anchor: [74.4, 62.2], marker: [74.4, 62.2], contour: sceneContours.information },
      { id: 'cinema', to: 'cinema', label: ['영상관', 'Cinema'], detail: ['STAM 소개영상', 'Discover STAM'], x: 86, y: 74, focus: [91, 48], anchor: [91.3, 68.1], marker: [91.3, 68.1], contour: sceneContours.cinema },
    ] satisfies SceneTarget[] },
    bridge: { image: bridge, targets: [
      { id: 'mission', to: 'mission', label: ['미션 콘솔', 'Mission console'], detail: ['함선 · 출발지 · 계약', 'Ship · Departure · Contracts'], x: 26, y: 68, focus: [24, 55], anchor: [25, 52], marker: [24.8, 44.2], contour: sceneContours.mission },
      { id: 'map', to: 'map', label: ['항로 지도', 'Star map'], detail: ['스탠턴 · 항성계 탐색', 'Stanton · System navigation'], x: 50, y: 80, focus: [50, 42], anchor: [50, 59], marker: [50.2, 70], contour: sceneContours.map },
      { id: 'operations', to: 'operations', label: ['운항 관제', 'Operations'], detail: ['현재 작업 · 화물 적재', 'Current task · Cargo'], x: 74, y: 68, focus: [76, 55], anchor: [75, 52], marker: [76.1, 45.6], contour: sceneContours.operations },
    ] satisfies SceneTarget[] },
  },
} as const;
