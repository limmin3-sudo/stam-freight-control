import {lang} from './i18n.mjs';
import {createFeedback as create} from './feedback-core.mjs';
export {firebaseApp} from './feedback-core.mjs';
export const createFeedback=(button,options={})=>create(button,{language:lang,...options});
