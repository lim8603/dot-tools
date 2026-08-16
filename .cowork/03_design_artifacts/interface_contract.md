# Interface Contract

> 인터페이스 명세 — 모듈 간 통신 계약. 이 확장의 언어별 차이는 전부 `LanguageAdapter` 뒤로 숨는다.

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 인터페이스 이름 | `LanguageAdapter` (+ `ChipDescriptor`) |
| 관련 Intent | INT-001 |
| 프로토콜 | in-process TypeScript 인터페이스 (IPC/네트워크 아님) |
| 버전 | v1 — 상세설계서 §4 반입 + F20 프로젝트 생성 계약(ADR-010) 추가 |
| 출처 | `.cowork/06_evolution/imported_context/DevSwitcher-Tools_Detailed-Design.md` §4 |

---

## 1. 개요

UI(StatusBar/SettingsPanel)와 Orchestrator는 `LanguageAdapter` 인터페이스와 `ChipDescriptor[]`만 알고 **특정 언어를 모른다**(BR-003). 어댑터를 추가·변경해도 UI/오케스트레이터 코드는 수정하지 않는다(ADR-003).

- **Provider**: 언어별 어댑터 — `CargoAdapter`(v1 구현), `CMakeAdapter`·`DotnetAdapter`·`PythonAdapter`(스텁, 칩 선언 포함)
- **Consumer**: `Orchestrator`, `StatusBarController`, `SettingsPanel`, `AdapterRegistry`
- **의존 방향**: UI → Orchestrator → Adapter. **역방향 의존 금지.**

---

## 2. 칩 프레임워크 타입 (ADR-003)

```ts
export type ChipValue = string | string[];        // multiSelect 칩(features)은 string[]

export interface ChipItem {
  id: string;
  label: string;
  description?: string;   // QuickPick 우측 설명
  detail?: string;        // QuickPick 하단 상세
}

/** 어댑터가 선언하는 상태바 칩 하나. 상태바·QuickPick·설정 패널은 이 디스크립터만 보고 동작한다. */
export interface ChipDescriptor {
  id: string;                                          // 'profile' | 'architecture' | 'features' | 'target' | 'environment'
  icon: string;                                        // codicon 이름
  label: string;                                       // QuickPick placeholder / 설정 탭 이름
  multiSelect?: boolean;                               // true면 값은 string[] (features)
  required?: boolean;                                  // 미선택 시 액션 차단 (target)
  listItems(project: ProjectInfo): Promise<ChipItem[]>;  // 어댑터가 캐노니컬 소스에서 읽음
  format?(value: ChipValue): string;                   // 상태바 축약 표시
  defaultValue?(project: ProjectInfo): Promise<ChipValue | undefined>;
}
```

---

## 3. 프로젝트·선택 상태 타입

```ts
export interface ProjectInfo {
  id: string;                        // `${adapterId}:${manifestPath 상대경로}` (기계 독립, ADR-006)
  name: string;                      // 표시 이름(패키지명 등)
  adapterId: string;
  manifestPath: string;              // 매니페스트 절대 경로
  workspaceFolder: vscode.WorkspaceFolder;   // 멀티루트 대응
}

export interface Selection {
  projectId: string;
  values: Record<string, ChipValue>;   // chipId → 선택 값 (profile 칩 포함)
}
// 실행 인자(runArgs)는 InvocationConfig.runArgs로 승격 — (프로젝트×구성)별 저장(ADR-011, §7). Selection은 칩 선택만 담는다(OQ-002).

export interface ActionCapabilities {
  build: boolean;                       // '빌드' 개념 존재 여부. false면 빌드 버튼 미표시(Python)
  // run·debug는 전 언어 공통이라 선언 불필요
}

export interface TaskResult {
  exitCode: number | undefined;
  succeeded: boolean;                   // exitCode === 0
}
```

---

## 4. LanguageAdapter 인터페이스 (핵심 계약)

