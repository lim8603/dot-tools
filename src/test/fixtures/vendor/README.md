# vendor/ — a fixture for `devSwitcher.scan.exclude`

These are stand-ins for the thing that motivated the setting: a tree that lives in the
workspace, holds real manifests, and is **not yours to build**. In the report that started
it, that tree was ten git submodules; the switcher filled with entries nobody wanted to
switch to.

They are plain `package.json` files on purpose — the Node adapter lists a project by
reading the manifest, with no toolchain and no process, so these show up in the switcher
on any machine.

To exercise the setting, add this to `.vscode/settings.json` (or your User settings):

```json
{ "devSwitcher.scan.exclude": ["vendor"] }
```

Both entries should disappear from the switcher as soon as you save — the scan re-runs on
the setting change, without a manual Rescan. Remove the setting and they come back.

Worth checking while you are here: put `vendor` in User settings and something else in
Workspace settings. Both must apply. Exclusions are additive, so a project's settings must
never silently discard a rule you set for yourself.
