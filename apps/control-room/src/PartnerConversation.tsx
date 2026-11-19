import {academyTutorials} from './partner-tutorials';
import type {SpaceRoute} from './space-navigation';
import type {PartnerId} from './partner-dialogue';
import {partnerDialogue} from './partner-dialogue';
import operator from './assets/partner-close/operator.png';
import navigator from './assets/partner-close/navigator.png';
import director from './assets/partner-close/director.png';
import bridge from './assets/control-room-clean-plate.png';
import lounge from './assets/lounge-original-composite.png';
import {CrewEncounter} from './CrewEncounter';

const portraits={operator,navigator,director};
type Destination = Omit<SpaceRoute,'locale'>;
type Props={partner:PartnerId;variant:number;en:boolean;motion:boolean;sound:boolean;volume:number;navigate:(route:Destination)=>void;origin:HTMLElement;onClose:()=>void};
export function PartnerConversation({partner,variant,en,motion,sound,volume,navigate,origin,onClose}:Props){
 const profile=partnerDialogue[partner],greeting=profile.greetings[variant%profile.greetings.length]!;
 const destinations=partner==='director'?[
  {id:'tour',label:en?'Facility tour':'둘러보기',open:()=>navigate({screen:'guide',guidedVisit:true})},
  {id:'manual',label:en?'User guide':'이용안내',open:()=>navigate({screen:'service',serviceView:'manual'})},
  ...academyTutorials(en,navigate),
 ]:[];
 return <CrewEncounter id={partner} name={profile.name[en?1:0]} line={greeting[en?1:0]} image={portraits[partner]} background={partner==='director'?lounge:bridge} sound={sound} volume={volume} destinations={destinations} en={en} motion={motion} origin={origin} onClose={onClose}/>;
}
