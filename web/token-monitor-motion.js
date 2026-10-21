/* @section trackFlight */
function trackFlight(prev, r) {
  if (!animOn()) { flights.delete(r.id); return; }
  const cur = flights.get(r.id);
  if (isLive(r.state)) {
    if (!prev && now() - r.t0 < 2500) {
      flights.set(r.id, { kind: 'fwd', from: 'client', to: r.state === 'routed' ? 'exit' : 'hub', t0: animT, dur: motionTiming.forward });
    } else if (prev && prev.state === 'queued' && r.state === 'routed') {
      flights.set(r.id, { kind: 'fwd', from: cur ? cur.from : 'hub', startPoint: cur?.point, to: 'exit', t0: animT, dur: cur ? motionTiming.forward : motionTiming.routed });
    }
  } else if ((prev && isLive(prev.state)) || (!prev && now() - (r.t1 || r.t0) < 2500)) {
    const from = r.exit ? 'exit' : 'hub';
    const next = r.state === 'done' || r.state === 'failed'
      ? { kind: 'ret', from, to: 'client', t0: animT, dur: motionTiming.return, ok: r.state === 'done' }
      : { kind: r.state === 'lost' ? 'fade' : 'puff', from, to: from, t0: animT, dur: motionTiming.fade };
    // A fast response still completes its outward journey before returning.
    if (cur?.kind === 'fwd') cur.next = next;
    else flights.set(r.id, next);
    if (r.state === 'failed' && r.exit) flash.set('x' + r.exit, { t: animT, c: 'err' });
  }
}

/* @section helpers */
const motionTiming = Object.freeze({ forward: 1800, routed: 1200, return: 2400, fade: 900 });
let frameDelta = 1000 / 60;
const motionPaths = new Map();
const motionLayer = { canvas: null, key: '', rel: null, moving: false, draws: 0 };

function drawActiveNodes() {
  if (!animOn()) return;
  X.save();
  for (const type of ['c', 's', 'x']) for (const n of F.lists[type]) {
    if (!(n.inf > 0) || n.h < 18 || n.w < 28) continue;
    const width = n.w - 18, segment = Math.min(30, width * .35);
    const phase = (animT / 2600 + n.id * .13) % 1;
    const travel = .5 - .5 * Math.cos(phase * Math.PI * 2);
    const y = n.y + n.h / 2 - 5;
    X.globalAlpha = clamp(n.alpha, 0, 1) * dimN(n);
    X.fillStyle = rgba(C.info, .22); rr(n.x + 9, y, width, 2, 1); X.fill();
    X.globalAlpha *= .6 + .4 * Math.sin(phase * Math.PI) ** 2;
    X.fillStyle = mix(C.info, '#ffffff', .65);
    rr(n.x + 9 + (width - segment) * travel, y, segment, 2, 1); X.fill();
  }
  X.restore();
}

function motionPath(r) {
  const key = pathKeys(r).join('>');
  if (motionPaths.has(key)) return motionPaths.get(key);
  const path = buildPath(r);
  if (!path) return null;
  const samples = [], lengths = [];
  let length = 0, prev;
  for (let i = 0; i <= path.segs.length * 24; i++) {
    const p = posAt(path, i / (path.segs.length * 24));
    if (prev) length += Math.hypot(p.x - prev.x, p.y - prev.y);
    samples.push(p); lengths.push(length); prev = p;
  }
  Object.assign(path, { samples, lengths, length });
  motionPaths.set(key, path);
  return path;
}

function motionDistance(path, parameter) {
  const v = clamp(parameter, 0, 1) * (path.lengths.length - 1), i = Math.floor(v);
  return (path.lengths[i] + ((path.lengths[i + 1] ?? path.lengths[i]) - path.lengths[i]) * (v - i)) / (path.length || 1);
}

function motionPoint(path, distance) {
  const target = clamp(distance, 0, 1) * path.length;
  let lo = 0, hi = path.lengths.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (path.lengths[mid] < target) lo = mid + 1; else hi = mid; }
  const i = Math.max(1, lo), a = path.samples[i - 1], b = path.samples[i];
  const u = (target - path.lengths[i - 1]) / (path.lengths[i] - path.lengths[i - 1] || 1);
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

