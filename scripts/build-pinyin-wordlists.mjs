import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sourcePath = 'vendor/hsk/pinyin-source.json';
const importPath = process.argv[2];
if (importPath) {
  const bytes = await readFile(importPath);
  if (createHash('sha256').update(bytes).digest('hex') !== 'c869a0ce353279c9333d9b42c31fc3549785e8b40673dab57ee42bc99cd14131') {
    throw new Error('HSK 源文件 SHA-256 不匹配');
  }
  const entries = JSON.parse(bytes);
  const source = { words: [], idioms: [] };
  for (const entry of entries) {
    const text = entry.simplified;
    let kind;
    if (/^[\u4e00-\u9fff]{2}$/.test(text) && entry.level.some((level) => /^new-[1-6]$/.test(level))) kind = 'words';
    if (/^[\u4e00-\u9fff]{4}$/.test(text) && entry.forms.some((form) => form.meanings.some((meaning) => meaning.includes('(idiom)')))) kind = 'idioms';
    const numeric = entry.forms[0]?.transcriptions.numeric;
    if (kind && numeric) source[kind].push([text, numeric]);
  }
  await writeFile(sourcePath, JSON.stringify(source) + '\n');
}

const source = JSON.parse(await readFile(sourcePath, 'utf8'));
const output = {};
for (const kind of ['words', 'idioms']) {
  const unique = new Map();
  for (const [text, numeric] of source[kind]) {
    const syllables = numeric.toLowerCase().trim().split(/\s+/);
    if (syllables.length !== text.length || !syllables.every((syllable) => /^[a-zü:]+[1-5]$/.test(syllable))) continue;
    const value = syllables.map((syllable) => syllable.replace(/u:|ü/g, 'v').replace(/[1-5]$/, '')).join('');
    if (!/^[a-z]+$/.test(value)) continue;
    // Sampling unique output strings prevents homophones from receiving extra probability.
    if (!unique.has(value)) unique.set(value, text);
  }
  output[kind] = [...unique].map(([value, text]) => [text, value]);
  if (output[kind].length < 250) throw new Error(`${kind} 词库过小`);
  console.log(`${kind}: ${output[kind].length} 个唯一拼音`);
}
await writeFile('src/pinyin-words.json', JSON.stringify(output) + '\n');
