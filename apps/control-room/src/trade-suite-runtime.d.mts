import type {SuiteContext,SuiteOptions,PackedItem} from './trade-suite';
import type {TradeCargoPreview} from './trade-cargo-preview.mjs';
export function suiteDrives(shipId:string):{id:string;name:string;version:string}[];
export function suiteContext(options:SuiteOptions):SuiteContext;
export function packSuite(shipId:string,items:PackedItem[]):Omit<TradeCargoPreview,'reason'>|null;

export function fittingTradeShips(items:PackedItem[]):{id:string;name:string;capacity:number}[];
