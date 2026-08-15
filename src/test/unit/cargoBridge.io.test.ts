import { strict as assert } from 'node:assert';
import { dirname } from 'node:path';
import {
  CargoBridge,
  defaultExec,
  execCapture,
  type CargoExec,
  type ExecResult,
} from '../../adapters/cargo/cargoBridge';
import { DevSwitcherError } from '../../core/errors';

// ── Fake exec harness ────────────────────────────────────────────────────────
// A CargoExec that records calls and returns scripted results, so the I/O layer
// (caching, parsing wiring, error mapping) is tested without a real toolchain.

interface RecordedCall {
  command: string;
  args: string[];
  cwd?: string;
}

type Script = (command: string, args: string[]) => Partial<ExecResult> | Error;

function fakeExec(script: Script): { exec: CargoExec; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const exec: CargoExec = (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });
    const out = script(command, args);
    if (out instanceof Error) {
      return Promise.reject(out);
    }
    return Promise.resolve({ stdout: '', stderr: '', exitCode: 0, ...out });
  };
  return { exec, calls };
}

const MANIFEST = '/w/Cargo.toml';

const METADATA_JSON = JSON.stringify({
  workspace_root: '/w',
  workspace_members: ['app 0.1.0 (path+file:///w)'],
  packages: [
    {
      id: 'app 0.1.0 (path+file:///w)',
      name: 'app',
      manifest_path: MANIFEST,
      targets: [{ name: 'app', kind: ['bin'] }],
      features: { default: [], gui: [] },
    },
  ],
});

const metadataScript: Script = (command, args) =>
  command === 'cargo' && args[0] === 'metadata' ? { stdout: METADATA_JSON } : { exitCode: 127 };

function metadataCalls(calls: RecordedCall[]): RecordedCall[] {
  return calls.filter((c) => c.command === 'cargo' && c.args[0] === 'metadata');
}

// ── fetchMetadata (상세설계서 §8.1) ──────────────────────────────────────────

describe('CargoBridge.fetchMetadata', () => {
  it('runs cargo metadata with the manifest args and its directory as cwd', async () => {
    const { exec, calls } = fakeExec(metadataScript);
    await new CargoBridge(exec).fetchMetadata(MANIFEST);
    assert.deepEqual(calls[0].args, [
      'metadata',
      '--format-version=1',
      '--no-deps',
      '--manifest-path',
      MANIFEST,
    ]);
    assert.equal(calls[0].cwd, dirname(MANIFEST));
  });

  it('parses the JSON into metadata', async () => {
    const { exec } = fakeExec(metadataScript);
    const metadata = await new CargoBridge(exec).fetchMetadata(MANIFEST);
    assert.equal(metadata.packages[0].name, 'app');
    assert.deepEqual(metadata.workspace_members, ['app 0.1.0 (path+file:///w)']);
  });

  it('caches: a second fetch returns the same object without re-running cargo', async () => {
    const { exec, calls } = fakeExec(metadataScript);
    const bridge = new CargoBridge(exec);
    const first = await bridge.fetchMetadata(MANIFEST);
    const second = await bridge.fetchMetadata(MANIFEST);
    assert.equal(second, first); // same cached reference
    assert.equal(metadataCalls(calls).length, 1);
  });

  it('re-runs cargo after invalidateCache for that manifest', async () => {
    const { exec, calls } = fakeExec(metadataScript);
    const bridge = new CargoBridge(exec);
    await bridge.fetchMetadata(MANIFEST);
    bridge.invalidateCache(MANIFEST);
    await bridge.fetchMetadata(MANIFEST);
    assert.equal(metadataCalls(calls).length, 2);
  });

  it('peekMetadata returns the cached value synchronously, undefined before fetch', async () => {
    const { exec } = fakeExec(metadataScript);
    const bridge = new CargoBridge(exec);
    assert.equal(bridge.peekMetadata(MANIFEST), undefined);
    const fetched = await bridge.fetchMetadata(MANIFEST);
    assert.equal(bridge.peekMetadata(MANIFEST), fetched);
    bridge.invalidateCache(MANIFEST);
    assert.equal(bridge.peekMetadata(MANIFEST), undefined);
  });

  it('invalidateCache() with no argument clears every manifest', async () => {
    const { exec, calls } = fakeExec(metadataScript);
    const bridge = new CargoBridge(exec);
    await bridge.fetchMetadata(MANIFEST);
    bridge.invalidateCache();
    await bridge.fetchMetadata(MANIFEST);
    assert.equal(metadataCalls(calls).length, 2);
  });

  it('throws CARGO_METADATA_FAILED on a non-zero exit (E2)', async () => {
    const { exec } = fakeExec(() => ({ exitCode: 101, stderr: 'error: invalid Cargo.toml' }));
    await assert.rejects(
      () => new CargoBridge(exec).fetchMetadata(MANIFEST),
      (err: unknown) => err instanceof DevSwitcherError && err.code === 'CARGO_METADATA_FAILED',
    );
  });

  it('throws CARGO_METADATA_FAILED on unparseable output', async () => {
    const { exec } = fakeExec(() => ({ stdout: 'not json at all' }));
    await assert.rejects(
      () => new CargoBridge(exec).fetchMetadata(MANIFEST),
      (err: unknown) => err instanceof DevSwitcherError && err.code === 'CARGO_METADATA_FAILED',
    );
  });
});

