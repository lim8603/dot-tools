import { strict as assert } from 'node:assert';
import { formatArgsLine, parseArgsLine } from '../../core/argsLine';

describe('parseArgsLine', () => {
  it('splits on whitespace', () => {
    assert.deepEqual(parseArgsLine('--flag value  x'), ['--flag', 'value', 'x']);
  });

  it('keeps quoted segments together', () => {
    assert.deepEqual(parseArgsLine('--path "a b" \'c d\''), ['--path', 'a b', 'c d']);
  });

  it('handles escaped quotes and empty input', () => {
    assert.deepEqual(parseArgsLine('"a\\"b"'), ['a"b']);
    assert.deepEqual(parseArgsLine('   '), []);
  });
});

describe('formatArgsLine', () => {
  it('quotes only what parseArgsLine would split or strip', () => {
    assert.equal(formatArgsLine(['--input', 'my file.txt', '-v']), '--input "my file.txt" -v');
    assert.equal(formatArgsLine(['C:\\tools\\x.exe']), 'C:\\tools\\x.exe');
  });

  it('round-trips through parseArgsLine', () => {
    const cases = [
      ['--input', 'my file.txt'],
      ['C:\\Program Files\\App\\', 'say "hi"', "it's", ''],
      ['a\\\\b c', 'tab\there', '\\"'],
    ];
    for (const args of cases) {
      assert.deepEqual(parseArgsLine(formatArgsLine(args)), args);
    }
  });
});
