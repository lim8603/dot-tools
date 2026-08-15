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
  .opt .row { padding: 2px 0; flex-wrap: wrap; }
  /* Editor sits under its label and grows to use the width (like RunArgs). */
  .opt input[type="text"], .opt input[type="number"], #runargs-input {
    flex: 1 1 100%; min-width: 320px; max-width: 820px;
  }
  .opt select { min-width: 160px; }
  .preview { background: var(--vscode-textCodeBlock-background); padding: 10px 12px;
    border-radius: 4px; overflow-x: auto; white-space: pre-wrap; }
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
    const attrs = 'data-action="set-option" data-option-id="' + esc(o.id) + '" data-type="' + esc(o.type) + '"';
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
      editor = '<input type="number" ' + attrs + ' placeholder="' + esc(o.example || '') + '"' +
        ' value="' + esc(val === undefined ? '' : val) + '" />';
    } else {
      editor = '<input type="text" ' + attrs + ' placeholder="' + esc(o.example || '') + '"' +
        ' value="' + esc(val === undefined ? '' : val) + '" />';
    }
    // Help line: the description, then how the entered value is injected (teaching),
    // with the bare example shown as the field placeholder above — never as text to paste.
    return '<div class="opt">' +
      '<div class="opt-label"><b>' + esc(o.label) + '</b></div>' +
      '<div class="row">' + editor + '</div>' +
      '<div class="muted">' + esc(o.description) +
      (o.injectsAs ? ' &nbsp;injects: <code>' + esc(o.injectsAs) + '</code>' : '') +
      (o.docUrl ? ' &nbsp;<a href="' + esc(o.docUrl) + '">docs ↗</a>' : '') + '</div></div>';
  }

  function renderInvocation() {
    const byCat = {};
    state.optionCatalog.forEach((o) => { (byCat[o.category] = byCat[o.category] || []).push(o); });

    let html = '<h2>Invocation config <span class="muted">· profile: ' + esc(state.profile) + '</span></h2>';
    state.configCategories.forEach((cat) => {
      html += '<h3 class="cat">' + esc(cat) + '</h3>';
      if (cat === 'runArgs') {
        const args = state.invocation.runArgs || [];
        html += '<div class="row"><input type="text" id="runargs-input" style="flex:1" ' +
          'placeholder="--flag value" value="' + esc(args.join(' ')) + '" /></div>' +
          '<div class="muted">argv: [' + args.map((t) => '<code>' + esc(t) + '</code>').join(', ') + ']</div>';
      } else if (cat === 'buildEvent') {
        const pre = (state.invocation.preBuild || []).join('\\n');
        const post = (state.invocation.postBuild || []).join('\\n');
        html += '<div class="opt-label"><b>Pre-build</b> <span class="muted">one command per line · runs before build/run</span></div>' +
          '<div class="row"><textarea id="prebuild-input" rows="2">' + esc(pre) + '</textarea></div>' +
          '<div class="opt-label"><b>Post-build</b> <span class="muted">runs after a successful build/run</span></div>' +
          '<div class="row"><textarea id="postbuild-input" rows="2">' + esc(post) + '</textarea></div>' +
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

  function renderGeneral() {
    return '<h2>General</h2><p class="muted">Export / import a profile (F12) from the Command ' +
      'Palette: <code>DevSwitcher: Export Profile</code> · <code>DevSwitcher: Import Profile</code>.</p>';
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'tab') { activeTab = el.dataset.tab; render(); }
    else if (action === 'switch-project') { post({ type: 'switchProject', projectId: el.dataset.projectId }); }
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
    } else if (el.dataset && el.dataset.action === 'set-option') {
      const id = el.dataset.optionId;
      const type = el.dataset.type;
      let value;
      if (type === 'bool') value = el.checked;
      else if (type === 'int') value = el.value === '' ? undefined : Number(el.value);
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
