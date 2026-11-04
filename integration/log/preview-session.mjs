import {createManualDrafts} from './manual-drafts.mjs';
import {createGuidanceStore} from './guidance-store.mjs';
import {createTimingStore} from './timing.mjs';
import {createCargoContinuity} from './cargo-continuity.mjs';
import {createBoxMemory} from './box-memory.mjs';
import {PLANNING_KEY,cleanPlanningPreferences} from '../../planning-preferences.mjs';
// Preferences and explicitly entered box counts persist. Contract evidence stays in memory;
// allocation drafts persist per account, without restoring confirmation.
const KEY = 'stam-log-preview-settings-v1';
// Automatically add only resolvable, locally accepted/joined records. This is
// an original-demand plan, not proof that every historical record is still active.
export function createPlanSelection(limit=12,{store=null,persistent=!!store}={}) {
  const selected=new Set(), manual=new Set(), automatic=new Set(), awaiting=new Set(), deferred=new Set();
  let choices=new Map(),saveError=null;
  const eligible=c=>['acceptance-observed','participation-observed'].includes(c.status)&&
    c.participation?.state!=='left-observed'&&!c.conflicts?.length;
  const load=()=>{if(!persistent||!store)return;const saved=store.snapshot();saveError=saved.error;choices=new Map(saved.choices.map(r=>[r.id,r.choice]));for(const [id,choice] of choices){if(choice==='awaiting')awaiting.add(id);else manual.add(id);if(choice==='deferred')deferred.add(id);}};
  const persist=next=>{if(persistent&&store)store.save([...next].map(([id,choice])=>({id,choice})));choices=next;saveError=null;};
  const clear=()=>{selected.clear();manual.clear();automatic.clear();awaiting.clear();deferred.clear();choices.clear();saveError=null;};
  load();
  return {
    selected,awaiting,deferred,
    status(){const state=persistent&&store?store.snapshot():{choices:[],error:null};return {persistent:!!(persistent&&store),count:state.choices.length,error:state.error||saveError};},
    useSaved(value){if(persistent===value)return;clear();persistent=value;load();},
    resetSaved(){if(!persistent||!store)return;store.reset();clear();},
    set(id,value,{remember=true}={}) {if(remember){const next=new Map(choices);value?next.delete(id):next.set(id,'excluded');persist(next);}manual.add(id);automatic.delete(id);awaiting.delete(id);deferred.delete(id);value?selected.add(id):selected.delete(id);},
    defer(id) {const next=new Map(choices);next.set(id,'deferred');persist(next);manual.add(id);automatic.delete(id);awaiting.delete(id);selected.delete(id);deferred.add(id);},
    reconcile(contracts,readyIds,{autoSelect=true}={}) {
      const byId=new Map(contracts.map(c=>[c.missionId,c]));
      for(const id of selected)if(!byId.has(id)||(automatic.has(id)&&
        (byId.get(id).status==='end-observed'||byId.get(id).participation?.state==='left-observed'))) {
        selected.delete(id);automatic.delete(id);
      }
      const next=new Map(choices);
      if(!autoSelect)for(const c of contracts)if(!selected.has(c.missionId)&&!manual.has(c.missionId)&&eligible(c)&&readyIds.has(c.missionId)){awaiting.add(c.missionId);next.set(c.missionId,'awaiting');}
      if(next.size!==choices.size)try{persist(next);}catch(e){saveError=e.message;}
      const blocked=saveError||(persistent&&store?.snapshot().error);
      for(const c of contracts)if(!blocked&&autoSelect&&!awaiting.has(c.missionId)&&selected.size<limit&&!manual.has(c.missionId)&&
        eligible(c)&&readyIds.has(c.missionId)) {selected.add(c.missionId);automatic.add(c.missionId);}
    },
    // Clearing a replay/session view must not delete saved live choices.
    clear,
  };
}
export function createPreviewSession(storage) {
  const get=key=>{try{return storage?.getItem(key);}catch{return null;}};
  const read=key=>{try{return JSON.parse(get(key));}catch{return null;}};
  const saved=read(KEY),shared=read(PLANNING_KEY);
  const legacy={shipId:get('vh-ship-id')||'',startId:get('vh-start')||'',
    partner:get('sfc-voice')==='aide'?'operator':'navigator',disabled:read('vh-settings')?.disabledGrids||{}};
  // Old account values win over stale experimental preferences after account switching.
  const hasLegacy=legacy.shipId||legacy.startId||get('sfc-voice')||Object.keys(legacy.disabled).length;
  const preferences={...cleanPlanningPreferences(shared||(hasLegacy?legacy:saved)),mapQuality:saved?.mapQuality==='high'?'high':'normal'};
  const drafts = new Map(),manualDrafts=createManualDrafts(storage);let draftError=null;
  const persist = () => { try {
    storage?.setItem(PLANNING_KEY,JSON.stringify(cleanPlanningPreferences(preferences)));
    storage?.setItem(KEY,JSON.stringify({mapQuality:preferences.mapQuality}));
  } catch {} };
  // Migrate the old preview key once so guest/account restoration cannot reuse its account fields.
  if(!shared&&saved&&(saved.shipId||saved.startId||saved.partner||saved.disabled))persist();
  return {
    preferences,manualDrafts,draftError:()=>draftError,guidance:createGuidanceStore(storage),guidanceEnabled:false,timing:createTimingStore(storage),continuity:createCargoContinuity(storage),boxMemory:createBoxMemory(storage),
    savedShips() { const ships=read('vh-ships');return Array.isArray(ships)?ships.slice(0,200):[]; },
    setPreferences(patch) { Object.assign(preferences, patch); persist(); },
    setDisabled(shipId, ids) { preferences.disabled[shipId] = [...ids]; persist(); },
    observe(contract) {
      const fingerprint = JSON.stringify(contract), previous = drafts.get(contract.missionId);
      if (previous?.fingerprint === fingerprint) return false;
      let rows=previous?.rows||[];if(!previous&&this.guidanceEnabled)try{rows=manualDrafts.lookup(contract);}catch(e){draftError=e.message;}
      drafts.set(contract.missionId, {fingerprint,contract, rows, confirmed: false});
      return true;
    },
    draft(id) { const d=drafts.get(id);return structuredClone(d?{rows:d.rows,confirmed:d.confirmed}:{rows:[],confirmed:false}); },
    saveDraft(id, value) {
      const draft = drafts.get(id);
      if (draft) { draft.rows = structuredClone(value.rows); draft.confirmed = value.confirmed === true;try{if(this.guidanceEnabled)manualDrafts.save(draft.contract,draft.rows);draftError=null;}catch(e){draftError=e.message;} }
    },
    clearDrafts() { drafts.clear(); },
  };
}
