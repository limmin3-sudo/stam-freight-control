import {createWorkspaceUpdates} from './workspace-updates.mjs';
import {createFeedback} from '../../feedback-core.mjs';
import {createLocationManager} from '../../location-manager-core.mjs';
import {planningBase} from './personal-locations.mjs';

export function mountWorkspaceTools({context,onLocations}){
 const message=document.getElementById('workspace-message');
 const notify=(text,error=false)=>{message.textContent=text;message.classList.toggle('account-error',error);};
 const updates=createWorkspaceUpdates(document.getElementById('workspace-updates'));
 const feedback=createFeedback(document.getElementById('workspace-feedback'),{notify,context});
 let manager;
 return {setLocations(data){
   manager?.destroy();manager=createLocationManager(planningBase(data),{notify,live:false,
    host:document.getElementById('workspace-places'),onApply:onLocations});
   if(manager.error)notify(manager.error,true);
   return manager.getEdits();
  },destroy(){updates.destroy();feedback.destroy();manager?.destroy();}};
}
