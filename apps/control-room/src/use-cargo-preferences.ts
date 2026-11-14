import {useEffect,useState} from 'react';
import {cargoPreferenceEvent,cargoPreferenceKey,readCargoPreferences} from './cargo-plan.mjs';
export function useCargoPreferences(){
 const [value,setValue]=useState(readCargoPreferences);
 useEffect(()=>{
  const refresh=()=>setValue(readCargoPreferences());
  const storage=(event:StorageEvent)=>{if(event.key===cargoPreferenceKey||event.key===null)refresh();};
  window.addEventListener(cargoPreferenceEvent,refresh);
  window.addEventListener('storage',storage);
  refresh();
  return()=>{window.removeEventListener(cargoPreferenceEvent,refresh);window.removeEventListener('storage',storage);};
 },[]);
 return value;
}
