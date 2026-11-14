import {actualQuantity,deliveryGroups,quantitiesReady} from '../../../delivery-totals.mjs';
import {hasReward} from '../../../reward-summary.mjs';
import {calculateFlight} from './flight-engine.mjs';

// Read a snapshot of the previous flight deck's storage. All writes belong to the new console.
export function jobFromMission(mission) {
    const title=mission.title || mission.id;
    return {
      id:mission.id,title:[title,title],pay:mission.reward||0,rewardUnknown:!hasReward(mission),mission,state:quantitiesReady(mission)?'ready':'incomplete',
      shipments:mission.cargo.map((row,i)=>({id:mission.id+'-'+i,cargo:[row.commodity,row.commodity],from:row.pickupId,to:row.dropoffId,
        scu:actualQuantity(row)?row.scu:0,boxes:row.boxes,cargoShape:row._cargoShape,maxBoxSize:row.maxBoxSize})),
      reservations:Object.fromEntries(deliveryGroups(mission).filter(g=>g.reservation).map(g=>[g.dropoffId,g.total])),
    };
  }
export function importSavedFlight({missions,start,shipId,customShips,settings,voice,run,mode,locationEdits=[]}) {
  const jobs=missions.map(jobFromMission);
  const draft={locationEdits,jobs,start:start||missions[0].cargo[0].pickupId,ship:({'drake-cutlass-black':'Cutlass Black','crusader-c2-hercules-starlifter':'C2 Hercules'})[shipId]||shipId||'misc-hull-b',partner:voice==='aide'?'operator':'navigator',
    received:false,reviewed:true,customShip:customShips.find(s=>s.id===shipId),settings};
  const savedMode=run?.started ? (mode==='simple'?'simple':'detail') : undefined;
  let plan=calculateFlight(draft,{mode:savedMode});
  let index=0,jump=0;
  const started=!!run?.started,finished=!!run?.finished;
  const positionId=run?.positionId||run?.startId||plan.startId;
  const savedBoxes=started?(run.aboard||[]):[];
  if(started){
    const key=JSON.stringify(plan.visits.map(v=>[v.locationId,v.events.map(e=>[e.shipmentId,e.type])]));
    if(key===run.planKey){
      index=finished?plan.visits.length:run.index;
      jump=run.jump||0;
      if(!Number.isInteger(index)||index<0||(!finished&&!plan.visits[index]))throw Error('저장된 운항의 현재 거점을 찾지 못했습니다.');
    }else if(finished){index=plan.visits.length;}
    else{
      plan=calculateFlight(draft,{mode:savedMode,startId:positionId,resume:{picked:run.picked,delivered:run.delivered,aboard:savedBoxes}});
    }
  }
  const oldLog=Array.isArray(run?.log)?run.log:[];
  const log=oldLog.filter(entry=>Number.isFinite(entry.at)).map(entry=>({
    locationId:entry.locationId||'',name:entry.name,at:entry.at,
    seconds:Number.isFinite(entry.seconds)?entry.seconds:null,estimate:Number.isFinite(entry.est)?entry.est:null
  }));
  const completed=oldLog.filter(entry=>entry.jump==null);
  return {version:1,draft,plan,run:{index,jump,started,finished,positionId,startedAt:run?.startedAt??null,
    loadScu:index>0?plan.visits[index-1]?.load:undefined,elapsed:run?.elapsed||0,since:run?.since??null,picked:started?run.picked:[],delivered:started?run.delivered:[],
    log,completedStops:oldLog.length?completed.length:run?.completedStops,
    distanceMeters:completed.length&&completed.every(e=>Number.isFinite(e.meters))?completed.reduce((sum,e)=>sum+e.meters,0):run?.distanceMeters,
    aboard:savedBoxes.map(b=>({...b,shipmentId:b.shipmentId||b.cargoId})),history:[]}};
}
