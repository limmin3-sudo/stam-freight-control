import type { Locale, Screen, Station } from './navigation';

const ko = {
  preview: '구성 미리보기', home: '관제실', back: '관제실로',
  title: '항해의 중심, STAM 관제실.',
  welcome: 'INTERSTELLAR LOGISTICS',
  intro: '미션을 준비하고, 항로를 확인하고, 운송을 지휘하십시오.',
  begin: '운송 준비하기',
  roomAlt: '중앙 입체지도와 왼쪽 미션 콘솔, 오른쪽 관제 콘솔이 있는 STAM 관제실',
  navigate: '관제실 바로가기', language: '표시 언어', skip: '주요 메뉴로 건너뛰기',
  status: '화면 구성 확인용입니다. 실제 계약·운항 데이터는 연결하지 않았습니다.',
  mission: '미션 콘솔', map: '항로 지도', operations: '관제 콘솔',
  hints: { mission: '함선 · 출발지 · 계약', map: '항성계 · 목적지 · 경로', operations: '현재 작업 · 적재 · 방문 순서' },
  descriptions: {
    mission: '함선과 출발지를 정하고, 운송할 계약을 선택하는 곳입니다.',
    map: '입체 지도를 넓게 펼쳐 목적지와 이동 경로를 확인하는 곳입니다.',
    operations: '이번 거점의 작업과 적재 위치를 함께 확인하는 곳입니다.',
  },
  areas: {
    mission: [
      ['함선·출발지', '함선 사양, 사용 가능한 화물칸과 출발 위치를 한곳에서 확인합니다.'],
      ['계약 선택', '수신 계약을 확인하고, 선택한 계약을 운송 계획에 넣습니다.'],
      ['경로 확인', '예상 시간과 적재량을 확인한 뒤 운항을 시작합니다.'],
    ],
    map: [
      ['입체 항로 지도', '가운데 넓은 공간에서 행성·위성·정거장과 경로를 탐색합니다.'],
      ['방문 순서', '접을 수 있는 목록으로 구간을 선택하고 지도에 표시합니다.'],
      ['선택한 목적지', '거리, 예상 시간과 경유지를 필요한 순간에 확인합니다.'],
    ],
    operations: [
      ['현재 작업', '현재 목적지와 내릴 화물·실을 화물, 다음 행동을 가장 먼저 표시합니다.'],
      ['적재 3D', '현재 작업과 연결된 배치를 확인합니다. 필요하면 크게 펼쳐 봅니다.'],
      ['다음 거점', '방문 순서와 전체 경로를 확인하며 운항을 이어갑니다.'],
    ],
  },
};
type Copy = Omit<typeof ko, 'areas'> & { areas: Record<Station, string[][]> };
const en: Copy = {
  preview: 'Layout preview', home: 'Control room', back: 'Return to bridge',
  title: 'Your command. Your horizon.', welcome: 'INTERSTELLAR LOGISTICS',
  intro: 'Prepare your contracts, chart your route and direct your freight operations.',
  begin: 'Prepare a run',
  roomAlt: 'STAM control room with a central star map, mission console on the left and control console on the right',
  navigate: 'Control room navigation', language: 'Display language', skip: 'Skip to navigation',
  status: 'Layout preview. Live contracts and run progress are not connected.',
  mission: 'Mission console', map: 'Star map', operations: 'Control console',
  hints: { mission: 'Ship · Departure · Contracts', map: 'Systems · Destinations · Routes', operations: 'Current task · Cargo · Stops' },
  descriptions: {
    mission: 'Choose your ship and departure, then select the contracts to carry.',
    map: 'Explore a spacious star map to inspect destinations and your route.',
    operations: 'See the current stop’s tasks and cargo placement together.',
  },
  areas: {
    mission: [
      ['Ship & departure', 'Review your ship, available cargo grids and departure location in one place.'],
      ['Select contracts', 'Review received contracts and add your selection to the plan.'],
      ['Review the route', 'Check estimated time and cargo load before starting your run.'],
    ],
    map: [
      ['Interactive star map', 'Explore planets, moons, stations and routes in the main viewport.'],
      ['Visit order', 'Choose a leg from a collapsible list to locate it on the map.'],
      ['Selected destination', 'Inspect distance, estimated time and gateways when needed.'],
    ],
    operations: [
      ['Current task', 'Destination, cargo to unload or load, and the next action come first.'],
      ['Cargo 3D', 'Inspect placement for the current task and expand it when needed.'],
      ['Next stop', 'Follow the visit order and full route as your run progresses.'],
    ],
  },
};

export function copyFor(locale: Locale): Copy { return locale === 'en' ? en : ko; }
export function screenTitle(screen: Screen, copy: Copy): string {
  return screen === 'bridge' ? copy.home : copy[screen];
}
