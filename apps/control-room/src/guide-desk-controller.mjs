export function mountGuideDesk(root, options) {
const byId = id => root.querySelector('[id="'+id+'"]');
const word = text => options.translate?.(text) ?? text;
const stage = byId('stage');
const video = byId('approach');
const idle = byId('idle');
const returnVideo = byId('return-video');
const loungeFrame = byId('lounge-frame');
const endFrame = byId('end-frame');
const toggle = byId('toggle');
const status = byId('status');
const sound = byId('sound');
const panels = [...stage.querySelectorAll('.panel')];
let opened = false;
let sequence = 0;
let timers = [];

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}
function cancelPending() {
  sequence += 1;
  clearTimers();
  return sequence;
}
function later(callback, ms) {
  const current = sequence;
  timers.push(setTimeout(() => { if (current === sequence) callback(); }, ms));
}
function showPanels(value) {
  opened = value;
  stage.classList.toggle('closed', !value);
  panels.forEach(panel => {
    panel.inert = !value;
    panel.setAttribute('aria-hidden', String(!value));
  });
  toggle.setAttribute('aria-expanded', String(value));
  toggle.textContent = word(value ? '홀로그램 접기' : '홀로그램 펼치기');
  if (stage.dataset.state === 'arrived') status.textContent = word(value ? '안내 데스크' : '홀로그램 수납');
}
function stopIdle() {
  idle.pause();
  stage.dataset.idle = 'stopped';
}
function waitForVideoData(media) {
  if (media.error) return Promise.reject(new Error('Video unavailable'));
  if (media.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      media.removeEventListener('loadeddata', ready);
      media.removeEventListener('error', failed);
    };
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error('Video unavailable')); };
    const timeout = setTimeout(failed, 8000);
    media.addEventListener('loadeddata', ready, {once: true});
    media.addEventListener('error', failed, {once: true});
  });
}
async function startIdle(current) {
  try {
    await waitForVideoData(idle);
    if (current !== sequence || stage.dataset.state !== 'arrived') return;
    idle.currentTime = 0;
    idle.muted = true;
    await idle.play();
    if (current !== sequence || stage.dataset.state !== 'arrived') return;
    stage.dataset.idle = 'playing';
  } catch {
    if (current === sequence && stage.dataset.state === 'arrived') stage.dataset.idle = 'unavailable';
  }
}
async function revealArrival() {
  const current = sequence;
  try { await endFrame.decode(); } catch {
    if (current === sequence) status.textContent = word('도착 이미지 확인 필요');
    return;
  }
  if (current !== sequence) return;
  stage.dataset.state = 'arrived';
  toggle.disabled = false;
  status.textContent = word('데스크 도착');
  startIdle(current);
  later(() => showPanels(true), 200);
}
async function playFromStart() {
  const current = cancelPending();
  const wasOpened = opened;
  showPanels(false);
  stopIdle();
  returnVideo.pause();
  toggle.disabled = true;
  video.pause();
  if (wasOpened) await new Promise(resolve => setTimeout(resolve, 460));
  if (current !== sequence) return;
  stage.dataset.state = 'playing';
  video.currentTime = 0;
  status.textContent = word('데스크로 이동 중');
  try { await video.play(); } catch {
    if (current === sequence) {
      stage.dataset.state = 'ready';
      status.textContent = word('다시 보기로 재생');
    }
  }
}
async function jumpToArrival() {
  cancelPending();
  stopIdle();
  returnVideo.pause();
  video.pause();
  showPanels(false);
  await revealArrival();
}
function waitForPanelExit() {
  return Promise.all(panels.map(panel => new Promise(resolve => {
    const style = getComputedStyle(panel);
    // Sample the exit timing after the closed class has been applied.
    const seconds = value => value.split(',').map(part => {
      const text = part.trim();
      return parseFloat(text) * (text.endsWith('ms') ? 1 : 1000);
    });
    const duration = Math.max(...seconds(style.transitionDuration));
    const delay = Math.max(...seconds(style.transitionDelay));
    const finish = event => {
      if (event && (event.target !== panel || event.propertyName !== 'transform')) return;
      clearTimeout(timeout);
      panel.removeEventListener('transitionend', finish);
      resolve();
    };
    const timeout = setTimeout(() => finish(), duration + delay + 100);
    panel.addEventListener('transitionend', finish);
  })));
}
function restoreDeskAfterReturnError() {
  const current = cancelPending();
  returnVideo.pause();
  stage.dataset.state = 'arrived';
  toggle.disabled = false;
  startIdle(current);
  showPanels(true);
  status.textContent = word('복귀 영상을 확인해 주세요');
}
async function returnToLounge() {
  if (stage.dataset.state !== 'arrived') return;
  const current = cancelPending();
  stage.dataset.state = 'closing-return';
  toggle.disabled = true;
  showPanels(false);
  status.textContent = word('홀로그램 수납 중');
  // Keep the live desk view visible while the entire panel slides offstage.
  try {
    await Promise.all([waitForPanelExit(), waitForVideoData(returnVideo)]);
    if (current !== sequence || stage.dataset.state !== 'closing-return') return;
    if (options.motion === false) { stopIdle(); options.onLounge(); return; }
    idle.pause();
    video.pause();
    returnVideo.currentTime = 0;
    returnVideo.muted = video.muted;
    stage.dataset.state = 'returning';
    status.textContent = word('라운지로 이동 중');
    await returnVideo.play();
    if (current !== sequence || stage.dataset.state !== 'returning') return;
    later(stopIdle, 220);
  } catch {
    if (current === sequence) restoreDeskAfterReturnError();
  }
}
async function completeReturn() {
  if (stage.dataset.state !== 'returning') return;
  const current = sequence;
  try { await loungeFrame.decode(); } catch { return; }
  if (current !== sequence || stage.dataset.state !== 'returning') return;
  stopIdle();
  stage.dataset.state = 'lounge';
  toggle.disabled = true;
  status.textContent = word('라운지');
  options.onLounge();
}
returnVideo.addEventListener('ended', completeReturn);
returnVideo.addEventListener('error', () => {
  if (['closing-return', 'returning'].includes(stage.dataset.state)) restoreDeskAfterReturnError();
});
byId('return-to-lounge').addEventListener('click', returnToLounge);
video.addEventListener('ended', () => {
  if (stage.dataset.state === 'playing') revealArrival();
});
video.addEventListener('error', () => {
  cancelPending();
  stopIdle();
  status.textContent = word('영상을 불러오지 못했습니다');
});
byId('replay')?.addEventListener('click', playFromStart);
byId('arrival')?.addEventListener('click', jumpToArrival);
toggle.addEventListener('click', () => {
  if (stage.dataset.state !== 'arrived') return;
  clearTimers();
  showPanels(!opened);
});
sound.addEventListener('click', () => {
  video.muted = !video.muted;
  returnVideo.muted = video.muted;
  sound.setAttribute('aria-pressed', String(!video.muted));
  sound.textContent = word(video.muted ? '소리 켜기' : '소리 끄기');
});
for (const group of ['.actions', '.replies']) {
  const buttons = [...stage.querySelectorAll(`${group} .holo-action`)];
  buttons.filter(button => button.id !== 'return-to-lounge').forEach(button => button.addEventListener('click', () => {
    buttons.forEach(item => item.classList.toggle('selected', item === button));
  }));
}
const onKeyDown = event => {
  if (event.key === 'Escape' && stage.dataset.state === 'arrived') {
    event.preventDefault();
    returnToLounge();
  }
};
root.addEventListener('keydown', onKeyDown);

