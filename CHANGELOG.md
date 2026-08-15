# Changelog

All notable changes to DevSwitcher Tools are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-08-16

First personal release. Rust (Cargo) is fully implemented; C++, C#, and Python
ship as declaration-only adapter stubs.

### Added

- **Status bar UX** — project, profile, architecture (target triple), features,
  and run-target chips plus Build / Debug / Run action buttons and a settings gear,
  all rendered purely from each adapter's `ChipDescriptor[]`.
- **Cargo adapter** — project scan, build/run/debug via the Task API (no shell),
  executable resolution, and a self-contained rustc problem matcher.
- **Debug** — LLDB launch through CodeLLDB, installed on demand when missing.
- **Settings page** (Webview) — option-catalog editor, invocation-config overlay
  (compiler options, linker, output dir, environment) applied without editing
  `Cargo.toml`, live command preview (including env injection), and pre/postBuild
  events.
- **Profile export / import** — save and restore selections and invocation config.
- **Doctor** — environment diagnostics (cargo, rustup, required extensions) with a
  toolchain-warning chip and guided fixes.
- **rustup target auto-install** — add missing cross-compile targets straight from
  the Architecture chip.
- **Status-bar options** — `statusBar.compact` (icon-only chips) and
  `statusBar.selectedOnly` (hide unselected optional chips).
