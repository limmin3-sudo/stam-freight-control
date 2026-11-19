type Playback = {
  approach: string;
  idle: { src: string; type: 'image' | 'video'; muted?: boolean; loop?: boolean };
  return: string;
};

let manifest: Promise<Record<string, Playback>> | undefined;

export async function loadPartnerPlayback(id: string): Promise<Playback> {
  const url = new URL('partner-dialogue/playback.json', document.baseURI);
  manifest ??= fetch(url, {signal: AbortSignal.timeout(10000)}).then(response => {
    if (!response.ok) throw Error('Partner playback unavailable');
    return response.json() as Promise<Record<string, Playback>>;
  }).catch(error => {
    manifest = undefined;
    throw error;
  });
  const entry = (await manifest)[id];
  if (!entry) throw Error('Unknown partner playback');
  return {
    approach: new URL(entry.approach, url).href,
    return: new URL(entry.return, url).href,
    idle: {...entry.idle, src: new URL(entry.idle.src, url).href},
  };
}
