// A frame is requested only while visible and needed. The callback returns the
// next frame rate (0 = settled). Timers avoid spinning rAF on high refresh screens.
export function createFrameLoop(draw, {
  raf = fn => requestAnimationFrame(fn), cancelRaf = id => cancelAnimationFrame(id),
  delay = (fn, ms) => setTimeout(fn, ms), cancelDelay = id => clearTimeout(id),
  now = () => performance.now(),
} = {}) {
  let frame = null, timer = null, visible = true, disposed = false, previous = null;
  let drawing = false, dirty = false, frames = 0;
  function cancel() {
    if (frame !== null) cancelRaf(frame);
    if (timer !== null) cancelDelay(timer);
    frame = timer = null;
  }
  function request() {
    if (!disposed && visible && frame === null) frame = raf(tick);
  }
  function tick(stamp) {
    frame = null;
    if (disposed || !visible) return;
    if (previous !== null && stamp - previous < 1000 / 60 - .5) {
      timer = delay(() => { timer = null; request(); }, Math.max(1, 1000 / 60 - (stamp - previous) - 2));
      return;
    }
    const dt = previous === null ? 1 / 60 : Math.min(.05, Math.max(0, (stamp - previous) / 1000));
    previous = stamp;
    dirty = false;
    drawing = true;
    let fps;
    try { fps = draw(dt, stamp); frames++; } finally { drawing = false; }
    if (disposed || !visible) return;
    if (dirty) { request(); return; }
    if (Number.isFinite(fps) && fps > 0) {
      // Wake just before the desired frame, accounting for the draw's own cost.
      const wait = Math.max(0, 1000 / Math.min(60, fps) - 2 - (now() - stamp));
      if (wait > 1) timer = delay(() => { timer = null; request(); }, wait);
      else request();
    } else previous = null;
  }
  return {
    invalidate() {
      if (disposed) return;
      dirty = true;
      if (drawing) return;
      if (timer !== null) { cancelDelay(timer); timer = null; }
      request();
    },
    setVisible(value) {
      if (visible === !!value || disposed) return;
      visible = !!value;
      previous = null;
      cancel();
      if (visible) request();
    },
    dispose() { disposed = true; cancel(); },
    stats: () => ({frames, visible, pending: frame !== null || timer !== null, disposed}),
  };
}

export function observeRenderLoop(element, draw) {
  const loop = createFrameLoop(draw), events = new AbortController();
  let intersecting = true, contextLost = false, sized = element.clientWidth > 0 && element.clientHeight > 0;
  const visibility = () => loop.setVisible(!document.hidden && intersecting && sized && !contextLost);
  const intersection = new IntersectionObserver(entries => {
    intersecting = entries.at(-1).isIntersecting;
    visibility();
  });
  const resize = new ResizeObserver(() => {
    sized = element.clientWidth > 0 && element.clientHeight > 0;
    visibility();
    loop.invalidate();
  });
  intersection.observe(element);
  resize.observe(element);
  document.addEventListener('visibilitychange', visibility, {signal: events.signal});
  element.addEventListener('webglcontextlost', () => { contextLost = true; visibility(); }, {capture: true, signal: events.signal});
  element.addEventListener('webglcontextrestored', () => { contextLost = false; visibility(); loop.invalidate(); }, {capture: true, signal: events.signal});
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave', 'wheel', 'keydown']) {
    element.addEventListener(type, loop.invalidate, {passive: true, signal: events.signal});
  }
  visibility();
  loop.invalidate();
  return {...loop, dispose() { loop.dispose(); events.abort(); intersection.disconnect(); resize.disconnect(); }};
}

// Match the original 60 Hz damping response at other refresh rates.
export const dampingForDelta = (factor, dt) => 1 - Math.pow(1 - factor, Math.min(.05, Math.max(0, dt)) * 60);
