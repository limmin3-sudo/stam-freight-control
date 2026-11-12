import {missionFor} from './flight-engine.mjs';
import {quantityPlan} from './mission-quantities.mjs';
import type {Job} from './mission-trial';
import type {Locale} from './navigation';

// Describe the contract's evidence without changing its quantities or pickup shares.
export function quantityBasis(job:Job|undefined,locale:Locale){
 const certainty=job?quantityPlan(missionFor(job)).certainty:'unavailable';
 const labels={
  boxes:['상자 구성 확인','Known containers'],
  quantity:['총량 확인 · 상자 예상','Known total · Estimated boxes'],
  'upper-bound':['최대치 기준 · 실제 수량 미확인','Upper bound · Actual quantity unknown'],
  unavailable:['수량 미확인','Quantity unknown'],
 };
 const key=Object.hasOwn(labels,certainty)?certainty as keyof typeof labels:'unavailable';
 return labels[key][locale==='en'?1:0];
}
