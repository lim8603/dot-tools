# DevSwitcher Tools 상세설계서

| 항목 | 내용 |
|---|---|
| 문서 버전 | 1.1 |
| 작성일 | 2026-08-13 |
| 상태 | 확정 (구현 착수 기준 문서) |
| 기반 문서 | `docs/VSCode확장_개발계획서_개념설계.md` (개념설계서) |
| 확장 식별자 | `devswitcher-tools` |
| 구현 언어 | TypeScript / 번들러 esbuild |
| v1 구현 범위 | CargoAdapter(Rust) 단독 구현 + 3개 언어 어댑터 스텁 |

> **문서 성격**: 개념설계서의 방향을 계승하되, 검토 과정에서 확정된 설계 결정(§2)을 반영하여
> 구현에 바로 착수할 수 있는 수준으로 타입·모듈·시퀀스·에러 처리를 확정한다.
> 개념설계서와 이 문서가 충돌하는 부분은 **이 문서가 우선**한다.

---

## 1. 개요

### 1.1 목적

Rust·C++·C#·Python 등 서로 다른 언어/빌드시스템을 **동일한 상태바 UX**(프로젝트·프로파일·아키텍처·타깃 등의 칩 + 빌드/디버그/실행 버튼)로 다루는 VSCode 확장을 만든다. 언어별 차이는 **LanguageAdapter**가 흡수하고, 상태바·오케스트레이터·설정 UI는 어댑터가 선언하는 **칩 디스크립터**만 보고 동작한다.

### 1.2 범위

**v1 포함 (In Scope)**

| ID | 기능 | 출처 |
|---|---|---|
| F1 | 프로젝트 자동 감지 (글롭 스캔 + 멀티루트 워크스페이스) | 개념설계 + 상세화 |
| F2 | 프로젝트 스위처 (상태바 칩 + QuickPick) | 개념설계 |
| F3 | 어댑터 능력 선언 — **선언적 칩 배열**(ChipDescriptor[]) 방식 | 개념설계 + DD-03 |
| F4 | 설정 영속화(SSOT) — 값은 캐노니컬 파일, 선택 상태는 workspaceState | 개념설계 + DD-01 |
| F5 | 액션 오케스트레이션 (빌드/디버그/실행 위임) | 개념설계 |
| F6 | 상태 표시·검증·에러 상태 UX | 개념설계 + 상세화 |
| F7 | 빌드 변형(프로파일) 제어 | 개념설계 |
| F8 | 빌드·디버그·실행 상태바 버튼 — **Task API 기반** | 개념설계 + DD-02 |
| F9 | 타깃/엔트리포인트 선택 | 개념설계 |
| F10 | 아키텍처 선택 (target triple) | 개념설계 |
| F12 | 프로파일 export/import | 개념설계 |
| F13 | 문제 매처·단축키 (Task API problem matcher로 통합) | 개념설계 + DD-02 |
| F14 | 어댑터별 확장 의존성 안내 — F19의 1단계(온디맨드 설치)로 구현 | 개념설계 + DD-09 |
| **F15** | **Cargo features 칩** (`--features` / `--no-default-features`) | 신규 (DD-04) |
| **F16** | **실행 인자(run args) 설정** — 실행/디버그 시 프로그램 인자 전달 | 신규 (DD-04) |
| **F17** | **매니페스트 파일 감시** — Cargo.toml 변경 시 자동 갱신 | 신규 (DD-04) |
| **F18** | **원격 개발 환경 호환** — WSL/Dev Containers/Remote-SSH에서 전 기능 동작 | 신규 (DD-08) |
| **F19** | **환경 진단·의존성 처리(Doctor)** — 감지 → 3단계 자동화 → 복구 | 신규 (DD-09) |

**v1 제외 (Out of Scope)** — 개념설계서와 동일

- CMake/Dotnet/Python 어댑터의 실제 구현 (스텁 + 칩 디스크립터 선언만)
- 새 디버거 어댑터 자체 구현 (기존 디버거 확장에 위임)
- 원격 배포/타깃 관리, 멀티 워크스페이스 간 의존성 그래프
- F11(환경/venv 선택)은 칩 프레임워크 상에서 **정의만** 하고 PythonAdapter 구현 시 활성화

### 1.3 v1 완료 기준 (Definition of Done)

1. Rust 워크스페이스(단일 패키지·cargo workspace·멀티루트)에서 프로젝트/프로파일/아키텍처/features/타깃 칩이 동작한다.
2. 빌드/실행이 Task API로 실행되고 종료 코드가 감지되며, `cargo`의 problem matcher로 진단이 Problems 패널에 표시된다.
3. 디버그 버튼이 "최신 빌드 보장 → 실행 파일 경로 해석 → CodeLLDB 기동"을 자동 수행한다.
4. Cargo.toml 수정(프로파일/타깃/features 추가) 시 상태바가 자동 갱신된다.
5. 선택 상태가 workspaceState에 프로젝트별로 유지되고, export/import로 파일 공유가 가능하다.
6. PythonAdapter 스텁을 활성화했을 때 칩 구성이 선언대로 바뀌는 회귀 테스트를 통과한다 (리트머스 시험).
7. WSL(또는 Dev Container)에서 폴더를 열었을 때 1~5가 동일하게 동작한다 (F18).
8. `DevSwitcher: 환경 진단`이 툴체인·확장·target 상태를 정확히 보고하고, 1단계 항목을 즉시 설치한다 (F19).

---

## 2. 설계 결정 사항 (Design Decisions)

개념설계서 검토 과정에서 확정된 결정. 추후 `.cowork/03_design_artifacts/adrs/`로 승격 가능한 후보다.

| ID | 결정 | 기각된 대안 | 근거 |
|---|---|---|---|
| **DD-01** | 선택 상태(프로파일·아키텍처·타깃 등)는 **`context.workspaceState`(Memento)** 에 저장 | workspace `settings.json` 저장(개념설계 원안) | settings.json은 `.vscode/`가 git에 커밋되는 순간 개인 선택 상태가 팀원과 충돌하고 diff를 오염시킴. workspaceState는 기계 로컬·워크스페이스별 저장으로 이 문제가 없음. 공유가 필요할 때만 F12 export/import로 명시적으로 파일화 — F12의 존재 이유가 명확해짐 |
| **DD-02** | 빌드/실행은 **VSCode Task API**(`vscode.tasks.executeTask`)로 실행 | 터미널에 명령 전송(`runInTerminal`, 개념설계 원안) | 터미널 방식은 종료 코드를 받을 수 없어 `ensureBuilt()`(디버그 전 최신 빌드 보장) 구현이 불가능. Task API는 `onDidEndTaskProcess`로 종료 코드 감지, problem matcher 연동(F13 자동 해결), 출력 패널 재사용까지 제공 |
| **DD-03** | Capabilities는 **선언적 칩 배열**(`chips: ChipDescriptor[]`)로 정의 | boolean 5개 고정 구조체(개념설계 원안) | boolean 고정 구조는 새 칩(features 등) 추가 시마다 인터페이스가 깨짐. 어댑터가 임의의 칩을 선언하는 배열 구조는 상태바/설정 UI 코드 수정 없이 어댑터 고유 칩을 추가할 수 있음. F15(features)가 첫 수혜자 |
| **DD-04** | v1 범위에 **F15(features 칩)·F16(run args)·F17(파일 감시)** 포함 | v1 최소 범위 유지 | Rust 실사용에서 features 전환은 프로파일 전환만큼 빈번하고, 매니페스트 변경 감지는 실사용 필수에 가까움. 일정 +2일 미만으로 실사용성 크게 상승 |
| **DD-05** | 디버그 대상 실행 파일 경로는 **`cargo build --message-format=json`의 `executable` 필드 파싱**으로 해석 | `target/<triple>/<profile-폴더>/<bin>` 경로 조합(개념설계 원안) | 경로 조합 방식은 ①`dev`→`debug` 폴더명 불일치 ②커스텀 프로파일 출력 폴더 ③`CARGO_TARGET_DIR`/`.cargo/config.toml`로 target 디렉토리 변경 시 전부 깨짐. cargo가 직접 알려주는 경로를 쓰면 세 문제가 설계에서 소멸 — 개념설계 §10의 리스크 2건 해소 |
| **DD-06** | 프로젝트 감지는 **`workspace.findFiles('**/Cargo.toml')` 글롭 스캔 + 멀티루트 워크스페이스** 순회 | 워크스페이스 루트 파일 존재 확인(개념설계 원안) | 루트만 확인하면 하위 폴더 프로젝트와 멀티루트 구성을 놓침 |
| **DD-07** | SSOT 파사드 원칙 유지: **값은 캐노니컬 파일에만**, 확장은 포인터+선택 상태만 소유 | — | 개념설계서 원칙 계승. DD-01은 이 원칙의 저장 위치만 정정한 것 |
| **DD-08** | 원격 환경(WSL·Dev Containers·Remote-SSH)을 v1 지원 범위로 — `extensionKind: ["workspace"]` 선언 + 원격 안전 규칙(§12.2) | 로컬 전용 v1 | VSCode Remote 아키텍처에서는 확장 호스트가 원격 측에서 실행되므로, 안전 규칙만 지키면 추가 구현 없이 WSL/컨테이너/SSH 전체가 열림. DD-05(경로를 cargo에 위임)·DD-06(Uri 기반 스캔)이 이미 원격 안전 |
| **DD-09** | 의존성은 온디맨드 3단계 처리(§13) — `extensionDependencies` 미사용 | CodeLLDB `extensionDependencies` 하드 의존(v1.0 원안) | 다언어 확장에서 전 어댑터의 디버거 확장을 강제 동반 설치하는 것은 부적절(Python 사용자에게 CodeLLDB 강제 설치). 확장은 `workbench.extensions.installExtension`으로 사용 시점 자동 설치가 가능하므로 하드 의존이 불필요 |

