import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('standalone build restricts active content and pins script/style bytes without changing the micro-app template', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'password-web-security-'));
  try {
    await mkdir(join(directory, 'src'));
    await mkdir(join(directory, 'dist'));
    const shell = await readFile('index.html', 'utf8');
    const template = await readFile('src/template.html', 'utf8');
    const script = 'document.body.dataset.loaded = "true";';
    const style = 'body { color: green; }';
    await writeFile(join(directory, 'index.html'), shell);
    await writeFile(join(directory, 'src/template.html'), template);
    await writeFile(join(directory, 'src/strings.json'), '{}');
    await writeFile(join(directory, 'dist/app.js'), script);
    await writeFile(join(directory, 'dist/app.css'), style);
    const result = spawnSync(process.execPath, [resolve('scripts/build-web.mjs')], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const html = await readFile(join(directory, 'dist/index.html'), 'utf8');
    const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
    assert.ok(policy);
    const directives = Object.fromEntries(policy.split(';').map((entry) => {
      const [name, ...values] = entry.trim().split(/\s+/);
      return [name, values];
    }));
    for (const name of ['default-src', 'connect-src', 'base-uri', 'form-action']) assert.deepEqual(directives[name], ["'none'"]);
    for (const name of ['script-src', 'style-src']) assert.deepEqual(directives[name], ["'self'"]);
    assert.deepEqual(directives['require-trusted-types-for'], ["'script'"]);
    assert.deepEqual(directives['trusted-types'], ["'none'"]);
    assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval|https?:|data:|\*/);
    assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('rel="stylesheet"'));
    assert.match(html, /<meta name="referrer" content="no-referrer">/);
    for (const [name, content] of [['app.js', script], ['app.css', style]]) {
      const integrity = `sha384-${createHash('sha384').update(content).digest('base64')}`;
      assert.ok(html.includes(`./${name}" integrity="${integrity}"`));
    }
    assert.equal((html.match(/<script\b/g) ?? []).length, 1);
    assert.match(html, /<script defer src="\.\/app.js" integrity="sha384-[^"]+"><\/script>/);
    assert.ok(html.includes(template));
    assert.doesNotMatch(shell, /Content-Security-Policy/);
    assert.doesNotMatch(template, /<meta|<script|<style/i);
    assert.equal(await readFile(join(directory, 'src/template.html'), 'utf8'), template);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
