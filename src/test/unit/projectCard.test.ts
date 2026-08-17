import { strict as assert } from 'node:assert';
import { deriveToolchain, formatChipValue } from '../../ui/settingsPanel/projectCard';
import type { DiagnosticProbe } from '../../core/types';

const adapter = { id: 'cargo', displayName: 'Rust (Cargo)' };

function probe(over: Partial<DiagnosticProbe>): DiagnosticProbe {
  return { id: 'cargo', label: 'cargo', severity: 'critical', present: true, tier: 1, ...over };
}

describe('deriveToolchain', () => {
  it('reports unknown with the adapter name when there are no probes (stub adapter)', () => {
    assert.deepEqual(deriveToolchain(adapter, []), { status: 'unknown', label: 'Rust (Cargo)' });
  });

  it('is ok with the version detail when the critical toolchain is present', () => {
    const tc = deriveToolchain(adapter, [probe({ present: true, detail: '1.83.0' })]);
    assert.equal(tc.status, 'ok');
    assert.equal(tc.label, 'cargo 1.83.0');
  });

  it('does not double the tool name when the detail already begins with it', () => {
    // cargo's real Doctor detail is the full `cargo --version` output.
    const cargo = deriveToolchain(adapter, [probe({ present: true, detail: 'cargo 1.96.0 (30a34c682 2026-05-25)' })]);
    assert.equal(cargo.label, 'cargo 1.96.0 (30a34c682 2026-05-25)');
    // go's label is 'Go' but its detail starts with lowercase 'go version …'.
    const go = deriveToolchain(
      { id: 'go', displayName: 'Go' },
      [probe({ id: 'go', label: 'Go', detail: 'go version go1.26.6 windows/amd64' })],
    );
    assert.equal(go.label, 'go version go1.26.6 windows/amd64');
  });

  it('is an error when the critical toolchain is missing', () => {
    const tc = deriveToolchain(adapter, [probe({ present: false, detail: 'not found' })]);
    assert.equal(tc.status, 'error');
    assert.equal(tc.label, 'cargo not found');
  });

  it('picks the critical probe as primary even when optional probes come first', () => {
    const tc = deriveToolchain(adapter, [
      probe({ id: 'ext', label: 'CodeLLDB', severity: 'optional', present: false, tier: 1 }),
      probe({ id: 'cargo', label: 'cargo', severity: 'critical', present: true, detail: '1.83.0' }),
    ]);
    // The optional (missing) extension must not decide the card's toolchain glyph.
    assert.equal(tc.status, 'ok');
    assert.equal(tc.label, 'cargo 1.83.0');
  });

  it('falls back to the first probe when none is critical', () => {
    const tc = deriveToolchain(adapter, [
      probe({ id: 'rustup', label: 'rustup', severity: 'optional', present: true, detail: '1.27' }),
    ]);
    assert.equal(tc.status, 'ok');
    assert.equal(tc.label, 'rustup 1.27');
  });

  it('omits the trailing space when the primary probe has no detail', () => {
    const tc = deriveToolchain(adapter, [probe({ present: true })]);
    assert.equal(tc.label, 'cargo');
  });
});

describe('formatChipValue', () => {
  it("uses the adapter's own format when present", () => {
    assert.equal(formatChipValue({ format: () => 'x86_64' }, 'x86_64-unknown-linux-gnu'), 'x86_64');
  });

  it('falls back to defaultChipFormat when the chip declares no format', () => {
    assert.equal(formatChipValue({}, ['a', 'b', 'c']), '3 features');
    assert.equal(formatChipValue({}, 'dev'), 'dev');
  });

  it('degrades to the default formatter when a chip format throws', () => {
    const chip = { format: () => { throw new Error('bad value'); } };
    assert.equal(formatChipValue(chip, 'dev'), 'dev');
  });
});