---

## 3. 시스템 아키텍처

### 3.1 컴포넌트 구성

```
extension.ts (activate)
 │
 ├─ AdapterRegistry ──────── 어댑터 등록·워크스페이스 스캔(F1, DD-06)
 │    ├─ CargoAdapter       (v1 구현)
 │    ├─ CMakeAdapter       (스텁)
 │    ├─ DotnetAdapter      (스텁)
 │    └─ PythonAdapter      (스텁 — 칩 선언은 실제로 하여 리트머스 시험에 사용)
 │
 ├─ StateStore ───────────── workspaceState 래퍼(DD-01), export/import(F12)
 │
 ├─ Orchestrator ─────────── 활성 컨텍스트 관리, 명령 처리, 어댑터 위임(F5)
 │    └─ TaskRunner ──────── Task API 실행·종료 코드 대기(DD-02)
 │
 ├─ StatusBarController ──── 칩 디스크립터 순회 렌더링(F3/DD-03), QuickPick, 에러 상태(F6)
 │
 ├─ ManifestWatcher ──────── FileSystemWatcher, 디바운스 재스캔(F17)
 │
 └─ SettingsPanel ────────── Webview 설정 다이얼로그(F4 보조, F16 편집)
      └─ FileFacade ──────── 캐노니컬 파일 국소 편집(TOML/JSONC/XML)
```

**의존 방향**: UI(StatusBar/SettingsPanel) → Orchestrator → Adapter. 역방향 의존 금지.
상태바와 설정 패널은 `LanguageAdapter` 인터페이스와 `ChipDescriptor[]`만 알고, 특정 언어를 모른다.

### 3.2 소스 모듈 구조

```
src/
 ├─ extension.ts                  # activate/deactivate, 컴포넌트 배선(wiring)만
 ├─ core/
 │   ├─ types.ts                  # §4 전체 타입 (단일 정의 지점)
 │   ├─ adapterRegistry.ts        # 스캔·어댑터 매칭
 │   ├─ orchestrator.ts           # 명령 핸들러, 활성 컨텍스트
 │   ├─ stateStore.ts             # workspaceState 스키마 관리, reconcile, export/import
 │   ├─ taskRunner.ts             # Task 실행 → 종료 코드 Promise
 │   └─ manifestWatcher.ts        # FileSystemWatcher + 디바운스
 ├─ ui/
 │   ├─ statusBar.ts              # 칩/버튼 렌더링 (어댑터 무지)
 │   ├─ picks.ts                  # QuickPick 헬퍼 (단일/복수 선택)
 │   └─ settingsPanel/            # Webview (HTML/메시지 프로토콜)
 ├─ adapters/
 │   ├─ cargo/
 │   │   ├─ cargoAdapter.ts       # LanguageAdapter 구현
 │   │   ├─ cargoBridge.ts        # cargo CLI 호출 + JSON 파싱 (순수 로직 분리 → 단위 테스트 대상)
 │   │   └─ cargoToml.ts          # Cargo.toml 국소 편집 (FileFacade의 TOML 구현)
 │   ├─ cmake/cmakeAdapter.ts     # 스텁
 │   ├─ dotnet/dotnetAdapter.ts   # 스텁
 │   └─ python/pythonAdapter.ts   # 스텁 (칩 선언 포함)
 └─ test/
     ├─ unit/                     # cargoBridge 등 순수 로직 (VSCode 호스트 불필요)
     └─ integration/              # @vscode/test-electron
```

**설계 규칙**: `cargoBridge.ts`의 파싱·인자 조립 함수는 VSCode API에 의존하지 않는 순수 함수로 작성한다(§15 테스트 전략의 전제).

### 3.3 활성화·초기화 시퀀스

```
1. VSCode: activationEvents 매칭 (workspaceContains:**/Cargo.toml 등, §14)
2. activate():
   a. AdapterRegistry.scan() — 모든 workspaceFolder × 모든 어댑터 detect 글롭 (DD-06)
   b. StateStore.load() — workspaceState 복원 → reconcile (§6.2: 사라진 프로젝트/값 정리)
   c. 활성 프로젝트 결정: 저장된 activeProjectId → 없으면 첫 감지 프로젝트
   d. StatusBarController.render(activeAdapter.chips, selection)
   e. ManifestWatcher.start(모든 어댑터의 manifestGlobs)
   f. 명령 등록 (§14 contributes.commands와 1:1)
3. 프로젝트 0개 감지 시: 상태바 미표시, 확장은 대기 (watcher는 유지 — 매니페스트 생성 시 자동 등장)
```

---

## 4. 핵심 타입 정의

`src/core/types.ts`에 단일 정의한다. 이 절이 M1 마일스톤의 산출물이며, **어댑터 4종의 칩 선언을 모두 이 타입으로 표현할 수 있는지 확인한 뒤 확정**한다(개념설계 §10 인터페이스 변경 리스크 대응).

```ts
// ───────────────────────── 칩 프레임워크 (DD-03) ─────────────────────────

/** 칩 하나의 선택 값. multiSelect 칩(features)은 string[] */
export type ChipValue = string | string[];

export interface ChipItem {
  id: string;
  label: string;
  description?: string;   // QuickPick 우측 설명
  detail?: string;        // QuickPick 하단 상세
}

/**
 * 어댑터가 선언하는 상태바 칩 하나.
 * 상태바·QuickPick·설정 패널은 이 디스크립터만 보고 동작한다.
 */
export interface ChipDescriptor {
  /** 선택 값의 키. Selection.values[id]로 저장됨. 예: 'profile' | 'architecture' | 'features' | 'target' | 'environment' */
  id: string;
  /** codicon 이름. 예: 'tools', 'chip', 'symbol-misc', 'target', 'server-environment' */
  icon: string;
  /** QuickPick placeholder 및 설정 패널 탭 이름 */
  label: string;
  /** true면 QuickPick canPickMany, 값은 string[] (features 칩) */
  multiSelect?: boolean;
  /** 미선택 시 액션 실행을 막을지 여부. 예: target은 required */
  required?: boolean;
  /** 선택지 열거. 어댑터가 자기 캐노니컬 소스에서 읽는다 */
  listItems(project: ProjectInfo): Promise<ChipItem[]>;
  /** 상태바 표시용 축약. 미구현 시 값 그대로. 예: 'x86_64-pc-windows-msvc' → 'x64-msvc' */
  format?(value: ChipValue): string;
  /** 값 미선택 시 기본값 결정 (예: profile → 'dev') */
  defaultValue?(project: ProjectInfo): Promise<ChipValue | undefined>;
}

// ───────────────────────── 프로젝트·선택 상태 ─────────────────────────

export interface ProjectInfo {
  /** 워크스페이스 내 유일 ID: `${adapterId}:${manifestPath 상대경로}` */
  id: string;
  /** 사용자 표시 이름 (패키지명 등) */
  name: string;
  adapterId: string;
  /** 매니페스트 절대 경로 (Cargo.toml 등) */
  manifestPath: string;
  /** 소속 workspaceFolder (멀티루트 대응, DD-06) */
  workspaceFolder: vscode.WorkspaceFolder;
}

export interface Selection {
  projectId: string;
  /** chipId → 선택 값 */
  values: Record<string, ChipValue>;
  /** 실행/디버그 시 프로그램에 전달할 인자 (F16) */
  runArgs: string[];
}

// ───────────────────────── 액션·실행 ─────────────────────────

export interface ActionCapabilities {
  /** '빌드' 개념 존재 여부. false면 빌드 버튼 미표시 (Python) */
  build: boolean;
  /* run·debug는 전 언어 공통이므로 선언 불필요 */
}

export interface TaskResult {
  exitCode: number | undefined;   // undefined: 프로세스가 시그널로 종료된 경우 등
  succeeded: boolean;             // exitCode === 0
}

// ───────────────────────── 어댑터 인터페이스 ─────────────────────────

export interface LanguageAdapter {
  readonly id: string;                    // 'cargo' | 'cmake' | 'dotnet' | 'python'
  readonly displayName: string;           // 'Rust (Cargo)' 등
  readonly actions: ActionCapabilities;
  /** 이 어댑터가 상태바에 요구하는 칩 목록. 순서 = 상태바 표시 순서 (DD-03) */
  readonly chips: ChipDescriptor[];
  /** 감지·감시용 글롭 패턴. 예: ['**/Cargo.toml'] (F1·F17 공용) */
  readonly manifestGlobs: string[];
  /** 필요 확장 ID 목록 (F14). 예: ['vadimcn.vscode-lldb'] */
  readonly requiredExtensions: string[];

  /** 글롭 매칭된 매니페스트들로부터 프로젝트 열거 (DD-06: 루트 확인이 아니라 파일 목록 기반) */
  listProjects(manifests: vscode.Uri[]): Promise<ProjectInfo[]>;

  /** 빌드 Task 생성. actions.build === false면 미호출 (DD-02: Task 객체 반환, 실행은 TaskRunner) */
  createBuildTask(project: ProjectInfo, sel: Selection): vscode.Task;
  /** 실행 Task 생성 (runArgs 포함, F16) */
  createRunTask(project: ProjectInfo, sel: Selection): vscode.Task;
  /** 디버그 구성 생성. 호출 전 Orchestrator가 ensureBuilt를 보장 (§7.4) */
  createDebugConfig(project: ProjectInfo, sel: Selection): Promise<vscode.DebugConfiguration>;
  /** 디버그 전 최신 빌드 보장 + 산출물 경로 해석에 필요한 어댑터별 준비 (DD-05) */
  resolveExecutable(project: ProjectInfo, sel: Selection): Promise<string>;

  /** 설정 패널 저장 → 캐노니컬 파일 국소 편집 (F4/DD-07) */
  persistSetting(project: ProjectInfo, key: string, value: unknown): Promise<void>;
  /** 매니페스트 변경 시 내부 캐시 무효화 (F17) */
  invalidateCache(project?: ProjectInfo): void;
}
```

