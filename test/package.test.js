import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getOfficialPack } from '../scripts/official-pack.mjs';

test('micro-app template passes official pack markup and file validation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'password-package-test-'));
  try {
    const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
    manifest.id = '019a2a58-0000-7000-8000-000000000001';
    const template = await readFile('src/template.html');
    assert.doesNotMatch(template.toString(), /<script|<style|\s(?:style|on\w+)\s*=/i);
    assert.deepEqual(manifest.permissions, ['theme.read', 'clipboard.write', 'links.open']);
    const pkg = JSON.parse(await readFile('package.json', 'utf8'));
    assert.deepEqual(manifest.links, [pkg.repository.url, `${pkg.repository.url}/releases/tag/v${pkg.version}`]);
    const pack = await getOfficialPack();
    const result = await pack({ manifest, outputDirectory: directory, files: {
      'index.html': template, 'app.js': '(()=>{})();', 'app.css': ':root{}',
      'strings.json': await readFile('src/strings.json'),
    } });
    assert.ok(result.size > 0);
    assert.equal((await readFile(result.file)).subarray(0, 2).toString(), 'PK');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
