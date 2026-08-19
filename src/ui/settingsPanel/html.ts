import type * as vscode from 'vscode';

/**
 * The settings-page webview document (TASK-013). Self-contained: inline CSS/JS gated
 * by a CSP nonce, no external resources (coding_convention Webview rule / 상세설계서 §10.3).
 * The script renders purely from the `state` message and posts changes back — it keeps
 * no truth of its own. The Invocation tab's editor is filled in by TASK-014.
 */
export function getSettingsHtml(webview: vscode.Webview, nonce: string): string {
  const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'nonce-${nonce}'`,
    `script-src 'nonce-${nonce}'`,
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>DevSwitcher Settings</title>
<style nonce="${nonce}">
  :root { color-scheme: light dark; }
  body {
    margin: 0; padding: 0;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
  }
  .topbar {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 16px; border-bottom: 1px solid var(--vscode-panel-border);
  }
  .topbar label { opacity: .8; }
  select, button, input[type="text"], textarea {
    font-family: inherit; font-size: inherit;
    color: var(--vscode-input-foreground);
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 3px; padding: 3px 6px;
  }
  textarea { flex: 1; resize: vertical; font-family: var(--vscode-editor-font-family, monospace); }
  button {
    color: var(--vscode-button-foreground);
    background: var(--vscode-button-background);
    border: none; cursor: pointer; padding: 4px 10px;
  }
  button.secondary {
    color: var(--vscode-button-secondaryForeground);
    background: var(--vscode-button-secondaryBackground);
  }
  button:hover { background: var(--vscode-button-hoverBackground); }
  a { color: var(--vscode-textLink-foreground); text-decoration: none; }
  a:hover { color: var(--vscode-textLink-activeForeground); text-decoration: underline; }
  .layout { display: flex; min-height: calc(100vh - 46px); }
  .tabs { width: 160px; border-right: 1px solid var(--vscode-panel-border); padding: 8px 0; }
  .tab {
    padding: 7px 16px; cursor: pointer; border-left: 2px solid transparent;
  }
  .tab:hover { background: var(--vscode-list-hoverBackground); }
  .tab.active {
    border-left-color: var(--vscode-focusBorder);
    background: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
  }
  .detail { flex: 1; padding: 16px 20px; }
  .detail h2 { margin: 0 0 12px; font-size: 1.1em; font-weight: 600; }
  .muted { opacity: .7; }
  .row { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
  .row.item { padding: 6px 8px; border-radius: 3px; cursor: pointer; }
  .row.item:hover { background: var(--vscode-list-hoverBackground); }
  .row.item.active { background: var(--vscode-list-inactiveSelectionBackground); }
  .badge {
    font-size: .8em; opacity: .7; margin-left: 6px;
    border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 0 6px;
  }
  .empty { padding: 24px; opacity: .7; text-align: center; }
  code { font-family: var(--vscode-editor-font-family); }
  h3.cat { margin: 18px 0 6px; font-size: .95em; text-transform: capitalize; opacity: .85;
    border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 3px; }
  .opt { padding: 8px 0; }
  .opt-label { padding: 2px 0; }
  .opt .meta { margin-top: 3px; }
  .opt .row { padding: 2px 0; flex-wrap: wrap; }
  /* Editor sits under its label and grows to use the width (like RunArgs). */
  .opt input[type="text"], .opt input[type="number"], #runargs-input {
    flex: 1 1 100%; min-width: 320px; max-width: 820px;
  }
  .opt select { min-width: 160px; }
  .opt textarea { flex: 1 1 100%; min-width: 320px; max-width: 820px; min-height: 3.4em; }
  .preview { background: var(--vscode-textCodeBlock-background); padding: 10px 12px;
    border-radius: 4px; overflow-x: auto; white-space: pre-wrap; }
  h4.cat { margin: 16px 0 4px; font-size: .9em; opacity: .85; }
  .stage-lbl { margin-left: 4px; }
  .group-stage { width: 56px; }
  #new-group-name { min-width: 220px; }
  /* Run-group member cards: one card per member, sorted by Stage (MS-018 tidy-up). */
  .mcard { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 9px 12px; margin: 7px 0; }
  .mcard-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .mcard-head b { font-size: 1.0em; }
  .mcard-spacer { flex: 1 1 24px; }
  .mcard-remove { padding: 2px 10px; }
  .mcard-empty { padding: 6px 0; }
  .mcard-hint { margin-top: 12px; line-height: 1.5; }
  .add-member-row { margin-top: 12px; gap: 8px; }
  #add-member { min-width: 260px; }
  /* Per-member readiness gate (MS-018), shown inside the member card. */
  .readiness { gap: 6px; flex-wrap: wrap; padding: 8px 0 0; align-items: center;
    margin-top: 8px; border-top: 1px solid var(--vscode-panel-border); }
  .rd-lbl { min-width: 84px; }
  .rd-kind { min-width: 130px; }
  .rd-url { flex: 1 1 240px; min-width: 220px; max-width: 460px; }
  .rd-port, .rd-status, .rd-timeout { width: 76px; }
  .rd-to-lbl { margin-left: 4px; }
  /* Project cards (B-2): one detected project per card, click to switch. */
  .card { border: 1px solid var(--vscode-panel-border); border-radius: 6px;
    padding: 10px 12px; margin: 8px 0; cursor: pointer; }
  /* Nested sub-project cards (ADR-019) indent under their parent. */
  .card.card-sub { margin-left: 26px; }
  .error-banner { border: 1px solid var(--vscode-inputValidation-errorBorder, #f85149);
    background: var(--vscode-inputValidation-errorBackground, transparent);
    border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; }
  .card:hover { background: var(--vscode-list-hoverBackground); }
  .card.active { border-color: var(--vscode-focusBorder);
    background: var(--vscode-list-inactiveSelectionBackground); }
  .card-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .card-head b { font-size: 1.02em; }
  .card-manifest { margin: 4px 0 6px; }
  .card-line { padding: 1px 0; }
  .card-chips { display: flex; flex-wrap: wrap; gap: 3px 16px; margin-top: 6px; }
  .card-chip { font-size: .92em; }
  .tc { font-weight: 600; margin-right: 2px; }
  .tc.ok { color: var(--vscode-testing-iconPassed, #3fb950); }
  .tc.error { color: var(--vscode-testing-iconFailed, #f85149); }
  .tc.warn { color: var(--vscode-testing-iconQueued, #cca700); }
  .tc.unknown { opacity: .6; }
</style>
</head>
<body>
  <div class="topbar">
    <label for="project-select">Project</label>
    <select id="project-select"></select>
    <span class="muted" id="profile-label"></span>
  </div>
  <div class="layout">
    <div class="tabs" id="tabs"></div>
    <!-- Static placeholder until the first state message lands (TASK-058) -->
    <div class="detail" id="detail"><div class="empty">Loading DevSwitcher settings…</div></div>
  </div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  let state = null;
  let activeTab = 'project';
  let selectedGroupId = null;

  function post(msg) { vscode.postMessage(msg); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function asArray(v) { return Array.isArray(v) ? v : (v === undefined ? [] : [v]); }
  function chip(id) { return state.chips.find((c) => c.id === id); }

  function tabList() {
    const tabs = [{ id: 'project', label: 'Project' }];
    if (chip('features')) tabs.push({ id: 'features', label: 'Features' });
    if (chip('profile')) tabs.push({ id: 'profile', label: 'Profile' });
    if (state.configCategories.length) tabs.push({ id: 'invocation', label: 'Invocation' });
    // Run Groups is workspace-level (not per-project), so it always shows.
    tabs.push({ id: 'groups', label: 'Run Groups' });
    tabs.push({ id: 'general', label: 'General' });
    return tabs;
  }

  function render() {
    if (!state) return;

    // context bar
    const sel = document.getElementById('project-select');
    sel.innerHTML = state.projects
      .map((p) => '<option value="' + esc(p.id) + '"' +
        (p.id === state.activeProjectId ? ' selected' : '') + '>' +
        (p.sub ? '&nbsp;&nbsp;↳ ' : '') + esc(p.name) + '</option>')
      .join('');
    sel.disabled = state.projects.length === 0;
    document.getElementById('profile-label').textContent =
      state.displayName ? state.displayName + '  ·  profile: ' + state.profile : '';

    const tabs = tabList();
    if (!tabs.some((t) => t.id === activeTab)) activeTab = 'project';
    document.getElementById('tabs').innerHTML = tabs
      .map((t) => '<div class="tab' + (t.id === activeTab ? ' active' : '') +
        '" data-action="tab" data-tab="' + t.id + '">' + esc(t.label) + '</div>')
      .join('');

    document.getElementById('detail').innerHTML = renderDetail();
  }

  function renderDetail() {
    // A state-building failure surfaces in-page instead of a silent blank (TASK-058).
    const banner = state.error
      ? '<div class="error-banner">DevSwitcher settings failed to load: ' + esc(state.error) +
        ' — close and reopen Settings to retry.</div>'
      : (state.loading ? '<div class="muted">Loading project data…</div>' : '');
    // Run Groups and the Project list are workspace-level — they render even with no
    // active project (the Project cards let you pick one).
    if (activeTab === 'groups') return banner + renderGroups();
    if (activeTab === 'project') return banner + renderProjects();
    if (!state.activeProjectId) {
      return banner + '<div class="empty">No project selected. Pick one from the Project tab, ' +
        'or open a folder with a project manifest.</div>';
    }
    switch (activeTab) {
      case 'features': return banner + renderFeatures();
      case 'profile': return banner + renderProfile();
      case 'invocation': return banner + renderInvocation();
      default: return banner + renderGeneral();
    }
  }

  function tcClass(s) { return s === 'ok' ? 'ok' : s === 'error' ? 'error' : s === 'warn' ? 'warn' : 'unknown'; }
  function tcGlyph(s) { return s === 'ok' ? '✓' : s === 'error' ? '✗' : s === 'warn' ? '!' : '?'; }

  // Project tab (B-2): one card per detected project — adapter, manifest, toolchain
  // health, active profile, and a per-chip summary (value + available count). Clicking a
  // card switches to that project (same as the old rows). Rendered purely from
  // state.projectCards, which the extension builds from declarative adapter data.
  function renderProjects() {
    const cards = state.projectCards || [];
    if (!cards.length) {
      return '<h2>Detected projects</h2><div class="muted">None detected. ' +
        'Open a folder with a project manifest (Cargo.toml, package.json, …).</div>';
    }
    const html = cards.map((c) => {
      const tc = c.toolchain || { status: 'unknown', label: '' };
      const chipRows = (c.chips || []).map((ch) =>
        '<span class="card-chip"><span class="muted">' + esc(ch.label) + ':</span> ' +
        (ch.value ? esc(ch.value) : '<span class="muted">—</span>') +
        ' <span class="badge" title="options available">' + esc(ch.count) + '</span></span>').join('');
      return '<div class="card' + (c.active ? ' active' : '') + (c.sub ? ' card-sub' : '') +
        '" data-action="switch-project" data-project-id="' + esc(c.id) + '">' +
        '<div class="card-head"><b>' + (c.sub ? '<span class="muted">↳</span> ' : '') + esc(c.name) + '</b>' +
        '<span class="badge">' + esc(c.displayName) + '</span>' +
        (c.library ? '<span class="badge">library</span>' : '') +
        (c.active ? '<span class="badge">active</span>' : '') + '</div>' +
        '<div class="muted card-manifest"><code>' + esc(c.manifestPath) + '</code></div>' +
        '<div class="card-line"><span class="tc ' + tcClass(tc.status) + '">' + tcGlyph(tc.status) +
        '</span> <span class="muted">toolchain</span> ' + esc(tc.label) + '</div>' +
        (c.profile ? '<div class="card-line"><span class="muted">profile</span> ' + esc(c.profile) + '</div>' : '') +
        (chipRows ? '<div class="card-chips">' + chipRows + '</div>' : '') +
        '</div>';
    }).join('');
    return '<h2>Detected projects</h2>' + html;
  }

  function renderFeatures() {
    const c = chip('features');
    if (!c || !c.items.length) return '<h2>Features</h2><div class="muted">No features declared.</div>';
    const current = new Set(asArray(c.value));
    const rows = c.items.map((it) =>
      '<label class="row"><input type="checkbox" class="feature-cb" value="' + esc(it.id) + '"' +
      (current.has(it.id) ? ' checked' : '') + ' /> ' + esc(it.label) +
      (it.description ? ' <span class="muted">(' + esc(it.description) + ')</span>' : '') + '</label>').join('');
    return '<h2>Features</h2>' + rows;
  }

  function renderProfile() {
    const c = chip('profile');
    if (!c) return '';
    const rows = c.items.map((it) =>
      '<div class="row item' + (it.id === state.profile ? ' active' : '') + '">' + esc(it.label) +
      (it.description ? '<span class="badge">' + esc(it.description) + '</span>' : '') +
      (it.id === state.profile ? '<span class="badge">active</span>' : '') + '</div>').join('');
    return '<h2>Profiles <span class="muted">(read-only)</span></h2>' + rows +
      '<p class="muted">Profiles come from the project build files. DevSwitcher switches ' +
      'between them but never edits them.</p>';
  }

  function currentOptionValue(o) {
    const inv = state.invocation || {};
    if (o.category === 'compiler') return (inv.compiler || {})[o.id];
    if (o.category === 'linker') return (inv.linker || {})[o.id];
    if (o.category === 'output') return inv.outputDir;
    if (o.category === 'env') return (inv.env || {})[o.label];
    return undefined;
  }

  function renderOption(o) {
    const val = currentOptionValue(o);
    // aria-label mirrors the visible <b>label</b> so every generated control has an
    // accessible name (axe "Form elements must have labels"); the label sits in a sibling
    // div, not a <label for>, so the control itself carries the name.
    const attrs = 'data-action="set-option" data-option-id="' + esc(o.id) +
      '" data-type="' + esc(o.type) + '" aria-label="' + esc(o.label) + '"';
    let editor;
    if (o.type === 'enum') {
      // Show the effective value (stored, else the option's default) so picking the
      // default value doesn't visibly "jump" to a separate (default) entry.
      const effective = val !== undefined ? String(val)
        : (o.defaultValue !== undefined ? String(o.defaultValue) : '');
      editor = '<select ' + attrs + '>' +
        (o.allowedValues || []).map((v) =>
          '<option value="' + esc(v) + '"' + (effective === v ? ' selected' : '') + '>' + esc(v) + '</option>').join('') +
        '</select>';
    } else if (o.type === 'bool') {
      editor = '<input type="checkbox" ' + attrs + (val === true ? ' checked' : '') + ' />';
    } else if (o.type === 'int') {
      editor = '<input type="number" ' + attrs + ' value="' + esc(val === undefined ? '' : val) + '" />';
    } else if (o.type === 'stringList') {
      // Free-form list (L-1): one entry per line, committed on blur like the build-event editors.
      const list = Array.isArray(val) ? val : [];
      editor = '<textarea ' + attrs + ' rows="3">' + esc(list.join('\\n')) + '</textarea>';
    } else {
      editor = '<input type="text" ' + attrs + ' value="' + esc(val === undefined ? '' : val) + '" />';
    }
    // Two muted lines: the description, then a meta line (example value · how it is
    // injected · docs). Fields stay empty — examples never sit in the input as a
    // placeholder that reads like entered text.
    const meta = [];
    if (o.example) meta.push('e.g. <code>' + esc(o.example) + '</code>');
    if (o.injectsAs) meta.push('injects <code>' + esc(o.injectsAs) + '</code>');
    if (o.docUrl) meta.push('<a href="' + esc(o.docUrl) + '">docs ↗</a>');
    return '<div class="opt">' +
      '<div class="opt-label"><b>' + esc(o.label) + '</b></div>' +
      '<div class="row">' + editor + '</div>' +
      '<div class="muted">' + esc(o.description) + '</div>' +
      (meta.length ? '<div class="muted meta">' + meta.join(' &nbsp;·&nbsp; ') + '</div>' : '') +
      '</div>';
  }

  function renderInvocation() {
    const byCat = {};
    state.optionCatalog.forEach((o) => { (byCat[o.category] = byCat[o.category] || []).push(o); });

    let html = '<h2>Invocation config <span class="muted">· profile: ' + esc(state.profile) + '</span></h2>';
    state.configCategories.forEach((cat) => {
      html += '<h3 class="cat">' + esc(cat) + '</h3>';
      if (cat === 'runArgs') {
        const args = state.invocation.runArgs || [];
        html += '<div class="row"><input type="text" id="runargs-input" aria-label="Run arguments" value="' + esc(args.join(' ')) + '" /></div>' +
          '<div class="muted">Arguments passed to your program, after <code>cargo run --</code> ' +
          '(shell-quoted). &nbsp;e.g. <code>--verbose --input data.txt</code></div>' +
          '<div class="muted meta">argv: [' + args.map((t) => '<code>' + esc(t) + '</code>').join(', ') + ']</div>';
      } else if (cat === 'buildEvent') {
        const pre = (state.invocation.preBuild || []).join('\\n');
        const post = (state.invocation.postBuild || []).join('\\n');
        html += '<div class="opt-label"><b>Pre-build</b> <span class="muted">one command per line · runs before build/run</span></div>' +
          '<div class="row"><textarea id="prebuild-input" aria-label="Pre-build commands" rows="2">' + esc(pre) + '</textarea></div>' +
          '<div class="opt-label"><b>Post-build</b> <span class="muted">runs after a successful build/run</span></div>' +
          '<div class="row"><textarea id="postbuild-input" aria-label="Post-build commands" rows="2">' + esc(post) + '</textarea></div>' +
          '<div class="muted">Runs as your shell in the project directory (NFR-002a). ' +
          'e.g. <code>cargo fmt</code> · <code>npm run codegen</code> · <code>cp target/release/app dist/</code></div>';
      } else {
        const opts = byCat[cat] || [];
        html += opts.length ? opts.map(renderOption).join('') : '<div class="muted">No options.</div>';
      }
    });
    html += '<h3 class="cat">Command preview</h3><pre class="preview"><code>' +
      esc(state.commandPreview || '(unavailable)') + '</code></pre>';
    return html;
  }

  function renderGroups() {
    const groups = state.groups || [];
    // Keep a valid selection (falls back to the first group).
    if (!groups.some((g) => g.id === selectedGroupId)) {
      selectedGroupId = groups.length ? groups[0].id : null;
    }
    let html = '<h2>Run groups</h2>' +
      '<p class="muted">Start several projects together in dependency order (e.g. auth → api → web). ' +
      'Members start in layers: a member starts once the members it depends on have started ' +
      '(readiness = the process launched).</p>';
    html += '<div class="row">' +
      '<input type="text" id="new-group-name" aria-label="New group name" placeholder="New group name" />' +
      '<button data-action="create-group">Add group</button></div>';
    if (!groups.length) {
      return html + '<div class="muted">No run groups yet.</div>';
    }
    html += groups.map((g) =>
      '<div class="row item' + (g.id === selectedGroupId ? ' active' : '') +
      '" data-action="select-group" data-group-id="' + esc(g.id) + '">' + esc(g.name) +
      '<span class="badge">' + g.members.length + ' member(s)</span>' +
      (g.running ? '<span class="badge">running</span>' : '') +
      (g.problems.length ? '<span class="badge">⚠ ' + g.problems.length + '</span>' : '') +
      '</div>').join('');
    const selected = groups.find((g) => g.id === selectedGroupId);
    return html + (selected ? renderGroupEditor(selected) : '');
  }

  // Per-member readiness gate editor (MS-018): pick process-start / port / HTTP, then fill
  // the port or URL (+ optional status) and a timeout. Changes assemble a ReadinessProbe and
  // post setMemberReadiness; the whole page re-renders from the stored group.
  function readinessEditor(gid, pid, rd) {
    const kind = rd ? rd.kind : 'process';
    const timeoutS = rd ? Math.round(rd.timeoutMs / 1000) : 30;
    let fields = '';
    if (kind === 'port') {
      fields = '<input type="number" class="rd-port" aria-label="Readiness port" placeholder="port" min="1" max="65535" value="' +
        esc(rd.port) + '" />';
    } else if (kind === 'http') {
      fields = '<input type="text" class="rd-url" aria-label="Readiness URL" placeholder="http://localhost:3000/health" value="' +
        esc(rd.url) + '" />' +
        '<input type="number" class="rd-status" aria-label="Expected HTTP status" placeholder="200" value="' +
        esc(rd.expectStatus === undefined ? '' : rd.expectStatus) + '" />';
    }
    const timeoutCtl = kind === 'process' ? '' :
      '<span class="muted rd-to-lbl">timeout(s)</span>' +
      '<input type="number" class="rd-timeout" aria-label="Readiness timeout (seconds)" min="1" value="' + esc(timeoutS) + '" />';
    return '<div class="row readiness" data-group-id="' + esc(gid) + '" data-project-id="' + esc(pid) + '">' +
      '<span class="muted rd-lbl">Ready when</span>' +
      '<select class="rd-kind" aria-label="Readiness type">' +
      '<option value="process"' + (kind === 'process' ? ' selected' : '') + '>process start</option>' +
      '<option value="port"' + (kind === 'port' ? ' selected' : '') + '>port open</option>' +
      '<option value="http"' + (kind === 'http' ? ' selected' : '') + '>HTTP status</option>' +
      '</select>' + fields + timeoutCtl + '</div>';
  }

  // Assemble a ReadinessProbe from a member's readiness controls (or undefined for process
  // start). Left-as-typed values (a blank port / URL) round-trip and surface as a validation
  // warning, so the user sees what to fix rather than a silently dropped gate.
  function readReadiness(box) {
    const kind = box.querySelector('.rd-kind').value;
    if (kind === 'process') return undefined;
    const toEl = box.querySelector('.rd-timeout');
    const secs = Number(toEl && toEl.value);
    const timeoutMs = secs > 0 ? Math.round(secs * 1000) : 30000;
    if (kind === 'port') {
      const portEl = box.querySelector('.rd-port');
      return { kind: 'port', port: Number(portEl && portEl.value) || 0, timeoutMs: timeoutMs };
    }
    const urlEl = box.querySelector('.rd-url');
    const statusEl = box.querySelector('.rd-status');
    const readiness = { kind: 'http', url: (urlEl && urlEl.value) || '', timeoutMs: timeoutMs };
    const status = statusEl && statusEl.value;
    if (status) readiness.expectStatus = Number(status);
    return readiness;
  }

  // Look up a member's display name + adapter (falls back to the id for a stale member).
  function projectMeta(pid) {
    return (state.projects || []).find((p) => p.id === pid) || { id: pid, name: pid, adapterId: '?' };
  }

  // One member as a card: name + adapter, its launch mode (Run/Debug, ADR-020), its Stage,
  // a Remove button, and the readiness gate.
  function memberCard(g, m) {
    const p = projectMeta(m.projectId);
    return '<div class="mcard">' +
      '<div class="mcard-head">' +
      '<b>' + esc(p.name) + '</b><span class="badge">' + esc(p.adapterId) + '</span>' +
      '<span class="mcard-spacer"></span>' +
      '<span class="muted">Launch</span>' +
      '<select class="member-launch" aria-label="Launch mode for ' + esc(p.name) + '" ' +
      'data-group-id="' + esc(g.id) + '" data-project-id="' + esc(m.projectId) + '">' +
      '<option value="run"' + (m.debug ? '' : ' selected') + '>Run</option>' +
      '<option value="debug"' + (m.debug ? ' selected' : '') + '>Debug</option>' +
      '</select>' +
      '<span class="muted stage-lbl">Stage</span>' +
      '<input type="number" class="group-stage" min="1" aria-label="Stage for ' + esc(p.name) + '" ' +
      'data-group-id="' + esc(g.id) + '" data-project-id="' + esc(m.projectId) + '" value="' + esc(m.stage) + '" />' +
      '<button class="secondary mcard-remove" data-action="remove-member" data-group-id="' + esc(g.id) +
      '" data-project-id="' + esc(m.projectId) + '">Remove</button>' +
      '</div>' +
      readinessEditor(g.id, m.projectId, m.readiness) +
      '</div>';
  }

  function renderGroupEditor(g) {
    let html = '<h3 class="cat">Editing: ' + esc(g.name) + '</h3>';
    html += '<div class="row">' +
      '<input type="text" class="group-rename" data-group-id="' + esc(g.id) + '" aria-label="Group name" value="' + esc(g.name) + '" />' +
      (g.running
        ? '<button data-action="stop-group" data-group-id="' + esc(g.id) + '">Stop</button>'
        : '<button data-action="run-group" data-group-id="' + esc(g.id) + '">Run</button>') +
      '<button class="secondary" data-action="delete-group" data-group-id="' + esc(g.id) + '">Delete</button>' +
      '</div>';
    if (g.problems.length) {
      html += '<div class="muted">⚠ ' + g.problems.map(esc).join(' &nbsp;·&nbsp; ') + '</div>';
    }

    // Members are cards, sorted by Stage (their execution order). Each card carries its
    // Stage, a Remove button, and its "Ready when" gate (MS-018). Projects not yet in the
    // group are added from the dropdown below, so the list stays uncluttered.
    html += '<h4 class="cat">Members <span class="badge">' + g.members.length + '</span></h4>';
    if (g.members.length) {
      const ordered = g.members.slice().sort((a, b) =>
        (a.stage - b.stage) || projectMeta(a.projectId).name.localeCompare(projectMeta(b.projectId).name));
      html += ordered.map((m) => memberCard(g, m)).join('');
    } else {
      html += '<div class="muted mcard-empty">No members yet — add a project below.</div>';
    }

    const inGroup = new Set(g.members.map((m) => m.projectId));
    const available = (state.projects || []).filter((p) => !inGroup.has(p.id));
    if (available.length) {
      html += '<div class="row add-member-row"><span class="muted">Add a project</span>' +
        '<select id="add-member" data-group-id="' + esc(g.id) + '" aria-label="Add a project to the group">' +
        '<option value="">Select…</option>' +
        available.map((p) =>
          '<option value="' + esc(p.id) + '">' + esc(p.name) + ' (' + esc(p.adapterId) + ')</option>').join('') +
        '</select></div>';
    } else if (!state.projects || !state.projects.length) {
      html += '<div class="muted">No projects detected.</div>';
    }
    html += '<p class="muted mcard-hint">Same Stage runs in parallel; a higher Stage starts after every ' +
      'lower Stage is ready. <b>Launch</b> starts the member as a plain run or under the debugger. ' +
      '<b>Ready when</b> sets what counts as ready — the process launching, or a port / HTTP health check.</p>';
    return html;
  }

  function renderGeneral() {
    const sb = state.statusBar || {};
    const gen = state.general || {};
    const shortcuts = state.shortcuts || [];
    const rows = shortcuts.map((s) =>
      '<div class="row"><code>' + esc(s.key) + '</code><span>' + esc(s.title) + '</span>' +
      '<button class="secondary" data-action="open-keybindings" data-query="' + esc(s.command) +
      '">Edit…</button></div>').join('');
    return '<h2>General</h2>' +
      '<h3 class="cat">Status bar</h3>' +
      '<label class="row"><input type="checkbox" id="sb-compact"' + (sb.compact ? ' checked' : '') +
      ' /> Compact — icons only (hover / click for the value)</label>' +
      '<label class="row"><input type="checkbox" id="sb-selectedonly"' + (sb.selectedOnly ? ' checked' : '') +
      ' /> Selected chips only — hide unselected optional chips</label>' +
      '<h3 class="cat">Projects</h3>' +
      '<label class="row"><input type="checkbox" id="gen-showlibs"' + (gen.showLibraries ? ' checked' : '') +
      ' /> Show library projects and targets — static/shared libraries build, but cannot run or debug</label>' +
      '<h3 class="cat">Languages</h3>' +
      (gen.languages || []).map((l) =>
        '<label class="row"><input type="checkbox" class="lang-cb" data-adapter-id="' + esc(l.id) + '"' +
        (l.enabled ? ' checked' : '') + ' /> ' + esc(l.label) + '</label>').join('') +
      '<p class="muted">Unchecked languages are not scanned and their projects are hidden from the ' +
      'switcher. Unchecking everything falls back to all languages.</p>' +
      '<div class="muted">Also editable in VSCode Settings › DevSwitcher.</div>' +
      '<h3 class="cat">Keyboard shortcuts</h3>' +
      (rows || '<p class="muted">No default shortcuts.</p>') +
      '<div class="row"><button data-action="open-keybindings">Open Keyboard Shortcuts…</button></div>' +
      '<p class="muted">These are the defaults — change any of them in the VSCode Keyboard Shortcuts editor. ' +
      'Built-in keys (F5, Ctrl+Shift+B) are left untouched; to drive DevSwitcher with them, bind ' +
      '<code>devSwitcher.debug</code> to F5 or <code>devSwitcher.build</code> to Ctrl+Shift+B there.</p>' +
      '<h3 class="cat">Profile</h3>' +
      '<p class="muted">Export / import a profile (F12) from the Command Palette: ' +
      '<code>DevSwitcher: Export Profile</code> · <code>DevSwitcher: Import Profile</code>.</p>';
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'tab') { activeTab = el.dataset.tab; render(); }
    else if (action === 'switch-project') { post({ type: 'switchProject', projectId: el.dataset.projectId }); }
    else if (action === 'select-group') { selectedGroupId = el.dataset.groupId; render(); }
    else if (action === 'create-group') {
      const input = document.getElementById('new-group-name');
      post({ type: 'createGroup', name: input ? input.value : '' });
    }
    else if (action === 'delete-group') { post({ type: 'deleteGroup', groupId: el.dataset.groupId }); }
    else if (action === 'remove-member') { post({ type: 'setGroupMember', groupId: el.dataset.groupId, projectId: el.dataset.projectId, member: false }); }
    else if (action === 'run-group') { post({ type: 'runGroup', groupId: el.dataset.groupId }); }
    else if (action === 'stop-group') { post({ type: 'stopGroup', groupId: el.dataset.groupId }); }
    else if (action === 'open-keybindings') { post({ type: 'openKeybindings', query: el.dataset.query || undefined }); }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'project-select') {
      post({ type: 'switchProject', projectId: el.value });
    } else if (el.classList.contains('feature-cb')) {
      const checked = Array.from(document.querySelectorAll('.feature-cb'))
        .filter((cb) => cb.checked).map((cb) => cb.value);
      post({ type: 'setChipValue', chipId: 'features', value: checked });
    } else if (el.id === 'runargs-input') {
      post({ type: 'setRunArgs', line: el.value });
    } else if (el.id === 'prebuild-input') {
      post({ type: 'setBuildEvent', event: 'preBuild', text: el.value });
    } else if (el.id === 'postbuild-input') {
      post({ type: 'setBuildEvent', event: 'postBuild', text: el.value });
    } else if (el.id === 'sb-compact') {
      post({ type: 'setStatusBarPref', key: 'compact', value: el.checked });
    } else if (el.id === 'sb-selectedonly') {
      post({ type: 'setStatusBarPref', key: 'selectedOnly', value: el.checked });
    } else if (el.id === 'gen-showlibs') {
      post({ type: 'setShowLibraries', value: el.checked });
    } else if (el.classList.contains('lang-cb')) {
      post({ type: 'setLanguageEnabled', adapterId: el.dataset.adapterId, enabled: el.checked });
    } else if (el.classList.contains('group-rename')) {
      post({ type: 'renameGroup', groupId: el.dataset.groupId, name: el.value });
    } else if (el.id === 'add-member') {
      if (el.value) post({ type: 'setGroupMember', groupId: el.dataset.groupId, projectId: el.value, member: true });
    } else if (el.classList.contains('group-stage')) {
      post({ type: 'setMemberStage', groupId: el.dataset.groupId, projectId: el.dataset.projectId, stage: Number(el.value) });
    } else if (el.classList.contains('member-launch')) {
      post({ type: 'setMemberLaunch', groupId: el.dataset.groupId, projectId: el.dataset.projectId, debug: el.value === 'debug' });
    } else if (el.classList.contains('rd-kind')) {
      // Switching type seeds sensible defaults so the inputs appear pre-filled and valid.
      const box = el.closest('.readiness');
      let readiness;
      if (el.value === 'port') readiness = { kind: 'port', port: 3000, timeoutMs: 30000 };
      else if (el.value === 'http') readiness = { kind: 'http', url: 'http://localhost:3000/health', timeoutMs: 30000 };
      else readiness = undefined; // process start
      post({ type: 'setMemberReadiness', groupId: box.dataset.groupId, projectId: box.dataset.projectId, readiness: readiness });
    } else if (el.classList.contains('rd-port') || el.classList.contains('rd-url') ||
               el.classList.contains('rd-status') || el.classList.contains('rd-timeout')) {
      const box = el.closest('.readiness');
      post({ type: 'setMemberReadiness', groupId: box.dataset.groupId, projectId: box.dataset.projectId, readiness: readReadiness(box) });
    } else if (el.dataset && el.dataset.action === 'set-option') {
      const id = el.dataset.optionId;
      const type = el.dataset.type;
      let value;
      if (type === 'bool') value = el.checked;
      else if (type === 'int') value = el.value === '' ? undefined : Number(el.value);
      else if (type === 'stringList') {
        const items = el.value.split('\\n').map((s) => s.trim()).filter((s) => s.length > 0);
        value = items.length ? items : undefined;
      }
      else value = el.value; // enum / string
      if (value === undefined || value === '') post({ type: 'clearOption', optionId: id });
      else post({ type: 'setOption', optionId: id, value: value });
    }
  });

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'state') { state = e.data; render(); }
  });

  post({ type: 'ready' });
</script>
</body>
</html>`;
}
