import {validateSuiteBook,expeditionSummary} from './trade-expedition.ts';
import {accountBoundary,readOwner} from '../../../flight-ownership.mjs';
import {TradeError,blankTradeBook,validateTradeBook,tradeSummary,type TradeBook} from './trade-operations.ts';
export const tradeKey=(owner:string)=>'stam.trade-book.v1:'+encodeURIComponent(owner);
export type TradeStorage=Pick<Storage,'getItem'|'setItem'>;
export function readyTradeOwner(storage:TradeStorage=localStorage):string{
 const owner=readOwner(storage),b=accountBoundary();
 if(['checking','error'].includes(b.phase)||storage.getItem('stam.account-storage-journal.v1')||owner.startsWith('account:')&&(b.phase!=='ready'||'account:'+b.uid!==owner)||b.phase==='ready'&&b.uid&&owner!=='account:'+b.uid)throw new TradeError('account');
 return owner;
}
export function readTradeBook(storage:TradeStorage,owner:string){const raw=storage.getItem(tradeKey(owner));return {raw,book:raw===null?blankTradeBook(owner):validateTradeBook(JSON.parse(raw),owner)};}
// Must run under the origin-wide Web Lock. Never overwrite a stale tab's revision.
export function writeTradeBook(storage:TradeStorage,owner:string,expected:string|null,next:TradeBook,guard=()=>readyTradeOwner(storage)){
 if(guard()!==owner)throw new TradeError('account');validateTradeBook(next,owner);
 if(storage.getItem(tradeKey(owner))!==expected)throw new TradeError('conflict');
 const raw=JSON.stringify(next);if(new TextEncoder().encode(raw).length>8_000_000)throw new TradeError('size');
 storage.setItem(tradeKey(owner),raw);return raw;
}

export const suiteBookKey=(owner:string)=>'stam.trade-suite.v1:'+encodeURIComponent(owner);
export const tradeOwnerLock=(owner:string)=>'stam.trade-owner:'+encodeURIComponent(owner);
// Both ledger generations use this same Web Lock. An idle→active transition must
// inspect the other generation inside the lock, including restore and undo.
export function assertTradeExclusivity(storage:TradeStorage,owner:string,kind:'legacy'|'suite',wasActive:boolean,nextActive:boolean){
 if(wasActive||!nextActive)return;
 if(kind==='legacy'){const raw=storage.getItem(suiteBookKey(owner));if(raw&&validateSuiteBook(JSON.parse(raw),owner).runs.some(r=>expeditionSummary(r).status==='active'))throw new TradeError('active');}
 else if(readTradeBook(storage,owner).book.runs.some(r=>tradeSummary(r).status==='active'))throw new TradeError('active');
}
