import type {Draft,Job} from './mission-trial';
import type {Session} from './flight-session';
import {missionFor} from './flight-engine.mjs';
import {quantityPlan} from './mission-quantities.mjs';

export function needsPartnerChoice(session:Session){
 return !session.draft.partnerSelected&&!session.plan&&!session.run&&!session.draft.jobs.length;
}
export function planningPartner(jobs:Job[],preferred:Draft['partner']):Draft['partner']{
 return preferred==='operator'||jobs.some(job=>!quantityPlan(missionFor(job),false).ready)?'operator':'navigator';
}
