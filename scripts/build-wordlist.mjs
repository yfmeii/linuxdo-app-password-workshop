import { readFile, writeFile } from 'node:fs/promises';

const source = await readFile('vendor/eff_large_wordlist.txt', 'utf8');
const words = source.trim().split(/\r?\n/).map((line) => line.split(/\s+/)[1]).filter((word) => /^[a-z]+$/.test(word));
if (words.length !== 7772 || new Set(words).size !== words.length) throw new Error('EFF 词表数量或唯一性校验失败');
await writeFile('src/words.json', JSON.stringify(words) + '\n');
