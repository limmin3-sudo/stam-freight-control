export const stations = ['mission', 'map', 'operations'] as const;
export type Station = typeof stations[number];
export type Screen = 'bridge' | Station;
export type Locale = 'ko' | 'mix' | 'en';
export type Route = Readonly<{ screen: Screen; locale: Locale }>;

export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const screen: Screen = stations.find(station => station === path) ?? 'bridge';
  const language = new URLSearchParams(query).get('lang');
  const locale: Locale = language === 'en' || language === 'mix' ? language : 'ko';
  return { screen, locale };
}

export function routeHash(route: Route): string {
  return `#/${route.screen}?lang=${route.locale}`;
}

export const stationLayout: Record<Station, { x: number; y: number; number: string }> = {
  mission: { x: 14, y: 56, number: '01' },
  map: { x: 50, y: 53, number: '02' },
  operations: { x: 87, y: 56, number: '03' },
};