**개념설계서 대비 변경점 요약**

| 개념설계 | 상세설계 | 사유 |
|---|---|---|
| `capabilities: {profile, architecture, environment, target, build}` | `chips: ChipDescriptor[]` + `actions: {build}` | DD-03. 칩 종류가 열려 있어 F15 같은 어댑터 고유 칩 추가 가능 |
| `listProfiles/listArchitectures/listEnvironments/listTargets` 개별 메서드 | `ChipDescriptor.listItems()`로 통합 | 칩별 메서드가 인터페이스에 고정되지 않음 — 새 칩 = 디스크립터 1개 추가 |
| `detect(root)` + `listProjects(root)` | `manifestGlobs` + `listProjects(manifests)` | DD-06. 글롭 스캔 결과를 넘겨받아 하위 폴더·멀티루트 대응 |
| `build/run(sel): Promise<...>` (내부에서 터미널 실행) | `createBuildTask/createRunTask(sel): vscode.Task` (실행은 TaskRunner) | DD-02. 실행 책임을 오케스트레이터로 이동해 종료 코드·problem matcher 일원화 |
| `debug(sel)` 내부에서 경로 조합 | `resolveExecutable()` + `createDebugConfig()` 분리 | DD-05. 경로 해석을 명시적 단계로 승격 |

---

## 5. 상태바 서브시스템 (StatusBarController)

### 5.1 렌더링 규칙

상태바는 **활성 프로젝트의 어댑터가 선언한 `chips` 배열을 순회**하며 그린다. 어댑터를 추가·변경해도 이 코드는 수정하지 않는다 (개념설계 §5.2의 목표를 DD-03 구조로 달성).

```ts
class StatusBarController {
  private items = new Map<string, vscode.StatusBarItem>();  // chipId → item (재사용)

  render(adapter: LanguageAdapter, project: ProjectInfo, sel: Selection) {
    // 1) 프로젝트 칩 — 모든 어댑터 공통, 항상 표시
    this.upsert('project', '$(repo)', project.name, 'devSwitcher.switchProject');

    // 2) 어댑터 선언 칩 — 배열 순서대로
    for (const chip of adapter.chips) {
      const value = sel.values[chip.id];
      const text = value !== undefined
        ? (chip.format?.(value) ?? this.defaultFormat(value))
        : `(${chip.label})`;                      // 미선택 상태 표시
      const item = this.upsert(chip.id, `$(${chip.icon})`, text, 'devSwitcher.pickChip', [chip.id]);
      // required 칩이 미선택이면 경고 배경
      item.backgroundColor = (chip.required && value === undefined)
        ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
    }

    // 3) 선언되지 않은 칩은 숨김 (어댑터 전환 시 이전 어댑터의 칩 정리)
    this.hideAllExcept(['project', ...adapter.chips.map(c => c.id), 'build', 'debug', 'run']);

    // 4) 액션 버튼
    this.toggle('build', adapter.actions.build);   // Python이면 여기서 숨김
    this.toggle('debug', true);
    this.toggle('run', true);
  }

  private defaultFormat(v: ChipValue): string {
    return Array.isArray(v)
      ? (v.length === 0 ? '기본' : v.length <= 2 ? v.join(',') : `${v.length}개`)  // features 축약
      : v;
  }
}
```

### 5.2 표시 순서·우선순위·축약

- `StatusBarItem`의 `priority`는 칩 배열 순서 기준 내림차순으로 자동 부여한다 (프로젝트 칩이 가장 왼쪽).
- **긴 값 축약**: 각 칩의 `format()`이 담당. CargoAdapter의 아키텍처 칩은 target triple을 축약한다 —
  `x86_64-pc-windows-msvc` → `x64-msvc`, `aarch64-unknown-linux-gnu` → `arm64-linux`.
  전체 값은 `tooltip`에 항상 표시한다.
- features 칩(multiSelect)은 0개 → `기본`, 1~2개 → 이름 나열, 3개 이상 → `N개`로 표시.

### 5.3 QuickPick 동작 (`devSwitcher.pickChip`)

```
1. chip = 활성 어댑터.chips에서 chipId 검색
2. items = await chip.listItems(activeProject)          // 실패 시 §11 에러 UX
3. multiSelect ? showQuickPick(canPickMany: true, 현재값 선택 표시)
              : showQuickPick(현재값에 $(check) 표시)
4. 선택 결과 → StateStore.setValue(projectId, chipId, value)
5. StatusBarController.render(...) 재호출
```

### 5.4 에러·특수 상태 표시 (F6)

| 상태 | 상태바 표현 |
|---|---|
| 프로젝트 0개 | 칩 전체 미표시 (확장 침묵) |
| 툴체인 미설치 (cargo/rustup 없음) | 경고 칩 1개만 표시: `$(warning) DevSwitcher: cargo 없음` → 클릭 시 설치 안내 |
| 매니페스트 파싱 실패 | 프로젝트 칩을 `errorBackground`로 표시, 클릭 시 Output 채널 열기. 마지막 정상 캐시로 계속 동작 |
| required 칩 미선택 | 해당 칩 `warningBackground`, 액션 버튼 클릭 시 해당 QuickPick을 먼저 띄움 |
| 빌드/작업 진행 중 | 액션 버튼을 `$(sync~spin)` + disabled 처리 (중복 실행 방지) |

---

## 6. 상태 저장 서브시스템 (StateStore, DD-01)

### 6.1 workspaceState 스키마

키: `devSwitcher.state.v1` (스키마 버전을 키에 포함 — 마이그레이션 대비)

```ts
interface PersistedState {
  activeProjectId?: string;
  /** projectId → (chipId → 값) */
  selections: Record<string, Record<string, ChipValue>>;
  /** projectId → 실행 인자 (F16) */
  runArgs: Record<string, string[]>;
}
```

- **값이 아니라 선택만 저장한다** (DD-07 유지). 프로파일 정의·빌드 플래그 등 실제 값은 캐노니컬 파일에만 존재.
- 프로젝트별 독립 유지: Rust ↔ C++ 프로젝트를 오가도 각자 마지막 선택 복원 (개념설계 요구 유지).
- `devSwitcher.projects` 목록은 저장하지 않는다 — **매 활성화 시 재스캔**이 원천이며, 저장하면 이중 진실이 됨
  (개념설계의 `settings.json` 프로젝트 목록 항목은 폐기).

