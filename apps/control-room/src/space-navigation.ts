import type { Locale, Station } from './navigation';

export const spaceScreens = ['division', 'lounge', 'guide', 'information', 'cinema', 'service', 'bridge', 'mission', 'map', 'operations'] as const;
export type SpaceScreen = typeof spaceScreens[number];
export type TradeScope='intrasystem'|'interstellar';
export type DivisionFacility='trade'|'guide-center';
export const lobbyRoomIds={trade:['market','planning','trade-operations'],'guide-center':['freight-information','education','operations-study']} as const;
export type LobbyRoom=typeof lobbyRoomIds[DivisionFacility][number];
export function validLobbyRoom(facility:DivisionFacility|undefined,room:string|undefined|null):room is LobbyRoom { return !!facility && (lobbyRoomIds[facility] as readonly string[]).includes(room??''); }
export type ArchiveView = 'missions'|'ships'|'cargo';
export const serviceViews=['account','history','feedback','updates','manual'] as const;
export type ServiceView=typeof serviceViews[number];
export type SpaceRoute = Readonly<{ screen: SpaceScreen; locale: Locale; view?:ArchiveView; serviceView?:ServiceView; facility?:DivisionFacility; lobbyRoom?:LobbyRoom;tradeScope?:TradeScope }>;

export function parseSpaceRoute(hash: string): SpaceRoute {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const params=new URLSearchParams(query),lang=params.get('lang');
  const screen=spaceScreens.find(screen => screen === path) ?? 'division';
  const facility=screen==='division'&&['trade','guide-center'].includes(params.get('facility')||'')?params.get('facility') as DivisionFacility:undefined;
  const room=params.get('room');
  return {
    screen,
    ...(facility==='trade'&&room==='planning'&&['intrasystem','interstellar'].includes(params.get('advisor')||'')?{tradeScope:params.get('advisor') as TradeScope}:{}),
    ...(validLobbyRoom(facility,room)?{lobbyRoom:room}:{}),
    ...(screen==='division'&&['trade','guide-center'].includes(params.get('facility')||'')?{facility:params.get('facility') as DivisionFacility}:{}),
    locale: lang === 'en' || lang === 'mix' ? lang : 'ko',
    ...(screen==='service'&&serviceViews.some(v=>v===params.get('section'))?{serviceView:params.get('section') as ServiceView}:{}),
    ...(screen==='information'&&['missions','ships','cargo'].includes(params.get('view')||'')?{view:params.get('view') as ArchiveView}:{}),
  };
}

export function spaceHash(route: SpaceRoute) { return `#/${route.screen}?lang=${route.locale}${route.screen==='information'&&route.view?'&view='+route.view:''}${route.screen==='service'&&route.serviceView?'&section='+route.serviceView:''}${route.screen==='division'&&route.facility?'&facility='+route.facility:''}${route.screen==='division'&&validLobbyRoom(route.facility,route.lobbyRoom)?'&room='+route.lobbyRoom:''}${route.screen==='division'&&route.facility==='trade'&&route.lobbyRoom==='planning'&&route.tradeScope?'&advisor='+route.tradeScope:''}`; }
export function isStation(screen: SpaceScreen): screen is Station {
  return screen === 'mission' || screen === 'map' || screen === 'operations';
}
export function parentSpace(screen: SpaceScreen): 'lounge' | 'bridge' {
  return isStation(screen) || screen === 'bridge' ? 'bridge' : 'lounge';
}
