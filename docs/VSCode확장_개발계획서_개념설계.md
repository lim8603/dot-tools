# VSCode 확장 개발 계획서 — DevSwitcher Tools (식별자 `devswitcher-tools`)

> **목적**: Rust·C++·C#·Python 등 서로 다른 언어/빌드시스템을, **동일한 상태바 UX**(프로젝트·프로파일·아키텍처·타깃 칩 + 빌드/디버그/실행 버튼)로 다루는 VSCode 확장. 언어별 차이는 **어댑터**가 흡수한다.
> **전제**: 작성자는 VSCode 확장 개발 경험 없음 → 셋업·API·패키징을 상세히 기술.
> **가정**(다르면 조정): 언어 **TypeScript**, 배포 **개인용 → 추후 Open VSX/Marketplace 검토**, 대상 IDE **VSCode 데스크톱**, **v1 구현은 Rust(CargoAdapter) 단독**. 다른 어댑터는 인터페이스만 확정하고 스텁으로 둔다.

---

## 1. 이 확장이 하는 일 (한눈에)

하단 상태바를 언어에 무관하게 동일한 패턴으로 구성한다:

```
[$(repo) 프로젝트: my-app] [$(tools) 프로파일: Release] [$(chip) x64] [$(target) main]  |  [$(play) 빌드] [$(debug-alt) 디버그] [$(run) 실행]  |  [$(gear) 설정]
      프로젝트 선택            빌드 변형              아키텍처      실행 대상              액션 버튼                    설정
```

- 워크스페이스를 열면 확장이 `Cargo.toml` / `CMakeLists.txt` / `*.csproj` / `pyproject.toml`을 스캔해 **어떤 언어 프로젝트가 있는지 자동 감지**하고, 해당 언어의 **어댑터**를 붙인다.
- **각 어댑터는 자신이 지원하는 칩만 선언**한다. 예: Python 어댑터는 "프로파일(Debug/Release)"과 "아키텍처(x86/x64)" 칩을 선언하지 않으므로 상태바에 자동으로 나타나지 않는다 — 대신 "환경(venv/interpreter)" 칩을 선언한다.
- 칩을 누르면 QuickPick(콤보박스)으로 항목을 고르고, **빌드·디버그·실행 버튼**으로 바로 실행한다.

> **범위 밖(v1 제외)**: 새 디버거 어댑터 자체 구현(각 언어의 기존 디버거 확장에 위임), 원격 배포/타깃 관리(임베디드 특화), 멀티 워크스페이스 간 프로젝트 의존성 그래프.

---

## 2. 기능 명세

