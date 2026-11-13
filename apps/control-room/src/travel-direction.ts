import type {SpaceScreen} from './space-navigation';

export function isReturnTravel(from:SpaceScreen,to:SpaceScreen):boolean {
 // A console/room exits to a hub; the orbital hub also returns to the lounge.
 // The lounge gate's trip to the orbital hub remains a forward approach.
 return (to==='lounge'||to==='bridge') && from!=='lounge' && from!==to;
}
