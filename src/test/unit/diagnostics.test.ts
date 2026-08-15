import { strict as assert } from 'node:assert';
import { buildDiagnostics, diagnosticIcon, worstStatus } from '../../core/diagnostics';
import type { DiagnosticProbe } from '../../core/types';

function probe(partial: Partial<DiagnosticProbe> & Pick<DiagnosticProbe, 'id' | 'severity' | 'present'>): DiagnosticProbe {
  return { label: partial.id, tier: 1, ...partial };
}

describe('buildDiagnostics — status derivation', () => {
  it('a present check is ok regardless of severity', () => {
    const [item] = buildDiagnostics([probe({ id: 'cargo', severity: 'critical', present: true, detail: '1.83.0' })]);
    assert.equal(item.status, 'ok');
    assert.equal(item.detail, '1.83.0');
  });

  it('a missing critical check is an error (E1)', () => {
    const [item] = buildDiagnostics([probe({ id: 'cargo', severity: 'critical', present: false })]);
    assert.equal(item.status, 'error');
  });

  it('a missing optional check is a warning', () => {
    const [item] = buildDiagnostics([probe({ id: 'rustup', severity: 'optional', present: false })]);
    assert.equal(item.status, 'warn');
  });

  it('an info check is always informational, present or not', () => {
    assert.equal(buildDiagnostics([probe({ id: 'docker', severity: 'info', present: false })])[0].status, 'info');
    assert.equal(buildDiagnostics([probe({ id: 'wsl', severity: 'info', present: true })])[0].status, 'info');
  });
});

describe('buildDiagnostics — resolution handling', () => {
  it('keeps the resolution when the check needs fixing', () => {
    const [item] = buildDiagnostics([
      probe({ id: 'lldb', severity: 'optional', present: false, resolution: { kind: 'installExtension', extensionId: 'x' } }),
    ]);
    assert.deepEqual(item.resolution, { kind: 'installExtension', extensionId: 'x' });
  });

  it('drops the resolution once the check is ok (nothing to fix)', () => {
    const [item] = buildDiagnostics([
      probe({ id: 'lldb', severity: 'optional', present: true, resolution: { kind: 'installExtension', extensionId: 'x' } }),
    ]);
    assert.equal(item.resolution, undefined);
  });
});

describe('buildDiagnostics — ordering', () => {
  it('surfaces problems first: error → warn → info → ok, stable within a group', () => {
    const items = buildDiagnostics([
      probe({ id: 'ok1', severity: 'optional', present: true }),
      probe({ id: 'info1', severity: 'info', present: false }),
      probe({ id: 'warn1', severity: 'optional', present: false }),
      probe({ id: 'err1', severity: 'critical', present: false }),
      probe({ id: 'warn2', severity: 'optional', present: false }),
    ]);
    assert.deepEqual(items.map((i) => i.id), ['err1', 'warn1', 'warn2', 'info1', 'ok1']);
  });
});

describe('worstStatus', () => {
  it('returns the most severe status present', () => {
    const items = buildDiagnostics([
      probe({ id: 'a', severity: 'optional', present: true }),
      probe({ id: 'b', severity: 'optional', present: false }),
    ]);
    assert.equal(worstStatus(items), 'warn');
  });

  it('is ok when every check passes, and error when any is critical-missing', () => {
    assert.equal(worstStatus(buildDiagnostics([probe({ id: 'a', severity: 'optional', present: true })])), 'ok');
    assert.equal(worstStatus(buildDiagnostics([probe({ id: 'a', severity: 'critical', present: false })])), 'error');
  });

  it('is ok for an empty list', () => {
    assert.equal(worstStatus([]), 'ok');
  });
});

describe('diagnosticIcon', () => {
  it('maps each status to its codicon', () => {
    assert.equal(diagnosticIcon('ok'), 'check');
    assert.equal(diagnosticIcon('warn'), 'warning');
    assert.equal(diagnosticIcon('error'), 'error');
    assert.equal(diagnosticIcon('info'), 'info');
  });
});
