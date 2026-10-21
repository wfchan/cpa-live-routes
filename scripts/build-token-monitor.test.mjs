import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import test from 'node:test';

const upstream = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
const generated = await readFile(new URL('../web/token-monitor.html', import.meta.url), 'utf8');
const script = generated.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test('the integrated page has valid JavaScript and a credential-free data adapter', () => {
  assert.ok(script);
  assert.doesNotThrow(() => new Script(script));
  assert.match(generated, /<html lang="en"/);
  assert.doesNotMatch(generated, /\p{Script=Han}/u);
  assert.match(script, /new URL\('\/api\/live-routes\/'/);
  assert.doesNotMatch(script, /managementKey|Authorization|sessionStorage|lr-key|indexedDB/);
  assert.match(script, /controller\.abort\(\)/);
  assert.match(script, /function updateUserLabels\(items\)/);
  assert.match(script, /function drawClient\(n,/);
  assert.match(script, /updateUserLabels\(data.userLabels\)/);
});

test('the data contract and flow layout retain the upstream algorithms', () => {
  const extract = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
  for (const [start, end] of [
    ['function buildPath(', '/* ---------- canvas setup'],
    ['function layoutFlow()', '/* requests travel right to left'],
    ['async function loadSnapshot()', 'async function applyEvents('],
  ]) {
    const original = extract(upstream, start, end);
    assert.ok(original.length > 200, start);
    assert.equal(extract(generated, start, end), original);
  }
});