### 6.2 재검증 (reconcile)

활성화 시·재스캔 시 수행:

```
for (projectId in state.selections):
  프로젝트가 스캔 결과에 없음        → 항목 유지하되 비활성 (매니페스트가 브랜치 전환으로 잠시 사라지는 경우 대비,
                                        30일 초과 미사용 항목은 정리)
  칩 값이 listItems 결과에 없음      → 해당 값만 삭제 + 상태바 미선택 표시 (예: 프로파일이 Cargo.toml에서 삭제됨)
```

### 6.3 Export / Import (F12)

파일 형식: `devswitcher.profile.json` (워크스페이스 루트 저장 권장, 위치는 저장 다이얼로그로 선택)

```jsonc
{
  "version": 1,
  "exportedAt": "2026-08-13T12:00:00Z",
  "selections": {
    "cargo:crates/my-app/Cargo.toml": {
      "values": { "profile": "release", "architecture": "x86_64-pc-windows-msvc",
                  "features": ["gui", "metrics"], "target": "main" },
      "runArgs": ["--config", "dev.toml"]
    }
  }
}
```

- **Import 시 검증**: projectId가 현재 스캔 결과에 존재하는 것만 반영, 나머지는 결과 요약에 표시.
- projectId는 §4 정의(`adapterId:상대경로`)라 기계 독립적 — 팀 온보딩 시 그대로 공유 가능.

---

## 7. 실행 서브시스템 (TaskRunner, DD-02)

### 7.1 Task 생성·실행 규칙

- 어댑터는 `vscode.Task` **객체 생성까지만** 책임진다 (`ShellExecution`이 아닌 **`ProcessExecution`** 사용 —
  인자 배열을 그대로 전달해 셸 이스케이프 문제 원천 차단).
- 실행·대기·종료 코드 감지는 TaskRunner가 전담한다:

```ts
class TaskRunner {
  async run(task: vscode.Task): Promise<TaskResult> {
    const execution = await vscode.tasks.executeTask(task);
    return new Promise(resolve => {
      const d = vscode.tasks.onDidEndTaskProcess(e => {
        if (e.execution === execution) {
          d.dispose();
          resolve({ exitCode: e.exitCode, succeeded: e.exitCode === 0 });
        }
      });
    });
  }
}
```

- 동일 프로젝트에서 실행 중 Task가 있으면 새 요청은 거부하고 상태바에 진행 중 표시 (§5.4).

### 7.2 Problem Matcher (F13)

- CargoAdapter의 Task에는 `$rustc` problem matcher를 지정한다 (Rust 언어 확장이 기여하는 matcher 사용,
  없으면 `package.json`의 `contributes.problemMatchers`에 자체 정의를 포함해 이중화).
- Task 정의(`vscode.TaskDefinition`)에 `{ type: 'devswitcher', projectId, action }`을 넣어
  Task 재실행(`Tasks: Rerun Last Task`)과의 호환을 확보한다.

### 7.3 빌드/실행 플로우

```
[빌드 버튼] → orchestrator.build()
  1. required 칩 검증 (§5.4)
  2. task = adapter.createBuildTask(project, sel)
  3. result = await taskRunner.run(task)
  4. 실패 시: Problems 패널 포커스 제안 토스트

[실행 버튼] → orchestrator.run()
  1. required 칩 검증
  2. task = adapter.createRunTask(project, sel)   // cargo run은 자체적으로 빌드 포함
  3. await taskRunner.run(task)
```

### 7.4 디버그 플로우 (DD-05)

```
[디버그 버튼] → orchestrator.debug()
  1. required 칩 검증
  2. 필수 확장 확인 — CodeLLDB 미설치 시 온디맨드 설치 (F19 1단계, §13.3), 거부 시 중단 + Doctor 안내
  3. buildResult = await taskRunner.run(adapter.createBuildTask(project, sel))
     └─ 실패(exitCode ≠ 0) 시 여기서 중단 — "빌드 실패로 디버그를 시작할 수 없습니다" + Problems 포커스
  4. executablePath = await adapter.resolveExecutable(project, sel)     // §8.5
  5. config = await adapter.createDebugConfig(project, sel)             // program=executablePath, args=sel.runArgs
  6. await vscode.debug.startDebugging(project.workspaceFolder, config)
```

이 플로우가 개념설계의 `ensureBuilt()`를 대체한다 — Task API의 종료 코드 감지(DD-02)가 있어야만 2단계가 성립한다.

---

## 8. CargoAdapter 상세 (v1 구현 대상)

### 8.1 CargoBridge — cargo CLI 경계층

cargo와의 모든 접점을 `cargoBridge.ts`로 격리한다. **JSON 파싱·인자 조립은 순수 함수**로 작성해 단위 테스트한다(§15).

| 함수 | 명령 | 용도 |
|---|---|---|
| `fetchMetadata(manifestPath)` | `cargo metadata --format-version=1 --no-deps --manifest-path <p>` | 패키지·타깃·features 열거 |
| `listInstalledTargets()` | `rustup target list --installed` | 아키텍처 칩 선택지 |
| `resolveExecutables(manifestPath, sel)` | `cargo build --message-format=json ...` (§8.5) | 디버그 실행 파일 경로 |
| `checkToolchain()` | `cargo --version` / `rustup --version` | 활성화 시 툴체인 존재 확인 (§11) |

**메타데이터 캐시**: `manifestPath → { data, fetchedAt }`. 무효화 시점은 ①ManifestWatcher 이벤트(F17)
②명시적 새로고침 명령. 시간 기반 만료는 두지 않는다(변경은 전부 감시로 잡히므로).
`cargo metadata`가 수 초 걸리는 대형 워크스페이스에서도 칩 클릭이 캐시로 즉시 반응하게 하는 것이 목적.

### 8.2 감지·프로젝트 열거 (F1, DD-06)

```
manifests = workspace.findFiles('**/Cargo.toml', '**/target/**')   // target/ 제외
루트 매니페스트가 [workspace]면: cargo metadata가 멤버 전체를 반환 → 멤버 패키지 각각을 ProjectInfo로
독립 매니페스트면: 단일 ProjectInfo
ProjectInfo.id = `cargo:${workspaceFolder 상대경로}`
```

- 멀티루트: workspaceFolder별로 위 절차 반복.
- 동일 패키지가 workspace 멤버와 독립 파일로 이중 발견되면 workspace 쪽으로 병합(중복 제거).

### 8.3 칩 선언 (F3·F7·F10·F15·F9)

```ts
const cargoChips: ChipDescriptor[] = [
  {
    id: 'profile', icon: 'tools', label: '프로파일', required: false,
    // dev/release + Cargo.toml [profile.*] 커스텀 (메타데이터 캐시에서)
    listItems: p => bridge.listProfiles(p),          // [{id:'dev',label:'Debug'},{id:'release',label:'Release'},...]
    defaultValue: async () => 'dev',
  },
  {
    id: 'architecture', icon: 'chip', label: '아키텍처',
    // 설치 target + 미설치 target을 '(미설치)' 표기로 함께 열거.
    // 미설치 항목 선택 시 `rustup target add` 확인 후 자동 실행 (F19 1단계, §13.4)
    listItems: () => bridge.listTargetsWithAvailability(),   // 미선택 = 호스트 기본 (--target 미전달)
    format: v => abbreviateTriple(v as string),      // §5.2 축약
  },
  {
    id: 'features', icon: 'symbol-misc', label: 'Features', multiSelect: true,   // F15
    listItems: p => bridge.listFeatures(p),          // metadata packages[].features 키 열거
    format: v => formatFeatureCount(v as string[]),
  },
  {
    id: 'target', icon: 'target', label: '타깃', required: true,                  // F9
    listItems: p => bridge.listBinTargets(p),        // kind에 'bin' 포함 + examples
    defaultValue: p => bridge.defaultBinTarget(p),   // bin이 1개면 자동 선택
  },
];
```

**features 칩 의미론 (F15)**

- 선택지: `cargo metadata`의 `packages[].features` 키 전체. `default` feature가 정의된 패키지는
  `default` 항목을 목록 맨 위에 표시하고 초기 선택 상태로 둔다.
- 인자 변환 규칙 (순수 함수 `featuresToArgs(selected, hasDefault)`):
  - `default`가 선택 해제됨 → `--no-default-features` 추가
  - `default` 외 선택 항목 → `--features a,b,c`
  - 아무것도 바꾸지 않음(기본 상태) → 인자 없음

### 8.4 빌드/실행 인자 조립

순수 함수 `assembleCargoArgs(action, projectName, sel)`:

