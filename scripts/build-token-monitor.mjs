import { readFile, writeFile } from 'node:fs/promises';

// Keep upstream data/layout behavior; layer Token Monitor motion and presentation on top.
let html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
function replace(old, value) {
  if (!html.includes(old)) throw new Error(`Upstream integration point changed: ${old.slice(0, 80)}`);
  html = html.replaceAll(old, value);
}
function section(start, end, value) {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error(`Upstream section changed: ${start}`);
  html = html.slice(0, a) + value + html.slice(b);
}
replace('<html lang="zh-CN">', '<html lang="en" data-theme="dark">');
replace('<h1>实时链路</h1>', '');
replace('      <button class="btn" id="bOut" hidden>退出</button>\n', '');
section('  <section class="panel gate"', '  <div class="main"', '  <div id="connectionError" class="connection-error" role="status" hidden>Live data unavailable. Retrying automatically. <button class="btn" id="retryConnection">Retry now</button></div>\n');
section('    <p>这里只读。', '    <div class="cfgg"', '');
section('/* ---------- status pill / gate ---------- */', 'function applyConfig(c)', `/* ---------- Token Monitor data adapter ---------- */
let netState = 'connecting';
const gated = false;
function setPill() {
  const p = $('#pill'), tx = $('#pillT'); p.className = 'pill';
  if (DEMO) { tx.textContent = paused ? 'Demo / paused' : 'Demo'; p.classList.add('idle'); return; }
  if (netState === 'retry') { tx.textContent = 'Reconnecting'; p.classList.add('warn'); return; }
  if (netState === 'connecting') { tx.textContent = 'Connecting'; p.classList.add('idle'); return; }
  tx.textContent = paused ? 'Connected / paused' : 'Connected / live';
}
const API = new URL('/api/live-routes/', location.origin);
let cursor = null, histNext = null, histGen = 0, backoff = 0, pollTm = 0, lastEv = 0, polling = false, fetchingOlder = false, stopped = false;
const pending = new Set();
async function call(path, params) {
  const u = new URL(path, API);
  for (const k in params || {}) u.searchParams.set(k, params[k]);
  const controller = new AbortController(); pending.add(controller);
  try {
    const res = await fetch(u, { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
    if (res.ok) { const data = await res.json(); updateUserLabels(data.userLabels); return data; }
    const err = new Error('Live data unavailable'); err.status = res.status; throw err;
  } finally { pending.delete(controller); }
}
addEventListener('pagehide', () => {
  stopped = true; clearTimeout(pollTm); clearTimeout(tmId); cancelAnimationFrame(rafId);
  for (const controller of pending) controller.abort();
});
$('#retryConnection').onclick = () => { clearTimeout(pollTm); cursor = null; pollNow(); };
`);
section('function handleErr(e) {', 'function nextDelay()', `function handleErr(e) {
  if (stopped) return;
  if (e.status === 400) cursor = null;
  netState = 'retry'; setPill(); $('#connectionError').hidden = false;
  backoff = Math.min(10000, backoff ? backoff * 2 : 1000);
  clearTimeout(pollTm); if (!document.hidden) pollTm = setTimeout(pollNow, backoff);
}
`);
replace('if (DEMO || document.hidden || gated || polling) return;', 'if (DEMO || document.hidden || stopped || polling) return;');
replace("  if (!managementKey) { showGate('key'); return; } polling = true;", '  polling = true;');
replace("backoff = 0; netState = 'ok'; setPill(); polling = false;", "backoff = 0; netState = 'ok'; setPill(); $('#connectionError').hidden = true; polling = false;");
replace('pollTm = setTimeout(pollNow, nextDelay());', 'if (!document.hidden && !stopped) pollTm = setTimeout(pollNow, nextDelay());');
replace('  if (document.hidden || paused) return;', '  if (document.hidden || stopped) return;\n  if (paused) { render(); return; }');
section('function login() {', '/* ---------- demo mode', '');
replace("  managementKey = loadKey(); if (managementKey) $('#bOut').hidden = false;\n", '');
// A natural-height document lets React own scrolling, with no nested scroll area.
section('function measureFill() {', '\nconst flights', 'function measureFill() { return 0; }\n');
const motion = await readFile(new URL('../web/token-monitor-motion.js', import.meta.url), 'utf8');
const motionSections = Object.fromEntries([...motion.matchAll(/\/\* @section (\w+) \*\/\n([\s\S]*?)(?=\/\* @section |$)/g)].map((m) => [m[1], m[2]]));
for (const [name, start, end] of [
  ['trackFlight', 'function trackFlight(', '/* ---------- flow model'],
  ['drawFlights', 'function drawFlights()', 'function drawFlow('],
  ['drawFlow', 'function drawFlow(', '/* flow interaction */'],
  ['loop', 'function loop()', 'function render()'],
]) {
  if (!motionSections[name]) throw new Error(`Missing motion section: ${name}`);
  section(start, end, motionSections[name] + '\n');
}
replace('const flights = new Map(), fx = [], flash = new Map();', motionSections.helpers + '\nconst flights = new Map(), fx = [], flash = new Map();');
const users = await readFile(new URL('../web/token-monitor-users.js', import.meta.url), 'utf8');
replace('  const fill = split ? 0 : fillH;', '  if (userLabels.size) G.gap = Math.max(G.gap, 24);\n  const fill = split ? 0 : fillH;');
section("    const nm = mini() ? cliShort(n.id) : cliName(n.id), dotW = 14, sc = n.sess.size;", "  } else if (n.type === 's') {", '    drawClient(n, x, y, w, h, small, bf, badge, bw, px, iw, f1, f2, three, l1, l2);\n');
replace("s += trow('harness',", "s += (clientUser(n.id) ? trow('User', clientUser(n.id).name) : '') + trow('harness',");
replace("const rm = reduced(), K = rm ? 1 : .22;", "const rm = reduced(), K = rm ? 1 : 1 - Math.exp(-frameDelta / 110);");
replace("!document.hidden && effLayout() === 'tabs' && view === 'flow'", "!document.hidden && flowVisible()");
replace("return flights.size > 0 || fx.length > 0 || nodeAnim || fadeFlag || (flowVisible() && inflight.size > 0 && effLayout() === 'tabs');", "return flowVisible() && (flights.size > 0 || fx.length > 0 || nodeAnim || fadeFlag || inflight.size > 0);");
replace('cancelAnimationFrame(rafId);\n  for', 'cancelAnimationFrame(rafId); rafId = 0; tmId = 0; lastDraw = 0;\n  for');
replace("$('#retryConnection').onclick", "addEventListener('pageshow', e => { if (e.persisted) { stopped = false; cursor = null; pollNow(); kick(); } });\n$('#retryConnection').onclick");
// Keep node shapes crisp and consistent with the dashboard controls.
section('function nodeBox(', 'function drawNode(', `function nodeBox(n) {
  const f = flash.get(n.key), fl = f ? clamp(1 - (animT - f.t) / 700, 0, 1) : 0;
  const active = n.inf > 0;
  X.fillStyle = active ? mix(C.card, C.info, .16) : mix(C.card, C.ter, .32);
  rr(n.x, n.y - n.h / 2, n.w, n.h, 7); X.fill();
  const inset = active ? 1 : .5;
  X.lineWidth = active ? 2 : 1;
  X.strokeStyle = fl > .05 ? mix(C.border, C.err, fl) : active ? C.info : C.border;
  rr(n.x + inset, n.y - n.h / 2 + inset, n.w - inset * 2, n.h - inset * 2, 7); X.stroke();
}
`);
replace('rr(x, y, w, h, 14)', 'rr(x, y, w, h, 8)');
replace('function drawNode(n) {', users + '\nfunction drawNode(n) {');
replace('rr(x + .75, y + .75, w - 1.5, h - 1.5, 14)', 'rr(x + .75, y + .75, w - 1.5, h - 1.5, 8)');
replace('X.lineWidth = 1.5; X.strokeStyle = C.accent;', 'X.lineWidth = 1; X.strokeStyle = mix(C.border, C.accent, .6);');
replace('get rafCount() { return rafCount; }', 'get rafCount() { return rafCount; }, get staticDraws() { return motionLayer.draws; }');
replace("  if (!small) txt('线宽 = 近 60 秒请求速率（指数衰减）· 环 = 区间流量占比 / 失败 · 点击客户端展开 / 收起会话', W - 16, ly, lf, C.faint, 0, 'right');", '');
replace("(viewEnd == null ? '近' + rangeLabel() : '窗口') + '请求'", "viewEnd == null ? 'Requests / ' + rangeLabel() : 'Requests / window'");
replace("'区间内无请求' + (last ? ' · 上次请求 ' + ag + '前' : '')", "'No requests in this window' + (last ? ' / last request ' + ag + ' ago' : '')");
const translations = {
  '入口（OAuth / API）、CPA 模型、harness / 客户端、会话流向': 'Flow between credentials, CPA models, clients and sessions',
  '输出 token ÷ 实际生成时长（各请求首字到结束的并集，不含空闲）': 'Output tokens per second of active generation',
  '按入口分道的请求时间线': 'Request timeline by credential',
  '当前生效的插件配置': 'Current configuration',
  '近 60 秒速率权重': 'Rate weight / 60 s',
  '追踪进行中请求': 'Track in-flight requests',
  '流向活跃窗口': 'Active window',
  'harness / 客户端': 'Clients',
  '区间内转发 ': 'Forwarded / ',
  '已折叠 · 悬停查看': 'Collapsed',
  '点击收起会话': 'Collapse sessions', '点击展开会话': 'Expand sessions',
  '没有更早的数据': 'No earlier records',
  '该时间范围内暂无请求': 'No requests in this time range',
  '排队中 / 未分配': 'Queued / unassigned',
  '默认动画速度': 'Animation speed', '最大记录数': 'Record limit',
  '默认布局': 'Layout', '减少动画': 'Reduced motion', '保留时长': 'Retention',
  '演示模式 · 已暂停': 'Demo / paused', '演示模式': 'Demo',
  '已连接 · 已暂停': 'Connected / paused', '已连接 · 实时': 'Connected / live',
  '子代理进行中': 'Subagents in flight', '折叠的子代理': 'Collapsed subagents',
  '会话 ID': 'Session ID', '父会话': 'Parent session', '会话数': 'Sessions',
  '动画速度': 'Animation speed', '时间范围': 'Time range',
  '平均延迟': 'Average latency', '首字延迟': 'Time to first token',
  '尝试次数': 'Attempts', '输入 / 输出': 'Input / output',
  '密钥 / IP': 'Key / IP', '合计 tokens': 'Total tokens',
  '最近请求': 'Recent requests', '模型图例': 'Model legend',
  '输出 tok/s': 'Output tok/s', '区间请求': 'Requests',
  '回到现在': 'Back to live', '条已加载': 'loaded',
  '成功率': 'Success rate', '进行中': 'In flight', '失败权重': 'Failure weight',
  '总耗时': 'Duration', '模型数': 'Models', '个模型': 'models',
  '近期 429': 'Recent 429', '未知客户端': 'Unknown client', '客户端#': 'Client #',
  '入口#': 'Credential #', '未分配': 'Unassigned', '未识别': 'Unknown',
  '规则#': 'Rule #', '排队中': 'Queued',
  '标签页': 'Tabs', '分栏': 'Split', '时间轴': 'Timeline',
  '10分钟': '10 min', '2分钟': '2 min', '30秒': '30 s',
  '跟随现在': 'Live', '回看 ': 'History / ', '上次 ': 'last ',
  '连接中': 'Connecting', '重连中': 'Reconnecting',
  '工作机': 'Workstation', '开发机': 'Development',
  '子代理': 'subagents', '会话': 'sessions', '客户端': 'Client',
  'CPA 模型': 'CPA models', '空闲': 'Idle', '凭证': 'Credential',
  '规则': 'Rule', '入口': 'Credentials', '其他': 'Other',
  '配置': 'Configuration', '布局': 'Layout', '视图': 'View', '流向': 'Flow',
  '继续': 'Resume', '暂停': 'Pause', '成功': 'Success', '失败': 'Failed',
  '路由中': 'Routing', '排队': 'Queued', '取消': 'Canceled',
  '拒绝': 'Rejected', '丢失': 'Lost', '状态': 'State', '开始': 'Started',
  '缓存': 'Cached', '推理': 'Reasoning', '错误': 'Error', '请求': 'Requests',
  ' 分钟': ' min', ' 分': ' min', ' 秒': ' s', ' 小时': ' h', ' 条': ' records',
  ' /分': ' /min', '父 ': 'Parent ', '含 ': 'Includes ', '现在': 'Now', '无': 'None',
};
for (const [from, to] of Object.entries(translations).sort((a, b) => b[0].length - a[0].length)) {
  html = html.replaceAll(from, to);
}
if (/\p{Script=Han}/u.test(html)) {
  throw new Error('Untranslated interface text: ' + html.match(/[^\n]*\p{Script=Han}[^\n]*/u)?.[0]);
}
replace('</style>', `
:root[data-theme="dark"] {
  --bg-secondary:#07100d;--bg-card:#101916;--bg-tertiary:#17231f;
  --text-primary:#f7faf8;--text-quaternary:#9db0a6;--text-faint:#8ca299;
  --border-color:#294139;--accent:#7dd3fc;--accent-contrast:#07100d;
  --success:#4ade80;--warning:#fbbf24;--error:#fb7185;--info:#7dd3fc;
}
* { letter-spacing:0 !important; }
.wrap { max-width:none; padding:0 0 8px; }
.top { padding:16px 0 4px; min-height:48px; }
.panel { border-radius:6px; box-shadow:none; }
.chips { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin:14px 0 18px; }
.chip { min-width:0; border:0; border-radius:0; border-left:1px solid var(--border-color); background:transparent; padding:4px 12px; }
.chip b { font-size:20px; }
.chip small { min-height:18px; overflow-wrap:anywhere; }
.ctl { gap:6px; }
.ctl .btn,.ctl .seg button { min-height:32px; padding:5px 9px; font-size:12px; }
.main { grid-template-columns:minmax(0,1fr) 280px; }
.mainp { border-left:0; border-right:0; border-radius:0; }
.feed { border:0; border-left:1px solid var(--border-color); border-radius:0; background:transparent; }
.feed h2 { gap:8px; flex-wrap:wrap; }
.connection-error { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:12px 0; padding:12px; border-left:1px solid var(--warning); color:var(--warning); background:var(--bg-tertiary); }
@media(max-width:1150px) { .main { grid-template-columns:minmax(0,1fr); } .feed { contain:none; min-height:0; border-left:0; border-top:1px solid var(--border-color); } #list { display:block; } #list li:nth-child(n+7) { display:none; } }
@media(max-width:600px) { .chips { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px 8px; } .chip:last-child { grid-column:1 / -1; } .top { gap:10px; } .ctl { width:100%; } .ctl .seg { margin-left:0; padding-left:0; border:0; } .phead { gap:8px; padding:9px 4px; } .row { padding:10px 4px; } }
</style>`);
const presentation = await readFile(new URL('../web/token-monitor.css', import.meta.url), 'utf8');
replace('</style>', presentation + '\n</style>');
// Lucide icons, ISC license; paths vendored from lucide-react used by Token Monitor.
const icon = name => `<svg class="control-icon" aria-hidden="true"><use href="#lr-${name}"/></svg>`;
replace('<body>', `<body><svg class="icon-defs" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>
<symbol id="lr-pause" viewBox="0 0 24 24"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></symbol>
<symbol id="lr-play" viewBox="0 0 24 24"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></symbol>
<symbol id="lr-settings" viewBox="0 0 24 24"><path d="M10 5H3M12 19H3M14 3v4M16 17v4M21 12h-9M21 19h-5M21 5h-7M8 10v4M8 12H3"/></symbol>
</defs></svg>`);
replace('id="bPause" aria-pressed="false">Pause', `id="bPause" aria-pressed="false" aria-label="Pause" title="Pause animation">${icon('pause')}`);
replace('id="bCfg" aria-pressed="false" aria-controls="cfgp">Configuration', `id="bCfg" aria-pressed="false" aria-controls="cfgp" aria-label="Configuration" title="Configuration">${icon('settings')}`);
replace("e.currentTarget.textContent = paused ? 'Resume' : 'Pause';", `e.currentTarget.innerHTML = paused ? '${icon('play')}' : '${icon('pause')}'; e.currentTarget.setAttribute('aria-label', paused ? 'Resume' : 'Pause'); e.currentTarget.title = paused ? 'Resume animation' : 'Pause animation';`);
replace("'Connected / paused' : 'Connected / live'", "'Paused' : 'Live traffic'");
replace("'Credentials · OAuth / API · '", "'Credentials · '");
replace("'CPA models'", "'Model routing'");
replace("  readColors(); W =", `  let heightFrame = 0;
  const reportHeight = () => {
    cancelAnimationFrame(heightFrame);
    heightFrame = requestAnimationFrame(() => {
      if (parent !== window) parent.postMessage({ type: 'live-routes:height', height: Math.ceil($('.wrap').getBoundingClientRect().height) }, location.origin);
    });
  };
  new ResizeObserver(reportHeight).observe($('.wrap'));
  reportHeight();
  readColors(); W =`);
html = html.replace('<!doctype html>', '<!doctype html>\n<!-- Adapted from Roomen/cpa-live-routes (MIT). See LICENSE.txt and SOURCE.md. -->');
await writeFile(new URL('../web/token-monitor.html', import.meta.url), html);
console.log('Built web/token-monitor.html (English, same-origin data adapter, smooth Canvas motion).');
