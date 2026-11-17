import type {PartnerId} from './partner-dialogue';
import {partnerDialogue} from './partner-dialogue';
import operator from './assets/partner-close/operator.png';
import navigator from './assets/partner-close/navigator.png';
import director from './assets/partner-close/director.png';
import bridge from './assets/control-room-clean-plate.png';
import lounge from './assets/lounge-original-composite.png';
import {CrewEncounter} from './CrewEncounter';

const portraits={operator,navigator,director};
type Props={partner:PartnerId;variant:number;en:boolean;motion:boolean;origin:HTMLElement;onClose:()=>void};
export function PartnerConversation({partner,variant,en,motion,origin,onClose}:Props){
 const profile=partnerDialogue[partner],greeting=profile.greetings[variant%profile.greetings.length]!;
 return <CrewEncounter id={partner} name={profile.name[en?1:0]} line={greeting[en?1:0]} image={portraits[partner]} background={partner==='director'?lounge:bridge} focus={partner==='operator'?32:partner==='navigator'?68:33} en={en} motion={motion} origin={origin} onClose={onClose} note={en?'More conversation topics are being prepared.':'더 다양한 대화 주제를 준비하고 있습니다.'}/>;
}
