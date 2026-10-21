import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('../web/token-monitor-users.js', import.meta.url), 'utf8');
test('ownership requires both the plugin fingerprint and mask and refreshes cached nodes', () => {
  const D = { clients: new Map([[1, { key: 1 }], [2, { key: 2 }], [3, { key: 1 }]]),
    keys: new Map([[1, { fp: 'aabbccdd', mask: 'sk-…1234' }], [2, { fp: 'aabbccdd', mask: 'sk-…9999' }]]) };
  const motionLayer = { key: 'cached' };
  const api = runInNewContext(source + '\n({updateUserLabels,clientUser})', { D, motionLayer });
  const label = { fp: 'aabbccdd', mask: 'sk-…1234', name: '<Alice>', color: '#22c55e' };
  api.updateUserLabels([label]);
  assert.equal(api.clientUser(1).name, '<Alice>');
  assert.equal(api.clientUser(3).name, '<Alice>');
  assert.equal(api.clientUser(2), undefined);
  assert.equal(api.clientUser(999), undefined);
  assert.equal(motionLayer.key, '');
  motionLayer.key = 'stable';
  api.updateUserLabels([label]);
  assert.equal(motionLayer.key, 'stable');
  api.updateUserLabels([{ ...label, name: 'Renamed' }]);
  assert.equal(api.clientUser(1).name, 'Renamed');
  assert.equal(motionLayer.key, '');
  api.updateUserLabels([]);
  assert.equal(api.clientUser(1), undefined);
});
