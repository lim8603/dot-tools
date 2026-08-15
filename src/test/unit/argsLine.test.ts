import { strict as assert } from 'node:assert';
import { parseArgsLine } from '../../core/argsLine';

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
