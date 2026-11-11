import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, randomInt, characterGroups, characterEntropy, GROUPS, WORDS, MEMORABLE_LISTS, strength } from '../src/generator.js';

test('randomInt rejects the biased tail before mapping to the requested range', () => {
  const samples = [0xffffffff, 19];
  assert.equal(randomInt(10, (buffer) => { buffer[0] = samples.shift(); }), 9);
  assert.equal(samples.length, 0);
  assert.equal(randomInt(1, (buffer) => { buffer[0] = 0xffffffff; }), 0);
  for (const limit of [0, -1, 1.5, NaN, Infinity, 0x100000001]) assert.throws(() => randomInt(limit), RangeError);
});

test('secure random source failures propagate without an insecure fallback', () => {
  assert.throws(() => randomInt(10, () => { throw new Error('unavailable'); }), /unavailable/);
});

test('all 15 character combinations satisfy selected groups at both length bounds', () => {
  const names = Object.keys(GROUPS);
  for (let mask = 1; mask < 16; mask++) {
    for (const excludeSimilar of [true, false]) {
      for (const length of [8, 64]) {
        const options = { mode: 'random', length, excludeSimilar };
        names.forEach((name, i) => { options[name] = Boolean(mask & (1 << i)); });
        const groups = characterGroups(options);
        for (let round = 0; round < 12; round++) {
          const result = generate(options);
          assert.equal(result.value.length, length);
          for (const group of groups) assert.ok([...result.value].some((char) => group.includes(char)));
          assert.ok([...result.value].every((char) => groups.join('').includes(char)));
          if (excludeSimilar) assert.doesNotMatch(result.value, /[O0Il1]/);
          assert.ok(Number.isFinite(result.entropy) && result.entropy > 0);
        }
      }
    }
  }
});

test('whole-string rejection excludes candidates missing a selected group', () => {
  const picks = [...Array(8).fill(0), 0, 26, 0, 26, 0, 26, 0, 26];
  const result = generate({ mode: 'random', length: 8, upper: true, lower: true }, () => picks.shift());
  assert.equal(result.value, 'AaAaAaAa');
  assert.equal(picks.length, 0);
});

test('entropy counts valid strings, excluding combinations that miss required classes', () => {
  assert.equal(characterEntropy(['a', 'b'], 2), 1);
  assert.equal(characterEntropy(['ab', 'c'], 2), 2);
  assert.equal(characterEntropy(['0123456789'], 8), Math.log2(10 ** 8));
});

test('PIN preserves leading zeros and supports both length bounds', () => {
  assert.equal(generate({ mode: 'pin', length: 6 }, () => 0).value, '000000');
  for (const length of [4, 20]) {
    const result = generate({ mode: 'pin', length });
    assert.match(result.value, new RegExp(`^[0-9]{${length}}$`));
    assert.equal(result.entropy, length * Math.log2(10));
  }
  assert.equal(strength(generate({ mode: 'pin', length: 6 }).entropy).label, '较弱');
});

test('memorable phrases use unique EFF words without separator ambiguity and account for random suffixes', () => {
  assert.equal(WORDS.length, 7772);
  assert.equal(new Set(WORDS).size, WORDS.length);
  assert.ok(WORDS.every((word) => /^[a-z]+$/.test(word)));
  for (const separator of ['-', ' ', '.', '_']) {
    for (const length of [4, 6, 10]) {
      const options = { mode: 'memorable', length, separator, capitalize: true, digits: true, symbols: true };
      const result = generate(options, () => 0);
      assert.equal(result.value, ['Abacus', ...Array(length - 1).fill('abacus')].join(separator) + '0!');
      assert.equal(result.entropy, length * Math.log2(WORDS.length) + Math.log2(10) + Math.log2(GROUPS.symbols.length));
    }
  }
  const plain = generate({ mode: 'memorable', length: 6, separator: '-' }, () => WORDS.length - 1);
  assert.equal(plain.value, Array(6).fill(WORDS.at(-1)).join('-'));
  assert.equal(plain.entropy, 6 * Math.log2(WORDS.length));
});

test('invalid settings fail explicitly', () => {
  for (const mode of ['random', 'pin', 'memorable']) {
    for (const length of [0, 3, 65, NaN, 10.5]) assert.throws(() => generate({ mode, length }), RangeError);
  }
  assert.throws(() => generate({ mode: 'random', length: 20 }), /至少选择/);
  assert.throws(() => generate({ mode: 'memorable', length: 6, separator: '/' }), /分隔符/);
  for (const wordlist of ['unknown', '__proto__', 'toString']) {
    assert.throws(() => generate({ mode: 'memorable', length: 6, separator: '-', wordlist }), /词库/);
  }
  assert.throws(() => generate({ mode: 'other', length: 20 }), /类型/);
});

test('pinyin pools contain unique ASCII output tokens and accurate mnemonic lengths', () => {
  for (const [key, count, width] of [['pinyin', 3761, 2], ['idiom', 264, 4]]) {
    const { entries, defaultLength } = MEMORABLE_LISTS[key];
    assert.equal(entries.length, count);
    assert.equal(new Set(entries.map(([, value]) => value)).size, count);
    for (const [text, value] of entries) {
      assert.match(text, new RegExp(`^[\\u4e00-\\u9fff]{${width}}$`));
      assert.match(value, /^[a-z]+$/);
    }
    assert.ok(defaultLength * Math.log2(count) >= 80);
  }
  const entries = MEMORABLE_LISTS.pinyin.entries;
  assert.equal(entries.filter(([, value]) => value === 'quanli').length, 1);
  assert.ok(entries.some(([, value]) => value.includes('v')));
});

test('pinyin generation samples the final pool independently and copies only romanized tokens', () => {
  for (const key of ['pinyin', 'idiom']) {
    const { entries } = MEMORABLE_LISTS[key];
    for (const separator of ['-', ' ', '.', '_']) {
      for (const length of [4, 10]) {
        let draw = 0;
        const selected = Array.from({ length }, (_, index) => entries[index % 2 ? entries.length - 1 : 0]);
        const result = generate({ mode: 'memorable', wordlist: key, length, separator }, (limit) => {
          assert.equal(limit, entries.length);
          return draw++ % 2 ? limit - 1 : 0;
        });
        assert.equal(draw, length);
        assert.equal(result.value, selected.map(([, value]) => value).join(separator));
        assert.equal(result.mnemonic, selected.map(([text]) => text).join(' · '));
        assert.equal(result.entropy, length * Math.log2(entries.length));
        assert.doesNotMatch(result.value, /[^a-z ._-]/);
      }
    }
    const plain = generate({ mode: 'memorable', wordlist: key, length: 4, separator: '-' }, () => 0);
    const extra = generate({ mode: 'memorable', wordlist: key, length: 4, separator: '.', capitalize: true, digits: true, symbols: true }, () => 0);
    assert.equal(extra.entropy, plain.entropy + Math.log2(10) + Math.log2(GROUPS.symbols.length));
    assert.equal(extra.mnemonic, plain.mnemonic);
    assert.equal(extra.value, Array(4).fill(entries[0][1]).join('.').replace(/^./, (char) => char.toUpperCase()) + '0!');
  }
});
