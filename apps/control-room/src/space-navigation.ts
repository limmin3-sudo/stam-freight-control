import type { Locale, Station } from './navigation';

export const spaceScreens = ['lounge', 'guide', 'information', 'cinema', 'service', 'bridge', 'mission', 'map', 'operations'] as const;
export type SpaceScreen = typeof spaceScreens[number];
export type SpaceRoute = Readonly<{ screen: SpaceScreen; locale: Locale }>;

export function parseSpaceRoute(hash: string): SpaceRoute {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const lang = new URLSearchParams(query).get('lang');
  return {
    screen: spaceScreens.find(screen => screen === path) ?? 'lounge',
    locale: lang === 'en' || lang === 'mix' ? lang : 'ko',
  };
}

export function spaceHash(route: SpaceRoute) { return `#/${route.screen}?lang=${route.locale}`; }
export function isStation(screen: SpaceScreen): screen is Station {
  return screen === 'mission' || screen === 'map' || screen === 'operations';
}
export function parentSpace(screen: SpaceScreen): 'lounge' | 'bridge' {
  return isStation(screen) || screen === 'bridge' ? 'bridge' : 'lounge';
}
