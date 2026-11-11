export const openingSeenKey='stam:director-opening:v1';
// Do not interrupt map/console deep links or replay on every in-site navigation.
export function openingEligible(hash:string,seen:string|null){
 return seen!=='1'&&/^#?\/?(?:lounge)?(?:\?.*)?$/.test(hash);
}
