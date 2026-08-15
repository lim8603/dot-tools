# DevSwitcher Tools

Multi-language unified **status-bar UX** for VSCode — switch projects, profiles,
and build/run/debug across Rust, C++, C#, and Python from one consistent surface.

> v1 real implementation targets **Rust (Cargo)**; C++/C#/Python ship as
> declarative stubs. The new-project wizard (F20) works for all four languages.
> Design lives under [`.cowork/`](.cowork/) (AI–Human Cowork framework).

## Status

Early scaffold (M0 / TASK-001). Ships a `DevSwitcher: Hello World` command to
validate the extension host. Core features land per the `.cowork/` roadmap
(MS-001 … MS-008).

## Develop

```bash
npm install
npm run compile      # esbuild bundle -> dist/extension.js
npm run check-types  # tsc --noEmit
```

Then press **F5** in VSCode to launch the Extension Development Host and run
`DevSwitcher: Hello World` from the Command Palette.

## Architecture (summary)

- `LanguageAdapter` + declarative `ChipDescriptor[]` — UI is language-agnostic (ADR-003)
- SSOT facade — values live in canonical files, extension owns pointers/selection (ADR-007)
- Invocation-config overlay — build options injected at call time, no file editing in v1 (ADR-011)
- Task API execution, `workspaceState` persistence, manifest watching

See [`.cowork/03_design_artifacts/`](.cowork/03_design_artifacts/) for the full design.

## License

MIT — see [LICENSE](LICENSE).
