/*! EFF Long Wordlist, Electronic Frontier Foundation.
Source: https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt
CC BY 3.0 https://creativecommons.org/licenses/by/3.0/us/
Adaptation: dice indices and four hyphenated entries removed.
*/
import words from './words.json' with { type: 'json' };
import pinyin from './pinyin-words.json' with { type: 'json' };

/*!
Pinyin data: Complete HSK Vocabulary, Copyright (c) 2026 Yanis Zafirópulos.
Source: https://github.com/drkameleon/complete-hsk-vocabulary/tree/7ac65bf1a6387d35f1ade478906172a19311c7f9
Dictionary transcriptions: CC-CEDICT contributors, https://www.mdbg.net/chinese/dictionary?page=cc-cedict
Selected, normalized and deduplicated pinyin data: CC BY-SA 4.0,
https://creativecommons.org/licenses/by-sa/4.0/ . This license applies to the data.

MIT License (Complete HSK Vocabulary):
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export const GROUPS = Object.freeze({
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?',
});
export const WORDS = Object.freeze(words);
export const MEMORABLE_LISTS = Object.freeze({
  english: { label: '英文单词', entries: WORDS, defaultLength: 6 },
  pinyin: { label: '词汇拼音', entries: Object.freeze(pinyin.words), defaultLength: 7 },
  idiom: { label: '成语拼音', entries: Object.freeze(pinyin.idioms), defaultLength: 10 },
});

export function randomInt(limit, fill = (buffer) => globalThis.crypto.getRandomValues(buffer)) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 0x100000000) throw new RangeError('随机数范围无效');
  const ceiling = Math.floor(0x100000000 / limit) * limit;
  const buffer = new Uint32Array(1);
  do { fill(buffer); } while (buffer[0] >= ceiling);
  return buffer[0] % limit;
}

function checkLength(length, min, max) {
  if (!Number.isInteger(length) || length < min || length > max) throw new RangeError('密码长度超出范围');
}

export function characterGroups(options) {
  return Object.entries(GROUPS).filter(([name]) => options[name]).map(([, chars]) =>
    options.excludeSimilar ? chars.replace(/[O0Il1]/g, '') : chars);
}

// Inclusion–exclusion counts only strings containing every selected character group.
export function characterEntropy(groups, length) {
  const total = groups.join('').length;
  let count = 0n;
  for (let mask = 0; mask < 2 ** groups.length; mask++) {
    let excluded = 0;
    let parity = 0;
    groups.forEach((group, index) => {
      if (mask & (1 << index)) { excluded += group.length; parity++; }
    });
    count += (parity % 2 ? -1n : 1n) * BigInt(total - excluded) ** BigInt(length);
  }
  return Math.log2(Number(count));
}

export function generate(options, pick = randomInt) {
  if (options.mode === 'pin') {
    checkLength(options.length, 4, 20);
    return { value: Array.from({ length: options.length }, () => String(pick(10))).join(''), entropy: options.length * Math.log2(10) };
  }
  if (options.mode === 'memorable') {
    checkLength(options.length, 4, 10);
    if (!['-', ' ', '.', '_'].includes(options.separator)) throw new RangeError('分隔符无效');
    const key = options.wordlist ?? 'english';
    if (!Object.hasOwn(MEMORABLE_LISTS, key)) throw new RangeError('词库无效');
    const { entries } = MEMORABLE_LISTS[key];
    const selected = Array.from({ length: options.length }, () => entries[pick(entries.length)]);
    const chosen = selected.map((entry) => typeof entry === 'string' ? entry : entry[1]);
    if (options.capitalize) chosen[0] = chosen[0][0].toUpperCase() + chosen[0].slice(1);
    let suffix = '';
    let entropy = options.length * Math.log2(entries.length);
    if (options.digits) { suffix += pick(10); entropy += Math.log2(10); }
    if (options.symbols) { suffix += GROUPS.symbols[pick(GROUPS.symbols.length)]; entropy += Math.log2(GROUPS.symbols.length); }
    return { value: chosen.join(options.separator) + suffix, entropy,
      mnemonic: key === 'english' ? '' : selected.map(([text]) => text).join(' · '),
    };
  }
  if (options.mode !== 'random') throw new RangeError('密码类型无效');
  checkLength(options.length, 8, 64);
  const groups = characterGroups(options);
  if (!groups.length) throw new RangeError('请至少选择一种字符');
  const pool = groups.join('');
  let value;
  // Rejecting whole candidates keeps the distribution uniform over valid passwords.
  do {
    value = Array.from({ length: options.length }, () => pool[pick(pool.length)]).join('');
  } while (!groups.every((group) => [...value].some((char) => group.includes(char))));
  return { value, entropy: characterEntropy(groups, options.length) };
}

export function strength(entropy) {
  if (entropy < 40) return { level: 1, label: '较弱', hint: '建议增加长度或词组数量。' };
  if (entropy < 60) return { level: 2, label: '一般', hint: '增加长度可以进一步提高安全性。' };
  if (entropy < 80) return { level: 3, label: '强', hint: '为每个账号使用独立密码，并妥善保存。' };
  return { level: 4, label: '很强', hint: '为每个账号使用独立密码，并妥善保存。' };
}
