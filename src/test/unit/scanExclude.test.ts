import { strict as assert } from 'node:assert';
import {
  mergeExcludePatterns,
  normalizeExcludeEntry,
  toExcludeGlob,
} from '../../core/scanExclude';

const BUILTIN = ['target', 'node_modules', '.git', '.vscode-test'];

describe('normalizeExcludeEntry', () => {
  it('turns a bare folder name into a match-anywhere glob', () => {
    assert.equal(normalizeExcludeEntry('vendor'), '**/vendor/**');
  });

  it('accepts the same folder written with slashes or a leading ./', () => {
    const expected = '**/third_party/grpc/**';
    assert.equal(normalizeExcludeEntry('third_party/grpc'), expected);
    assert.equal(normalizeExcludeEntry('/third_party/grpc/'), expected);
    assert.equal(normalizeExcludeEntry('./third_party/grpc'), expected);
    assert.equal(normalizeExcludeEntry('third_party\\grpc'), expected);
  });

  it('trims surrounding whitespace', () => {
    assert.equal(normalizeExcludeEntry('  vendor  '), '**/vendor/**');
  });

  it('passes an explicit glob through untouched', () => {
    assert.equal(normalizeExcludeEntry('**/examples/**'), '**/examples/**');
    assert.equal(normalizeExcludeEntry('libs/*/build'), 'libs/*/build');
  });

  it('drops entries that carry no meaning', () => {
    assert.equal(normalizeExcludeEntry(''), undefined);
    assert.equal(normalizeExcludeEntry('   '), undefined);
    assert.equal(normalizeExcludeEntry('/'), undefined);
    assert.equal(normalizeExcludeEntry('./'), undefined);
  });

  // Supporting `!` means order dependence, precedence and nested inheritance. It is
  // dropped outright rather than half-honoured, so nobody can write a rule that looks
  // like it re-includes something and quietly does not.
  it('drops a ! re-inclusion rather than honouring half of it', () => {
    assert.equal(normalizeExcludeEntry('!vendor/keep-me'), undefined);
  });
});

describe('mergeExcludePatterns', () => {
  // Exclusions are additive. If a workspace setting overrode the user's, opening a repo
  // that excludes `vendor` would silently drop a personal "never scan this" rule.
  it('unions the levels instead of letting the later one override', () => {
    assert.deepEqual(mergeExcludePatterns(['scratch'], ['vendor']), [
      '**/scratch/**',
      '**/vendor/**',
    ]);
  });

  it('de-duplicates across levels, including entries written differently', () => {
    assert.deepEqual(mergeExcludePatterns(['vendor'], ['vendor/', './vendor']), ['**/vendor/**']);
  });

  it('ignores absent levels', () => {
    assert.deepEqual(mergeExcludePatterns(undefined, ['vendor'], undefined), ['**/vendor/**']);
    assert.deepEqual(mergeExcludePatterns(), []);
  });

  // A hand-edited settings.json can hold anything; a malformed value must not take the
  // workspace scan down with it.
  it('survives a malformed setting', () => {
    assert.deepEqual(mergeExcludePatterns('vendor' as unknown as string[]), []);
    assert.deepEqual(mergeExcludePatterns([1, null, 'vendor'] as unknown as string[]), [
      '**/vendor/**',
    ]);
  });

  it('keeps the order the levels were given in', () => {
    assert.deepEqual(mergeExcludePatterns(['a'], ['b'], ['c']), [
      '**/a/**',
      '**/b/**',
      '**/c/**',
    ]);
  });
});

describe('toExcludeGlob', () => {
  // The unconfigured case is what every existing user is on. It must not change shape.
  it('returns the original built-in pattern when nothing is configured', () => {
    assert.equal(toExcludeGlob(BUILTIN, []), '**/{target,node_modules,.git,.vscode-test}/**');
  });

  // Top-level alternatives, not a brace nested inside another brace: only the flat form
  // was verified against a real VS Code host (session #018).
  it('expands the builtin into a flat top-level list once patterns are added', () => {
    assert.equal(
      toExcludeGlob(['target', '.git'], ['**/vendor/**']),
      '{**/target/**,**/.git/**,**/vendor/**}',
    );
  });

  it('never nests one brace expression inside another', () => {
    const glob = toExcludeGlob(BUILTIN, ['**/vendor/**']);
    assert.equal(glob.indexOf('{'), glob.lastIndexOf('{'), 'exactly one opening brace');
    assert.equal(glob.indexOf('}'), glob.lastIndexOf('}'), 'exactly one closing brace');
  });

  it('keeps every built-in directory when the user adds their own', () => {
    const glob = toExcludeGlob(BUILTIN, ['**/vendor/**']);
    for (const dir of BUILTIN) {
      assert.ok(glob.includes(`**/${dir}/**`), `${dir} still excluded`);
    }
  });
});
