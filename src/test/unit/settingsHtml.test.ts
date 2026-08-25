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

  it('renders the Project tab from projectCards (B-2 card view)', () => {
    const html = getSettingsHtml(webview, 'TESTNONCE');
    // The Project tab reads the enriched cards and renders toolchain glyphs — guard that
    // the card renderer (not the old flat row list) survives future edits.
    assert.match(html, /state\.projectCards/);
    assert.match(html, /function renderProjects/);
    assert.match(html, /class="card/);
  });

  it('explains an empty chip list instead of showing a bare 0 (B-5)', () => {
    const html = getSettingsHtml(webview, 'TESTNONCE');
    // A CMake project that has never been built lists no targets, because selecting a
    // project does not configure it (v1.2.1). The card must say so rather than render
    // a 0 that reads as broken.
    assert.match(html, /not listed yet/);
    assert.match(html, /Number\(ch\.count\) > 0/);
  });

  it('renders the per-member readiness editor (MS-018)', () => {
    const html = getSettingsHtml(webview, 'TESTNONCE');
    // The Run Groups tab lets each member pick a readiness gate and posts setMemberReadiness.
    assert.match(html, /function readinessEditor/);
    assert.match(html, /setMemberReadiness/);
    assert.match(html, /rd-kind/);
  });

  it('never sits blank: static placeholder + loading/error banners (TASK-058)', () => {
    const html = getSettingsHtml(webview, 'TESTNONCE');
    // Static placeholder shows until the first state message; a failed state build
    // surfaces as an in-page error banner instead of a silent blank page.
    assert.match(html, /Loading DevSwitcher settings…/);
    assert.match(html, /state\.error/);
    assert.match(html, /error-banner/);
  });

  it('renders nested sub-project cards and the show-libraries preference (ADR-019)', () => {
    const html = getSettingsHtml(webview, 'TESTNONCE');
    assert.match(html, /card-sub/);
    assert.match(html, /gen-showlibs/);
    assert.match(html, /setShowLibraries/);
  });

  it('renders the per-member launch mode selector (ADR-020)', () => {
    const html = getSettingsHtml(webview, 'TESTNONCE');
    assert.match(html, /member-launch/);
    assert.match(html, /setMemberLaunch/);
  });
});