async function navigate(screen) {
  if(['playing','ready','returning'].includes(stage.dataset.state)){
    cancelPending();video.pause();idle.pause();returnVideo.pause();options.onNavigate(screen);return;
  }
  if (screen === 'lounge') return returnToLounge();
  if (stage.dataset.state !== 'arrived') return;
  const current=cancelPending();
  stage.dataset.state='closing-action';
  toggle.disabled=true;showPanels(false);
  await waitForPanelExit();
  if(current===sequence){stopIdle();options.onNavigate(screen);}
}
const actions=[...stage.querySelectorAll('.actions button')];
actions[0].addEventListener('click',()=>navigate('mission'));
actions[1].addEventListener('click',()=>{byId('greeting').textContent=word('미션 콘솔에서 함선과 출발지를 고른 뒤 계약을 담아 주세요. 항로와 적재를 확인하면 출항할 수 있어요.');});
actions[2].addEventListener('click',()=>navigate('information'));
const replies=[...stage.querySelectorAll('.replies button')];
replies[0].addEventListener('click',()=>{byId('greeting').textContent=word('먼저 미션 콘솔에서 이번 운송에 담을 계약을 선택해 주세요. 확인한 계약으로 항로를 계산할 수 있어요.');});
replies[1].addEventListener('click',()=>navigate('mission'));
byId('skip').addEventListener('click',()=>{
  if(stage.dataset.state==='playing')jumpToArrival();
  else if(stage.dataset.state==='returning'){returnVideo.pause();completeReturn();}
});
video.muted=!options.sound;returnVideo.muted=!options.sound;
sound.setAttribute('aria-pressed',String(!!options.sound));
sound.textContent=word(options.sound?'소리 끄기':'소리 켜기');
showPanels(false);
if(options.startWithApproach&&options.motion!==false)playFromStart();else jumpToArrival();
return {navigate,destroy(){root.removeEventListener('keydown', onKeyDown);cancelPending();video.pause();idle.pause();returnVideo.pause();}};


}
