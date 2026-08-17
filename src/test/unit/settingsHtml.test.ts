import { strict as assert } from 'node:assert';
import { getSettingsHtml } from '../../ui/settingsPanel/html';

// Regression guard: the settings page is a webview whose behaviour lives in an inline
// <script>. That script is a plain string, so a JS syntax error in it (e.g. an
// unescaped apostrophe swallowed by the surrounding template literal) is invisible to
// tsc/eslint and blanks the whole page at runtime. Parsing the emitted script here
// catches it — this test would have failed on the pre-existing renderProfile bug.
describe('getSettingsHtml', () => {
  const webview = { cspSource: 'vscode-resource:' } as unknown as Parameters<typeof getSettingsHtml>[0];

  it('emits a webview script that parses without syntax errors', () => {
    const html = getSettingsHtml(webview, 'TESTNONCE');
    const match = html.match(/<script nonce="TESTNONCE">([\s\S]*?)<\/script>/);
    assert.ok(match, 'the page should contain a nonce-gated script block');
    // new Function parses (but does not run) the body — it throws on a syntax error.
    assert.doesNotThrow(() => new Function(match![1]));
  });
});
