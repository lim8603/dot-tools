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
  .member-row { gap: 6px; }
  .member-label { display: inline-flex; align-items: center; gap: 4px; min-width: 260px; }
  .stage-lbl { margin-left: 4px; }
  .group-stage { width: 56px; }
  #new-group-name { min-width: 220px; }
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
    // Run Groups is workspace-level — it renders even with no active project.
    if (activeTab === 'groups') return renderGroups();
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

  function renderGroupEditor(g) {
    const stageOf = {};
    g.members.forEach((m) => { stageOf[m.projectId] = m.stage; });
    const memberIds = new Set(g.members.map((m) => m.projectId));
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

    // Members: check to include, and set each member's Stage (order). Same stage number
    // runs in parallel; a higher stage starts after every lower stage is ready.
    html += '<h4 class="cat">Members <span class="muted">(check to include · Stage sets order — same number runs together)</span></h4>';
    html += state.projects.length
      ? state.projects.map((p) => {
          const isMember = memberIds.has(p.id);
          return '<div class="row member-row">' +
            '<label class="member-label"><input type="checkbox" class="group-member" data-group-id="' + esc(g.id) +
            '" data-project-id="' + esc(p.id) + '"' + (isMember ? ' checked' : '') + ' /> ' +
            esc(p.name) + '<span class="badge">' + esc(p.adapterId) + '</span></label>' +
            (isMember
              ? '<span class="muted stage-lbl">Stage</span><input type="number" class="group-stage" min="1" ' +
                'aria-label="Stage for ' + esc(p.name) + '" data-group-id="' + esc(g.id) + '" data-project-id="' + esc(p.id) +
                '" value="' + esc(stageOf[p.id]) + '" />'
              : '') +
            '</div>';
        }).join('')
      : '<div class="muted">No projects detected.</div>';
    return html;
  }

  function renderGeneral() {
    const sb = state.statusBar || {};
    return '<h2>General</h2>' +
      '<h3 class="cat">Status bar</h3>' +
      '<label class="row"><input type="checkbox" id="sb-compact"' + (sb.compact ? ' checked' : '') +
      ' /> Compact — icons only (hover / click for the value)</label>' +
      '<label class="row"><input type="checkbox" id="sb-selectedonly"' + (sb.selectedOnly ? ' checked' : '') +
      ' /> Selected chips only — hide unselected optional chips</label>' +
      '<div class="muted">Also editable in VSCode Settings › DevSwitcher.</div>' +
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
    else if (action === 'run-group') { post({ type: 'runGroup', groupId: el.dataset.groupId }); }
    else if (action === 'stop-group') { post({ type: 'stopGroup', groupId: el.dataset.groupId }); }
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
    } else if (el.classList.contains('group-rename')) {
      post({ type: 'renameGroup', groupId: el.dataset.groupId, name: el.value });
    } else if (el.classList.contains('group-member')) {
      post({ type: 'setGroupMember', groupId: el.dataset.groupId, projectId: el.dataset.projectId, member: el.checked });
    } else if (el.classList.contains('group-stage')) {
      post({ type: 'setMemberStage', groupId: el.dataset.groupId, projectId: el.dataset.projectId, stage: Number(el.value) });
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