function motionStart(path, point) {
  let best = 0, distance = Infinity;
  path.samples.forEach((p, i) => { const d = Math.hypot(p.x - point.x, p.y - point.y); if (d < distance) { distance = d; best = i; } });
  return path.lengths[best] / (path.length || 1);
}

/* @section drawLinks */
function drawLinks() {
  X.lineCap = 'round';
  F.edges.forEach(e => {
    const g = edgeG(e), quiet = e.w < .006;
    const focused = !rel || rel.E.has(e.k), opacity = Math.min(e.alpha, 1) * (focused ? 1 : .2);
    const path = () => { X.beginPath(); X.moveTo(g[0].x, g[0].y); X.bezierCurveTo(g[1].x, g[1].y, g[2].x, g[2].y, g[3].x, g[3].y); };
    X.lineWidth = quiet ? 1 : linkW(e);
    X.setLineDash(quiet ? [2, 6] : []);
    X.globalAlpha = opacity * (quiet ? .26 : .66);
    X.strokeStyle = mix(C.border, C.faint, quiet ? .2 : .28); path(); X.stroke();
    if (!quiet) {
      const errorShare = e.ew / (e.w + .001);
      X.lineWidth = Math.max(1, linkW(e) - 1.5);
      X.globalAlpha = opacity * Math.min(.42, e.w * .07);
      X.strokeStyle = mix(C.ok, C.info, .22); path(); X.stroke();
      if (errorShare > .03) {
        X.globalAlpha = opacity * Math.min(.65, errorShare); X.strokeStyle = C.err; path(); X.stroke();
      }
    }
  });
  X.setLineDash([]); X.globalAlpha = 1;
}

/* @section drawFlights */
function drawFlights() {
  if (!animOn()) return;
  const ranks = new Map(), counts = new Map(), queued = r => r.state === 'queued' || !r.exit;
  for (const id of inflight) {
    const r = recs.get(id); if (!r) continue;
    const key = queued(r) ? 'q' + r.rule : 'x' + r.exit, n = counts.get(key) || 0;
    counts.set(key, n + 1); ranks.set(id, n);
  }
  for (const id of inflight) {
    const r = recs.get(id); if (!r || flights.has(id) || ranks.get(id) >= 5) continue;
    const path = motionPath(r); if (!path) continue;
    const p = posAt(path, restS(path, ranks.get(id) || 0, !queued(r)));
    const phase = animT / 2600 * Math.PI * 2 + (ranks.get(id) || 0) * .6, breath = .5 + .5 * Math.sin(phase);
    X.globalAlpha = .12 + breath * .1; X.fillStyle = C.info;
    X.beginPath(); X.arc(p.x, p.y, 7 + breath * 2, 0, 7); X.fill();
    X.globalAlpha = .85; X.beginPath(); X.arc(p.x, p.y, 2.8 + breath * .35, 0, 7); X.fill();
  }
  for (const [id, f] of flights) {
    const r = recs.get(id), u = clamp((animT - f.t0) / f.dur, 0, 1);
    if (!r || u >= 1) {
      if (r && f.next) { flights.set(id, { ...f.next, t0: animT }); continue; }
      flights.delete(id);
      if (r && f.kind === 'ret') { const n = F.nodes.get('c' + (r.client || 0)); if (n) fx.push({ n: n.key, c: f.ok ? 'ok' : 'err', t: animT }); }
      continue;
    }
    const path = motionPath(r); if (!path) { flights.delete(id); continue; }
    const a = f.startPoint ? motionStart(path, f.startPoint) : motionDistance(path, resolveS(path, f.from));
    const b = motionDistance(path, resolveS(path, f.to, Math.min(ranks.get(id) || 0, 4)));
    const distance = a + (b - a) * u, p = motionPoint(path, distance);
    f.point = p;
    if (f.kind === 'fwd' || f.kind === 'ret') {
      const col = f.kind === 'fwd' ? C.info : f.ok ? C.ok : C.err;
      const direction = Math.sign(b - a), tail = Math.min(32 / (path.length || 1), Math.abs(distance - a));
      const alpha = Math.min(1, u * 12, (1 - u) * 12);
      X.lineCap = 'round';
      for (let i = 5; i >= 1; i--) {
        const start = motionPoint(path, distance - direction * tail * i / 5);
        const end = motionPoint(path, distance - direction * tail * (i - 1) / 5);
        X.globalAlpha = alpha * (1 - (i - 1) / 6) * .65; X.strokeStyle = col; X.lineWidth = 3;
        X.beginPath(); X.moveTo(start.x, start.y); X.lineTo(end.x, end.y); X.stroke();
      }
      X.globalAlpha = alpha * .15; X.fillStyle = col; X.beginPath(); X.arc(p.x, p.y, 6, 0, 7); X.fill();
      X.globalAlpha = alpha; X.fillStyle = mix(col, '#ffffff', .55); X.beginPath(); X.arc(p.x, p.y, 2.7, 0, 7); X.fill();
    } else {
      X.globalAlpha = (1 - u) * .45; X.strokeStyle = f.kind === 'puff' ? C.warn : C.faint; X.lineWidth = 1;
      X.beginPath(); X.arc(p.x, p.y, 4 + u * 8, 0, 7); X.stroke();
    }
  }
  for (let i = fx.length - 1; i >= 0; i--) {
    const e = fx[i], u = (animT - e.t) / 900;
    if (u >= 1) { fx.splice(i, 1); continue; }
    const n = F.nodes.get(e.n); if (!n) continue;
    X.globalAlpha = (1 - u) * .5; X.strokeStyle = e.c === 'ok' ? C.ok : C.err; X.lineWidth = 1.5;
    rr(n.x + .75, n.y - n.h / 2 + .75, n.w - 1.5, n.h - 1.5, 7); X.stroke();
  }
  X.globalAlpha = 1;
}

