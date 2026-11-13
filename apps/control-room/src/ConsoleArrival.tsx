import type {CSSProperties} from 'react';
import logo from './assets/arrival/stam-standby.png';
import plasma from './assets/arrival/ignition-plasma.png';

// Always mounted so the two production textures decode before the first visit.
// The real destination stays behind this brief optical curtain, including its
// actual controls and current account/mission data.
export function ConsoleArrival({departing,powerOn,returning,departureMs,ignitionMs}:{departing:boolean;powerOn:boolean;returning:boolean;departureMs:number;ignitionMs:number}){
 return <div className="console-arrival" data-state={powerOn?(returning?'return':'ignite'):departing?'depart':'idle'} aria-hidden="true"
  style={{'--departure-ms':`${returning?ignitionMs:departureMs}ms`,'--ignition-ms':`${ignitionMs}ms`} as CSSProperties}>
  <img className="console-arrival-logo" src={logo} alt="" decoding="async"/>
  <img className="console-arrival-plasma" src={plasma} alt="" decoding="async"/>
  <div className="console-arrival-scan"/>
 </div>;
}
