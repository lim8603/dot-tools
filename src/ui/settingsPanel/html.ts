import * as vscode from 'vscode';

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
  select, button, input[type="text"] {
    font-family: inherit; font-size: inherit;
    color: var(--vscode-input-foreground);
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 3px; padding: 3px 6px;
  }
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
</style>
</head>
<body>
  <div class="topbar">
    <label for="project-select">Project</label>
    <select id="project-select"></select>
    <span class="muted" id="profile-label"></span>
    <span style="flex:1"></span>
    <button class="secondary" data-action="refresh">Refresh</button>
  </div>
  <div class="layout">
    <div class="tabs" id="tabs"></div>
    <div class="detail" id="detail"></div>
  </div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  let state = null;
  let activeTab = 'project';

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
    tabs.push({ id: 'general', label: 'General' });
    return tabs;
  }

  function render() {
    if (!state) return;

    // context bar
    const sel = document.getElementById('project-select');
    sel.innerHTML = state.projects
      .map((p) => '<option value="' + esc(p.id) + '"' +
        (p.id === state.activeProjectId ? ' selected' : '') + '>' + esc(p.name) + '</option>')
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
    if (!state.activeProjectId) {
      return '<div class="empty">No project detected. Open a folder with a Cargo.toml.</div>';
    }
    switch (activeTab) {
      case 'project': return renderProjects();
      case 'features': return renderFeatures();
      case 'profile': return renderProfile();
      case 'invocation': return renderInvocation();
      default: return renderGeneral();
    }
  }

  function renderProjects() {
    const rows = state.projects.map((p) =>
      '<div class="row item' + (p.id === state.activeProjectId ? ' active' : '') +
      '" data-action="switch-project" data-project-id="' + esc(p.id) + '">' +
      esc(p.name) + '<span class="badge">' + esc(p.adapterId) + '</span></div>').join('');
    return '<h2>Detected projects</h2>' + (rows || '<div class="muted">None.</div>');
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
    return '<h2>Profiles <span class="muted">(read-only in v1)</span></h2>' + rows +
      '<p class="muted">Editing profile definitions (Cargo.toml) is planned for v2.</p>';
  }

  function renderInvocation() {
    // TASK-014 fills in the master-detail option editor; show categories for now.
    const cats = state.configCategories.map((cat) => '<div class="row item">' + esc(cat) + '</div>').join('');
    return '<h2>Invocation config</h2>' +
      '<p class="muted">Overlay categories for this adapter:</p>' + cats +
      '<p class="muted">The option-catalog editor and command preview arrive in TASK-014.</p>';
  }

  function renderGeneral() {
    return '<h2>General</h2><p class="muted">Export / import (F12) arrives in TASK-015.</p>';
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'tab') { activeTab = el.dataset.tab; render(); }
    else if (action === 'switch-project') { post({ type: 'switchProject', projectId: el.dataset.projectId }); }
    else if (action === 'refresh') { post({ type: 'ready' }); }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'project-select') {
      post({ type: 'switchProject', projectId: el.value });
    } else if (el.classList.contains('feature-cb')) {
      const checked = Array.from(document.querySelectorAll('.feature-cb'))
        .filter((cb) => cb.checked).map((cb) => cb.value);
      post({ type: 'setChipValue', chipId: 'features', value: checked });
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
