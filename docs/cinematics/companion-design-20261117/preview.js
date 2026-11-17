// Review-only state examples. No file access, bridge API, credentials or storage.
let language='ko',phase='idle';
const $=id=>document.getElementById(id),t=(ko,en)=>language==='en'?en:ko;
const messages={
 idle:['연결 대기','READY TO CONNECT','앱을 실행하면 로그를 자동으로 찾습니다.','Finds your game log automatically on launch.'],
 watching:['로그 수신 중','LOG CONNECTED','새 계약을 미션콘솔에서 확인하세요.','Review new contracts in your mission console.'],
 'waiting-file':['게임 실행 대기','WAITING FOR GAME','Game.log가 생성되면 자동으로 이어집니다.','Resumes automatically when Game.log appears.'],
 error:['연결 확인 필요','CHECK CONNECTION','파일 위치와 읽기 권한을 확인하세요.','Check the file location and read access.'],
 stopped:['연결 중지됨','DISCONNECTED','수신한 계약과 진행 중 운항은 유지됩니다.','Your received contracts and flight are retained.']
};
function render(){
 document.documentElement.lang=language;
 document.querySelectorAll('[data-ko]').forEach(el=>el.textContent=el.dataset[language]);
 document.querySelectorAll('[data-language]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.language===language));
 document.querySelector('main').dataset.phase=phase;$('preview-state').value=phase;
 const m=messages[phase];$('state-label').textContent=t(m[0],m[1]);$('state-detail').textContent=t(m[2],m[3]);
 const selected=phase!=='idle',live=phase==='watching';
 $('bytes-read').textContent=live?'18.4':'—';$('last-read').textContent=live?'14:32:08':'— : — : —';
 $('connection-caption').textContent=live?t('새 기록을 기다리고 있습니다.','Waiting for new records.'):t('로그 읽기 대기','Waiting to read');
 $('channel').textContent=selected?'LIVE / GAME.LOG':'AUTO DISCOVERY';
 $('file-title').textContent=selected?'LIVE / Game.log':t('Star Citizen · 자동 탐색','Star Citizen · Auto discovery');
 $('file-path').textContent=selected?'C:\\Games\\StarCitizen\\LIVE\\Game.log':t('일반 설치 경로에서 LIVE 로그를 찾습니다.','Searches standard installation folders for LIVE.');$('file-path').title=$('file-path').textContent;
 $('disconnect').textContent=phase==='stopped'?t('다시 연결','Reconnect'):t('연결 중지','Disconnect');
 $('open-console').href='https://limmin3-sudo.github.io/stam-freight-control/#/mission?lang='+language;
}
document.querySelectorAll('[data-language]').forEach(el=>el.addEventListener('click',()=>{language=el.dataset.language;render();}));
$('preview-state').addEventListener('change',e=>{phase=e.target.value;render();});
$('disconnect').addEventListener('click',()=>{phase=phase==='stopped'?'watching':'stopped';render();$('preview-message').textContent=t('시안에서 상태 표시만 바꿨습니다. 실제 연결은 실행하지 않습니다.','Preview state only. No real connection is started or stopped.');});
for(const id of ['find-log','choose-log'])$(id).addEventListener('click',()=>{phase=id==='find-log'?'waiting-file':'watching';render();$('preview-message').textContent=t('디자인 검토용 예시입니다. 파일 선택·자동 탐색은 실제 앱의 기존 기능에 연결할 예정입니다.','Design example only. File selection and discovery will use the existing native app actions.');});
render();
