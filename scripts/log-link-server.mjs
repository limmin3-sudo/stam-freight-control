import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { startLogService } from '../integration/log/live-server.mjs';

// Keep the browser origin stable so local preferences survive ordinary restarts.
// Never silently fall back to a random origin with a different storage area.
export const DEFAULT_LOG_PORT = 41454;
export function launchOptions(args) {
  const {values}=parseArgs({args,options:{file:{type:'string'},port:{type:'string'},open:{type:'boolean'},help:{type:'boolean'}}});
  if(values.port!==undefined&&!/^\d{1,5}$/.test(values.port))throw Error('invalid-port');
  const port=values.port===undefined?DEFAULT_LOG_PORT:Number(values.port);
  if(port>65535)throw Error('invalid-port');
  return {...values,port};
}
export async function main(args=process.argv.slice(2)) {
  const values=launchOptions(args);
  if (values.help || !values.file) {
    console.log('Node 22+: node scripts/log-link-server.mjs --file <Game.log> [--open] [--port 41454]\n선택한 로그를 읽는 PC 전용 운송 관제입니다. 기본 주소는 고정되며 --port 0은 임시 주소를 사용합니다. Ctrl+C로 종료합니다.');
    return;
  }
  const service = await startLogService({ file: values.file, port: values.port });
  console.log('STAM 운송 관제 · 로그 읽기 전용\n브라우저 주소 (연결 키 포함, 공유하지 마세요):\n' + service.url + '\n이 창은 켜 두세요. 종료하려면 Ctrl+C를 누르세요.\n게임에 접속한 뒤 파트너와 함선·출발지를 확인하고 운송 계약을 받으세요.');
  if(values.port===0)console.log('임시 주소를 사용합니다. 다음 실행에서는 브라우저 설정 저장 공간이 달라질 수 있습니다.');
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

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error => {
  if(error.code==='EADDRINUSE')console.error('STAM 실행 주소가 이미 사용 중입니다. 이전 STAM 실행 창에서 Ctrl+C로 종료한 뒤 다시 실행해 주세요. 다른 프로그램이 사용 중이면 --port로 다른 고정 포트를 지정할 수 있습니다. 포트를 바꾸면 브라우저의 저장 공간도 달라집니다.');
  else console.error(`운송 관제를 시작하지 못했습니다 (${error.code || (/^[a-z-]+$/.test(error.message) ? error.message : 'startup-error')}).`);
  process.exitCode = 1;
});
