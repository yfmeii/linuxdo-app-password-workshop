import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, lstat } from 'node:fs/promises';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

export async function getSourceManifest() {
  const paths = [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean))].sort();
  const files = [];
  for (const path of paths) {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Unsupported source file: ${path}`);
    files.push({ path, sha256: sha256(await readFile(path)) });
  }
  if (!files.length) throw new Error('No source files found');
  return { sha256: sha256(JSON.stringify(files)), files };
}

export async function getBuildInfo() {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  if (pkg.version !== manifest.version) throw new Error('package.json and manifest.json versions must match');
  const repository = pkg.repository.url;
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid source repository URL');
  const releaseUrl = `${repository}/releases/tag/v${pkg.version}`;
  if (JSON.stringify(manifest.links) !== JSON.stringify([repository, releaseUrl])) throw new Error('Manifest links must match repository and version');
  let commit = null;
  try { commit = git('rev-parse', 'HEAD'); } catch {}
  return {
    version: pkg.version, repository, releaseUrl, commit,
    sourceSha256: (await getSourceManifest()).sha256,
    dirty: !commit || Boolean(git('status', '--porcelain', '--untracked-files=normal')),
  };
}
