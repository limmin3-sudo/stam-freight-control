import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { startLogService } from '../integration/log/live-server.mjs';

async function main() {
  const { values } = parseArgs({ options: { file: { type: 'string' }, port: { type: 'string' }, open: { type: 'boolean' }, help: { type: 'boolean' } } });
  if (values.help || !values.file) {
    console.log('Node 22: node scripts/log-link-server.mjs --file <Game.log> [--open] [--port 0]\n선택한 로그를 읽는 PC 전용 검증 서버입니다. Ctrl+C로 종료합니다.');
    return;
  }
  const service = await startLogService({ file: values.file, port: values.port === undefined ? 0 : Number(values.port) });
  console.log('STAM 로그 실시간 검증 · 읽기 전용\n브라우저 주소 (연결 키 포함, 공유하지 마세요):\n' + service.url + '\nCtrl+C로 종료합니다.');
  if (values.open) {
    const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const child = spawn(command, [service.url], { stdio: 'ignore', windowsHide: true });
    child.on('error', () => console.error('브라우저를 자동으로 열지 못했습니다. 위 주소를 직접 열어 주세요.'));
  }
  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    await service.close();
    process.off('SIGINT', close); process.off('SIGTERM', close);
  }
  process.on('SIGINT', close); process.on('SIGTERM', close);
}

main().catch(error => {
  console.error(`실시간 검증기를 시작하지 못했습니다 (${error.code || (/^[a-z-]+$/.test(error.message) ? error.message : 'startup-error')}).`);
  process.exitCode = 1;
});
