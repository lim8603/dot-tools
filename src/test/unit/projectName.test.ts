import { strict as assert } from 'node:assert';
import { validateProjectName } from '../../core/projectName';

describe('validateProjectName', () => {
  it('accepts letters, digits, hyphen, and underscore', () => {
    assert.equal(validateProjectName('my-project'), undefined);
    assert.equal(validateProjectName('my_project'), undefined);
    assert.equal(validateProjectName('App42'), undefined);
    assert.equal(validateProjectName('  trimmed-ok  '), undefined); // trimmed before checks
  });

  it('rejects an empty or whitespace-only name', () => {
    assert.ok(validateProjectName(''));
    assert.ok(validateProjectName('   '));
  });

  it('rejects path separators', () => {
    assert.ok(validateProjectName('a/b'));
    assert.ok(validateProjectName('a\\b'));
  });

  it('rejects internal spaces and other punctuation', () => {
    assert.ok(validateProjectName('my project'));
    assert.ok(validateProjectName('my.project'));
    assert.ok(validateProjectName('proj!'));
  });
});
