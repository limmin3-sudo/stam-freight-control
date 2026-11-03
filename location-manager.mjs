import {createLocationManager as create} from './location-manager-core.mjs';
export const createLocationManager=(base,options={})=>create(base,{...options});
