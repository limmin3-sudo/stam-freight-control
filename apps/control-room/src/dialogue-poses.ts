import {useLayoutEffect, useState} from 'react';

const images = import.meta.glob<string>('./assets/dialogue-poses/*/*.webp', {
  eager: true, import: 'default', query: '?url',
});
const variants = new Map<string, string[]>();
for (const [path, url] of Object.entries(images)) {
  const person = path.split('/').at(-2)!;
  const poses = variants.get(person) ?? [];
  poses.push(url);
  variants.set(person, poses);
}

type Draw = {portrait: string; remaining: string[]};
const visits = new Map<string, Draw>();

function draw(person: string, original: string): Draw {
  const previous = visits.get(person);
  const remaining = previous?.remaining.length
    ? [...previous.remaining]
    : [original, ...(variants.get(person) ?? [])];
  const choices = remaining.filter(url => url !== previous?.portrait);
  const portrait = choices[Math.floor(Math.random() * choices.length)] ?? original;
  return {portrait, remaining: remaining.filter(url => url !== portrait)};
}

// Each mounted encounter owns its pose; only committed visits advance the rotation.
export function useDialoguePortrait(person: string, original: string) {
  const [visit] = useState(() => draw(person, original));
  useLayoutEffect(() => { visits.set(person, visit); }, [person, visit]);
  return visit.portrait;
}
