import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sha256 } from '../scripts/build-info.mjs';
import { verifyRelease } from '../scripts/verify-release.mjs';

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'password-release-'));
  const source = { files: [{ path: 'src/main.jsx', sha256: sha256('source') }] };
  source.sha256 = sha256(JSON.stringify(source.files));
  const build = { version: '1.1.0', commit: 'a'.repeat(40), sourceSha256: source.sha256, dirty: false };
  const archive = Buffer.from('fixture archive bytes');
  const release = { format: 1, build, archive: { name: 'app.zip', sha256: sha256(archive), size: archive.length } };
  await writeFile(join(directory, 'app.zip'), archive);
  await writeFile(join(directory, 'release-manifest.json'), JSON.stringify(release));
  await writeFile(join(directory, 'build-info.json'), JSON.stringify(build));
  await writeFile(join(directory, 'source-manifest.json'), JSON.stringify(source));
  const names = ['app.zip', 'release-manifest.json', 'source-manifest.json', 'build-info.json'];
  const lines = await Promise.all(names.map(async (name) => `${sha256(await readFile(join(directory, name)))}  ${name}`));
  await writeFile(join(directory, 'SHA256SUMS'), lines.join('\n') + '\n');
  return { directory, build, localArchive: join(directory, 'app.zip') };
}

test('release verifier compares source, local build, and community archive bytes', async () => {
  const value = await fixture();
  try {
    await verifyRelease(value.directory, { ...value, runningArchive: value.localArchive });
    const different = join(value.directory, 'different.zip');
    await writeFile(different, 'different archive');
    await assert.rejects(verifyRelease(value.directory, { ...value, localArchive: different }), /Local build differs/);
    await assert.rejects(verifyRelease(value.directory, { ...value, runningArchive: different }), /Community package differs/);
  } finally { await rm(value.directory, { recursive: true, force: true }); }
});

test('release verifier rejects dirty source, different commit, and tampered download', async () => {
  const value = await fixture();
  try {
    await assert.rejects(verifyRelease(value.directory, { ...value, build: { ...value.build, dirty: true } }), /clean build/);
    await assert.rejects(verifyRelease(value.directory, { ...value, build: { ...value.build, commit: 'b'.repeat(40) } }), /commit or fingerprint/);
    await writeFile(join(value.directory, 'app.zip'), 'tampered');
    await assert.rejects(verifyRelease(value.directory, value), /checksum mismatch/);
  } finally { await rm(value.directory, { recursive: true, force: true }); }
});
