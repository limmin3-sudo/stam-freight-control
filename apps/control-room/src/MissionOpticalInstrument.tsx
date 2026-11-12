import microtech from './assets/celestial/microtech.png';

// Decorative material-review instrument, never a second route/map data source.
export function MissionOpticalInstrument(){return <div className="mission-optical-instrument" aria-hidden="true">
  <div className="optical-orbit"><i className="orbit-fine"/><i className="orbit-ticks"/><i className="orbit-segment"/>
    <div className="optical-planet" style={{backgroundImage:`url(${microtech})`}}/>
    <svg viewBox="0 0 400 400" fill="none"><defs><linearGradient id="optical-route-light"><stop stopColor="#b7f5ff"/><stop offset="1" stopColor="#e7c391"/></linearGradient></defs><path d="M83 284Q156 144 308 96" stroke="url(#optical-route-light)" strokeWidth="1.4"/><circle cx="83" cy="284" r="10" stroke="#b7f5ff"/><circle cx="83" cy="284" r="5" fill="#d7f9ff"/><circle cx="308" cy="96" r="13" stroke="#b7f5ff" strokeDasharray="1 3"/><circle cx="308" cy="96" r="7" stroke="#c8f7ff"/><circle cx="308" cy="96" r="2.5" fill="#e4fbff"/><path d="M200 10V33m0 334v23M10 200h23m334 0h23" stroke="#a9dce9" strokeOpacity=".5"/></svg>
  </div>
</div>}
