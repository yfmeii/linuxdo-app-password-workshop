import { readFile, writeFile } from 'node:fs/promises';
import { getOfficialPack, packTool } from './official-pack.mjs';
import { getBuildInfo, getSourceManifest, sha256 } from './build-info.mjs';

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const build = JSON.parse(await readFile('dist/build-info.json', 'utf8'));
if (JSON.stringify(build) !== JSON.stringify(await getBuildInfo())) throw new Error('Source changed after build; rebuild before packaging');
const files = { 'index.html': await readFile('src/template.html') };
for (const name of ['app.js', 'app.css', 'strings.json']) files[name] = await readFile(`dist/${name}`);
const pack = await getOfficialPack();
const result = await pack({ manifest, files, outputDirectory: 'dist/package' });
const entries = { 'manifest.json': Buffer.from(JSON.stringify(manifest)), ...files };
const entryHashes = Object.fromEntries(Object.entries(entries).map(([name, bytes]) => [name, sha256(bytes)]));
const releaseManifest = {
  format: 1, build, packTool, node: process.version,
  archive: { name: 'app.zip', sha256: result.zipSha256, size: result.size },
  entries: entryHashes,
};
await writeFile('dist/package/release-manifest.json', JSON.stringify(releaseManifest, null, 2) + '\n');
await writeFile('dist/package/source-manifest.json', JSON.stringify(await getSourceManifest(), null, 2) + '\n');
await writeFile('dist/package/build-info.json', JSON.stringify(build, null, 2) + '\n');
const names = ['app.zip', 'release-manifest.json', 'source-manifest.json', 'build-info.json'];
const checksums = await Promise.all(names.map(async (name) => `${sha256(await readFile(`dist/package/${name}`))}  ${name}`));
await writeFile('dist/package/SHA256SUMS', checksums.join('\n') + '\n');
console.log(`已生成 ${result.file}（${result.size} 字节），SHA-256 ${result.zipSha256}`);
