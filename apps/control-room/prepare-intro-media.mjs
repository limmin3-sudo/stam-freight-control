import {createHash, randomUUID} from 'node:crypto';
import {createReadStream, createWriteStream} from 'node:fs';
import {readFile, rename, rm} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';

const source = new URL('./media/freight-intro/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', source), 'utf8'));

// Store exact MP4 bytes in Git-sized parts. Vite serves a regular seekable MP4.
export async function prepareIntroMedia() {
  for (const [edition, {parts, sha256}] of Object.entries(manifest)) {
    const name = edition === 'uhd' ? 'freight-intro-4k.mp4' : 'freight-intro-hd.mp4';
    const dest = new URL('./src/assets/' + name, import.meta.url);
    const temporary = new URL(dest.href + '.' + randomUUID() + '.tmp');
    const hash = createHash('sha256');
    async function* readParts() {
      for (const part of parts) {
        for await (const bytes of createReadStream(new URL(part, source))) {
          hash.update(bytes);
          yield bytes;
        }
      }
    }
    try {
      await pipeline(readParts(), createWriteStream(temporary, {flags: 'wx'}));
      if (hash.digest('hex') !== sha256) throw new Error('Invalid trailer media: ' + name);
      await rename(temporary, dest);
    } finally {
      await rm(temporary, {force: true});
    }
  }
}