```ts
export interface LanguageAdapter {
  readonly id: string;                    // 'cargo' | 'cmake' | 'dotnet' | 'python'
  readonly displayName: string;           // 'Rust (Cargo)' 등
  readonly actions: ActionCapabilities;
  readonly chips: ChipDescriptor[];       // 상태바 요구 칩(순서 = 표시 순서, ADR-003)
  readonly manifestGlobs: string[];       // 감지·감시 글롭. 예: ['**/Cargo.toml'] (F1·F17)
  readonly requiredExtensions: string[];  // 필요 확장 ID (F14). 예: ['vadimcn.vscode-lldb']

  listProjects(manifests: vscode.Uri[]): Promise<ProjectInfo[]>;              // 글롭 결과 기반(ADR-006)

  // config = 활성 (프로젝트×구성) 호출 오버레이(§7). OQ-002 확정(2026-08-15): 별도 인자로 전달.
  createBuildTask(project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task;   // actions.build===false면 미호출(ADR-002)
  createRunTask(project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task;     // config.runArgs 주입(F16)
  createDebugConfig(project: ProjectInfo, sel: Selection, config: InvocationConfig): Promise<vscode.DebugConfiguration>;
  resolveExecutable(project: ProjectInfo, sel: Selection, config: InvocationConfig): Promise<string>;   // 디버그 전 경로 해석(ADR-005)

  persistSetting(project: ProjectInfo, key: string, value: unknown): Promise<void>;  // 캐노니컬 파일 국소 편집(ADR-007)
  invalidateCache(project?: ProjectInfo): void;                              // 매니페스트 변경 시 캐시 무효화(F17)
}
```

**계약 규칙**
- 어댑터는 `vscode.Task` **객체 생성까지만** 책임진다. 실행·종료 코드 감지는 `TaskRunner`가 전담한다(ADR-002).
- Task는 `ProcessExecution`(배열 인자)로 만든다 — 셸 이스케이프 차단(NFR-002).
- 경로·파일 접근은 `vscode.Uri` 기반, OS 경로 형식 가정 금지 — 원격 안전(ADR-008).

---

## 5. F20 확장 — 프로젝트 생성 계약 (ADR-010) 【신규 · TASK-023 일반화】

시작 마법사(F20)를 위해 `LanguageAdapter`에 **프로젝트 생성 능력**을 추가한다. 네이티브 스캐폴더가 있는 언어는 Task를 반환하고, 없는 언어는 확장이 쓸 템플릿 파일 목록을 반환한다(D-13). 확장은 오케스트레이션만 한다.

```ts
export interface NewProjectTarget {
  folderUri: vscode.Uri;    // 생성 대상 폴더 (빈 워크스페이스 폴더 또는 사용자 선택)
  projectName: string;      // 새 프로젝트 이름 (= 생성될 `<name>/` 서브폴더)
}

export interface ProjectFile {
  relativePath: string;     // 새 프로젝트 폴더 기준 상대 경로
  content: string;
}

// 네이티브 스캐폴더 有 → task, 無 → files (Orchestrator가 workspace.fs로 작성)
export type ProjectCreation =
  | { kind: 'task'; task: vscode.Task }
  | { kind: 'files'; files: ProjectFile[] };

export interface LanguageAdapter {
  // ... §4 기존 멤버 ...

  /** F20 — 이 어댑터가 새 프로젝트 생성을 지원하는지. v1: 4개 어댑터 모두 true(스위치/빌드 스텁과 무관) */
  readonly canCreateProject: boolean;

  /**
   * F20 — 기본 템플릿 프로젝트 생성 방법을 반환한다.
   * cargo new / dotnet new console → { kind: 'task' } (TaskRunner 실행, ADR-002).
   * cmake 최소 템플릿 / python pyproject.toml → { kind: 'files' } (확장이 workspace.fs로 작성, D-13).
   * 완료 후 ManifestWatcher(F17)가 새 매니페스트를 감지.
   */
  createProject(target: NewProjectTarget): ProjectCreation;
}
```

