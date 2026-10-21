import { readFile, writeFile } from 'node:fs/promises';

// Keep the upstream Canvas renderer intact; customize its shell and data adapter.
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
    if (res.ok) return await res.json();
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
replace("  if (!small) txt('线宽 = 近 60 秒请求速率（指数衰减）· 环 = 区间流量占比 / 失败 · 点击客户端展开 / 收起会话', W - 16, ly, lf, C.faint, 0, 'right');", '');
replace("'近 ' + Math.round(rootTtl() / 60000) + ' 分钟没有会话 · 插件只能看到加载后经过 CPA 的请求'", "'No sessions in the last ' + Math.round(rootTtl() / 60000) + ' min'");
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
.chip { min-width:0; border:0; border-radius:0; border-left:2px solid var(--border-color); background:transparent; padding:4px 12px; }
.chip b { font-size:20px; }
.chip small { min-height:18px; overflow-wrap:anywhere; }
.ctl { gap:6px; }
.ctl .btn,.ctl .seg button { min-height:32px; padding:5px 9px; font-size:12px; }
.main { grid-template-columns:minmax(0,1fr) 280px; }
.mainp { border-left:0; border-right:0; border-radius:0; }
.feed { border:0; border-left:1px solid var(--border-color); border-radius:0; background:transparent; }
.feed h2 { gap:8px; flex-wrap:wrap; }
.connection-error { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:12px 0; padding:12px; border-left:2px solid var(--warning); color:var(--warning); background:var(--bg-tertiary); }
@media(max-width:1150px) { .main { grid-template-columns:minmax(0,1fr); } .feed { contain:none; min-height:0; border-left:0; border-top:1px solid var(--border-color); } #list { display:block; } #list li:nth-child(n+7) { display:none; } }
@media(max-width:600px) { .chips { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px 8px; } .chip:last-child { grid-column:1 / -1; } .top { gap:10px; } .ctl { width:100%; } .ctl .seg { margin-left:0; padding-left:0; border:0; } .phead { gap:8px; padding:9px 4px; } .row { padding:10px 4px; } }
</style>`);
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
console.log('Built web/token-monitor.html (English, same-origin data adapter, upstream Canvas renderer).');
