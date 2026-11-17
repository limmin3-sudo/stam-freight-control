import type {TradePlan} from './trade-operations';
import type {MarketSnapshot,Terminal} from './trade-data';
import type {FlightPlan} from './flight-types';
import type {currentLocationData} from './personal-locations.mjs';
export const tradeAtlas:ReturnType<typeof currentLocationData>;
export type ResolvedTerminal={point:typeof tradeAtlas.locations[number];match:string;terminalId:number};
export type TradeNavigation={origin:ResolvedTerminal|null;destination:ResolvedTerminal|null;route:FlightPlan|null;reason:string|null;version:string};
export function resolveTradeTerminal(terminal:Terminal,atlas?:typeof tradeAtlas):ResolvedTerminal|null;
export function tradeNavigation(plan:Pick<TradePlan,'ship'|'origin'|'destination'|'systemPath'>,market:MarketSnapshot,atlas?:typeof tradeAtlas):TradeNavigation;