**계약 규칙 (F20)**
- 네이티브 스캐폴더가 있으면(`cargo new`/`dotnet new`) 확장은 파일을 직접 쓰지 않는다(SSOT·위임, ADR-007/ADR-010).
- **네이티브 스캐폴더가 없는 CMake/Python은 예외(D-13)** — 확장이 `workspace.fs`로 최소 템플릿을 작성한다(ShellExecution은 셸 종류 미제어·C++ `<>` 리다이렉션 충돌로 부적합). ADR-010을 "네이티브 도구가 있으면 위임, 없으면 확장이 작성"으로 해석.
- 네이티브 도구 부재 시(task 실패) `requiredExtensions`/툴체인 점검과 동일하게 Doctor 경로로 연결(F19).
- 생성 후 상태 반영은 별도 로직 없이 refresh(scan)+ManifestWatcher 경로를 재사용한다(F17). **v1 스위처 자동 등장은 Rust만**(cmake/dotnet/python은 listProjects 스텁이라 파일은 생성되나 스위처 등장은 v2, scope A).

---

## 6. 어댑터별 계약 요약

| 어댑터 | chips (id) | actions.build | manifestGlobs | requiredExtensions | canCreateProject | v1 |
|--------|-----------|---------------|---------------|--------------------|------------------|----|
| CargoAdapter | profile·architecture·features·target | true | `**/Cargo.toml` | `vadimcn.vscode-lldb` | true (`cargo new`) | **실구현** |
| CMakeAdapter | profile·architecture·target | true | `**/CMakeLists.txt` | (cmake tools 계열) | true (cmake 템플릿) | 스텁 + F20 |
| DotnetAdapter | profile·architecture·target | true | `**/*.csproj` | (C# Dev Kit 계열) | true (`dotnet new`) | 스텁 + F20 |
| PythonAdapter | environment·target | false | `**/pyproject.toml` | (Python 계열) | true (`pyproject.toml`) | 스텁 + F20 |

> Python 행이 리트머스: profile·architecture·build 없이도 스위처+환경+실행+디버그가 동작해야 칩 프레임워크가 검증된다(DoD 6). **단 F20 생성은 4개 모두 v1 실동작.**

---

## 7. 호출 구성 오버레이 계약 (ADR-011) 【신규】

호출 구성(계층 ③)은 캐노니컬 파일을 편집하지 않고 `(projectId × profile)` 단위로 저장되며, 어댑터가 빌드/실행 Task 조립 시 **언어별 메커니즘으로 주입**한다. 값의 정의(계층 ②)는 여전히 캐노니컬 파일에만 있고, 확장은 호출 시점 덮어쓰기만 소유한다(ADR-007 보완).

```ts
export type OptionValue = string | number | boolean | string[];

/** 한 (프로젝트 × 구성)에 적용되는 호출 구성 오버레이. 파일 미편집, 호출 시 주입. */
export interface InvocationConfig {
  compiler?: Record<string, OptionValue>;   // 카탈로그 옵션 id → 값 (opt-level 등)
  linker?: Record<string, OptionValue>;
  outputDir?: string;                        // 출력 위치 (CARGO_TARGET_DIR 등)
  env?: Record<string, string>;              // 환경변수 (PYTHONPATH 등)
  runArgs?: string[];                        // 실행 인자 (F16 승격)
  preBuild?: string[];                       // 빌드/실행 전 명령 (BAT식, ShellExecution)
  postBuild?: string[];                      // 빌드/실행 후 명령
}

/** 설정 페이지가 렌더하는 옵션 카탈로그 항목 (ADR-012). 어댑터가 선언 → UI는 이것만 안다. */
export interface OptionSpec {
  id: string;                 // 'opt-level'
  category: string;           // 'compiler' | 'linker' | 'output' | 'env' | 'buildEvent' | 'runArgs'
  label: string;
  description: string;        // 설명 (옵션 잘 모르는 개발자용 교육 텍스트)
  example: string;            // 예제
  type: 'enum' | 'bool' | 'int' | 'string' | 'stringList';
  allowedValues?: string[];   // enum일 때 드롭다운 값
  defaultValue?: OptionValue;
  injection: 'config' | 'env' | 'flag' | 'preTask' | 'postTask';  // 주입 방식
}

export interface LanguageAdapter {
  // ... §4·§5 기존 멤버 ...

  /** ADR-012 — 이 어댑터가 설정 페이지에 선언하는 옵션 카탈로그. UI는 이것만 렌더(언어 무지). */
  readonly optionCatalog: OptionSpec[];

  /** ADR-012 — 지원하는 설정 페이지 카테고리(가변). Python은 compiler/linker/output 없음(리트머스). */
  readonly configCategories: string[];
}
```

**계약 규칙 (호출 구성)**
- UI/오케스트레이터는 `InvocationConfig`·`OptionSpec[]`만 알고 언어를 모른다(INV-2, ADR-003 연장).
- **주입 시점(configure/build/run)과 방식은 어댑터 내부 사항**이다 — 언어별 차이는 §8이 규정.
- Task 생성 메서드는 활성 `InvocationConfig`를 **별도 인자 `config`로 받아** 언어별로 접어 넣는다(OQ-002 확정 2026-08-15: 별도 인자안). `Selection`은 칩 선택만 담고, 오버레이 해석·전달은 오케스트레이터 책임.
- 구성(profile) 목록은 캐노니컬 파일(②)에서 읽어오며 확장이 지어내지 않는다.
- 빌드 전후 명령은 사용자 자유 명령이라 `ShellExecution`을 허용한다(NFR-002의 문서화된 예외).
- **v1은 주입만**. 오버레이를 캐노니컬 파일에 영구 반영(편집/승격)하는 기능은 v2(구 §8.7).

---

## 8. 언어별 호출 구성 능력 (Invocation Config by Language) 【신규】

VS2026식 속성을 각 어댑터가 "파일 무편집 주입"으로 어디까지 흡수할 수 있는지의 SSOT 표. `정의`=캐노니컬 파일에 있어 v1 읽기전용(편집은 v2), `—`=언어상 해당 없음.

| 카테고리 | Rust (cargo) | C++ (cmake) | C# (dotnet) | Python |
|---|---|---|---|---|
| **구성 축(=profile)** | dev/release/커스텀 `--profile` | `CMAKE_BUILD_TYPE` / `--config` | `-c Debug/Release` + 커스텀 | — (대신 environment 축, F11) |
| **컴파일러 옵션** | `--config profile.*` / `RUSTFLAGS` | `-D CMAKE_CXX_FLAGS[_<CFG>]` | `-p:Optimize/LangVersion/DefineConstants` | 해석형 — `-O`/`PYTHONOPTIMIZE` 소수 |
| **링커** | `--config target.*.linker` / `RUSTFLAGS -C linker=` | `-D CMAKE_EXE_LINKER_FLAGS` | 게시 옵션(`-p:PublishTrimmed/Aot`) | — |
| **출력 위치** | `CARGO_TARGET_DIR` / `--config build.target-dir` | `-B <dir>` / `-D *_OUTPUT_DIRECTORY` | `-o` / `-p:OutputPath` | — |
| **출력 이름** | `[[bin]].name` (정의 → v2) | 타깃 속성 (정의 → v2) | `-p:AssemblyName` (주입 가능) | — |
| **환경변수** | Task env | Task env | Task env | Task env (PYTHONPATH 등 핵심) |
| **인클루드/검색 경로** | — (모듈 시스템) | `target_include_directories`(정의) / `-D` 일부 주입 | — (참조/패키지 모델) | `PYTHONPATH` (env 주입) |
| **빌드 전/후 이벤트** | pre/post Task | pre/post Task | `-p:Pre/PostBuildEvent` 또는 pre/post Task | (빌드 없음) 실행 전/후 훅 |
| **실행 인자** | `-- <args>` (F16) | 실행 오케스트레이션 | `run -- <args>` | `main.py <args>` |
| **주입 시점** | 빌드 시점 | **configure + build 분리** ⚠ | 빌드 시점(`-p:`) | 실행 시점 |
| **v1 실데이터** | ✅ 실구현 | 스텁(카탈로그 v2) | 스텁(카탈로그 v2) | 스텁(리트머스) |

**핵심 관찰**
- **Python이 리트머스**: `actions.build=false` → 설정 페이지에서 컴파일러/링커/출력 카테고리가 사라지고 환경변수·검색경로(PYTHONPATH)·실행 인자만 남는다. `configCategories`가 선언대로 바뀌면 설정 페이지 프레임워크가 검증된 것(칩 리트머스의 설정 페이지판, INV-2).
- **인클루드 폴더는 C++에서만 살아난다**(다른 언어는 개념 부재 또는 env 대체). CMake는 실구현이 v2라 v1 범위 밖.
- **cmake는 configure/build 2단계**라 주입 지점이 cargo(빌드 단일 시점)와 다르다 → 어댑터가 이 차이를 흡수한다.
- **출력 이름은 dotnet만 주입 가능**(`-p:AssemblyName`), cargo/cmake는 정의라 v1 읽기전용.

---

## 9. 제약 사항

| 항목 | 값 |
|------|-----|
| 통신 방식 | in-process 함수 호출 (직렬화·네트워크 없음) |
| 실행 위임 | `vscode.Task`(ProcessExecution) → TaskRunner |
| 경로 규약 | `vscode.Uri` 기반, OS 경로 가정 금지 |
| 동시 실행 | 동일 프로젝트 진행 중 Task 있으면 신규 요청 거부(E9) |

---

## 10. 가정 (Assumptions)

| ID | 가정 | 영향 |
|----|------|------|
| ASM-001 | M1에서 4개 어댑터 칩 선언을 스텁으로 전부 작성해 이 인터페이스를 확정한다(Python 리트머스) | 인터페이스 변경 리스크(RSK-005) 완화 |
| ASM-002 | M1 인터페이스 확정 시 `InvocationConfig`·`OptionSpec`·`optionCatalog`·`configCategories`도 4개 어댑터에 스텁 선언한다 | 호출 구성 계약 선확정, 후속 변경 리스크 완화 |

---

## 11. 미확정 사항 (Open Questions)

| ID | 항목 | 질문 | 상태 |
|----|------|------|------|
| OQ-001 | F20 생성 후 활성 전환 | 생성 직후 새 프로젝트를 자동 활성 프로젝트로 전환할지 | **Resolved (2026-08-16)** — 자동 활성 전환. 생성 Task 성공 후 reconcile→새 projectId를 활성으로 설정·상태바 렌더. 실패 시 전환 없음 |
| OQ-002 | `InvocationConfig` 전달 방식 | `Selection` 확장 vs 별도 인자 | **Resolved (2026-08-15)** — 별도 인자 `config`. Selection은 칩 선택만, runArgs는 InvocationConfig로 승격 |

---

## 12. 관련 근거 / 출처

| ID | 근거 | 출처 | 비고 |
|----|------|------|------|
| SRC-001 | LanguageAdapter/ChipDescriptor 타입 | 상세설계서 §4 | 원문 |
| SRC-002 | F20 프로젝트 생성 계약 | ADR-010 | 세션 #001 |
| SRC-003 | 호출 구성 오버레이·옵션 카탈로그·언어별 능력 | ADR-011, ADR-012 | 세션 #002 |
