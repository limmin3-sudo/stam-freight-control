const stage = document.getElementById('stage');
const video = document.getElementById('approach');
const idle = document.getElementById('idle');
const returnVideo = document.getElementById('return-video');
const loungeFrame = document.getElementById('lounge-frame');
const endFrame = document.getElementById('end-frame');
const toggle = document.getElementById('toggle');
const status = document.getElementById('status');
const sound = document.getElementById('sound');
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
  toggle.textContent = value ? '홀로그램 접기' : '홀로그램 펼치기';
  if (stage.dataset.state === 'arrived') status.textContent = value ? '안내 데스크' : '홀로그램 수납';
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
    if (current === sequence) status.textContent = '도착 이미지 확인 필요';
    return;
  }
  if (current !== sequence) return;
  stage.dataset.state = 'arrived';
  toggle.disabled = false;
  status.textContent = '데스크 도착';
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
  status.textContent = '데스크로 이동 중';
  try { await video.play(); } catch {
    if (current === sequence) {
      stage.dataset.state = 'ready';
      status.textContent = '다시 보기로 재생';
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
  status.textContent = '복귀 영상을 확인해 주세요';
}
async function returnToLounge() {
  if (stage.dataset.state !== 'arrived') return;
  const current = cancelPending();
  stage.dataset.state = 'closing-return';
  toggle.disabled = true;
  showPanels(false);
  status.textContent = '홀로그램 수납 중';
  // Keep the live desk view visible while the entire panel slides offstage.
  try {
    await Promise.all([waitForPanelExit(), waitForVideoData(returnVideo)]);
    if (current !== sequence || stage.dataset.state !== 'closing-return') return;
    idle.pause();
    video.pause();
    returnVideo.currentTime = 0;
    returnVideo.muted = video.muted;
    stage.dataset.state = 'returning';
    status.textContent = '라운지로 이동 중';
    await returnVideo.play();
    if (current !== sequence || stage.dataset.state !== 'returning') return;
    later(stopIdle, 220);
  } catch {
    if (current === sequence) restoreDeskAfterReturnError();
  }
}
returnVideo.addEventListener('ended', async () => {
  if (stage.dataset.state !== 'returning') return;
  const current = sequence;
  try { await loungeFrame.decode(); } catch { return; }
  if (current !== sequence || stage.dataset.state !== 'returning') return;
  stopIdle();
  stage.dataset.state = 'lounge';
  toggle.disabled = true;
  status.textContent = '라운지';
});
returnVideo.addEventListener('error', () => {
  if (['closing-return', 'returning'].includes(stage.dataset.state)) restoreDeskAfterReturnError();
});
document.getElementById('return-to-lounge').addEventListener('click', returnToLounge);
video.addEventListener('ended', () => {
  if (stage.dataset.state === 'playing') revealArrival();
});
video.addEventListener('error', () => {
  cancelPending();
  stopIdle();
  status.textContent = '영상을 불러오지 못했습니다';
});
document.getElementById('replay').addEventListener('click', playFromStart);
document.getElementById('arrival').addEventListener('click', jumpToArrival);
toggle.addEventListener('click', () => {
  if (stage.dataset.state !== 'arrived') return;
  clearTimers();
  showPanels(!opened);
});
sound.addEventListener('click', () => {
  video.muted = !video.muted;
  returnVideo.muted = video.muted;
  sound.setAttribute('aria-pressed', String(!video.muted));
  sound.textContent = video.muted ? '소리 켜기' : '소리 끄기';
});
for (const group of ['.actions', '.replies']) {
  const buttons = [...stage.querySelectorAll(`${group} .holo-action`)];
  buttons.filter(button => button.id !== 'return-to-lounge').forEach(button => button.addEventListener('click', () => {
    buttons.forEach(item => item.classList.toggle('selected', item === button));
  }));
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && stage.dataset.state === 'arrived') {
    clearTimers();
    showPanels(false);
  }
});
showPanels(false);
playFromStart();
