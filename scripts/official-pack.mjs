import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const packTool = {
  repository: 'https://github.com/linux-do/mapp-developer-guide',
  commit: 'acbe7817a006bd82c2fc084611d8f43de245808c',
  sha256: '3d163ba12e709f202a2472f5fd357494aea272f8fff2e94f4ef4ee5363f9bc51',
};
const directory = new URL('../.cache/mapp-sdk/', import.meta.url);
const path = new URL(`pack-${packTool.sha256}.mjs`, directory);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function getOfficialPack() {
  let bytes;
  try { bytes = await readFile(path); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const url = `https://raw.githubusercontent.com/linux-do/mapp-developer-guide/${packTool.commit}/sdk/pack.mjs`;
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Official pack download failed: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== packTool.sha256) throw new Error('Official pack SHA-256 mismatch');
    await mkdir(directory, { recursive: true });
    const temporary = new URL(`pack-${process.pid}.tmp`, directory);
    try { await writeFile(temporary, bytes); await rename(temporary, path); }
    finally { await rm(temporary, { force: true }); }
  }
  if (hash(bytes) !== packTool.sha256) throw new Error('Cached official pack SHA-256 mismatch');
  return (await import(path.href)).pack;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await getOfficialPack();
  console.log(`Official pack ready: ${packTool.commit} / ${packTool.sha256}`);
}
