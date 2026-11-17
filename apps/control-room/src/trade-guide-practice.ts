// Deliberately independent of the real trade book, account and market APIs.
export const tradeLesson={capital:100_000,quantity:32,buy:1_000,sell:1_200,expense:1_000} as const;
export const tradePracticeActions=['buy','depart','arrive','sell','expense','close'] as const;
export type TradePracticeAction=typeof tradePracticeActions[number];
export type TradePractice={events:TradePracticeAction[]};
export const blankTradePractice=():TradePractice=>({events:[]});
export function advanceTradePractice(state:TradePractice,action:TradePracticeAction):TradePractice{
 if(tradePracticeActions[state.events.length]!==action)return state;
 return {events:[...state.events,action]};
}
export function tradePracticeSummary(state:TradePractice){
 const has=(event:TradePracticeAction)=>state.events.includes(event),p=tradeLesson;
 return {cash:p.capital-(has('buy')?p.quantity*p.buy:0)+(has('sell')?p.quantity*p.sell:0)-(has('expense')?p.expense:0),cargo:has('buy')&&!has('sell')?p.quantity:0,profit:(has('sell')?p.quantity*(p.sell-p.buy):0)-(has('expense')?p.expense:0),next:tradePracticeActions[state.events.length],finished:has('close')};
}
