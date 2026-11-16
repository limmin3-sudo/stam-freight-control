import type {ReactNode} from 'react';
import type {Locale} from './navigation';
import desktopRelease from '../../../data/desktop-release.json';

type Props={locale:Locale;shot:(step:string,ko:string,en:string)=>ReactNode};
export function LogAppGuide({locale,shot}:Props){
 const t=(ko:string,en:string)=>locale==='en'?en:ko;
 const installer=desktopRelease.installer?.url||desktopRelease.url;
 const filename=installer.split('/').pop();
 return <div className="manual-import-guide">
  <p className="manual-start-order">{t('게임 실행 → STAM 로그 앱 실행 → 미션 콘솔 연결','Start the game → Open the STAM log app → Connect the mission console')}</p>
  <p className="manual-note">{t('게임을 실행하는 Windows PC에서 진행하세요. 모바일에서는 안내를 읽을 수 있지만 Windows 로그 앱을 설치하거나 이 PC의 로그에 연결할 수는 없습니다.','Use the Windows PC where you play the game. You can read this guide on mobile, but cannot install the Windows log app or connect to that PC’s log from your phone.')}</p>
  <article className="manual-step" id="manual-download"><header><span>01</span><div><small>DOWNLOAD</small><h3>{t('상단 「앱 다운로드」를 누르세요','Select “Download app” in the top bar')}</h3></div></header>
   <p>{t('사이트 오른쪽 위의 「앱 다운로드」에서 Windows 설치 파일을 받습니다. 아래 버튼도 같은 파일로 연결됩니다. 다운로드가 끝나면 브라우저의 다운로드 목록에서 파일을 여세요.','Use “Download app” at the top right to get the Windows installer. The button below links to the same file. Once the download finishes, open it from your browser’s downloads.')}</p>
   <a className="manual-action manual-installer-link" href={installer} target="_blank" rel="noopener noreferrer">{t('Windows 앱 다운로드','Download Windows app')} ↗</a>
   <p className="manual-download-file">{t('받을 파일','File')}: <code>{filename}</code></p>
   {shot('download','사이트 상단 오른쪽의 앱 다운로드 버튼','Download app at the top right of the site')}
  </article>
  <article className="manual-step"><header><span>02</span><div><small>INSTALL</small><h3>{t('앱을 설치하고 게임부터 실행하세요','Install the app, then start the game first')}</h3></div></header>
   <ol className="manual-install-steps">
    <li>{t('받은 .exe 파일을 실행하고 설치 언어를 선택합니다.','Run the downloaded .exe and choose the installer language.')}</li>
    <li>{t('설치 위치를 확인합니다. 바탕화면 바로가기를 원하면 해당 항목을 선택하고 설치를 진행합니다.','Confirm the installation folder. Select the desktop shortcut option if you want one, then install.')}</li>
    <li>{t('Star Citizen을 먼저 실행한 뒤, 설치 완료 화면에서 앱 실행을 선택하거나 시작 메뉴의 STAM을 엽니다. 바탕화면 바로가기를 만들었다면 STAM 로고로도 실행할 수 있습니다.','Start Star Citizen first, then launch STAM from the completion screen or the Start menu. If you created the desktop shortcut, you can also use its STAM logo.')}</li>
   </ol>
   <p>{t('별도로 Node.js를 설치할 필요는 없습니다. 앱 창을 닫으면 트레이에서 계속 수신합니다. 완전히 종료하려면 트레이의 STAM 아이콘 메뉴에서 「앱 종료 · 로그 연결 종료」를 선택하세요.','You do not need to install Node.js separately. Closing the app window leaves it receiving in the tray. To quit completely, use “Quit app · Disconnect” from the STAM tray icon menu.')}</p>
  </article>
  <article className="manual-step"><header><span>03</span><div><small>SELECT GAME.LOG</small><h3>{t('실제로 플레이하는 Game.log를 확인하세요','Check the Game.log for your active game channel')}</h3></div></header>
   <p>{t('앱은 이전에 선택한 파일을 기억하고 일반 LIVE 설치를 자동으로 찾습니다. 「로그 선택 필요」가 나오거나 다른 채널을 플레이한다면 「파일 직접 선택」을 누르세요. 현재 사용하는 LIVE·PTU·EPTU 폴더의 Game.log를 선택합니다.','The app remembers your previous file and finds standard LIVE installations automatically. If it shows “CHOOSE A LOG”, or you play another channel, select “Choose Game.log”. Choose Game.log inside the LIVE, PTU or EPTU folder you actually use.')}</p>
   <p>{t('파일을 선택한 뒤 「로그 수신 중」을 확인하세요. 「게임 실행 대기」는 파일 생성을 기다리는 상태입니다. 게임을 이미 실행했다면 선택한 채널과 파일 위치를 다시 확인하세요.','After selecting the file, look for “LOG CONNECTED”. “WAITING FOR GAME” means the file has not appeared yet. If the game is already running, check the selected channel and file location.')}</p>
   {shot('app-window','Windows 앱의 연결 대기 화면 — 파일 직접 선택·미션콘솔 열기 위치','Windows app in the ready state — Choose Game.log and Open mission console')}
  </article>
  <article className="manual-step"><header><span>04</span><div><small>CONNECT & CHECK</small><h3>{t('미션 콘솔에서 「앱 자동 수신 중」을 확인하세요','Check “Receiving from app” in the mission console')}</h3></div></header>
   <p>{t('앱의 「미션콘솔 열기」를 누릅니다. 처음 방문했다면 운항 파트너를 고른 뒤 미션 콘솔로 들어가세요. 브라우저가 이 사이트의 로컬 네트워크 접근을 요청하면 허용합니다. 이미 열어 둔 콘솔도 앱 연결을 자동으로 시도합니다.','Select “Open mission console” in the app. On your first visit, choose a flight partner and enter the mission console. Allow this site’s local network access if the browser asks. An already-open console also attempts to connect automatically.')}</p>
   <p>{t('Game.log 입력 영역에 「앱 자동 수신 중」이 보이면 사이트와 앱이 연결된 상태입니다. 게임에서 받은 계약이 수신함에 들어오는지 확인하고, 내용과 수량을 검토한 뒤 이번 운송에 넣을 계약을 선택하세요. 연결 표시만으로 계약 수신이나 배송 완료가 확정되지는 않습니다.','“Receiving from app” in the Game.log section confirms the site is connected to the app. Check that your accepted contracts appear, review their details and quantities, then select those for this haul. Connection status alone does not confirm contract receipt or delivery completion.')}</p>
   {shot('connected','앱 연결 후 실제 미션 콘솔의 수신 상태 — 안내용 테스트 로그 사용','Actual connected mission-console status — captured with a test log')}
   <a className="manual-action" href={`#/mission?lang=${locale}`}>{t('미션 콘솔 열기','Open mission console')} ↗</a>
  </article>
  <section className="manual-import-help" aria-labelledby="manual-log-help"><h3 id="manual-log-help">{t('여기서 막혔다면','If you get stuck')}</h3>
   <dl>
    <div><dt>{t('앱은 켜져 있는데 연결이 안 돼요','The app is open but not connected')}</dt><dd>{t('브라우저의 이 사이트 로컬 네트워크 권한을 확인한 뒤 「로그 앱 연결」을 누르세요. 「앱 연결 중지」가 보이면 이미 앱 연결 방식이 켜진 상태이므로 아래 상태 문구를 먼저 확인하세요.','Check this site’s local network permission, then select “Connect log app”. If the button says “Disconnect app”, app reception is already enabled; check the status beneath it first.')}</dd></div>
    <div><dt>{t('연결됐는데 계약이 없어요','Connected, but no contracts appear')}</dt><dd>{t('현재 게임 채널의 Game.log인지, 수주가 로그에 기록됐는지 확인하세요. 로그에 없는 내용은 스크린샷이나 직접 입력으로 보완할 수 있습니다.','Check that this is the active channel’s Game.log and that the accepted contract was recorded. Use screenshots or manual entry for information the log does not contain.')}</dd></div>
    <div><dt>{t('설치 파일을 못 찾겠어요','I cannot find the downloaded installer')}</dt><dd>{t('브라우저 다운로드 목록에서 위 파일명을 찾으세요. 다운로드가 실패했다면 다시 받습니다. 설치 파일과 게임의 Game.log는 서로 다른 파일입니다.','Look for the filename above in your browser’s downloads. Retry if the download failed. The installer and the game’s Game.log are different files.')}</dd></div>
   </dl>
  </section>
  <section className="manual-import-help"><h3>{t('앱 외의 입력 방법','Other ways to import')}</h3><p>{t('「Game.log 선택」으로 파일을 직접 읽거나, 스크린샷을 자동 인식한 뒤 검토해 추가할 수 있습니다. 「직접 입력」과 「텍스트 가져오기」도 같은 미션 콘솔에 있습니다. 같은 로그를 앱과 파일로 중복해서 가져올 필요는 없습니다.','Use “Choose Game.log” to read a file, or recognize screenshots and review the result before adding. Manual entry and text import are in the same console. You do not need to import the same log through both app reception and file input.')}</p><p>{t('수신함과 보완값은 현재 탭에 보관하며 새로고침하면 복원됩니다. 탭을 닫으면 초기화되고, 선택해 운항에 넣은 계약은 운항에 별도로 저장됩니다.','The inbox and corrections survive reloads in the current tab but reset when the tab closes. Contracts included in your flight are saved with it separately.')}</p></section>
 </div>;
}
