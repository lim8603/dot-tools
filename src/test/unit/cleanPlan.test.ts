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

function reasonFor(dirs: string[], dir: string): string | undefined {
  return classifyDeletions(dirs, GUARD).refused.find((r) => r.dir === dir)?.reason;
}

describe('classifyDeletions', () => {
  it('allows a build directory inside the project', () => {
    const plan = classifyDeletions(['C:/ws/app/build'], GUARD);
    assert.deepEqual(plan.deletable, ['C:/ws/app/build']);
    assert.deepEqual(plan.refused, []);
  });

  it('allows a build directory elsewhere in the workspace', () => {
    // An out-of-source tree (`build-dir` overlay, a CMake preset binaryDir) is still fine
    // as long as it is inside the workspace.
    const plan = classifyDeletions(['C:/ws/out/app'], GUARD);
    assert.deepEqual(plan.deletable, ['C:/ws/out/app']);
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
    const plan = classifyDeletions(['C:\\ws\\app\\build'], GUARD);
    assert.deepEqual(plan.deletable, ['C:\\ws\\app\\build']);
  });

  it('recognises a POSIX workspace too', () => {
    const plan = classifyDeletions(['/home/u/ws/app/build'], {
      workspaceRoot: '/home/u/ws',
      sourceDir: '/home/u/ws/app',
    });
    assert.deepEqual(plan.deletable, ['/home/u/ws/app/build']);
  });

  // ── Bookkeeping ────────────────────────────────────────────────────────────

  it('keeps the given order and collapses duplicates', () => {
    const plan = classifyDeletions(
      ['C:/ws/app/bin', 'C:/ws/app/obj', 'C:/ws/app/bin/', 'C:\\ws\\app\\BIN'],
      GUARD,
    );
    assert.deepEqual(plan.deletable, ['C:/ws/app/bin', 'C:/ws/app/obj']);
  });

  it('skips blank entries without reporting them as refusals', () => {
    // An adapter returning '' means "nothing here", which is not worth warning about.
    const plan = classifyDeletions(['', '   ', 'C:/ws/app/build'], GUARD);
    assert.deepEqual(plan.deletable, ['C:/ws/app/build']);
    assert.deepEqual(plan.refused, []);
  });

  it('separates good from bad rather than failing the whole batch', () => {
    const plan = classifyDeletions(['C:/ws/app/bin', 'C:/elsewhere', 'C:/ws/app/obj'], GUARD);
    assert.deepEqual(plan.deletable, ['C:/ws/app/bin', 'C:/ws/app/obj']);
    assert.equal(plan.refused.length, 1);
  });
});

describe('describeDeletionPrompt', () => {
  // The prompt is the last chance to notice a directory that should not be on the list,
  // so every path is spelled out — no "3 directories" summary.
  it('lists every path in full', () => {
    const text = describeDeletionPrompt('app', ['C:/ws/app/bin', 'C:/ws/app/obj']);
    assert.ok(text.includes('C:/ws/app/bin'));
    assert.ok(text.includes('C:/ws/app/obj'));
    assert.ok(text.includes('2'));
  });

  it('reads naturally for a single directory', () => {
    const text = describeDeletionPrompt('app', ['C:/ws/app/build']);
    assert.match(text, /this build directory for app/);
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
