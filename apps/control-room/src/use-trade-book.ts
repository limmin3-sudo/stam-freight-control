import {useCallback,useEffect,useRef,useState} from 'react';
import {TradeError,changeTradeBook,tradeSummary,type TradeBook,type TradeCommand} from './trade-operations';
import {readTradeBook,readyTradeOwner,writeTradeBook,tradeOwnerLock,assertTradeExclusivity} from './trade-storage';
export function useTradeBook(){
 const [view,setView]=useState<{owner:string;raw:string|null;book:TradeBook|null;error:string}>({owner:'',raw:null,book:null,error:''});
 const ref=useRef(view),mounted=useRef(true);ref.current=view;
 const reload=useCallback(()=>{try{const owner=readyTradeOwner();const {raw,book}=readTradeBook(localStorage,owner);const next={owner,raw,book,error:''};ref.current=next;setView(next);}catch(error){const next={owner:'',raw:null,book:null,error:error instanceof TradeError?error.code:'storage'};ref.current=next;setView(next);}},[]);
 useEffect(()=>{mounted.current=true;reload();const changed=(e:StorageEvent)=>{if(!e.key||e.key.startsWith('stam.trade-book.')||['stam.flight-owner.v1','vh-account-meta','stam.account-storage-journal.v1'].includes(e.key))reload();};window.addEventListener('storage',changed);window.addEventListener('stam-account-boundary',reload);window.addEventListener('focus',reload);window.addEventListener('stam-trade-updated',reload);return()=>{mounted.current=false;window.removeEventListener('storage',changed);window.removeEventListener('stam-account-boundary',reload);window.removeEventListener('focus',reload);window.removeEventListener('stam-trade-updated',reload);};},[reload]);
 const commit=async(make:(book:TradeBook)=>TradeBook,expected=ref.current.raw)=>{
  const initial=ref.current;if(!initial.book||initial.error)throw new TradeError(initial.error||'storage');if(!navigator.locks)throw new TradeError('locks');
  return navigator.locks.request(tradeOwnerLock(initial.owner),async()=>{
   if(!mounted.current||readyTradeOwner()!==initial.owner)throw new TradeError('account');
   const current=readTradeBook(localStorage,initial.owner);if(current.raw!==expected)throw new TradeError('conflict');
   const book=make(current.book);assertTradeExclusivity(localStorage,initial.owner,'legacy',current.book.runs.some(r=>tradeSummary(r).status==='active'),book.runs.some(r=>tradeSummary(r).status==='active'));const raw=writeTradeBook(localStorage,initial.owner,expected,book);
   if(mounted.current){const next={owner:initial.owner,book,raw,error:''};ref.current=next;setView(next);}window.dispatchEvent(new Event('stam-trade-updated'));return book;
  });
 };
 const dispatch=(command:TradeCommand,expected=ref.current.raw)=>commit(book=>changeTradeBook(book,command),expected);
 // Restore only into an empty owner book. Existing history is never replaced.
 const restore=(backup:TradeBook,expected=ref.current.raw)=>commit(book=>{if(book.runs.length)throw new TradeError('restoreOccupied');if(backup.owner!==book.owner)throw new TradeError('account');return {...backup,revision:book.revision+1};},expected);
 return {...view,dispatch,restore,reload};
}
export type TradeStore=ReturnType<typeof useTradeBook>;
