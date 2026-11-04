// Bounded UTF-8 streaming decoder shared by browser replay and Node collection.
export class LogLines {
  constructor({ onLine, onInvalid = () => {}, maxBytes = 128 * 1024 } = {}) {
    if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 1024 * 1024) throw new Error('invalid-line-limit');
    this.onLine = onLine;
    this.onInvalid = onInvalid;
    this.maxBytes = maxBytes;
    this.reset();
  }
  reset() {
    this.decoder = new TextDecoder('utf-8', { fatal: true });
    this.pending = new Uint8Array(0);
    this.lineNumber = 0;
    this.finished = false;
  }
  write(bytes) {
    if (this.finished) throw new Error('stream-finished');
    if (bytes.length > 1024 * 1024) throw new Error('chunk-limit');
    // Split bytes before decoding: one corrupt unrelated line must not replace
    // characters in a mission, or discard the valid lines sharing its chunk.
    const text = new Uint8Array(this.pending.length + bytes.length);
    text.set(this.pending);
    text.set(bytes, this.pending.length);
    let start = 0, end;
    while ((end = text.indexOf(10, start)) !== -1) {
      if (end - start > this.maxBytes) throw new Error('line-limit');
      this.lineNumber++;
      let line;
      try { line = this.decoder.decode(text.subarray(start, end)); }
      catch { this.onInvalid('invalid-utf8-line', this.lineNumber); }
      if (line !== undefined) this.onLine(line.replace(/\r$/, ''), this.lineNumber);
      start = end + 1;
    }
    this.pending = text.slice(start);
    if (this.pending.length > this.maxBytes) throw new Error('line-limit');
  }
  finish() {
    this.finished = true;
    // No newline: possibly an unfinished game write. Do not infer that it is complete.
    return { unterminatedLine: this.pending.length > 0, lines: this.lineNumber };
  }
}
