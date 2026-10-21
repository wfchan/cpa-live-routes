import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const page = await readFile(new URL('../web/token-monitor.html', import.meta.url), 'utf8');
const extract = (start, end) => page.slice(page.indexOf(start), page.indexOf(end, page.indexOf(start)));
const helpers = extract('const motionTiming', 'const flights =');

test('active motion draws every available 60 Hz frame', () => {
  let draws = 0, elapsed = 100;
  const context = {
    rafId: 0, tmId: 0, lastDraw: 100, rafCount: 0, animT: 0, frameDelta: 16.67,
    document: { hidden: false }, stopped: false, paused: false,
    performance: { now: () => elapsed }, speedVal: () => 1,
    clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
    render: () => { draws++; }, animating: () => true,
    requestAnimationFrame: () => 1, setTimeout: () => 1, idleDelay: () => 500, console,
  };
  runInNewContext(extract('function loop()', 'function render()'), context);
  for (let i = 1; i <= 60; i++) { elapsed = 100 + i * 1000 / 60; context.loop(); }
  assert.ok(draws >= 59, `Only ${draws}/60 frames rendered`);
  assert.ok(Math.abs(context.animT - 1000) < 1, `Clock advanced ${context.animT}ms`);
});

test('speed is applied once and normal-speed request travel lasts at least 1.4 seconds', () => {
  const durations = [];
  for (const speed of [.5, 1, 2]) {
    const flights = new Map();
    const context = {
      flights, animOn: () => true, speedVal: () => speed,
      now: () => 1000, animT: 0, isLive: s => s === 'routed' || s === 'queued',
      flash: new Map(),
    };
    runInNewContext(helpers + extract('function trackFlight(', '/* ---------- flow model'), context);
    context.trackFlight(null, { id: 'request', t0: 1000, state: 'routed', exit: 1 });
    durations.push(flights.get('request').dur);
  }
  assert.ok(durations[1] >= 1400, `Normal travel is only ${durations[1]}ms`);
  assert.equal(durations[0], durations[1], 'Clock owns speed; flight duration must not apply it again');
  assert.equal(durations[2], durations[1]);
});

test('packets travel equal physical distances across unequal path segments', () => {
  const context = {
    clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
    pathKeys: () => ['client', 'hub', 'exit'],
    buildPath: () => ({ segs: [1, 2] }),
    posAt: (_path, p) => ({ x: p <= .5 ? p * 200 : 100 + (p - .5) * 1800, y: 0 }),
  };
  runInNewContext(helpers, context);
  const path = context.motionPath({});
  const xs = [0, .25, .5, .75, 1].map(p => context.motionPoint(path, p).x);
  assert.deepEqual(xs, [0, 250, 500, 750, 1000]);
  assert.equal(context.motionPath({}), path, 'Identical routes share sampled geometry');
});

test('a fast response queues its return until the outbound packet arrives', () => {
  const flights = new Map(), context = {
    flights, animOn: () => true, now: () => 1000, animT: 0,
    isLive: s => s === 'queued' || s === 'routed', flash: new Map(),
  };
  runInNewContext(helpers + extract('function trackFlight(', '/* ---------- flow model'), context);
  const routed = { id: 'fast', t0: 1000, state: 'routed', exit: 1 };
  context.trackFlight(null, routed);
  context.trackFlight(routed, { ...routed, state: 'done' });
  assert.equal(flights.get('fast').kind, 'fwd');
  assert.equal(flights.get('fast').next.kind, 'ret');
  assert.equal(flights.get('fast').next.ok, true);
});

test('stable nodes and text are cached between frames and invalidate on data or hover', () => {
  let nodeDraws = 0, copies = 0;
  const paint = { setTransform() {}, fillRect() {}, drawImage() { copies++; } };
  const context = {
    cvF: { width: 800, height: 400 }, fctx: paint, X: paint,
    document: { createElement: () => ({ getContext: () => paint }) },
    sizeCv() {}, G: {}, W: 800, FH: 400, dpr: 1, dataVer: 1, lastCompute: 100,
    C: { card: '#000', accent: '#fff' }, rel: null, animT: 0, flash: new Map(),
    nodeAnim: false, fadeFlag: false, drawChrome() {}, drawLinks() {}, drawHub() {},
    drawNode() { nodeDraws++; }, drawFlights() {},
    F: { sig: 'stable', nodes: new Map([['x', {}]]), lists: { c: [{}], s: [], x: [] } },
  };
  runInNewContext(helpers + extract('function drawFlow(', '/* flow interaction */'), context);
  for (let i = 0; i < 60; i++) context.drawFlow(i * 1000 / 60);
  assert.equal(copies, 60);
  assert.equal(nodeDraws, 1, 'Static text must not be painted on every frame');
  context.dataVer++; context.drawFlow(1000);
  assert.equal(nodeDraws, 2);
  context.rel = {}; context.drawFlow(1017);
  assert.equal(nodeDraws, 3);
});
