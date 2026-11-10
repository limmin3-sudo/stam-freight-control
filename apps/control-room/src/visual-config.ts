import type { Screen } from './navigation';
import mapArtwork from './assets/glass-stanton.png';
import bridgeIcon from './assets/icons/bridge.png';
import missionIcon from './assets/icons/mission.png';
import mapIcon from './assets/icons/map.png';
import operationsIcon from './assets/icons/operations.png';

// Presentation-only settings. Change these without changing navigation or saved data.
export const visualConfig = {
  icons: {
    style: 'line' as 'line' | 'image',
    images: { bridge: bridgeIcon, mission: missionIcon, map: mapIcon, operations: operationsIcon } satisfies Record<Screen, string>,
  },
  map: {
    artwork: mapArtwork,
    route: {
      width: 6, color: '#fff1cf',
      glowWidth: 22, glowColor: '#77dcff', glowOpacity: .7, glowBlur: 6,
      originRadius: 10, originColor: '#d7f6ff',
      targetRadius: 28, targetDotRadius: 8, targetWidth: 3.5,
      targetColor: '#f2cf98', targetFill: '#07172490',
    },
  },
};

// Positions belong to this illustration, not to the live star-system dataset.
// Update them alongside a replacement artwork if planet positions change.
export const previewDestinations = [
  { id: 'hurston', ko: '허스턴', en: 'Hurston', x: 16, y: 64, labelX: 16, labelY: 43, color: '#bd936c' },
  { id: 'crusader', ko: '크루세이더', en: 'Crusader', x: 46, y: 25, labelX: 64, labelY: 14, color: '#dcc6b6' },
  { id: 'arccorp', ko: '아크코프', en: 'ArcCorp', x: 81, y: 45, labelX: 84, labelY: 24, color: '#c0a78d' },
  { id: 'microtech', ko: '마이크로텍', en: 'microTech', x: 65, y: 78, labelX: 79, labelY: 92, color: '#9fd9e8' },
] as const;
