import test from 'node:test';
import assert from 'node:assert/strict';
import {needsPartnerChoice,planningPartner} from '../src/partner-policy.ts';
import {emptyDraft,type Job} from '../src/mission-trial.ts';
const job=(scu:number):Job=>({id:'one',title:['운송','Haul'],pay:0,rewardUnknown:true,shipments:[{id:'row',from:'hurston',to:'arccorp',cargo:['광석','Ore'],scu}]});
test('new pilots choose a partner first; existing manifests and runs are preserved',()=>{
 const session={version:1 as const,draft:emptyDraft(),plan:null,run:null};
 assert.equal(needsPartnerChoice(session),true);
 assert.equal(needsPartnerChoice({...session,draft:{...session.draft,partnerSelected:true}}),false);
 assert.equal(needsPartnerChoice({...session,draft:{...session.draft,jobs:[job(0)]}}),false);
});
test('only actual delivery quantities decide whether cargo planning can continue',()=>{
 assert.equal(planningPartner([job(12)],'navigator'),'navigator');
 assert.equal(planningPartner([job(12)],'operator'),'operator');
 assert.equal(planningPartner([job(0)],'navigator'),'operator');
 const pooled={...job(0),reservations:{arccorp:22},shipments:[job(0).shipments[0]!,{...job(0).shipments[0]!,id:'second',from:'microtech'}]};
 assert.equal(planningPartner([pooled],'navigator'),'navigator','known total is enough; pickup shares need not be invented');
});
test('catalogue maxima, rewards and descriptions cannot masquerade as known SCU',()=>{
 const unknown=job(0);unknown.mission={id:unknown.id,cargo:[{commodity:'Ore',pickupId:'hurston',dropoffId:'arccorp',scu:null,_quantityBounds:{unit:'SCU',min:1,max:16}}]};
 assert.equal(planningPartner([unknown],'navigator'),'operator');
 assert.equal(planningPartner([{...job(12),pay:0,rewardUnknown:true}],'navigator'),'navigator');
});
