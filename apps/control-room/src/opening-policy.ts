export const openingSeenKey = 'stam:first-departure:dismissed:v1';
export const openingHiddenKey = 'stam:first-departure:hidden:v1';

export function openingEligible(hash: string, seen: string | null, hidden: string | null = null) {
  if (seen === '1' || hidden === '1') return false;
  const [screen, query] = hash.replace(/^#\/?/, '').split('?');
  if (screen !== '') return false;

  return Array.from(new URLSearchParams(query).keys()).every(key => key === 'lang');
}
