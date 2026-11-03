import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Exercise the actual .cmd gate under each Windows CI runtime. --check skips
// only the interactive file picker, so unsupported-version regressions fail CI.
test('Windows launcher accepts the installed runtime without opening a dialog', {skip: process.platform !== 'win32'}, () => {
  const output = execFileSync('cmd.exe', ['/d', '/c', 'start-log-link.cmd', '--check'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8', timeout: 10_000, stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.ok(output.includes(`Using Node.js ${process.version} at `), output);
  assert.ok(!output.includes('Select the active Game.log'), output);
});
