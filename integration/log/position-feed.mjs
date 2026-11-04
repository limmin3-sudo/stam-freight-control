// Position observations stay separate from contract targets, routes and completion state.
const SYSTEMS=new Set(['stanton','pyro','nyx']);
// Community reference, not a 4.10.2 live calibration. This maps system coordinates ONLY;
// it must never be used to rotate surface sites or mutate the route dataset.
// Quantum 07b3d849: gateways.py PYRO_FILE_ROTATION_DEG describes file -> game (-85.22993°).
export function systemReferencePosition(system,position){
  if(!SYSTEMS.has(system)||!Array.isArray(position)||position.length!==3||position.some(n=>!Number.isFinite(n)||Math.abs(n)>1e12))throw Error('invalid-system-position');
  if(system!=='pyro')return [...position];
  const angle=85.22993*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),[x,y,z]=position;
  return [c*x-s*y,s*x+c*y,z];
}
export function parsePositionPaste(text,system) {
  if(!SYSTEMS.has(system))throw Error('좌표를 확인한 항성계를 선택해 주세요.');
  if(typeof text!=='string'||text.length>512)throw Error('/showlocation으로 복사한 좌표를 붙여 넣어 주세요.');
  const number='([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?)';
  const pattern=new RegExp('^\\s*Coordinates\\s*:\\s*x\\s*:\\s*'+number+'\\s*,?\\s*y\\s*:\\s*'+number+'\\s*,?\\s*z\\s*:\\s*'+number+'\\s*$','i');
  const match=text.match(pattern),position=match?.slice(1).map(Number);
  if(!position||position.some(n=>!Number.isFinite(n)||Math.abs(n)>1e12))throw Error('/showlocation 좌표 형식을 확인해 주세요.');
  return {system,position,frame:'game-system-m'};
}
export function createPositionFeed({locations,now=Date.now}={}) {
  let observation=null;const listeners=new Set();
  const snapshot=()=>observation?structuredClone(observation):null;
  function publish(next){observation=next;for(const listener of listeners)listener(snapshot());return snapshot();}
  return {
    snapshot,
    confirmPlace(id) {
      const found=locations.filter(p=>p.id===id);
      if(found.length!==1||!SYSTEMS.has(found[0].system))throw Error('목록에서 현재 거점을 선택해 주세요.');
      const place=found[0];
      return publish({kind:'place',source:'user-confirmed',locationId:place.id,name:place.name,system:place.system,confirmedAt:now()});
    },
    receiveCoordinates(text,system) {
      // Clipboard text has no capture timestamp. Receiving it does NOT prove a fresh live fix.
      const point=parsePositionPaste(text,system);
      return publish({kind:'coordinates',source:'showlocation-paste',...point,receivedAt:now(),observedAt:null,
        referencePosition:systemReferencePosition(system,point.position),mapping:'reference-system',liveVerified:false,surfaceCalibrated:false});
    },
    clear:()=>publish(null),
    subscribe(listener){listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener);},
  };
}
