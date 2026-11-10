import lounge from './assets/lounge-terminal-reference.png';
import bridge from './assets/control-room-empty-seats-reference.png';
import type { SpaceScreen } from './space-navigation';

// Coordinates belong to the artwork, never to mission/route data. Change these
// alongside a replacement scene; SVG and image share the exact same view box.
export type SceneTarget = {
  id: string; to: SpaceScreen; label: readonly [string, string];
  detail: readonly [string, string]; x: number; y: number;
  focus: readonly [number, number]; outline: string;
};
export const spaceConfig = {
  approachMs: 850,
  approachScale: 1.55,
  // Travel video is being made separately. No paid service or placeholder video.
  scenes: {
    lounge: { image: lounge, targets: [
      { id: 'desk', to: 'guide', label: ['안내 데스크', 'Welcome desk'], detail: ['파트너 · 이용안내', 'Partner · Getting started'], x: 20, y: 73, focus: [19, 56], outline: '43,570 566,522 550,596 76,693 43,670' },
      { id: 'gate', to: 'bridge', label: ['탑승 게이트', 'Boarding gate'], detail: ['우주 관제센터로', 'To orbital control'], x: 37, y: 37, focus: [37, 49], outline: '489,534 490,402 511,371 555,361 697,382 736,414 739,543 711,544 710,421 686,405 562,387 533,404 533,543' },
      { id: 'terminal', to: 'bridge', label: ['관제 터미널', 'Control terminal'], detail: ['관제센터 바로가기', 'Enter control centre'], x: 49, y: 73, focus: [48, 56], outline: '744,454 790,450 825,528 866,551 866,594 839,609 741,608 699,588 701,557 759,539' },
      { id: 'information', to: 'information', label: ['정보실', 'Information'], detail: ['운송 자료 · 업데이트', 'Freight reference · Updates'], x: 75, y: 66, focus: [75, 50], outline: '1147,409 1358,364 1383,378 1383,548 1146,551' },
      { id: 'cinema', to: 'cinema', label: ['영상관', 'Cinema'], detail: ['STAM 소개영상', 'Discover STAM'], x: 91, y: 72, focus: [91, 48], outline: '1440,303 1621,249 1657,263 1657,615 1431,578 1431,335' },
    ] satisfies SceneTarget[] },
    bridge: { image: bridge, targets: [
      { id: 'mission', to: 'mission', label: ['미션 콘솔', 'Mission console'], detail: ['함선 · 출발지 · 계약', 'Ship · Departure · Contracts'], x: 24, y: 70, focus: [24, 55], outline: '310,478 473,480 487,516 467,553 419,572 376,566 369,543 313,532' },
      { id: 'map', to: 'map', label: ['항로 지도', 'Star map'], detail: ['스탠턴 · 항성계 탐색', 'Stanton · System navigation'], x: 50, y: 74, focus: [50, 42], outline: '637,529 591,574 597,612 687,642 984,642 1076,611 1083,576 1028,530 976,518 684,518' },
      { id: 'operations', to: 'operations', label: ['운항 관제', 'Operations'], detail: ['현재 작업 · 화물 적재', 'Current task · Cargo'], x: 76, y: 70, focus: [76, 55], outline: '1231,478 1361,479 1357,532 1304,545 1300,565 1254,571 1216,551 1208,515' },
    ] satisfies SceneTarget[] },
  },
} as const;
