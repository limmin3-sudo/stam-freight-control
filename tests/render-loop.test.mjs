import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameLoop, observeRenderLoop, dampingForDelta} from '../render-loop.mjs';

function clock(draw) {
  let time = 0, id = 0;
  const frames = new Map(), timers = new Map();
  const loop = createFrameLoop(draw, {
    raf: fn => { frames.set(++id, fn); return id; }, cancelRaf: key => frames.delete(key),
    delay: (fn, ms) => { timers.set(++id, {fn, at: time + ms}); return id; }, cancelDelay: key => timers.delete(key),
    now: () => time,
  });
  return {loop, frames, timers, step(ms = 1000 / 60) {
    time += ms;
    for (const [key, {fn, at}] of [...timers]) if (at <= time) { timers.delete(key); fn(); }
    for (const [key, fn] of [...frames]) { frames.delete(key); fn(time); }
  }};
}

test('settled views stop, coalesce changes and wake on demand', () => {
  let draws = 0;
  const c = clock(() => { draws++; return 0; });
  c.loop.invalidate(); c.loop.invalidate();
  assert.equal(c.frames.size, 1);
  c.step();
  for (let i = 0; i < 100; i++) c.step();
  assert.equal(draws, 1);
  assert.equal(c.loop.stats().pending, false);
  c.loop.invalidate(); c.step();
  assert.equal(draws, 2);
});

test('hidden and disposed views cancel timers and frames; resume has bounded delta', () => {
  const delta = [], c = clock(dt => { delta.push(dt); return 20; });
  c.loop.invalidate(); c.step();
  assert.equal(c.timers.size, 1);
  c.loop.setVisible(false);
  assert.equal(c.timers.size + c.frames.size, 0);
  c.loop.invalidate(); c.step(10_000);
  assert.equal(delta.length, 1);
  c.loop.setVisible(true); c.step();
  assert.equal(delta[1], 1 / 60);
  c.loop.dispose(); c.loop.dispose(); c.loop.invalidate(); c.loop.setVisible(true); c.step();
  assert.equal(delta.length, 2);
  assert.equal(c.frames.size + c.timers.size, 0);
});

test('input interrupts the idle timer without duplicate renders', () => {
  let draws = 0;
  const c = clock(() => { draws++; return 20; });
  c.loop.invalidate(); c.step();
  c.loop.invalidate(); c.loop.invalidate();
  assert.equal(c.timers.size, 0);
  c.step();
  assert.equal(draws, 2);
  assert.equal(c.timers.size, 1);
});

test('changes during a draw are retained even when it would otherwise settle', () => {
  let draws = 0;
  const c = clock(() => { if (++draws === 1) c.loop.invalidate(); return 0; });
  c.loop.invalidate(); c.step(); c.step(); c.step();
  assert.equal(draws, 2);
  assert.equal(c.loop.stats().pending, false);
});

test('120 Hz screens are capped and idle effects use fewer frames', () => {
  for (const fps of [20, 60]) {
    let draws = 0;
    const c = clock(() => { draws++; return fps; });
    c.loop.invalidate();
    for (let i = 0; i < 120; i++) c.step(1000 / 120);
    assert.ok(draws <= fps + 1, `${fps}: ${draws}`);
    assert.ok(draws >= fps * .8, `${fps}: ${draws}`);
  }
});

test('damping decays equally over one second at 30, 60 and 120 Hz', () => {
  const remain = fps => Math.pow(1 - dampingForDelta(.09, 1 / fps), fps);
  assert.ok(Math.abs(remain(30) - remain(60)) < 1e-12);
  assert.ok(Math.abs(remain(120) - remain(60)) < 1e-12);
  assert.equal(dampingForDelta(.09, 0), 0);
  assert.equal(dampingForDelta(.09, 10), dampingForDelta(.09, .05));
});

test('browser visibility, sizing, intersection and context recovery wake only usable views', t => {
  const originals = new Map(), pending = new Map(); let id = 0, draws = 0;
  const observers = [];
  const install = (key, value) => { originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, {value, configurable: true}); };
  t.after(() => { for (const [key, descriptor] of originals) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; });
  const doc = new EventTarget(); doc.hidden = false;
  install('document', doc);
  install('requestAnimationFrame', fn => { pending.set(++id, fn); return id; });
  install('cancelAnimationFrame', key => pending.delete(key));
  class Observer {
    constructor(fn) { this.fn = fn; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  install('IntersectionObserver', Observer); install('ResizeObserver', Observer);
  const el = new EventTarget(); el.clientWidth = 640; el.clientHeight = 480;
  const loop = observeRenderLoop(el, () => { draws++; return 0; });
  const flush = () => { for (const [key, fn] of [...pending]) { pending.delete(key); fn(performance.now()); } };
  flush(); assert.equal(draws, 1);
  observers[0].fn([{isIntersecting: false}]); el.dispatchEvent(new Event('pointermove')); flush();
  assert.equal(draws, 1);
  observers[0].fn([{isIntersecting: true}]); flush(); assert.equal(draws, 2);
  el.dispatchEvent(new Event('webglcontextlost')); loop.invalidate(); flush(); assert.equal(draws, 2);
  el.dispatchEvent(new Event('webglcontextrestored')); flush(); assert.equal(draws, 3);
  doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); loop.invalidate(); flush(); assert.equal(draws, 3);
  el.clientWidth = 0; observers[1].fn(); doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); flush(); assert.equal(draws, 3);
  el.clientWidth = 640; observers[1].fn(); flush(); assert.equal(draws, 4);
  loop.dispose(); el.dispatchEvent(new Event('pointermove')); flush(); assert.equal(draws, 4);
  assert.ok(observers.every(o => o.disconnected));
});