```
build:  ['build', '-p', name, '--profile', profile]
        + (architecture ? ['--target', arch] : [])
        + featuresToArgs(...)
run:    ['run', '-p', name, '--profile', profile, '--bin', target]
        + (architecture ? ['--target', arch] : [])
        + featuresToArgs(...)
        + (runArgs.length ? ['--', ...runArgs] : [])          // F16: '--' 뒤가 프로그램 인자
```

`createBuildTask`/`createRunTask`는 이 인자로 `ProcessExecution('cargo', args, { cwd })` Task를 만든다.

### 8.5 실행 파일 경로 해석 (DD-05)

```ts
async resolveExecutable(project, sel): Promise<string> {
  // §7.4에서 이미 빌드 성공 직후이므로 전량 캐시 상태 → 수백 ms 내 완료
  const args = [...assembleCargoArgs('build', project.name, sel), '--message-format=json'];
  const lines = await bridge.execCapture('cargo', args, project);   // child_process로 stdout 캡처
  // 각 줄의 JSON에서 reason === 'compiler-artifact' && executable !== null 인 항목 수집
  const exe = pickExecutable(lines, sel.values.target);             // 순수 함수, target 이름 매칭
  if (!exe) throw new DevSwitcherError('executable-not-found', ...);
  return exe;
}
```

- `dev`→`debug` 폴더명 매핑, 커스텀 프로파일 출력 폴더, `CARGO_TARGET_DIR` 변경을 **전부 cargo가 해석**하므로
  경로 조합 로직이 설계에서 사라진다 (개념설계 §5.1의 매핑 함정 및 §10 리스크 2건 해소).
- 사용자 대면 빌드는 Task(문제 매처·출력 패널), 경로 해석은 캡처 실행으로 역할을 나눈다.

### 8.6 디버그 구성 (F14 연계)

```ts
async createDebugConfig(project, sel) {
  return {
    type: 'lldb',                       // CodeLLDB
    request: 'launch',
    name: `Debug ${sel.values.target}`,
    program: await this.resolveExecutable(project, sel),
    args: sel.runArgs,                  // F16
    cwd: project.workspaceFolder.uri.fsPath,
    sourceLanguages: ['rust'],
  };
}
```

- CodeLLDB(`vadimcn.vscode-lldb`)는 온디맨드 설치(DD-09) — 최초 디버그 시 확인 후 자동 설치 (§13.3).
- 설치 거부 시 디버그 중단 + Doctor 안내 (F19).

### 8.7 persistSetting — Cargo.toml 국소 편집 (F4·DD-07)

- 파서: `smol-toml`(읽기) + **라인 단위 치환**(쓰기) — TOML 직렬화 재작성은 주석·포맷을 파괴하므로,
  설정 패널에서 편집 가능한 항목을 "값 치환으로 안전한 것"으로 한정한다:
  `[profile.<name>]`의 `opt-level`, `debug`, `lto`, `panic` 등 스칼라 키.
- 테이블 추가(새 커스텀 프로파일 생성)는 파일 말미에 새 블록 append — 기존 내용 무변경.
- 저장 후 ManifestWatcher가 변경을 감지해 캐시 무효화 → 상태바 갱신 (별도 처리 불필요, 단일 경로).

---

## 9. 매니페스트 파일 감시 (ManifestWatcher, F17)

```
감시 대상: 모든 등록 어댑터의 manifestGlobs 합집합 (v1: **/Cargo.toml, 스텁 어댑터 글롭 포함)
이벤트: create / change / delete
처리: 500ms 디바운스 → 해당 매니페스트가 속한 어댑터.invalidateCache()
      → AdapterRegistry.rescan(변경된 workspaceFolder만)
      → StateStore.reconcile() (§6.2)
      → StatusBarController.render()
제외: **/target/**, **/node_modules/** (빌드 산출물 내 매니페스트 무시)
```

- git 브랜치 전환처럼 다수 파일이 한 번에 바뀌는 경우 디바운스가 재스캔 폭주를 방지한다.
- 자기 자신(persistSetting)의 쓰기도 같은 경로로 처리 — 갱신 경로를 단일화해 상태 불일치를 막는다.

---

## 10. 설정 다이얼로그 (SettingsPanel, Webview)

### 10.1 원칙

개념설계서 §6 계승: **값을 자체 저장하지 않는다.** 열 때 활성 어댑터의 캐노니컬 파일을 파싱해 폼을 채우고,
저장 시 그 파일만 국소 수정한다(§8.7). 단, 캐노니컬 파일이 없는 항목(runArgs 등 선택 상태)은 StateStore(DD-01)에 저장한다.

### 10.2 탭 구성 — 칩 디스크립터 기반 동적 구성 (DD-03)

| 탭 | 표시 조건 | 내용 | 저장 위치 |
|---|---|---|---|
| 프로젝트 | 항상 | 감지된 전체 프로젝트(언어 무관) 목록, 활성 전환, 새로고침 | StateStore (activeProjectId) |
| 프로파일 | `chips`에 `profile` 존재 | 프로파일 목록, 커스텀 프로파일 생성/편집 (`opt-level`·`lto` 등) | **Cargo.toml** (§8.7) |
| Features | `chips`에 `features` 존재 | feature 체크박스 목록 (QuickPick과 동일 데이터) | StateStore (선택), 정의는 읽기 전용 |
| 실행 | 항상 | **실행 인자(runArgs) 편집 (F16)**, 타깃 선택 | StateStore |
| 일반 | 항상 | export/import (F12), 단축키 안내 | — |

탭 표시 여부를 칩 존재로 판단하므로, 어댑터 추가 시 설정 패널 코드도 수정이 없다.

### 10.3 메시지 프로토콜 (Webview ↔ 확장)

```ts
// Webview → 확장
type InMsg =
  | { type: 'ready' }                                            // 초기 데이터 요청
  | { type: 'switchProject', projectId: string }
  | { type: 'setChipValue', chipId: string, value: ChipValue }   // StateStore 저장
  | { type: 'setRunArgs', args: string[] }                       // F16
  | { type: 'persistSetting', key: string, value: unknown }      // 캐노니컬 파일 편집 (§8.7)
  | { type: 'export' } | { type: 'import' };

// 확장 → Webview
type OutMsg =
  | { type: 'state', projects: ProjectInfo[], active: string, chips: ChipView[], sel: Selection }
  | { type: 'error', message: string };
```

- 저장 성공 시 별도 응답 대신 갱신된 `state`를 다시 내려보낸다 (단방향 데이터 흐름, 상태 불일치 방지).
- runArgs 입력은 문자열 1줄로 받아 셸 규칙(따옴표) 기준으로 토큰화하는 순수 함수 `parseArgsLine()`을 사용,
  파싱 결과를 미리보기로 표시한다.
- Webview는 `retainContextWhenHidden: false` + 상태는 항상 확장에서 재요청 (메모리 절약).
- CSP: `default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource}` — 외부 리소스 금지.

---

## 11. 에러 처리·엣지 케이스 명세

