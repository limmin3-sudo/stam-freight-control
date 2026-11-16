import type { Locale, Station } from './navigation';

export const spaceScreens = ['lounge', 'guide', 'information', 'cinema', 'service', 'bridge', 'mission', 'map', 'operations'] as const;
export type SpaceScreen = typeof spaceScreens[number];
export type ArchiveView = 'missions'|'ships'|'cargo';
export const serviceViews=['account','history','feedback','updates','manual'] as const;
export type ServiceView=typeof serviceViews[number];
export type SpaceRoute = Readonly<{ screen: SpaceScreen; locale: Locale; view?:ArchiveView; serviceView?:ServiceView }>;

export function parseSpaceRoute(hash: string): SpaceRoute {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const params=new URLSearchParams(query),lang=params.get('lang');
  const screen=spaceScreens.find(screen => screen === path) ?? 'lounge';
  return {
    screen,
    locale: lang === 'en' || lang === 'mix' ? lang : 'ko',
    ...(screen==='service'&&serviceViews.some(v=>v===params.get('section'))?{serviceView:params.get('section') as ServiceView}:{}),
    ...(screen==='information'&&['missions','ships','cargo'].includes(params.get('view')||'')?{view:params.get('view') as ArchiveView}:{}),
  };
}

export function spaceHash(route: SpaceRoute) { return `#/${route.screen}?lang=${route.locale}${route.screen==='information'&&route.view?'&view='+route.view:''}${route.screen==='service'&&route.serviceView?'&section='+route.serviceView:''}`; }
export function isStation(screen: SpaceScreen): screen is Station {
  return screen === 'mission' || screen === 'map' || screen === 'operations';
}
export function parentSpace(screen: SpaceScreen): 'lounge' | 'bridge' {
  return isStation(screen) || screen === 'bridge' ? 'bridge' : 'lounge';
}
