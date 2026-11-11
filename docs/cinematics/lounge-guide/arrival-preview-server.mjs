import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const files = new Map([
  ['/', ['desk-arrival-preview.html', 'text/html; charset=utf-8']],
  ['/desk-arrival.html', ['desk-arrival-preview.html', 'text/html; charset=utf-8']],
  ['/hologram-design-v2.css', ['hologram-design-v2.css', 'text/css; charset=utf-8']],
  ['/desk-arrival-preview.js', ['desk-arrival-preview.js', 'text/javascript; charset=utf-8']],
  ['/suit.woff2', ['../../../apps/control-room/src/assets/fonts/SUIT-Variable.woff2', 'font/woff2']],
  ['/selected-approach.mp4', ['grok-approach-selected-20261112/lounge-to-desk-grok.mp4', 'video/mp4']],
  ['/selected-idle.mp4', ['grok-desk-idle-20261112/desk-idle-ab-alternating.mp4', 'video/mp4']],
  ['/selected-return.mp4', ['grok-lounge-return-20261112/desk-to-lounge-grok-original.mp4', 'video/mp4']],
  ['/return-last-frame.png', ['grok-lounge-return-20261112/return-actual-last.png', 'image/png']],
  ['/actual-first-frame.png', ['grok-approach-selected-20261112/actual-first-frame.png', 'image/png']],
  ['/actual-last-frame.png', ['grok-approach-selected-20261112/actual-last-frame.png', 'image/png']],
]);
createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  const entry = files.get(new URL(req.url, 'http://127.0.0.1').pathname);
  if (!entry) { res.writeHead(404); res.end(); return; }
  try {
    const path = fileURLToPath(new URL(entry[0], import.meta.url));
    const {size} = await stat(path);
    let start = 0, end = size - 1, code = 200;
    const headers = {'Content-Type': entry[1], 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes'};
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1] && !match[2])) { res.writeHead(416, {'Content-Range': `bytes */${size}`}); res.end(); return; }
      if (!match[1]) start = Math.max(0, size - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (start > end || start >= size) { res.writeHead(416, {'Content-Range': `bytes */${size}`}); res.end(); return; }
      code = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length'] = end - start + 1;
    res.writeHead(code, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = createReadStream(path, {start, end});
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
}).listen(5190, '127.0.0.1', () => console.log('STAM arrival preview: http://127.0.0.1:5190/desk-arrival.html'));
