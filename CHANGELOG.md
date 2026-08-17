# Changelog

All notable changes to DevSwitcher Tools are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] - 2026-08-17

### Added

- **C#, Python, and C++ (CMake) are now fully implemented** — all four languages share the
  status-bar switcher (switch / build / run / debug), each driven through its own native CLI.
  - **C# (.NET)** — `dotnet` build & run, coreclr debug, `-p:` option injection, and
    Configuration / RID / target-framework chips.
  - **Python** — interpreter run and `debugpy` debugging, with Environment (venv/interpreter)
    and script-target chips (no build step); `PYTHONPATH` / `PYTHONOPTIMIZE` / env injection.
  - **C++ (CMake)** — drives `cmake` directly (configure + build), resolves targets and paths
    from the CMake File API, and auto-selects the debugger from the compiler (MSVC → cppvsdbg,
    GCC → gdb, Clang → lldb), overridable via `devSwitcher.cmake.debugger`.
- **CMake presets** — when a project has `CMakePresets.json`, a **Preset** chip replaces the
  profile/architecture chips and `cmake --preset` drives configure, so you can switch
  compilers (MSVC / Clang-CL / GCC) by picking a preset.
- **`DevSwitcher: Rescan Projects`** — force a re-scan when a folder moved or changed outside
  the editor.
- An **extension icon**, and an "extra rustflags" free-form option for Rust in the settings page.

### Changed

- The extension now activates for C#, Python, and CMake workspaces too (previously Cargo only).
- Debug extensions are auto-selected per toolchain and installed on demand.

### Fixed

- Settings page: the Profile tab is now hidden for CMake projects that use presets (matching
  the status bar), and the profiles section is labeled read-only by design (it no longer
  implies editing is "planned").
- Python: duplicate interpreter entries in the Environment chip are de-duplicated by real path.
- Accessibility: settings-webview form controls now carry aria-labels.

## [0.2.0] - 2026-08-16

### Added

- **Start wizard (F20)** — `DevSwitcher: New Project…` scaffolds a project through a
  folder → language → name flow. Rust (`cargo new`) and C# (`dotnet new console`)
  use their native scaffolders; C++ (CMake) and Python have none, so the extension
  writes a minimal template (`CMakeLists.txt` + `main.cpp` / `pyproject.toml` +
  `main.py`). A new Rust project is auto-selected in the status bar; the other
  languages are created on disk and appear in the switcher once their adapter is
  implemented.

### Fixed

- Features chip: multi-select is now a toggle list with no confirm button — a click
  applies immediately, and the count matches the checked boxes (empty reads `none`,
  distinct from the default-on state). An intentionally empty selection now survives
  a reload instead of resetting to the default.
- Build / run / debug (and native project creation) no longer hang with a stuck
  spinner in an untrusted workspace — they surface a "trust this workspace" prompt,
  and a task that ends without spawning a process can no longer wedge the run lock.

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
