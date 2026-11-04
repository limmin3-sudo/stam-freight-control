import { open } from 'node:fs/promises';
import { LogLines } from './lines.mjs';

// Only the explicitly selected path is opened, always with read-only flags.
// No directory scanning, game process access, network or persistence.
export class ReadOnlyLog {
  constructor(path, { onLine, onInvalid, onReset = () => {}, chunkBytes = 256 * 1024 } = {}) {
    if (!Number.isInteger(chunkBytes) || chunkBytes < 1 || chunkBytes > 1024 * 1024) throw new Error('invalid-chunk-size');
    this.path = path;
    this.onReset = onReset;
    this.chunkBytes = chunkBytes;
    this.lines = new LogLines({ onLine, onInvalid });
    this.offset = 0;
    this.identity = null;
    this.anchor = Buffer.alloc(0);
    this.busy = false;
    this.generation = 0;
  }
  async poll() {
    if (this.busy) throw new Error('concurrent-read');
    this.busy = true;
    let file;
    try {
      file = await open(this.path, 'r');
      const stat = await file.stat();
      if (!stat.isFile()) throw new Error('not-regular-file');
      const identity = `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
      let reset = this.identity !== null && (identity !== this.identity || stat.size < this.offset);
      if (!reset && this.anchor.length) {
        const check = Buffer.alloc(this.anchor.length);
        const { bytesRead } = await file.read(check, 0, check.length, this.offset - check.length);
        reset = bytesRead !== check.length || !check.equals(this.anchor);
      }
      if (reset) {
        this.offset = 0;
        this.anchor = Buffer.alloc(0);
        this.lines.reset();
        this.generation++;
        this.onReset(); // Existing evidence remains; never silently reactivate old contracts.
      }
      this.identity = identity;
      const length = Math.min(this.chunkBytes, Math.max(0, stat.size - this.offset));
      if (!length) return { bytes: 0, backlog: false, reset, generation: this.generation };
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await file.read(buffer, 0, length, this.offset);
      // A shrink during this read is ambiguous: stop instead of accepting a mixed snapshot.
      if (bytesRead !== length || (await file.stat()).size < this.offset + bytesRead) throw new Error('file-changed-during-read');
      this.lines.write(buffer.subarray(0, bytesRead));
      this.offset += bytesRead;
      const combined = Buffer.concat([this.anchor, buffer.subarray(0, bytesRead)]);
      this.anchor = Buffer.from(combined.subarray(-256));
      return { bytes: bytesRead, backlog: this.offset < stat.size, reset, generation: this.generation };
    } finally {
      if (file) await file.close();
      this.busy = false;
    }
  }
  finish() { return this.lines.finish(); }
}
