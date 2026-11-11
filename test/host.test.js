import test from 'node:test';
import assert from 'node:assert/strict';
import { copyPassword, connectHost, openProjectLink } from '../src/host.js';

test('standalone copying waits for confirmed browser clipboard success', async () => {
  let value;
  await copyPassword('test-password', null, { writeText: async (text) => { value = text; } });
  assert.equal(value, 'test-password');
  await assert.rejects(copyPassword('test-password', null, {}), { code: 'API_UNSUPPORTED' });
  await assert.rejects(copyPassword('test-password', null, { writeText: async () => { throw new Error('denied'); } }), /denied/);
});

test('host copying respects permission and never falls back around denial', async () => {
  let writes = 0;
  const sdk = { ready: Promise.resolve(), permissions: { has: () => false }, clipboard: { writeText: async () => { writes++; } } };
  const fallback = { writeText: async () => { writes++; } };
  await assert.rejects(copyPassword('example', sdk, fallback), { code: 'PERMISSION_DENIED' });
  assert.equal(writes, 0);
  sdk.permissions.has = (permission) => permission === 'clipboard.write';
  await copyPassword('example', sdk, fallback);
  assert.equal(writes, 1);
  sdk.clipboard.writeText = async () => { throw Object.assign(new Error('cancelled'), { code: 'USER_CANCELLED' }); };
  await assert.rejects(copyPassword('example', sdk, fallback), { code: 'USER_CANCELLED' });
  assert.equal(writes, 1);
});

test('host reports first render even if theme retrieval fails', async () => {
  let readyCount = 0;
  let cleaned = false;
  const notices = [];
  const sdk = {
    ready: Promise.resolve(), permissions: { has: () => true },
    theme: { onChange: () => () => { cleaned = true; }, get: async () => { throw new Error('theme unavailable'); } },
    lifecycle: { ready: async () => { readyCount++; } },
  };
  const dispose = await connectHost(sdk, () => {}, (text) => notices.push(text));
  assert.equal(readyCount, 1);
  assert.equal(notices.length, 1);
  dispose();
  assert.equal(cleaned, true);
});

test('host theme updates and standalone connection cleanup', async () => {
  let listener;
  let theme;
  const sdk = {
    ready: Promise.resolve(), permissions: { has: () => true },
    theme: { onChange: (callback) => { listener = callback; return () => {}; }, get: async () => ({ mode: 'dark' }) },
    lifecycle: { ready: async () => {} },
  };
  await connectHost(sdk, (value) => { theme = value; }, () => assert.fail('Unexpected host failure'));
  assert.equal(theme.mode, 'dark');
  listener({ mode: 'light' });
  assert.equal(theme.mode, 'light');
  assert.equal(typeof await connectHost(null, () => {}, () => {}), 'function');
});

test('project links use approved host API and preserve denied/cancelled errors', async () => {
  const calls = [];
  const sdk = { ready: Promise.resolve(), permissions: { has: () => false }, links: { open: async (url) => { calls.push(url); } } };
  const url = 'https://github.com/example/project';
  await assert.rejects(openProjectLink(url, sdk), { code: 'PERMISSION_DENIED' });
  assert.equal(calls.length, 0);
  sdk.permissions.has = (permission) => permission === 'links.open';
  await openProjectLink(url, sdk);
  assert.deepEqual(calls, [url]);
  sdk.links.open = async () => { throw Object.assign(new Error('cancelled'), { code: 'USER_CANCELLED' }); };
  await assert.rejects(openProjectLink(url, sdk), { code: 'USER_CANCELLED' });
});
