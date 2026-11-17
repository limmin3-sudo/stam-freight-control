import type {CargoShip,Packing} from './cargo-plan.mjs';
export type TradeCargoRequest={runId:string;shipId:string;quantity:number;boxSize:number;commodity:string;destination:string;mode:string};
export type TradeCargoPreview={ship:CargoShip;packing:Packing|null;reason:string|null};
export function tradeCargoPreview(input:TradeCargoRequest):TradeCargoPreview;
