// Presentation only. No contract, inventory, location evidence or persisted run state.
export function createEstimatedFlight(leg, now = () => performance.now()) {
  if (!Array.isArray(leg?.nodes) || leg.nodes.length < 2 || !Number.isFinite(leg.seconds) || leg.seconds <= 0)
    throw new Error('예상 이동 구간의 경로와 시간이 필요합니다.');
  const nodes = [...leg.nodes], duration = leg.seconds * 1000;
  let elapsed = 0, since = now(), paused = false;
  const snapshot = () => {
    const ms = Math.min(duration, elapsed + (paused ? 0 : Math.max(0, now() - since)));
    const progress = ms / duration, edge = Math.min(nodes.length - 2, Math.floor(progress * (nodes.length - 1)));
    // Intermediate nodes have no measured timing: this is a schematic estimate.
    return {progress, edge, fraction:progress === 1 ? 1 : progress * (nodes.length - 1) - edge,
      from:nodes[edge], to:nodes[edge+1], paused, arrived:progress === 1};
  };
  return {snapshot, togglePause() {
    const state = snapshot();elapsed = state.progress * duration;since = now();paused = !paused;
    return snapshot();
  }};
}

export function trackingPresentation({kind='unavailable',paused=false,arrived=false}={}) {
  if(kind==='estimated')return {state:paused||arrived?'waiting':'estimated',title:arrived?'예상 구간 이동 완료':paused?'예상 이동 일시정지':'예상 이동',detail:'계획 시간 기준'};
  return {state:'waiting',title:'항로 안내 대기',detail:'계획 경로'};
}
