import { strict as assert } from 'node:assert';
import {
  classifyDeletions,
  buildDeletionItems,
  describeDeletionTitle,
  describeRefusals,
  displayPath,
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

// Found in F5: a long absolute path gets elided in the middle
// ("d:\\GitHub\\lim8603\\dot-tools...\\target"), which makes a workspace's target
// directory indistinguishable from a package's — the one distinction the prompt exists to
// draw. Everything deletable is inside the workspace by then, so relative is both shorter
// and more precise.
describe('displayPath', () => {
  it('drops the workspace prefix', () => {
    assert.equal(displayPath('C:/ws/app/build', 'C:/ws'), 'app/build');
  });

  it('handles backslashes and a trailing separator on the root', () => {
    assert.equal(displayPath('C:\\ws\\app\\build', 'C:\\ws\\'), 'app/build');
  });

  it('ignores case, since Windows paths do', () => {
    assert.equal(displayPath('C:/WS/app/build', 'C:/ws'), 'app/build');
  });

  it('leaves a path outside the workspace exactly as it is', () => {
    // The guards refuse these, so one should never reach the prompt — but if it did,
    // shortening it would hide the very thing that makes it alarming.
    assert.equal(displayPath('D:/elsewhere/build', 'C:/ws'), 'D:/elsewhere/build');
  });

  it('does not treat a sibling with a shared prefix as inside', () => {
    assert.equal(displayPath('C:/ws-backup/build', 'C:/ws'), 'C:/ws-backup/build');
  });
});

describe('describeDeletionTitle', () => {
  // The rows below it read "bin" and "obj" — whose they are has to come from somewhere.
  it('reads naturally for a single directory', () => {
    assert.match(describeDeletionTitle('app', 1), /this build directory for app/);
  });

  it('counts them when there is more than one', () => {
    assert.match(describeDeletionTitle('app', 2), /these 2 build directories for app/);
  });
});

describe('buildDeletionItems', () => {
  // The picker is the last chance to notice a directory that should not be on the list, so
  // every path gets its own row — a "2 directories" summary would defeat that.
  it('gives every path its own row, relative to the workspace', () => {
    const items = buildDeletionItems(dirs('C:/ws/app/bin', 'C:/ws/app/obj'), 'C:/ws');
    assert.deepEqual(items.map((i) => i.label), ['app/bin', 'app/obj']);
  });

  it('starts with every row checked, so Enter deletes the whole list', () => {
    const items = buildDeletionItems(dirs('C:/ws/app/bin', 'C:/ws/app/obj'), 'C:/ws');
    assert.ok(items.every((i) => i.picked));
  });

  // The label is shortened for reading; the deletion must still use the real path.
  it('keeps the absolute path alongside the shortened label', () => {
    const [item] = buildDeletionItems(dirs('C:/ws/app/build'), 'C:/ws');
    assert.equal(item.label, 'app/build');
    assert.equal(item.path, 'C:/ws/app/build');
  });

  // A path alone does not tell you that a sub-project's CMake tree belongs to its root and
  // takes its siblings with it. That is exactly the case someone needs to catch here — and
  // it has to be `detail`, which gets its own line. Found in F5: as `description` the
  // warning arrived cut off at "...and is shared wit\u2026", losing the operative half.
  it('carries what each directory is, on a line of its own', () => {
    const [item] = buildDeletionItems(
      [
        {
          path: 'C:/ws/nested/build',
          description: 'CMake build tree — belongs to the root project and is shared',
        },
      ],
      'C:/ws',
    );
    assert.equal(item.label, 'nested/build');
    assert.match(item.detail, /shared/);
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
