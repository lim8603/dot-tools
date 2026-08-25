import { strict as assert } from 'node:assert';
import {
  classifyDeletions,
  describeDeletionPrompt,
  describeRefusals,
} from '../../core/cleanPlan';

const GUARD = {
  workspaceRoot: 'C:/ws',
  sourceDir: 'C:/ws/app',
};

/** Candidates from bare paths — the description is not what these tests are about. */
function dirs(...paths: string[]): { path: string; description: string }[] {
  return paths.map((path) => ({ path, description: 'build tree' }));
}

/** Just the surviving paths, for assertions that do not care about descriptions. */
function deletablePaths(paths: string[]): string[] {
  return classifyDeletions(dirs(...paths), GUARD).deletable.map((d) => d.path);
}

function reasonFor(paths: string[], dir: string): string | undefined {
  return classifyDeletions(dirs(...paths), GUARD).refused.find((r) => r.dir === dir)?.reason;
}

describe('classifyDeletions', () => {
  it('allows a build directory inside the project', () => {
    const plan = classifyDeletions(dirs('C:/ws/app/build'), GUARD);
    assert.deepEqual(plan.deletable.map((d) => d.path), ['C:/ws/app/build']);
    assert.deepEqual(plan.refused, []);
  });

  it('allows a build directory elsewhere in the workspace', () => {
    // An out-of-source tree (`build-dir` overlay, a CMake preset binaryDir) is still fine
    // as long as it is inside the workspace.
    assert.deepEqual(deletablePaths(['C:/ws/out/app']), ['C:/ws/out/app']);
  });

  // ── The guards. Each of these is a directory someone could lose. ────────────

  it('refuses the project source directory', () => {
    // An in-source configuration (build-dir set to '.') would otherwise delete the code.
    assert.equal(reasonFor(['C:/ws/app'], 'C:/ws/app'), 'this is the project source directory');
  });

  it('refuses the workspace folder itself', () => {
    assert.equal(reasonFor(['C:/ws'], 'C:/ws'), 'this is the workspace folder itself');
  });

  it('refuses anything outside the workspace folder', () => {
    assert.equal(reasonFor(['C:/elsewhere/build'], 'C:/elsewhere/build'), 'outside the workspace folder');
    assert.equal(reasonFor(['C:/'], 'C:/'), 'outside the workspace folder');
  });

  it('refuses a sibling whose path merely starts with the workspace path', () => {
    // 'C:/ws-backup' starts with 'C:/ws' as a string but is not inside it.
    assert.equal(reasonFor(['C:/ws-backup/build'], 'C:/ws-backup/build'), 'outside the workspace folder');
  });

  it('refuses a relative path', () => {
    assert.equal(reasonFor(['build'], 'build'), 'not an absolute path');
    assert.equal(reasonFor(['./build'], './build'), 'not an absolute path');
  });

  it('applies the source-directory guard case-insensitively', () => {
    // Windows paths are case-insensitive; a differently-cased match must not slip past.
    assert.equal(
      reasonFor(['C:/WS/App'], 'C:/WS/App'),
      'this is the project source directory',
    );
  });

  it('treats a trailing separator as the same directory', () => {
    assert.equal(reasonFor(['C:/ws/app/'], 'C:/ws/app/'), 'this is the project source directory');
  });

  it('handles backslash paths, which is what Windows adapters produce', () => {
    assert.deepEqual(deletablePaths(['C:\\ws\\app\\build']), ['C:\\ws\\app\\build']);
  });

  it('recognises a POSIX workspace too', () => {
    const plan = classifyDeletions(dirs('/home/u/ws/app/build'), {
      workspaceRoot: '/home/u/ws',
      sourceDir: '/home/u/ws/app',
    });
    assert.deepEqual(plan.deletable.map((d) => d.path), ['/home/u/ws/app/build']);
  });

  // ── Bookkeeping ────────────────────────────────────────────────────────────

  it('keeps the given order and collapses duplicates', () => {
    assert.deepEqual(
      deletablePaths(['C:/ws/app/bin', 'C:/ws/app/obj', 'C:/ws/app/bin/', 'C:\\ws\\app\\BIN']),
      ['C:/ws/app/bin', 'C:/ws/app/obj'],
    );
  });

  it('skips blank entries without reporting them as refusals', () => {
    // An adapter returning '' means "nothing here", which is not worth warning about.
    const plan = classifyDeletions(dirs('', '   ', 'C:/ws/app/build'), GUARD);
    assert.deepEqual(plan.deletable.map((d) => d.path), ['C:/ws/app/build']);
    assert.deepEqual(plan.refused, []);
  });

  it('separates good from bad rather than failing the whole batch', () => {
    const plan = classifyDeletions(dirs('C:/ws/app/bin', 'C:/elsewhere', 'C:/ws/app/obj'), GUARD);
    assert.deepEqual(plan.deletable.map((d) => d.path), ['C:/ws/app/bin', 'C:/ws/app/obj']);
    assert.equal(plan.refused.length, 1);
  });
});

describe('describeDeletionPrompt', () => {
  // The prompt is the last chance to notice a directory that should not be on the list,
  // so every path is spelled out — no "3 directories" summary.
  it('lists every path in full', () => {
    const text = describeDeletionPrompt('app', dirs('C:/ws/app/bin', 'C:/ws/app/obj'));
    assert.ok(text.includes('C:/ws/app/bin'));
    assert.ok(text.includes('C:/ws/app/obj'));
    assert.ok(text.includes('2'));
  });

  it('reads naturally for a single directory', () => {
    const text = describeDeletionPrompt('app', dirs('C:/ws/app/build'));
    assert.match(text, /this build directory for app/);
  });

  // A path alone does not tell you that a sub-project's CMake tree belongs to its root and
  // takes its siblings with it. That is exactly the case someone needs to catch here.
  it('says what each directory is, next to its path', () => {
    const text = describeDeletionPrompt('mathlib', [
      {
        path: 'C:/ws/build',
        description: 'CMake build tree — belongs to the root project and is shared',
      },
    ]);
    assert.ok(text.includes('C:/ws/build'));
    assert.ok(text.includes('shared'));
  });
});

describe('describeRefusals', () => {
  it('is empty when nothing was refused', () => {
    assert.equal(describeRefusals([]), '');
  });

  it('names each path with its reason', () => {
    const text = describeRefusals([
      { dir: 'C:/elsewhere', reason: 'outside the workspace folder' },
      { dir: 'x', reason: 'not an absolute path' },
    ]);
    assert.equal(text, 'C:/elsewhere (outside the workspace folder); x (not an absolute path)');
  });
});