| # | 상황 | 감지 지점 | 동작 |
|---|---|---|---|
| E1 | cargo/rustup 미설치 | activate 시 `checkToolchain()` | 상태바에 경고 칩 1개(§5.4), 기능 비활성. 경고 칩 클릭 → Doctor(§13.5)로 반자동 설치 유도(2단계), 설치 후 새로고침으로 복구 |
| E2 | `cargo metadata` 실패 (Cargo.toml 문법 오류 등) | CargoBridge | 마지막 정상 캐시 유지 + 프로젝트 칩 errorBackground + Output 채널에 stderr 기록. 파일 저장(watcher) 시 자동 재시도 |
| E3 | 프로젝트 0개 | 스캔 결과 | 상태바 전체 미표시. watcher는 유지 — 매니페스트 생성 시 자동 등장 (§3.3) |
| E4 | required 칩 미선택 상태에서 액션 실행 | Orchestrator | 해당 칩의 QuickPick을 먼저 표시, 선택 완료 시 액션 계속 진행 |
| E5 | 빌드 실패 후 디버그 요청 | §7.4 2단계 | 디버그 중단, Problems 패널 포커스 제안 |
| E6 | `resolveExecutable` 결과 없음 (lib-only 패키지 등) | §8.5 | "실행 가능한 바이너리 타깃이 없습니다" + 타깃 칩 QuickPick 유도 |
| E7 | CodeLLDB 미설치 | debug 직전 확인 (§7.4 2단계) | 온디맨드 설치 프롬프트(F19 1단계, §13.3) — 설치 후 디버그 계속, 거부 시 중단 + Doctor 안내 |
| E8 | 스텁 어댑터 프로젝트만 감지 (C++/C#/Python) | 스캔 | 프로젝트 칩에는 표시하되, 액션 시 "이 언어는 아직 지원 예정입니다 (vN 로드맵)" 안내 (개념설계 §5.5 유지) |
| E9 | 동일 프로젝트 중복 Task 실행 | TaskRunner | 신규 요청 거부 + 진행 중 표시 (§5.4) |
| E10 | 선택 값이 매니페스트에서 삭제됨 (프로파일 삭제 등) | reconcile (§6.2) | 해당 값만 제거, 칩은 미선택 표시. 알림은 1회 토스트 |
| E11 | git 브랜치 전환으로 매니페스트 대량 변경 | ManifestWatcher | 500ms 디바운스로 재스캔 1회만 수행 (§9) |
| E12 | 멀티루트에서 폴더 추가/제거 | `onDidChangeWorkspaceFolders` | 해당 폴더만 스캔/제거 → reconcile |

모든 오류는 `DevSwitcherError(code, message, cause?)`로 래핑하고, 사용자 대면 메시지와 Output 채널 상세 로그를 분리한다.

---

## 12. 원격 개발 환경 지원 (F18 · DD-08)

### 12.1 동작 원리

VSCode Remote 계열(WSL·Dev Containers·Remote-SSH)에서는 UI만 로컬에서 돌고 **확장 호스트가 원격 측에서 실행**된다.
이 확장은 워크스페이스 확장(`extensionKind: ["workspace"]`)으로 선언되므로 원격 연결 시 자동으로 원격 측에 설치·실행되고,
cargo 호출·Task 실행·파일 스캔·디버거 기동이 전부 원격 환경 안에서 일어난다. **원격 대응 코드를 별도로 작성하지 않는 것**이
이 설계의 핵심 — 아래 안전 규칙만 지키면 된다.

### 12.2 원격 안전 규칙

| 규칙 | 근거 |
|---|---|
| `package.json`에 `extensionKind: ["workspace"]` 명시 | 원격 연결 시 항상 원격 측 실행 보장 (§14) |
| 경로는 `vscode.Uri`·워크스페이스 API 기반, OS 경로 형식 가정 금지 | Windows↔Linux 경로 차이 흡수 |
| 프로세스 실행은 `ProcessExecution`/`child_process` — 확장 호스트 위치에서 실행됨 | 추가 처리 없이 원격 도구 호출 |
| 산출물 경로는 cargo가 알려주는 값 사용 (DD-05) | 원격 파일시스템·`CARGO_TARGET_DIR` 변형에 무관 |
| 툴체인 존재를 가정하지 않고 매 환경에서 재진단 (F19) | 환경마다 설치 상태가 다름 |

### 12.3 환경별 지원 표

| 환경 | 지원 | 전제 | 주의 |
|---|---|---|---|
| Windows/Mac/Linux 로컬 | ✅ | rustup/cargo | — |
| **WSL** (윈도우 VSCode) | ✅ | WSL 확장 + WSL 내 rust 툴체인 | 레포가 `/mnt/...`(9p)면 빌드 느림 → §12.4 |
| **Dev Containers** (전 OS) | ✅ | Docker + Dev Containers 확장, 컨테이너 내 툴체인 | 디버깅에 `"capAdd": ["SYS_PTRACE"]`, `"securityOpt": ["seccomp=unconfined"]` 필요 (devcontainer.json) |
| **Remote-SSH** | ✅ | 원격 머신에 rust 툴체인 | 원격 측 CodeLLDB는 온디맨드 설치(§13.3)가 처리 |

### 12.4 지원 시나리오와 한계

- **한 창 = 한 환경**: VSCode 한 창은 하나의 실행 환경에만 연결된다. 같은 창에서 칩 전환으로
  Windows MSVC 빌드 ↔ WSL gcc 빌드를 오가는 것은 구조적으로 불가 — 칩은 "현재 환경 안의" 툴체인/target을 전환한다.
- **창 2개 패턴 (권장)**: 같은 레포를 Windows 창 + WSL 창으로 각각 연다. 선택 상태는 환경별
  workspaceState에 독립 저장되므로(DD-01의 부수 이점) 각 창이 마지막 선택을 따로 기억한다.
- **WSL 성능**: WSL에서 `/mnt/` 경로 빌드는 느리다. WSL 파일시스템에 클론하는 것이 정석이고,
  한 클론을 공유해야 하면 `CARGO_TARGET_DIR`를 WSL 로컬 경로로 — DD-05 덕에 확장은 어느 쪽이든 경로를 정확히 해석한다.
- **범위 밖 → 백로그**: 로컬 빌드 + 원격 실행·어태치(lldb-server/gdbserver), 호스트 칩(환경 전환) — §16 백로그 참조.

---

## 13. 환경 진단·의존성 처리 (F19 · DD-09)

### 13.1 원칙 — 우아한 성능 저하 (Graceful Degradation)

없는 것이 있어도 확장은 죽지 않는다. 없는 것에 **의존하는 기능만** 비활성화하고, 복구 경로를 항상 클릭 가능한 형태로 제시한다.
모든 의존성은 아래 3단계 중 하나로 분류해 처리한다.

### 13.2 의존성 자동화 3단계

| 단계 | 자동화 수준 | 대상 | 메커니즘 |
|---|---|---|---|
| **1단계** | 완전 자동 (확인 1클릭) | VSCode 확장(CodeLLDB, CMake Tools 등), rustup target | `workbench.extensions.installExtension` 명령 / `rustup target add` 실행 |
| **2단계** | 반자동 (설치 명령 대행) | 툴체인 자체(rustup, .NET SDK, CMake, Python) | OS별 명령(winget/brew/공식 스크립트)을 사용자 확인 후 터미널에서 실행, 실패 시 공식 설치 페이지 링크 |
| **3단계** | 안내만 | WSL 본체, Docker Desktop | 관리자 권한·재부팅·라이선스 동의 필요 → 감지 + 명령 복사 버튼 + 공식 문서 링크 |

### 13.3 온디맨드 확장 설치 (DD-09)

`extensionDependencies`는 사용하지 않는다. 각 어댑터의 `requiredExtensions`(§4)를 **최초 사용 시점**에 처리한다:

```
액션 실행 직전 (예: Rust 첫 디버그):
  1. vscode.extensions.getExtension('vadimcn.vscode-lldb') 확인
  2. 없으면 프롬프트: "Rust 디버깅에는 CodeLLDB가 필요합니다. [설치] [취소]"
  3. [설치] → executeCommand('workbench.extensions.installExtension', id) → 완료 후 원래 액션 계속
  4. [취소] → 액션 중단 + Doctor 안내
```

원격 환경에서는 이 설치가 자동으로 원격 측에 이뤄진다 (§12).

### 13.4 rustup target 자동 설치 (1단계)

아키텍처 칩(§8.3)은 설치된 target과 미설치 target을 함께 열거하고 미설치 항목에 `(미설치)`를 표기한다.
미설치 항목 선택 시 `rustup target add <triple>`을 확인 후 실행하고, 성공하면 선택을 완료한다 — 관리자 권한이 필요 없어 안전하다.

### 13.5 Doctor 명령 (`devSwitcher.doctor`)

활성 어댑터의 전제조건을 일괄 점검하고 항목별 해결 액션을 제공한다. v1은 QuickPick 목록으로 구현(Webview 불필요):

```
✅ cargo 1.83.0        ✅ rustup 1.27        ✅ CodeLLDB 1.11
⚠️ target aarch64-unknown-linux-gnu 미설치      → [지금 설치]       (1단계)
ℹ️ Docker 미감지 — Dev Containers 사용 시 필요   → [안내 열기]       (3단계)
※ cargo/rustup 자체가 없으면 ❌ 표시 + [설치 명령 실행] (2단계)
```

- 점검 항목은 어댑터가 선언한다 (`requiredExtensions` + 어댑터별 툴체인 체크) — Doctor 자체는 어댑터 무지(agnostic).
- 진입점: 명령 팔레트, E1 경고 칩 클릭, 온디맨드 설치 취소 시 안내.
- WSL/Docker 가용성은 정보성(ℹ️) 항목 — 이 확장의 필수 조건이 아니라 사용자가 원격 환경을 원할 때의 참고 정보.

---

## 14. package.json 기여점 (contributes)

```jsonc
{
  "name": "devswitcher-tools",
  "publisher": "<개인 publisher — Marketplace 공개 시 확정>",
  "engines": { "vscode": "^1.90.0" },
  "main": "./dist/extension.js",

  // 활성화: 어댑터별 매니페스트 존재 시에만 깨어남 (불필요한 상시 로드 방지)
  "activationEvents": [
    "workspaceContains:**/Cargo.toml",
    "workspaceContains:**/CMakeLists.txt",
    "workspaceContains:**/*.csproj",
    "workspaceContains:**/pyproject.toml"
  ],

  // DD-08: 원격(WSL/컨테이너/SSH) 연결 시 항상 원격(워크스페이스) 측에서 실행
  "extensionKind": ["workspace"],

  // DD-09: extensionDependencies는 사용하지 않는다 — 어댑터별 requiredExtensions를
  // 최초 사용 시점에 온디맨드 설치(§13.3). CodeLLDB도 이 경로로 설치된다.

  "contributes": {
    "commands": [
      { "command": "devSwitcher.switchProject",  "title": "DevSwitcher: 프로젝트 전환" },
      { "command": "devSwitcher.pickChip",       "title": "DevSwitcher: 칩 선택" },      // 인자: chipId
      { "command": "devSwitcher.build",          "title": "DevSwitcher: 빌드" },
      { "command": "devSwitcher.run",            "title": "DevSwitcher: 실행" },
      { "command": "devSwitcher.debug",          "title": "DevSwitcher: 디버그" },
      { "command": "devSwitcher.openSettings",   "title": "DevSwitcher: 설정 열기" },
      { "command": "devSwitcher.refresh",        "title": "DevSwitcher: 새로고침(재스캔)" },
      { "command": "devSwitcher.doctor",         "title": "DevSwitcher: 환경 진단 (Doctor)" },
      { "command": "devSwitcher.exportProfile",  "title": "DevSwitcher: 프로파일 내보내기" },
      { "command": "devSwitcher.importProfile",  "title": "DevSwitcher: 프로파일 가져오기" }
    ],
    "keybindings": [
      { "command": "devSwitcher.build", "key": "ctrl+shift+b", "when": "devSwitcher.active && devSwitcher.canBuild" },
      { "command": "devSwitcher.run",   "key": "ctrl+f5",      "when": "devSwitcher.active" },
      { "command": "devSwitcher.debug", "key": "f5",           "when": "devSwitcher.active && !inDebugMode" }
    ],
    "problemMatchers": [
      // $rustc가 환경에 없을 때의 이중화 (§7.2) — rustc 진단 포맷 기준 자체 정의
      { "name": "devswitcher-rustc", "owner": "rust", "fileLocation": ["relative", "${workspaceFolder}"],
        "pattern": { /* rustc error 포맷 */ } }
    ],
    "taskDefinitions": [
      { "type": "devswitcher",
        "properties": { "projectId": { "type": "string" }, "action": { "type": "string" } } }
    ],
    "configuration": {
      "title": "DevSwitcher Tools",
      "properties": {
        // DD-01: 선택 상태는 settings에 두지 않는다. 여기엔 '동작 설정'만 둔다.
        "devSwitcher.scan.exclude": {
          "type": "array", "items": { "type": "string" },
          "default": ["**/target/**", "**/node_modules/**"],
          "description": "프로젝트 스캔 제외 글롭"
        },
        "devSwitcher.statusBar.abbreviate": {
          "type": "boolean", "default": true,
          "description": "긴 값(target triple 등) 축약 표시"
        }
      }
    }
  }
}
```

**개념설계서 §7과의 차이**: `devSwitcher.projects`·`activeProjectId`·`selections` 설정 항목은 **전부 삭제** —
DD-01에 따라 workspaceState로 이동했고, 프로젝트 목록은 매 스캔이 원천이라 저장하지 않는다(§6.1).
`keybindings`의 `when` 절 컨텍스트(`devSwitcher.active` 등)는 `vscode.commands.executeCommand('setContext', ...)`로 관리한다.

---

## 15. 테스트 계획

### 15.1 단위 테스트 (VSCode 호스트 불필요 — CI에서 빠르게 실행)

`cargoBridge.ts`의 순수 함수가 대상. 픽스처는 실제 cargo 출력을 캡처해 `test/fixtures/`에 저장한다.

| 대상 | 케이스 |
|---|---|
| `parseMetadata()` | 단일 패키지 / cargo workspace(멤버 N) / 커스텀 프로파일 / features 정의 |
| `featuresToArgs()` | 기본 상태(인자 없음) / default 해제 / 조합 선택 / default 없는 패키지 |
| `assembleCargoArgs()` | build·run × 프로파일·아키텍처·features·runArgs 조합 (F16의 `--` 구분 포함) |
| `pickExecutable()` | message-format=json 라인들에서 타깃 매칭 / bin 다수 / lib-only(결과 없음 → E6) |
| `abbreviateTriple()` | 주요 triple 축약 매핑 + 미지의 triple은 원문 유지 |
| `parseArgsLine()` | 따옴표·공백 포함 인자 토큰화 (§10.3) |
| `reconcile()` | 사라진 프로젝트 / 삭제된 프로파일 값 / 정상 유지 |

### 15.2 통합 테스트 (@vscode/test-electron) + 수동 체크리스트

1. 단일 Rust 패키지 열기 → 칩 4종 표시, 기본값(profile=dev, bin 1개면 target 자동) 확인
2. cargo workspace(멤버 3) → 프로젝트 스위처에 3개, 전환 시 선택 상태 독립 유지
3. 멀티루트(Rust + Python 폴더) → 활성 프로젝트에 따라 칩 구성 변화, **Python 스텁 칩 회귀 시험** (DoD 6)
4. 빌드 버튼 → Task 실행, 고의 컴파일 에러 → Problems 패널 표시(matcher), 종료 코드 실패 감지
5. 디버그 버튼 → 빌드 실패 시 중단(E5) / 성공 시 CodeLLDB 기동, 브레이크포인트 히트, runArgs 전달 확인
6. 커스텀 프로파일 + `CARGO_TARGET_DIR` 변경 상태에서 디버그 → 실행 파일 경로 정상 해석 (DD-05 검증)
7. Cargo.toml에 프로파일/feature 추가 저장 → 상태바 자동 갱신 (F17), 삭제 → E10 동작
8. export → import 라운드트립, 다른 클론에서 import (경로 독립성)
9. VSCode 재시작 → workspaceState 복원 확인 (DD-01)
10. cargo 미설치 환경(PATH 제거) → E1 경고 칩 → Doctor 유도 확인
11. WSL에서 동일 레포 열기 → 시나리오 1~7 동일 동작, Windows 창과 선택 상태 독립 유지 확인 (F18·DD-01)
12. CodeLLDB 미설치 상태에서 디버그 → 온디맨드 설치 → 디버그 이어짐 (E7) / 미설치 target 선택 → 자동 `rustup target add` (§13.4)
13. Doctor 실행 → 항목별 상태 정확성, 1단계 즉시 설치, 2·3단계 안내 동작 (F19)

---

## 16. 구현 로드맵

개념설계서 §11을 계승하되 DD-03(칩 프레임워크)·DD-04(범위 추가)를 반영해 재산정.

| 마일스톤 | 내용 | 산출물 | 예상 |
|---|---|---|---|
| **M0** 셋업 | yo code 스캐폴드, esbuild, F5 Hello World | 빌드되는 빈 확장 | 0.5일 |
| **M1** 코어 타입·칩 프레임워크 | §4 타입 확정, 4개 어댑터의 칩 선언을 스텁으로 전부 작성해 타입 검증 (Python 리트머스) | `core/types.ts`, 스텁 4종 | 1일 |
| **M2** CargoBridge + CargoAdapter | 메타데이터/빌드 JSON 파싱, 인자 조립, features(F15), resolveExecutable(DD-05) + 단위 테스트 | `adapters/cargo/*`, `test/unit/*` | 2일 |
| **M3** 상태바·상태 저장·감시 | 칩 렌더링(§5), QuickPick, StateStore(DD-01)·reconcile, ManifestWatcher(F17) | `ui/statusBar.ts`, `core/stateStore.ts`, `core/manifestWatcher.ts` | 1.5일 |
| **M4** 실행·디버그 | TaskRunner(DD-02), problem matcher, 디버그 플로우(§7.4), 키바인딩 | `core/taskRunner.ts`, 동작하는 빌드/실행/디버그 | 1일 |
| **M5** 설정 패널 | Webview(§10), runArgs 편집(F16), Cargo.toml 국소 편집(§8.7), export/import(F12) | `ui/settingsPanel/*` | 1.5일 |
| **M6** 품질·배포 | Doctor 명령(F19), WSL 원격 스모크 검증(F18), 통합 테스트 체크리스트(§15.2), README, VSIX 패키징 | Doctor + `devswitcher-tools-0.1.0.vsix` | 2일 |
| **합계** | | 개인용 v0.1 (Rust 실사용 + 3개 언어 스텁 + 원격 지원) | **약 9.5일** |

> 개념설계 대비 +4일: 칩 프레임워크 일반화(+0.5), features(+0.5), watcher·reconcile(+0.5), Task API·디버그 플로우 분리(+0.5),
> 단위 테스트 픽스처(+0.5), 설정 패널 runArgs(+0.5), Doctor·원격 스모크 검증(+1). **M4까지 완료하면 실사용 가능** — M5·M6은 편의·품질 기능.

### 이후 로드맵 (v1 범위 밖, 방향만)

- **v1.1**: CMakeAdapter (CMake Tools API 위임)
- **v1.2**: DotnetAdapter (.csproj 파싱, RID 칩)
- **v1.3**: PythonAdapter (environment 칩 실구현 — venv/conda 탐색, debugpy)
- 각 어댑터는 "칩 선언 + listItems + Task 생성 + 디버그 구성"만 구현하면 되므로 예상 1.5~2일/어댑터 유지
- **v2+ 백로그**: ①원격 디버그 타깃 — 로컬 빌드 + 원격 실행·어태치(lldb-server/gdbserver/debugpy attach) ②`cross` 연동 크로스 컴파일(아키텍처 칩 확장 — 도커 기반 타깃 빌드) ③호스트 칩 — local/WSL/container 환경 전환(§12.4의 "한 창 = 한 환경" 한계를 넘는 시도, `wsl.exe --` 프리픽스로 빌드는 가능하나 디버거 통합이 난제)

---

## 17. 리스크 관리

| # | 리스크 | 영향 | 대응 | 상태 |
|---|---|---|---|---|
| R1 | Cargo CLI 출력 형식 변경 | 파싱 실패 | `--format-version=1` 고정, 파싱 실패 시 E2 경로로 완충 | 유지 (개념설계 계승) |
| R2 | ~~dev→debug 폴더명 불일치~~ | — | **DD-05로 해소** — cargo가 경로를 직접 알려줌 | ✅ 해소 |
| R3 | ~~커스텀 프로파일 출력 폴더~~ | — | **DD-05로 해소** | ✅ 해소 |
| R4 | CodeLLDB 미설치 | 디버그 불가 | 온디맨드 자동 설치(DD-09, §13.3) + E7 안내 | 완화됨 |
| R5 | 어댑터 확장 시 인터페이스 변경 | 재작업 | M1에서 4개 어댑터 칩 선언을 전부 스텁 작성 후 타입 확정 (Python 리트머스). DD-03으로 칩 추가는 무변경 | 완화됨 |
| R6 | 언어 혼재 워크스페이스에서 칩이 나타났다 사라지는 UX 혼란 | 사용성 | 칩 위치 고정(priority)·프로젝트 칩 항상 왼쪽 고정으로 완화. M6에서 실사용 후 재검토 | 유지 (관찰) |
| R7 | `cargo metadata` 지연 (대형 워크스페이스) | 체감 성능 | 캐시(§8.1) + 스캔 진행 표시. 칩 클릭은 항상 캐시 응답 | 신규 |
| R8 | TOML 국소 편집의 주석 보존 한계 | 파일 오염 | 편집 가능 항목을 스칼라 치환·블록 append로 한정 (§8.7) | 신규 |
| R9 | 자체 problem matcher의 rustc 포맷 추종 | 진단 누락 | `$rustc` 우선 사용, 자체 정의는 폴백 (§7.2) | 신규 |
| R10 | 원격 환경별 도구 부재·경로 차이 (WSL/컨테이너/SSH) | 기능 오동작 | §12.2 원격 안전 규칙 + 환경별 Doctor 재진단(F19) | 신규 |
| R11 | 컨테이너 내 디버깅 ptrace 제약 | 디버그 실패 | `SYS_PTRACE`·seccomp 설정을 §12.3에 명시, Doctor에서 감지 시 안내 | 신규 |

---

## 18. 부록

### 18.1 개념설계서 → 상세설계서 추적표

| 개념설계서 | 이 문서 | 처리 |
|---|---|---|
| §1 상태바 UX | §5 | 계승 + 에러 상태·축약 추가 |
| §2 기능 명세 F1~F14 | §1.2 | F11만 v1 정의-보류, F15~F17 추가 |
| §3.1 Capabilities/LanguageAdapter | §4 | **DD-03으로 구조 변경** (변경점 표 §4 말미) |
| §3.2 능력 매트릭스 | §4 + M1 검증 절차 | 칩 선언 스텁으로 대체 |
| §3 데이터 모델 (settings.json) | §6 | **DD-01로 저장 위치 변경** |
| §5.1 CargoAdapter | §8 | DD-05 반영해 debug 경로 로직 교체, features 추가 |
| §5.2 상태바 렌더링 | §5.1 | boolean 분기 → 배열 순회 |
| §5.3 스캔 | §8.2 | DD-06 글롭 스캔으로 확장 |
| §5.4 오케스트레이션 | §7 | **DD-02 Task API로 교체** |
| §5.5 스텁 정의 | §3.1·E8 | 계승 |
| §6 Webview | §10 | 계승 + 메시지 프로토콜·CSP 명세 |
| §7 설정 스키마 | §14 | 선택 상태 항목 삭제 (DD-01), 동작 설정만 유지 |
| §9 테스트 | §15 | 단위/통합 분리, 픽스처 전략 추가 |
| §10 리스크 | §17 | 2건 해소, 3건 신규 |
| §11 로드맵 | §16 | 재산정 (5.5일 → 9.5일) |
| — (신규 논의) | §12 | WSL·Docker·SSH 원격 지원 (F18·DD-08) |
| — (신규 논의) | §13 | 환경 진단·의존성 3단계 처리 (F19·DD-09) |

### 18.2 참고 링크

- VSCode Extension API: https://code.visualstudio.com/api
- Task Provider 가이드: https://code.visualstudio.com/api/extension-guides/task-provider
- Webview 가이드: https://code.visualstudio.com/api/extension-guides/webview
- Contribution Points: https://code.visualstudio.com/api/references/contribution-points
- cargo metadata: https://doc.rust-lang.org/cargo/commands/cargo-metadata.html
- cargo JSON messages (`--message-format`): https://doc.rust-lang.org/cargo/reference/external-tools.html#json-messages
- CodeLLDB: https://github.com/vadimcn/codelldb
- 확장 샘플: https://github.com/microsoft/vscode-extension-samples

### 18.3 용어

| 용어 | 정의 |
|---|---|
| **ChipDescriptor** | 어댑터가 상태바 칩 하나를 선언하는 구조 (DD-03). 개념설계의 Capabilities를 대체 |
| **LanguageAdapter** | 언어별 빌드/디버그/실행 로직을 캡슐화한 인터페이스 |
| **SSOT 파사드** | 값은 캐노니컬 파일에만 두고 확장은 포인터·선택 상태만 소유하는 원칙 (DD-07) |
| **workspaceState** | VSCode Memento API — 워크스페이스별·기계 로컬 키-값 저장소 (DD-01) |
| **Task API** | `vscode.tasks.*` — 종료 코드 감지와 problem matcher를 제공하는 작업 실행 API (DD-02) |
| **reconcile** | 저장된 선택 상태를 현재 스캔 결과와 대조해 무효 항목을 정리하는 절차 (§6.2) |
| **compiler-artifact** | `cargo build --message-format=json` 출력에서 산출물(실행 파일 경로 포함)을 알리는 메시지 (DD-05) |
| **extensionKind** | 확장이 UI 측/워크스페이스(원격) 측 어디서 실행될지 선언하는 매니페스트 필드 (DD-08) |
| **온디맨드 설치** | 필요 확장을 최초 사용 시점에 확인·자동 설치하는 방식 — `extensionDependencies` 하드 의존을 대체 (DD-09) |
| **Doctor** | 활성 어댑터의 전제조건을 일괄 점검하고 등급별 해결 액션을 제공하는 진단 명령 (F19) |

---

### 18.4 개정 이력

| 버전 | 일자 | 변경 |
|---|---|---|
| 1.0 | 2026-08-13 | 최초 작성 — 개념설계서 검토 결정 DD-01~07 반영 |
| 1.1 | 2026-08-13 | 원격 환경 지원(§12, F18·DD-08)·환경 진단(§13, F19·DD-09) 신설, 의존성 온디맨드 전환, 아키텍처 칩 target 자동 설치, 백로그·리스크(R10·R11)·로드맵(9.5일) 갱신 |

---

*이 문서는 개념설계서(`VSCode확장_개발계획서_개념설계.md`)의 검토·논의 결과를 반영한 구현 기준 문서다.
설계 변경 시 §2 결정 표에 DD 항목을 추가하고 본문을 갱신한다.*
