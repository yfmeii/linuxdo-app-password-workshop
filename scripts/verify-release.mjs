import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBuildInfo, sha256 } from './build-info.mjs';

export async function verifyRelease(directory, options = {}) {
  const { build = await getBuildInfo(), localArchive = 'dist/package/app.zip', runningArchive } = options;
  const expected = ['app.zip', 'release-manifest.json', 'source-manifest.json', 'build-info.json'];
  const sums = (await readFile(join(directory, 'SHA256SUMS'), 'utf8')).trim().split('\n');
  if (sums.length !== expected.length) throw new Error('Unexpected checksum file count');
  for (const [index, name] of expected.entries()) {
    const hash = sha256(await readFile(join(directory, name)));
    if (sums[index] !== `${hash}  ${name}`) throw new Error(`Release checksum mismatch: ${name}`);
  }
  const release = JSON.parse(await readFile(join(directory, 'release-manifest.json'), 'utf8'));
  const publishedBuild = JSON.parse(await readFile(join(directory, 'build-info.json'), 'utf8'));
  const source = JSON.parse(await readFile(join(directory, 'source-manifest.json'), 'utf8'));
  if (release.format !== 1 || release.archive.name !== 'app.zip') throw new Error('Unsupported release manifest');
  if (build.dirty || publishedBuild.dirty || JSON.stringify(release.build) !== JSON.stringify(publishedBuild)) throw new Error('Release requires consistent clean build metadata');
  if (JSON.stringify(build) !== JSON.stringify(publishedBuild)) throw new Error('Source commit or fingerprint differs from release');
  if (sha256(JSON.stringify(source.files)) !== source.sha256 || source.sha256 !== build.sourceSha256) throw new Error('Source manifest mismatch');
  const archive = await readFile(join(directory, 'app.zip'));
  if (sha256(archive) !== release.archive.sha256 || archive.length !== release.archive.size) throw new Error('Archive hash or size mismatch');
  if (sha256(await readFile(localArchive)) !== release.archive.sha256) throw new Error('Local build differs from release archive');
  if (runningArchive && sha256(await readFile(runningArchive)) !== release.archive.sha256) throw new Error('Community package differs from release archive');
  return release;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: npm run verify:release -- RELEASE_DIRECTORY [COMMUNITY_PACKAGE.zip]');
  const release = await verifyRelease(resolve(process.argv[2]), { runningArchive: process.argv[3] });
  console.log(`Verified v${release.build.version}: ${release.archive.sha256}`);
}