| ID | 기능 | 설명 | 전체 언어 공통 |
|---|---|---|---|
| **F1** | 프로젝트 자동 감지 | 워크스페이스 스캔 → 언어별 매니페스트 파일 탐색 → 어댑터 자동 바인딩 | ✅ |
| **F2** | 프로젝트 스위처 | 상태바 칩 + QuickPick으로 워크스페이스 내 여러 프로젝트 전환 | ✅ |
| **F3** | 어댑터 능력 선언(Capability) | 각 어댑터가 자신이 지원하는 칩 목록을 선언 → 상태바가 동적으로 칩 표시/숨김 | ✅ (핵심 설계) |
| **F4** | 설정 영속화 (SSOT) | **값은 각 언어의 캐노니컬 파일**에 국소 편집으로 저장 — 확장은 위치 매핑만 보유 | ✅ |
| **F5** | 액션 오케스트레이션 | 선택 시 어댑터의 build/debug/run 위임 | ✅ |
| **F6** | 상태 표시·검증 | 현재 선택 표시, 어댑터별 유효성 검증, 실패 알림 | ✅ |
| **F7** | 빌드 변형 제어 | Debug/Release/커스텀 — **컴파일 언어만** 지원(어댑터 선언에 따라 표시) | 부분 |
| **F8** | 빌드·디버그·실행 버튼 | 상태바 액션 버튼 — 빌드/디버그 시작/디버그 없이 실행 | ✅ (실행·디버그는 전 언어, 빌드는 컴파일 언어만) |
| **F9** | 타깃/엔트리포인트 콤보박스 | 빌드/실행 대상 선택 — 바이너리(Rust/C++), 시작 프로젝트(C#), 진입 스크립트(Python) | ✅ (의미는 언어별로 다름) |
| **F10** | 아키텍처 선택 | x86/x64/target triple/RID 등 — **컴파일 언어만** | 부분 |
| **F11** | 환경(런타임) 선택 | venv/conda 등 인터프리터 환경 전환 — **스크립트 언어만** | 부분 |
| **F12** | 프로파일 내보내기/가져오기 | 프로젝트별 선택 상태를 파일로 공유(온보딩) | ✅ |
| **F13** | 문제 매처·단축키 | 컴파일러/린터 출력 파싱, 키 바인딩 | ✅ |
| **F14** | 어댑터별 확장 의존성 안내 | 필요한 언어 확장(CodeLLDB, C# Dev Kit, Python 등) 미설치 시 안내 | ✅ |

---

## 3. 아키텍처 & 데이터 모델

### 구성 요소

```
확장 호스트(extension.ts)
 ├─ StatusBar: 프로젝트 / 프로파일 / 아키텍처(또는 환경) / 타깃 / [빌드][디버그][실행] / 설정
 ├─ Commands: switchProject, selectProfile, selectArch, selectTarget, build, debug, run,
 │            openSettings, importProfile, exportProfile
 ├─ WebviewPanel: 설정 다이얼로그(폼) — §6
 ├─ AdapterRegistry: 설치된 어댑터 목록 관리, 워크스페이스 스캔 → 어댑터 자동 매칭
 ├─ LanguageAdapter (인터페이스): 아래 §3.1
 │   ├─ CargoAdapter        (Rust)      — v1 구현 대상
 │   ├─ CMakeAdapter        (C/C++)     — 스텁, CMake Tools 위임
 │   ├─ DotnetAdapter       (C#)        — 스텁, C# Dev Kit 위임 검토
 │   └─ PythonAdapter       (Python)    — 스텁, 축소된 칩 셋
 ├─ FileFacade: 캐노니컬 파일 국소 편집(jsonc-parser/toml-parser) — 값의 읽기·쓰기(F4·SSOT)
 └─ Orchestrator: 어댑터 위임 + 상태바 갱신(F5)
```

### 3.1 LanguageAdapter 인터페이스 — 이 설계의 핵심

모든 언어별 차이는 이 인터페이스 뒤로 숨는다. 상태바·오케스트레이터·설정 다이얼로그는 **이 인터페이스만 알면 되고, 특정 언어를 몰라도 동작**한다.

```ts
interface Capabilities {
  profile: boolean;        // Debug/Release/커스텀 — 컴파일 언어 true, 스크립트 언어 false
  architecture: boolean;   // x86/x64/target triple/RID — 컴파일 언어 true, 스크립트 언어 false
  environment: boolean;    // venv/conda/interpreter — 스크립트 언어 true, 컴파일 언어 false
  target: boolean;         // 실행 대상 선택 — 대부분 true
  build: boolean;          // "빌드" 개념 자체 존재 여부 — 스크립트 언어 false (빌드 없이 바로 실행)
}

interface LanguageAdapter {
  readonly id: string;                 // 'cargo' | 'cmake' | 'dotnet' | 'python'
  readonly displayName: string;        // 'Rust (Cargo)' 등
  readonly capabilities: Capabilities; // §3.1 — 상태바 칩 표시/숨김을 여기서 결정

  detect(workspaceRoot: string): Promise<boolean>;             // 매니페스트 파일 존재로 감지
  listProjects(workspaceRoot: string): Promise<ProjectInfo[]>;
  listProfiles(project: ProjectInfo): Promise<ProfileInfo[]>;      // capabilities.profile === true일 때만 호출
  listArchitectures(project: ProjectInfo): Promise<string[]>;      // capabilities.architecture === true일 때만 호출
  listEnvironments(project: ProjectInfo): Promise<EnvInfo[]>;      // capabilities.environment === true일 때만 호출
  listTargets(project: ProjectInfo): Promise<TargetInfo[]>;

  build(sel: Selection): Promise<BuildResult>;   // capabilities.build === false면 상태바에 빌드 버튼 자체가 없음
  debug(sel: Selection): Promise<void>;          // 각자 맞는 디버거 타입으로 launch config 구성
  run(sel: Selection): Promise<void>;
}
```

**상태바는 `capabilities`만 보고 칩을 그린다** — 어댑터를 추가할 때 상태바 코드를 건드릴 필요가 없다는 뜻. 이게 "환경 축을 언어로 바꾸면 다 대응된다"는 통찰을 실제 코드 구조로 반영한 부분이다.

### 3.2 언어별 능력 매트릭스

| 어댑터 | profile | architecture | environment | target | build | 비고 |
|---|---|---|---|---|---|---|
| **CargoAdapter (Rust)** | ✅ dev/release/커스텀 | ✅ target triple | — | ✅ bin/example | ✅ | v1 구현 대상 |
| **CMakeAdapter (C++)** | ✅ Debug/Release/… | ✅ 툴체인/프리셋 기반 | — | ✅ CMake target | ✅ | CMake Tools 위임 |
| **DotnetAdapter (C#)** | ✅ Debug/Release | ✅ RID(win-x64 등) | — | ✅ 시작 프로젝트 | ✅ | .csproj 파싱, C# Dev Kit 있으면 위임 검토 |
| **PythonAdapter (Python)** | — | — | ✅ venv/conda | ✅ 진입 스크립트 | — | **빌드 칩 자체가 상태바에 없음**, 디버그는 debugpy |

> Python 행이 이 설계의 리트머스 시험지다. profile·architecture·build가 전부 `false`인데도 프로젝트 스위처 + 환경 선택 + 실행 + 디버그가 정상 동작해야 설계가 검증된 것.

### 데이터 모델 — SSOT 파사드

**값은 각 언어의 캐노니컬 파일에만 존재한다.** 확장은 값을 복제하지 않고, 매니페스트는 "어느 어댑터의 어느 파일을 보고 있는지"에 대한 포인터만 가진다.

**① 값의 원천 (어댑터별로 다름, 그대로 둠)**

| 언어 | 프로파일/변형 | 아키텍처/환경 | 실행 대상 | 디버그 구성 |
|---|---|---|---|---|
| Rust | `Cargo.toml` `[profile.*]` | `rustup target list` | `cargo metadata`의 bin 타깃 | `launch.json` (CodeLLDB) |
| C++ | `CMakePresets.json` | 프리셋/툴체인 파일 | CMake Tools codemodel | `launch.json` (cppdbg/CodeLLDB) |
| C# | `.csproj`/`.sln` | RID(런타임 식별자) | 시작 프로젝트 | `launch.json` (netcoredbg/vsdbg) |
| Python | — | venv 경로(`.python-env` 등) | 진입 스크립트 경로 | `launch.json` (debugpy) |

**② 확장이 소유하는 것 = 값이 아니라 "지도" + 현재 선택 상태** — `settings.json`의 `devSwitcher.*`

```jsonc
{
  // 워크스페이스에서 감지된 프로젝트 목록 (어댑터가 채움, 값 아님)
  "devSwitcher.projects": [
    { "id": "my-app", "adapterId": "cargo", "manifestPath": "Cargo.toml" },
    { "id": "controller-fw", "adapterId": "cmake", "manifestPath": "firmware/CMakeLists.txt" }
  ],
  // 현재 선택 상태(확장 소유, 프로젝트별로 독립 유지)
  "devSwitcher.activeProjectId": "my-app",
  "devSwitcher.selections": {
    "my-app":        { "profile": "release", "architecture": "x86_64-pc-windows-msvc", "target": "main" },
    "controller-fw":  { "profile": "Debug",   "architecture": "x64", "target": "controller.elf" }
  }
}
```

> 실제 빌드 플래그·경로 같은 값은 매니페스트에 없다 — 어댑터가 자기 캐노니컬 파일에서 읽고 쓴다(SSOT 유지).
> **프로젝트별로 선택 상태가 독립적으로 유지**된다 — Rust 프로젝트와 C++ 프로젝트를 오가도 각자의 마지막 선택을 기억.

---

## 4. 사전 준비 — 개발 환경 셋업

### 4.1 설치

```bash
node -v                              # Node.js LTS(18+) 확인
npm install --global yo generator-code
# 배포용(나중): npm install --global @vscode/vsce
```

### 4.2 스캐폴드

```bash
yo code
# → New Extension (TypeScript) / 이름 devswitcher-tools / 번들러 esbuild / git yes
```

생성 파일: `package.json`(매니페스트·`contributes`), `src/extension.ts`(진입점), `tsconfig.json`, `.vscode/launch.json`(F5 실행), `esbuild.js`/`.vscodeignore`.

### 4.3 첫 실행

- **`F5`** → **Extension Development Host** 창 → 명령 팔레트에서 `Hello World` 실행 확인.
- 코드 수정 후 개발 호스트에서 **`Ctrl/Cmd+R`**로 리로드.

### 4.4 v1(Rust) 관련 의존성

- CodeLLDB 확장(`vadimcn.vscode-lldb`) — Rust 디버깅에 필요. `extensionDependencies`로 명시하거나, 없으면 안내 프롬프트.
- 이 확장은 CMake Tools처럼 완비된 API에 위임할 수 없으므로, `cargo metadata --format-version=1` 결과를 직접 JSON 파싱하는 `CargoBridge` 유틸을 만든다(§5.1).

---

## 5. 핵심 기능 상세

### 5.1 CargoAdapter 구현 (v1 실제 구현 대상)

```ts
class CargoAdapter implements LanguageAdapter {
  id = 'cargo';
  displayName = 'Rust (Cargo)';
  capabilities: Capabilities = {
    profile: true, architecture: true, environment: false, target: true, build: true
  };

  async detect(root: string) {
    return existsSync(path.join(root, 'Cargo.toml'));
  }

  async listProjects(root: string): Promise<ProjectInfo[]> {
    const { stdout } = await exec('cargo metadata --format-version=1 --no-deps', { cwd: root });
    const meta = JSON.parse(stdout);
    return meta.packages.map((p: any) => ({ id: p.name, manifestPath: p.manifest_path }));
  }

  async listProfiles(project: ProjectInfo): Promise<ProfileInfo[]> {
    // 표준 dev/release + Cargo.toml [profile.*] 커스텀 프로파일 파싱
    const toml = parseToml(readFileSync(workspaceRootManifest(project)));
    const custom = Object.keys(toml.profile ?? {}).filter(k => !['dev', 'release'].includes(k));
    return [{ id: 'dev', label: 'Debug' }, { id: 'release', label: 'Release' },
             ...custom.map(id => ({ id, label: id }))];
  }

  async listArchitectures(): Promise<string[]> {
    const { stdout } = await exec('rustup target list --installed');
    return stdout.trim().split('\n');
  }

  async listEnvironments() { return []; }  // capabilities.environment === false → 호출 안 됨(방어적으로 빈 배열)

  async listTargets(project: ProjectInfo): Promise<TargetInfo[]> {
    const { stdout } = await exec('cargo metadata --format-version=1 --no-deps', { cwd: project.root });
    const meta = JSON.parse(stdout);
    const pkg = meta.packages.find((p: any) => p.name === project.id);
    return pkg.targets.filter((t: any) => t.kind.includes('bin')).map((t: any) => ({ id: t.name }));
  }

  async build(sel: Selection) {
    const args = ['build', '-p', sel.projectId, '--profile', sel.profile];
    if (sel.architecture) args.push('--target', sel.architecture);
    return runInTerminal('cargo', args);
  }

  async debug(sel: Selection) {
    // 바이너리 경로 계산 시 profile 이름(dev)→출력 폴더 이름(debug) 매핑 함정 주의
    const outDir = sel.profile === 'dev' ? 'debug' : sel.profile;
    const binPath = path.join('target', sel.architecture ?? '', outDir, sel.target);
    await ensureBuilt(sel);  // 디버그 전 최신 빌드 보장
    await vscode.debug.startDebugging(undefined, {
      type: 'lldb', request: 'launch', name: `Debug ${sel.target}`, program: binPath, cwd: '${workspaceFolder}'
    });
  }

  async run(sel: Selection) {
    const args = ['run', '-p', sel.projectId, '--profile', sel.profile, '--bin', sel.target];
    return runInTerminal('cargo', args);
  }
}
```

> `--profile dev`일 때 실제 출력 폴더가 `target/debug`인 이름 불일치는 앞서 논의한 함정 그대로 — `debug()`에서 명시적으로 매핑 처리.

### 5.2 상태바 — Capabilities 기반 동적 렌더링

```ts
function refreshStatusBar(adapter: LanguageAdapter, sel: Selection) {
  projectChip.text = `$(repo) ${sel.projectId}`;
  projectChip.show();

  profileChip.text = `$(tools) ${sel.profile ?? ''}`;
  adapter.capabilities.profile ? profileChip.show() : profileChip.hide();

  archChip.text = `$(chip) ${sel.architecture ?? ''}`;
  adapter.capabilities.architecture ? archChip.show() : archChip.hide();

  envChip.text = `$(server-environment) ${sel.environment ?? ''}`;
  adapter.capabilities.environment ? envChip.show() : envChip.hide();

  targetChip.text = `$(target) ${sel.target ?? ''}`;
  adapter.capabilities.target ? targetChip.show() : targetChip.hide();

  buildBtn.text = '$(play) 빌드';
  adapter.capabilities.build ? buildBtn.show() : buildBtn.hide();  // Python이면 여기서 숨김

  debugBtn.text = '$(debug-alt) 디버그'; debugBtn.show();  // 실행/디버그는 전 언어 공통
  runBtn.text = '$(run) 실행';           runBtn.show();
}
```

이 함수 하나가 "환경을 언어로 바꿔도 대응 가능하다"는 이전 논의의 실제 구현 지점이다. 어댑터를 추가해도 이 함수는 수정할 필요가 없다.

### 5.3 프로젝트 자동 감지·전환 (F1·F2)

```ts
class AdapterRegistry {
  private adapters: LanguageAdapter[] = [new CargoAdapter(), new CMakeAdapter(), new DotnetAdapter(), new PythonAdapter()];

  async scanWorkspace(root: string): Promise<{ project: ProjectInfo; adapter: LanguageAdapter }[]> {
    const found = [];
    for (const adapter of this.adapters) {
      if (await adapter.detect(root)) {
        const projects = await adapter.listProjects(root);
        found.push(...projects.map(project => ({ project, adapter })));
      }
    }
    return found;  // Rust 프로젝트와 C++ 프로젝트가 한 워크스페이스에 있으면 둘 다 반환됨
  }
}
```

### 5.4 빌드·디버그·실행 액션 오케스트레이션 (F5)

```ts
vscode.commands.registerCommand('devSwitcher.build', async () => {
  const { adapter, sel } = getActiveContext();
  if (!adapter.capabilities.build) return;  // 방어적 처리(칩이 없으니 사실 호출 안 됨)
  await adapter.build(sel);
});
vscode.commands.registerCommand('devSwitcher.debug', async () => {
  const { adapter, sel } = getActiveContext();
  await adapter.debug(sel);
});
vscode.commands.registerCommand('devSwitcher.run', async () => {
  const { adapter, sel } = getActiveContext();
  await adapter.run(sel);
});
```

### 5.5 CMakeAdapter / DotnetAdapter / PythonAdapter — v1 스텁 정의만

v1에서는 실제 구현 없이 인터페이스와 capabilities만 정의해두고, `detect()`가 true를 반환해도 "아직 지원하지 않는 언어입니다"로 안내한다. 이렇게 해두면 나중에 어댑터를 하나씩 채워도 상태바·오케스트레이터 코드는 그대로 재사용된다.

```ts
class PythonAdapter implements LanguageAdapter {
  id = 'python'; displayName = 'Python';
  capabilities: Capabilities = {
    profile: false, architecture: false, environment: true, target: true, build: false
  };
  async detect(root: string) { return existsSync(path.join(root, 'pyproject.toml')); }
  async listProjects(root: string) { /* pyproject.toml [project].name 파싱 */ throw new Error('v2 예정'); }
  async listEnvironments(project: ProjectInfo) { /* venv 목록: ~/.venv, .venv, conda env list */ throw new Error('v2 예정'); }
  async debug(sel: Selection) {
    // debugpy로 위임 — launch.json type: 'python'
  }
  // build()는 capabilities.build === false이므로 구현 자체가 호출되지 않음(타입상 필수라면 no-op)
  async build() { throw new Error('Python은 빌드 개념이 없습니다'); }
}
```

---

## 6. GUI 설정 다이얼로그 (Webview, F4 보조)

Webview 폼은 SSOT 파사드 원칙을 따른다 — **값을 자체 저장하지 않고, 열 때 활성 어댑터의 캐노니컬 파일을 파싱해 채우고, 저장 시 그 파일만 국소 수정**한다.

### 탭 구성 — 활성 프로젝트의 어댑터에 따라 동적으로 구성

- **프로젝트 목록**: 감지된 전체 프로젝트(언어 무관) 나열, 전환.
- **프로파일**(어댑터가 `capabilities.profile === true`일 때만 탭 표시): 이름·빌드타입·추가 인자.
- **환경**(어댑터가 `capabilities.environment === true`일 때만 탭 표시): venv 경로, interpreter 버전.
- **일반**: 프로파일 import/export, 단축키.

### 저장 흐름 — 어댑터별로 다른 파서

```ts
panel.webview.onDidReceiveMessage(async (msg) => {
  if (msg.type === 'save') {
    const adapter = getActiveAdapter();
    await adapter.persistSetting(msg.key, msg.value);  // 어댑터가 자기 캐노니컬 파일 포맷(TOML/JSON/XML)을 안다
    refreshStatusBar(adapter, getActiveSelection());
  }
});
```

- Rust: `Cargo.toml`은 TOML — `@iarna/toml` 또는 `smol-toml`로 파싱, 국소 편집 시 주석 보존에 제약이 있어 **전체 재작성보다 라인 단위 치환 우선**.
- C++: `jsonc-parser`의 `modify`+`applyEdits`.
- C#: `.csproj`는 XML — `fast-xml-parser` 등으로 국소 편집.
- Python: `pyproject.toml`도 TOML, venv 경로는 `settings.json`에 저장(캐노니컬 파일이 딱히 없는 항목).

---

## 7. 설정 스키마 (`contributes.configuration`)

```jsonc
"devSwitcher.projects": { "type": "array", "items": { "type": "object", "properties": {
  "id": {"type":"string"}, "adapterId": {"type":"string"}, "manifestPath": {"type":"string"} } } },
"devSwitcher.activeProjectId": { "type": "string", "default": "" },
"devSwitcher.selections": { "type": "object", "default": {} }
```

`contributes.commands`에 F2·F5·F12의 명령을, `contributes.keybindings`에 단축키를, `extensionDependencies`에 CodeLLDB(v1 필수) 선언.

---

## 8. 패키징 & 배포

```bash
npm install --global @vscode/vsce
vsce package          # → devswitcher-tools-0.1.0.vsix
```

- `package.json`에 `publisher`·`version`·`engines.vscode` 필요. `README`/`CHANGELOG`/`icon.png` 권장.
- 배포: 초기엔 개인 사용 목적 VSIX 직접 설치. 완성도가 오르면 Open VSX/Marketplace 공개 검토.

---

## 9. 테스트 & 품질

- **수동**: Extension Development Host(F5)로 Rust 프로젝트 시나리오 전체.
- **자동(선택)**: `@vscode/test-cli` + `@vscode/test-electron`.
- **체크리스트**: 프로젝트 자동 감지(단일/workspace), 프로파일 전환 → `cargo build --profile` 반영, 아키텍처 전환 → `--target` 반영, 타깃 콤보박스, 빌드/디버그/실행 버튼, 디버그 시 `dev`→`debug` 폴더명 매핑 정상 동작, 커스텀 프로파일(Cargo.toml `[profile.*]`) 인식, capabilities에 따른 칩 표시/숨김(Python 스텁으로 회귀 테스트).

---

## 10. 리스크 & 유의사항

- **Cargo CLI 출력 형식 변경**: `cargo metadata --format-version=1`은 안정 인터페이스지만, 버전 필드는 고정해서 파싱 실패를 방지.
- **`dev` 프로파일 ↔ `debug` 출력 폴더 이름 불일치**: 하드코딩 매핑 필요(§5.1 debug() 참고), 커스텀 프로파일 추가 시 동일 문제 재발 가능 — 사용자 정의 프로파일은 출력 폴더명도 함께 저장하는 방식 검토.
- **CodeLLDB 미설치**: Rust 디버깅의 필수 전제 — `extensionDependencies`로 자동 설치 유도, 없을 시 명확한 안내.
- **어댑터 확장 시 인터페이스 변경 리스크**: v1에서 `LanguageAdapter` 인터페이스를 확정할 때, C#/Python처럼 이질적인 요구가 나중에 인터페이스 자체를 흔들 수 있음 — §3.2 능력 매트릭스를 먼저 다 채워보고(스텁이라도) 인터페이스를 확정하는 순서를 권장.
- **workspace 여러 언어 혼재 시 UX**: 프로젝트 전환마다 칩 구성이 바뀌는 게(칩이 나타났다 사라졌다) 오히려 혼란스러울 수 있음 — 첫 실사용 후 재검토.

---

## 11. 구현 로드맵 & 일정

> **원칙**: 설계(인터페이스·capabilities)는 4개 언어를 모두 고려해 확정하되, **실제 구현은 CargoAdapter(Rust)만** 완성한다. 나머지는 인터페이스 스텁으로 남겨 향후 확장이 쉽도록 자리만 잡아둔다.

| 마일스톤 | 포함 기능 | 산출물 | 예상 |
|---|---|---|---|
| **M0** 학습·셋업 | — | 스캐폴드 + Hello World | 0.5일 |
| **M1** 어댑터 인터페이스 확정 | §3.1·§3.2 | `LanguageAdapter` 타입, Capabilities 설계, 4개 언어 스텁 클래스(구현은 throw) | 0.5일 |
| **M2** CargoAdapter 구현 | F1·F2·F5·F7~F9 | `cargo metadata`/`rustup target list` 연동, 빌드/디버그/실행 동작 | 1.5일 |
| **M3** 상태바 + Capabilities 렌더링 | §5.2 | 칩 동적 표시/숨김, PythonAdapter 스텁으로 회귀 검증 | 1일 |
| **M4** 설정 다이얼로그 | F4·F12 | Webview 폼(Cargo.toml 국소 편집), import/export | 1.5일 |
| **M5** 다듬기·배포 | — | README, VSIX 패키징 | 0.5일 |
| **합계** | | 개인용 v0.1 (Rust 전용 실사용 + 3개 언어 스텁) | **약 5.5일** |

> **M3까지만 해도** Rust 프로젝트에서 VS2026식 빌드/디버그/실행 + 프로파일/아키텍처 콤보박스가 실사용 가능한 수준. C++/C#/Python 어댑터는 인터페이스가 이미 잡혀 있으므로 필요해질 때 하나씩 채우면 된다(예상 각 1.5~2일/어댑터).

---

## 12. 부록 — 참고 링크·용어

**공식 문서**
- Extension API: https://code.visualstudio.com/api
- Your First Extension: https://code.visualstudio.com/api/get-started/your-first-extension
- Webview 가이드: https://code.visualstudio.com/api/extension-guides/webview
- Contribution Points: https://code.visualstudio.com/api/references/contribution-points
- 샘플 모음: https://github.com/microsoft/vscode-extension-samples
- Cargo metadata 포맷: https://doc.rust-lang.org/cargo/commands/cargo-metadata.html
- CodeLLDB: https://github.com/vadimcn/codelldb

**용어**
- **LanguageAdapter**: 언어별 빌드/디버그/실행 로직을 캡슐화한 인터페이스. 이 설계의 핵심.
- **Capabilities**: 어댑터가 자신이 지원하는 상태바 칩을 선언하는 구조체. 스크립트 언어(Python)와 컴파일 언어(Rust/C++/C#)의 차이를 흡수.
- **SSOT(Single Source of Truth)**: 값은 각 언어의 캐노니컬 파일에만 두고, 확장은 포인터만 소유하는 원칙.
- **Extension Development Host**: F5로 뜨는, 개발 중 확장이 로드된 별도 VSCode 창.
- **QuickPick**: 명령 팔레트식 드롭다운(= 이 계획의 "콤보박스").
- **StatusBarItem**: 하단 상태바의 클릭 가능한 칩/버튼.
- **VSIX**: 확장 배포 패키지 파일.

---

### 착수 순서 요약

1. 4장대로 스캐폴드 → F5로 Hello World.
2. **M1**로 `LanguageAdapter` 인터페이스와 Capabilities를 4개 언어 기준으로 먼저 확정(스텁이라도 4개 다 작성 — Python이 리트머스 시험).
3. **M2~M3**으로 CargoAdapter 실제 구현 + 상태바 동적 렌더링까지 → 바로 실사용.
4. **M4**로 설정 다이얼로그, **M5**로 다듬기·배포.
5. 이후 필요할 때 CMakeAdapter → DotnetAdapter → PythonAdapter 순으로 채움.