/* @section drawFlow */
function drawFlow(t) {
  sizeCv(cvF, W, FH);
  if (!G) layoutFlow();
  if (!motionLayer.canvas) motionLayer.canvas = document.createElement('canvas');
  const base = motionLayer.canvas, key = [W, FH, dpr, F.sig, dataVer, lastCompute, C.card, C.accent].join('|');
  const moving = nodeAnim || fadeFlag || [...flash.values()].some(f => animT - f.t < 700);
  if (key !== motionLayer.key || motionLayer.rel !== rel || moving || motionLayer.moving) {
    base.width = cvF.width; base.height = cvF.height; X = base.getContext('2d');
    X.setTransform(dpr, 0, 0, dpr, 0, 0); X.fillStyle = C.card; X.fillRect(0, 0, W, FH);
    if (!F.nodes.size) txt('No sessions in the last ' + Math.round(rootTtl() / 60000) + ' min', W / 2, FH / 2, `13px ${SANS}`, C.faint, W - 32, 'center');
    else {
      drawChrome(); drawLinks();
      for (const type of ['c', 's', 'x']) for (const n of F.lists[type]) drawNode(n);
      drawHub();
    }
    motionLayer.key = key; motionLayer.rel = rel; motionLayer.moving = moving; motionLayer.draws++;
    motionPaths.clear();
  }
  X = fctx; X.setTransform(dpr, 0, 0, dpr, 0, 0);
  X.drawImage(base, 0, 0, base.width, base.height, 0, 0, W, FH);
  if (F.nodes.size) { drawActiveNodes(); drawFlights(); }
}

/* @section loop */
function loop() {
  rafId = 0; tmId = 0;
  if (document.hidden || stopped) { lastDraw = 0; return; }
  if (paused) { lastDraw = 0; render(); return; }
  const t0 = performance.now();
  frameDelta = lastDraw ? clamp(t0 - lastDraw, 0, 64) : 1000 / 60;
  lastDraw = t0; animT += frameDelta * speedVal();
  try { render(); } catch (e) { console.error(e); }
  if (animating()) rafId = requestAnimationFrame(() => { rafCount++; loop(); });
  else { lastDraw = 0; tmId = setTimeout(loop, idleDelay()); }
}