// ── listInstalledTargets ─────────────────────────────────────────────────────

describe('CargoBridge.listInstalledTargets', () => {
  it('parses rustup output into trimmed, non-empty triples', async () => {
    const { exec, calls } = fakeExec(() => ({
      stdout: 'x86_64-pc-windows-msvc\r\naarch64-apple-darwin\n\n',
    }));
    const targets = await new CargoBridge(exec).listInstalledTargets();
    assert.deepEqual(targets, ['x86_64-pc-windows-msvc', 'aarch64-apple-darwin']);
    assert.deepEqual(calls[0], {
      command: 'rustup',
      args: ['target', 'list', '--installed'],
      cwd: undefined,
    });
  });

  it('returns an empty list when rustup exits non-zero', async () => {
    const { exec } = fakeExec(() => ({ exitCode: 1 }));
    assert.deepEqual(await new CargoBridge(exec).listInstalledTargets(), []);
  });
});

// ── checkToolchain (E1) ──────────────────────────────────────────────────────

describe('CargoBridge.checkToolchain', () => {
  it('reports both versions and ok when cargo and rustup are present', async () => {
    const { exec } = fakeExec((command) => ({
      stdout: command === 'cargo' ? 'cargo 1.96.0\n' : 'rustup 1.29.0\n',
    }));
    const status = await new CargoBridge(exec).checkToolchain();
    assert.deepEqual(status, { cargo: 'cargo 1.96.0', rustup: 'rustup 1.29.0', ok: true });
  });

  it('is not ok when cargo cannot be spawned, but still reports rustup', async () => {
    const enoent = Object.assign(new Error('spawn cargo ENOENT'), { code: 'ENOENT' });
    const { exec } = fakeExec((command) =>
      command === 'cargo' ? enoent : { stdout: 'rustup 1.29.0' },
    );
    const status = await new CargoBridge(exec).checkToolchain();
    assert.equal(status.ok, false);
    assert.equal(status.cargo, undefined);
    assert.equal(status.rustup, 'rustup 1.29.0');
  });
});

// ── defaultExec / execCapture (real process, no cargo needed) ─────────────────
// Uses the running node binary so the child_process wiring is exercised for real,
// cross-platform, without depending on an installed toolchain.

describe('defaultExec (real process)', () => {
  it('captures stdout and a zero exit code', async () => {
    const result = await defaultExec(process.execPath, ['--version'], {});
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout.trim(), /^v\d+\.\d+\.\d+/);
  });

  it('rejects with CARGO_EXEC_FAILED when the binary is missing', async () => {
    await assert.rejects(
      () => defaultExec('devswitcher-no-such-binary-xyz', [], {}),
      (err: unknown) => err instanceof DevSwitcherError && err.code === 'CARGO_EXEC_FAILED',
    );
  });

  it('execCapture surfaces a non-zero exit without throwing', async () => {
    const result = await execCapture(process.execPath, ['-e', 'process.exit(3)'], undefined);
    assert.equal(result.exitCode, 3);
  });
});
