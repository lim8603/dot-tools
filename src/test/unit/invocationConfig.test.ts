import { strict as assert } from 'node:assert';
import { applyOption, setRunArgsLine } from '../../core/invocationConfig';
import type { OptionSpec } from '../../core/types';

function spec(partial: Partial<OptionSpec> & Pick<OptionSpec, 'id' | 'category'>): OptionSpec {
  return {
    label: partial.label ?? partial.id,
    description: '',
    example: '',
    type: 'string',
    injection: 'config',
    ...partial,
  };
}

const optLevel = spec({ id: 'opt-level', category: 'compiler', defaultValue: '0' });
const linker = spec({ id: 'linker', category: 'linker' });
const targetDir = spec({ id: 'target-dir', category: 'output' });
const rustLog = spec({ id: 'rust-log', category: 'env', label: 'RUST_LOG' });

describe('applyOption', () => {
  it('writes compiler/linker options into their records', () => {
    let config = applyOption({}, optLevel, '3');
    assert.deepEqual(config.compiler, { 'opt-level': '3' });
    config = applyOption(config, linker, 'lld');
    assert.deepEqual(config.linker, { linker: 'lld' });
  });

  it('maps output to outputDir and env to env[label]', () => {
    const config = applyOption(applyOption({}, targetDir, 'out/x'), rustLog, 'debug');
    assert.equal(config.outputDir, 'out/x');
    assert.deepEqual(config.env, { RUST_LOG: 'debug' });
  });

  it('removes an option (and prunes the record) when set to default or empty', () => {
    const config = applyOption({ compiler: { 'opt-level': '3' } }, optLevel, '0'); // '0' is the default
    assert.equal(config.compiler, undefined);
  });

  it('does not mutate the input config', () => {
    const original = { compiler: { lto: 'thin' } };
    const next = applyOption(original, optLevel, '3');
    assert.deepEqual(original, { compiler: { lto: 'thin' } });
    assert.deepEqual(next.compiler, { lto: 'thin', 'opt-level': '3' });
  });
});

describe('setRunArgsLine', () => {
  it('tokenizes a line into runArgs', () => {
    assert.deepEqual(setRunArgsLine({}, '--verbose "a b"').runArgs, ['--verbose', 'a b']);
  });

  it('clears runArgs on an empty line', () => {
    assert.equal(setRunArgsLine({ runArgs: ['x'] }, '   ').runArgs, undefined);
  });
});
