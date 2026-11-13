import type { Locale, Station } from './navigation';

export const spaceScreens = ['lounge', 'guide', 'information', 'cinema', 'service', 'bridge', 'mission', 'map', 'operations'] as const;
export type SpaceScreen = typeof spaceScreens[number];
export type ArchiveView = 'missions';
export type SpaceRoute = Readonly<{ screen: SpaceScreen; locale: Locale; view?:ArchiveView }>;

export function parseSpaceRoute(hash: string): SpaceRoute {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const params=new URLSearchParams(query),lang=params.get('lang');
  const screen=spaceScreens.find(screen => screen === path) ?? 'lounge';
  return {
    screen,
    locale: lang === 'en' || lang === 'mix' ? lang : 'ko',
    ...(screen==='information'&&params.get('view')==='missions'?{view:'missions' as const}:{}),
  };
}

export function spaceHash(route: SpaceRoute) { return `#/${route.screen}?lang=${route.locale}${route.screen==='information'&&route.view==='missions'?'&view=missions':''}`; }
export function isStation(screen: SpaceScreen): screen is Station {
  return screen === 'mission' || screen === 'map' || screen === 'operations';
}
export function parentSpace(screen: SpaceScreen): 'lounge' | 'bridge' {
  return isStation(screen) || screen === 'bridge' ? 'bridge' : 'lounge';
}
