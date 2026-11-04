import {createBoxMemory} from './box-memory.mjs';
import {PLANNING_KEY,cleanPlanningPreferences} from '../../planning-preferences.mjs';
// Preferences and explicitly entered box counts persist. Contract evidence and
// allocation drafts stay in memory, outside the existing guest/account run store.
const KEY = 'stam-log-preview-settings-v1';
// Automatically add only resolvable, locally accepted/joined records. This is
// an original-demand plan, not proof that every historical record is still active.
export function createPlanSelection(limit=12) {
  const selected=new Set(), manual=new Set(), automatic=new Set();
  const eligible=c=>['acceptance-observed','participation-observed'].includes(c.status)&&
    c.participation?.state!=='left-observed'&&!c.conflicts?.length;
  return {
    selected,
    set(id,value) { manual.add(id); automatic.delete(id); value?selected.add(id):selected.delete(id); },
    reconcile(contracts,readyIds) {
      const byId=new Map(contracts.map(c=>[c.missionId,c]));
      for(const id of selected)if(!byId.has(id)||(automatic.has(id)&&
        (byId.get(id).status==='end-observed'||byId.get(id).participation?.state==='left-observed'))) {
        selected.delete(id);automatic.delete(id);
      }
      for(const c of contracts)if(selected.size<limit&&!manual.has(c.missionId)&&
        eligible(c)&&readyIds.has(c.missionId)) { selected.add(c.missionId);automatic.add(c.missionId); }
    },
    clear() { selected.clear();manual.clear();automatic.clear(); },
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
  const drafts = new Map();
  const persist = () => { try {
    storage?.setItem(PLANNING_KEY,JSON.stringify(cleanPlanningPreferences(preferences)));
    storage?.setItem(KEY,JSON.stringify({mapQuality:preferences.mapQuality}));
  } catch {} };
  // Migrate the old preview key once so guest/account restoration cannot reuse its account fields.
  if(!shared&&saved&&(saved.shipId||saved.startId||saved.partner||saved.disabled))persist();
  return {
    preferences,boxMemory:createBoxMemory(storage),
    savedShips() { const ships=read('vh-ships');return Array.isArray(ships)?ships.slice(0,200):[]; },
    setPreferences(patch) { Object.assign(preferences, patch); persist(); },
    setDisabled(shipId, ids) { preferences.disabled[shipId] = [...ids]; persist(); },
    observe(contract) {
      const fingerprint = JSON.stringify(contract), previous = drafts.get(contract.missionId);
      if (previous?.fingerprint === fingerprint) return false;
      drafts.set(contract.missionId, {fingerprint, rows: previous?.rows || [], confirmed: false});
      return true;
    },
    draft(id) { return structuredClone(drafts.get(id) || {rows: [], confirmed: false}); },
    saveDraft(id, value) {
      const draft = drafts.get(id);
      if (draft) { draft.rows = structuredClone(value.rows); draft.confirmed = value.confirmed === true; }
    },
    clearDrafts() { drafts.clear(); },
  };
}
