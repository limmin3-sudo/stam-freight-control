import {suiteQuoteAllowed,suiteTerminalAllowed,type SuiteOptions,type SuiteRoute,type SuiteContext,type TradeLine,type SuiteLeg} from './trade-suite.ts';
import type {MarketSnapshot, Quote, Terminal} from './trade-data.ts';

// The commodity board quotes a single immediate purchase, before operating expenses.
export function bestSplitSale(data:MarketSnapshot, options:SuiteOptions, ctx:SuiteContext, now:number):SuiteRoute|null {
  const [id]=options.commodityIds;
  if(!id || options.commodityIds.length!==1 || options.destinationId) return null;
  const name=data.commodities.find(c=>c.id===id)?.name;
  if(!name)return null;
  const sites=new Map(data.terminals.filter(t=>suiteTerminalAllowed(t,options)).map(t=>[t.id,t]));
  const offers=data.quotes.filter(q=>q.commodityId===id && sites.has(q.terminalId) && suiteQuoteAllowed(q,data.liveVersion,options,now));
  const buyers=offers.filter(q=>q.sell && q.demand && q.demand>0);
  let best:SuiteRoute|null=null;
  for(const source of offers){
    if(!source.buy || !source.stock || (options.originId && source.terminalId!==options.originId))continue;
    const origin=sites.get(source.terminalId)!;
    const buy=Math.round(source.buy*100);
    if(buy<=0)continue;
    const affordable=Math.floor(Math.round(options.budget*100)/buy);
    const limit=Math.floor(Math.min(affordable,source.stock,options.capacity));
    const candidates=buyers.filter(q=>q.terminalId!==origin.id && Math.round(q.sell!*100)>buy);
    for(const box of [...new Set(source.containers)].sort((a,b)=>b-a)){
      if(![32,24,16,8,4,2,1].includes(box)||box>options.maxBoxSize||box>(origin.maxContainerScu??0)||limit<2*box)continue;
      let low=0,high=Math.floor(limit/box);
      while(low<high){
        const mid=Math.ceil((low+high)/2);
        if(ctx.pack([{commodityId:id,boxSize:box,quantity:mid*box}]))low=mid;
        else high=mid-1;
      }
      if(low<2)continue;
      for(const first of candidates)for(const second of candidates){
        const a=sites.get(first.terminalId)!, b=sites.get(second.terminalId)!;
        if(a.id===b.id||box>Math.min(a.maxContainerScu??0,b.maxContainerScu??0))continue;
        const firstMax=Math.floor(first.demand!/box), secondMax=Math.floor(second.demand!/box);
        if(!firstMax||!secondMax)continue;
        const boxes=Math.min(low,firstMax+secondMax);
        const firstBoxes=first.sell!>=second.sell!?Math.min(firstMax,boxes-1):Math.max(1,boxes-secondMax);
        const x=firstBoxes*box,y=(boxes-firstBoxes)*box,total=x+y;
        const purchase=buy*total/100;
        const profit=((Math.round(first.sell!*100)-buy)*x+(Math.round(second.sell!*100)-buy)*y)/100;
        if(best && profit<best.profit)continue;
        const m=ctx.route(origin,a), n=ctx.route(a,b);
        if(!m||!n)continue;
        const makeLeg=(from:Terminal,to:Terminal,q:Quote,qty:number,metric:typeof m,initial:boolean):SuiteLeg=>{
          const revenue=Math.round(q.sell!*100)*qty/100;
          const line:TradeLine={commodityId:id,name,boxSize:box,quantity:qty,buy:source.buy!,sell:q.sell!,purchase:initial?purchase:0,revenue,
            buySource:initial?'UEX':'holding',sellSource:'UEX',buyAt:source.updatedAt,sellAt:q.updatedAt,available:source.stock!,demand:q.demand!,
            ownership:'owned',costKnown:true,quantityLimit:boxes===firstMax+secondMax?'demand':total<limit?'packing':limit===options.capacity?'capacity':limit===affordable?'capital':'stock'};
          return {originId:from.id,destinationId:to.id,lines:[line],purchase:line.purchase,revenue,costs:0,profit:revenue-buy*qty/100,
            seconds:metric.seconds===null?null:metric.seconds+60*(2*options.approachMinutes+metric.jumps*options.jumpMinutes+(initial?2:1)*options.handlingMinutes),
            meters:metric.meters,systems:metric.systems,drive:metric.drive,waitMinutes:0,empty:false};
        };
        const legs=[makeLeg(origin,a,first,x,m,true),makeLeg(a,b,second,y,n,false)];
        const seconds=legs.every(l=>l.seconds!==null)?legs.reduce((s,l)=>s+l.seconds!,0):null;
        if(best && profit===best.profit && (seconds??Infinity)>=(best.seconds??Infinity))continue;
        best={id:['split',id,origin.id,a.id,b.id,x,y,box].join('-'),splitSale:true,legs,purchase,profit,costs:0,cash:options.budget+profit,
          reserve:0,seconds,profitPerHour:seconds?profit*3600/seconds:null,roi:profit/purchase,unsold:[],warnings:['community','timeAssumptions','noCostsEntered']};
      }
    }
  }
  return best;
}
