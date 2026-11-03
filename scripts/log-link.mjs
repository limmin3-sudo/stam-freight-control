import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay, setImmediate as yieldLoop } from 'node:timers/promises';
import { LogEvidence } from '../integration/log/state.mjs';
import { ReadOnlyLog } from '../integration/log/reader-node.mjs';

export async function runLogLink(args = process.argv.slice(2), output = console.log, { signal } = {}) {
  const { values } = parseArgs({ args, options: {
    file: { type: 'string', multiple: true }, watch: { type: 'boolean' },
    json: { type: 'boolean' }, help: { type: 'boolean' },
  }});
  if (values.help || !values.file?.length) {
    output('Node 22: node scripts/log-link.mjs --file <Game.log> [--file <backup.log>] [--watch] [--json]\n읽기 전용 검증기입니다. --watch는 파일 하나만 감시하며 --json은 로컬 계약 관측 정보를 출력합니다.');
    return;
  }
  if (values.watch && values.file.length !== 1) throw new Error('watch-requires-one-file');
  const state = new LogEvidence();
  let stopped = !!signal?.aborted;
  const stop = () => { stopped = true; };
  signal?.addEventListener('abort', stop, { once: true });
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    for (const [index, path] of values.file.entries()) {
      if (stopped) break;
      const reader = new ReadOnlyLog(path, {
        onLine: (line, lineNumber) => state.ingest(line, { input: `log-${index + 1}`, generation: reader.generation, line: lineNumber }),
        onReset: () => state.note('log-generation-changed'),
        onInvalid: code => state.note(code),
      });
      let previous = '';
      do {
        const progress = await reader.poll();
        if (!progress.backlog && values.watch && (progress.bytes || progress.reset || !previous)) {
          const snapshot = state.snapshot();
          const serialized = JSON.stringify(values.json ? snapshot : { ...snapshot.statistics, identity: snapshot.identity, diagnostics: snapshot.diagnostics });
          if (serialized !== previous) { output(serialized); previous = serialized; }
        }
        if (!progress.backlog && !values.watch) break;
        await (progress.backlog ? yieldLoop() : delay(250));
      } while (!stopped);
      if (!values.watch && reader.finish().unterminatedLine) state.note('unterminated-line-withheld');
      if (stopped) break;
    }
    if (!values.watch) {
      const snapshot = state.snapshot();
      output(JSON.stringify(values.json ? snapshot : { ...snapshot.statistics, identity: snapshot.identity, diagnostics: snapshot.diagnostics }, null, 2));
    }
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    signal?.removeEventListener('abort', stop);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) runLogLink().catch(error => {
  // Never print the selected game path, log text or a partial manifest on failure.
  console.error(`로그 검증을 중단했습니다 (${error.code || (/^[a-z-]+$/.test(error.message) ? error.message : 'read-or-decode-error')}). 미확인 정보는 계산에 전달하지 않습니다.`);
  process.exitCode = 1;
});
