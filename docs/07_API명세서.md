# API 명세서 — 어댑터 계약 (Adapter Contract Specification)

| 항목 | 내용 |
|------|------|
| 문서번호 | 07 |
| 문서명 | API 명세서 — 어댑터 계약 |
| 프로젝트 | DevSwitcher Tools |
| 버전 | v1.0.0 |
| 작성일 | 2026-08-17 |
| 작성 | AI — Claude Code |
| 승인 | Human |
| 기준 문서 | `.cowork/03_design_artifacts/interface_contract.md` + `src/core/types.ts` |

---

## 목차

1. [개요](#1-개요)
2. [칩 프레임워크 타입](#2-칩-프레임워크-타입)
3. [프로젝트·선택·액션 타입](#3-프로젝트선택액션-타입)
4. [LanguageAdapter 인터페이스 (핵심 계약)](#4-languageadapter-인터페이스-핵심-계약)
5. [프로젝트 생성 계약 (F20)](#5-프로젝트-생성-계약-f20)
6. [호출 구성 오버레이·옵션 카탈로그](#6-호출-구성-오버레이옵션-카탈로그)
7. [prepareInvocation 훅 (2단계 툴체인)](#7-prepareinvocation-훅-2단계-툴체인)
8. [진단 계약 (F19 Doctor)](#8-진단-계약-f19-doctor)
9. [Run Group 타입](#9-run-group-타입)
10. [영속 상태·프로파일 Export 타입](#10-영속-상태프로파일-export-타입)
11. [어댑터별 계약 구현 요약](#11-어댑터별-계약-구현-요약)
12. [오류 계약](#12-오류-계약)
13. [제약 사항](#13-제약-사항)
14. [미확정 사항](#14-미확정-사항)
15. [근거 / 출처](#15-근거--출처)

---

## 1. 개요

이 문서의 "API"는 REST/네트워크 API가 아니라 **VSCode 확장 내부의 in-process TypeScript 계약**이다. 언어별 차이는 전부 `LanguageAdapter` 인터페이스와 `ChipDescriptor[]` 뒤로 숨으며(ADR-003), UI(StatusBar/SettingsPanel)와 Orchestrator는 특정 언어를 모른다(BR-003).

- **Provider:** 언어별 어댑터 — `cargoAdapter` · `cmakeAdapter` · `dotnetAdapter` · `pythonAdapter` · `goAdapter` · `nodeAdapter` (`src/adapters/index.ts`의 `ALL_ADAPTERS`)
- **Consumer:** `Orchestrator`, `StatusBarController`, `SettingsPanel`, `AdapterRegistry`
- **의존 방향:** UI → Orchestrator → Adapter. **역방향 의존 금지** (INV-2).
- **타입 단일 정의 지점:** `src/core/types.ts` — 어댑터·UI·오케스트레이터는 이 파일에서만 타입을 import한다. 본 문서의 시그니처는 이 파일 기준이며, 기준 계약 문서(`interface_contract.md`)와 다른 부분에는 **【구현 반영】** 주석을 달았다.

> **범위 주석 (v1.0.0 시점):** 기준 계약 문서는 초기 계획("v1 실구현은 Rust 단독, 나머지 3개는 스텁") 기준으로 4개 어댑터(cargo/cmake/dotnet/python)를 서술한다. v1.0.0 릴리즈(2026-08-17) 현재는 **Go(`go`)·Node.js/TypeScript(`node`)를 포함한 6개 어댑터가 전부 실구현 완료**된 상태다. 【구현 반영】

---

## 2. 칩 프레임워크 타입

상태바·QuickPick·설정 페이지는 어댑터가 선언한 디스크립터만 보고 동작한다(ADR-003).

```ts
/** 칩 값. multiSelect 칩(예: Cargo features)은 string[]을 담는다. */
export type ChipValue = string | string[];

/** 칩 QuickPick에 표시되는 선택 항목 하나. */
export interface ChipItem {
  id: string;
  label: string;
  description?: string;   // QuickPick 우측 설명
  detail?: string;        // QuickPick 하단 상세
  secondary?: boolean;    // 【구현 반영】 보조 토글이 켜질 때까지 숨김 (예: 미설치 타깃, §13.4)
}
```

```ts
/** 어댑터가 선언하는 상태바 칩 하나. */
export interface ChipDescriptor {
  id: string;                 // 'profile' | 'architecture' | 'features' | 'target' | 'environment'
                              // 【구현 반영】 구현에는 'preset'(CMake) · 'script'(Node)도 존재
  icon: string;               // codicon 이름
  label: string;              // QuickPick placeholder / 설정 탭 이름
  multiSelect?: boolean;      // true면 값은 string[] (features)
  required?: boolean;         // 미선택 시 액션 차단 (예: target)
  secondaryToggle?: string;   // 【구현 반영】 설정 시 secondary 항목을 토글 버튼 뒤에 접음
                              //   (버튼 툴팁 텍스트, 단일 선택 칩 전용, §13.4)
  listItems(project: ProjectInfo): Promise<ChipItem[]>;  // 캐노니컬 소스에서 항목 읽기
  format?(value: ChipValue): string;                     // 상태바 축약 표시
  unsetText?: string;         // 【구현 반영】 값 미저장 시 상태바에 값처럼 표시할 텍스트
                              //   (예: architecture 칩의 'default' = 호스트 타깃)
  clearValueId?: string;      // 【구현 반영】 "이 칩 값을 지운다"를 뜻하는 항목 id —
                              //   선택 시 저장 값을 제거해 unset(unsetText) 상태로 복귀
  isBlank?(value: ChipValue): boolean;  // 【구현 반영】 statusBar.selectedOnly용 —
                              //   저장된 값이 사실상 "선택 없음"인지 (기본: 빈 배열)
  defaultValue?(project: ProjectInfo): Promise<ChipValue | undefined>;
  onPick?(project: ProjectInfo, value: ChipValue): Promise<boolean>;
                              // 【구현 반영】 선택 후·저장 전 훅 (F19 §13.4). false 반환 시 선택 중단.
                              //   Architecture 칩이 미설치 타깃의 `rustup target add`에 사용
  appliesTo?(project: ProjectInfo): Promise<boolean>;
                              // 프로젝트별 적용 여부 (TASK-041). false면 칩 숨김 +
                              //   필수 칩 프롬프트·기본값 시딩 생략. 미구현 = 항상 적용
}
```

**계약 규칙 (칩)**

- UI는 `appliesTo` predicate 결과만 참조하며 언어 무지를 유지한다(BR-003). CMake는 `CMakePresets.json` 유무로 **Preset 칩 ↔ profile/architecture 칩**을 상호 배타 노출한다(TASK-041).
- `chips` 배열 순서 = 상태바 표시 순서(ADR-003).

---

## 3. 프로젝트·선택·액션 타입

```ts
/** 감지된 프로젝트. */
export interface ProjectInfo {
  id: string;             // `${adapterId}:${워크스페이스 기준 manifestPath 상대경로}` — 기계 독립 (ADR-006)
  name: string;           // 표시 이름 (패키지명 등)
  adapterId: string;
  manifestPath: string;   // 매니페스트 절대 경로
  workspaceFolder: vscode.WorkspaceFolder;   // 멀티루트 대응
}

/** 프로젝트별 칩 선택 상태. 칩 선택만 담는다 — 오버레이는 InvocationConfig로 별도 전달 (OQ-002). */
export interface Selection {
  projectId: string;
  values: Record<string, ChipValue>;   // chipId → 선택 값 (profile 칩 포함)
}
// runArgs는 InvocationConfig.runArgs로 승격 — (프로젝트 × profile)별 저장 (ADR-011)
```

```ts
/** 어댑터가 지원하는 액션 버튼. */
export interface ActionCapabilities {
  build: boolean;               // '빌드' 개념 존재 여부. false면 빌드 버튼 미표시 (Python)
  runRequiresBuild?: boolean;   // 【구현 반영】 run 전에 build가 필요한가 — run이 사전 빌드된
                                //   산출물 실행인 어댑터(CMake)가 true. 단일 명령 run은 생략(false)
  debugRequiresBuild?: boolean; // 【구현 반영】 디버그 플로우(§7.4)가 디버거 기동 전에 빌드하는가.
                                //   기본값 = build. Node는 false (npm 스크립트를 직접 디버그, ADR-016).
                                //   build가 false면 무시
  // run·debug는 전 언어 공통이라 선언 불필요
}

/** Task 실행 결과 — TaskRunner가 표면화 (ADR-002). */
export interface TaskResult {
  exitCode: number | undefined;
  succeeded: boolean;   // exitCode === 0
}
```

```ts
// 【구현 반영】 Run Group(§9)을 위한 장수명 Task 시작 계약 (C-6 / ADR-015) — 기준 계약 문서 미기재
export interface StartResult {
  started: boolean;   // 프로세스 spawn 성공 여부 (Run Group readiness 신호)
}

export interface StartedTask {
  readonly lockKey: string;
  readonly ready: Promise<StartResult>;   // 프로세스 spawn 시 resolve
  readonly done: Promise<TaskResult>;     // 프로세스 종료 시 resolve
  terminate(): void;                      // teardown 시 Task 중지
}
```

> `runRequiresBuild`는 기준 계약 문서에서 계약 규칙 서술로만 존재하고 `ActionCapabilities` 타입 블록에는 없었다. `debugRequiresBuild` · `StartResult` · `StartedTask`는 구현에서 추가된 멤버다. 【구현 반영】

---

## 4. LanguageAdapter 인터페이스 (핵심 계약)

```ts
export interface LanguageAdapter {
  readonly id: string;                    // 'cargo' | 'cmake' | 'dotnet' | 'python'
                                          // 【구현 반영】 + 'go' | 'node'
  readonly displayName: string;           // 'Rust (Cargo)' 등
  readonly actions: ActionCapabilities;
  readonly chips: ChipDescriptor[];       // 상태바 칩 (순서 = 표시 순서, ADR-003)
  readonly manifestGlobs: string[];       // 감지·감시 글롭. 예: ['**/Cargo.toml'] (F1·F17)
  readonly requiredExtensions: string[];  // 필요 확장 ID (F14)

  readonly canCreateProject: boolean;     // F20 — 새 프로젝트 생성 지원 여부 (§5)
  readonly optionCatalog: OptionSpec[];   // ADR-012 — 설정 페이지 옵션 카탈로그 (§6)
  readonly configCategories: string[];    // ADR-012 — 지원 설정 카테고리 (가변, Python 리트머스)

  listProjects(manifests: vscode.Uri[]): Promise<ProjectInfo[]>;   // 글롭 결과 기반 (ADR-006)

  // config = 활성 (프로젝트 × 구성) 호출 오버레이 — 별도 인자로 전달 (OQ-002 확정 2026-08-15)
  createBuildTask(project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task;
                                          // actions.build === false면 미호출 (ADR-002)
  createRunTask(project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task;
                                          // config.runArgs 주입 (F16)
  createDebugConfig(project: ProjectInfo, sel: Selection, config: InvocationConfig): Promise<vscode.DebugConfiguration>;
  resolveExecutable(project: ProjectInfo, sel: Selection, config: InvocationConfig): Promise<string>;
                                          // 디버그 전 실행 경로 해석 (ADR-005)

  prepareInvocation?(project: ProjectInfo, sel: Selection, config: InvocationConfig): Promise<void>;
                                          // 선택적 — 2단계 툴체인 사전 단계 (§7, ADR-014)

  createProject(target: NewProjectTarget): ProjectCreation;   // F20 (§5)

  invalidateCache(project?: ProjectInfo): void;   // 매니페스트 변경 시 캐시 무효화 (F17)

  collectDiagnostics(): Promise<DiagnosticProbe[]>;
                                          // 【구현 반영】 F19 — Doctor 진단 프로브 (§8) — 기준 계약 문서 미기재
}
```

**계약 규칙**

- 어댑터는 `vscode.Task` **객체 생성까지만** 책임진다. 실행·종료 코드 감지는 `TaskRunner`가 전담한다(ADR-002).
- **캐노니컬 파일 편집 메서드는 없다** — 확장은 사용자 빌드 파일(Cargo.toml 등)을 절대 편집하지 않는다(영구 불변식, ADR-013 / D-15). 설정 영속화·공유는 프로파일 export/import(F12), 오버레이는 호출 시 주입(ADR-011).
- Task는 `ProcessExecution`(배열 인자)로 만든다 — 셸 이스케이프 차단(NFR-002). 예외는 §6의 preBuild/postBuild.
- 경로·파일 접근은 `vscode.Uri` 기반, OS 경로 형식 가정 금지 — 원격 안전(ADR-008).
- **run이 빌드를 요구하는 경우**(`runRequiresBuild: true`, CMake): 오케스트레이터가 run 전에 build를 돌리고, 동기 run Task는 `prepareInvocation`이 데운 캐시에서 실행 경로를 읽는다(TASK-035).
- **디버거 확장은 동적일 수 있다**: CMake는 컴파일러(File API `toolchains`)에서 디버거를 자동판별하므로 정적 `requiredExtensions`가 아니라 `createDebugConfig` 내부에서 판별된 확장을 보장(ensure)한다(ADR-009/ADR-014). 구현의 `cmakeAdapter.requiredExtensions`는 `[]`이다. 【구현 반영】

---

## 5. 프로젝트 생성 계약 (F20)

시작 마법사(F20)를 위한 프로젝트 생성 능력(ADR-010). 네이티브 스캐폴더가 있는 언어는 Task를, 없는 언어는 확장이 쓸 템플릿 파일 목록을 반환한다(D-13).

```ts
export interface NewProjectTarget {
  folderUri: vscode.Uri;   // 생성 대상 폴더 (빈 워크스페이스 폴더 또는 사용자 선택)
  projectName: string;     // 새 프로젝트 이름 (= 생성될 `<name>/` 서브폴더)
}

// 【구현 반영】 네이티브 생성 Task의 task type — package.json contributes.taskDefinitions에
// 등록되어 "unknown task type" 경고를 내지 않는다. 기준 계약 문서 미기재.
export const NEW_PROJECT_TASK_TYPE = 'devswitcher-newproject';

export interface ProjectFile {
  relativePath: string;    // 새 프로젝트 폴더 기준 상대 경로
  content: string;
}

// 네이티브 스캐폴더 有 → task (TaskRunner 실행), 無 → files (Orchestrator가 workspace.fs로 작성)
export type ProjectCreation =
  | { kind: 'task'; task: vscode.Task }
  | { kind: 'files'; files: ProjectFile[] };
```

**계약 규칙 (F20)**

- 네이티브 스캐폴더가 있으면(`cargo new` / `dotnet new console`) 확장은 파일을 직접 쓰지 않는다(SSOT·위임, ADR-007/ADR-010).
- 네이티브 스캐폴더가 없는 언어는 예외(D-13) — 확장이 `workspace.fs`로 최소 템플릿을 작성한다. 구현 기준 `files` 방식: **CMake · Python · Go · Node** / `task` 방식: **Cargo · .NET**. 【구현 반영 — Go·Node는 기준 계약 문서 미기재】
- 네이티브 도구 부재 시(task 실패) Doctor 경로로 연결(F19).
- 생성 후 상태 반영은 refresh(scan) + ManifestWatcher(F17) 경로를 재사용한다. 생성 성공 시 새 프로젝트를 자동 활성 전환한다(OQ-001 확정 2026-08-16).
- 기준 계약 문서의 "v1 스위처 자동 등장은 Rust만" 문구는 초기 계획 기준이다 — v1.0.0은 6개 어댑터 모두 `listProjects` 실구현으로 생성 즉시 스위처에 등장한다. 【구현 반영】

---

## 6. 호출 구성 오버레이·옵션 카탈로그

호출 구성(계층 ③)은 캐노니컬 파일을 편집하지 않고 `(projectId × profile)` 단위로 저장되며, 어댑터가 Task 조립 시 **언어별 메커니즘으로 주입**한다(ADR-011). 값의 정의(계층 ②)는 여전히 캐노니컬 파일에만 있다(ADR-007).

```ts
export type OptionValue = string | number | boolean | string[];

/** 한 (프로젝트 × profile)에 적용되는 호출 구성 오버레이. 파일 미편집, 호출 시 주입. */
export interface InvocationConfig {
  compiler?: Record<string, OptionValue>;   // 카탈로그 옵션 id → 값 (예: opt-level)
  linker?: Record<string, OptionValue>;
  outputDir?: string;                       // 출력 위치 (예: CARGO_TARGET_DIR)
  env?: Record<string, string>;             // 환경변수 (예: PYTHONPATH)
  runArgs?: string[];                       // 실행 인자 (F16 승격)
  preBuild?: string[];                      // 빌드/실행 전 명령 (ShellExecution)
  postBuild?: string[];                     // 빌드/실행 후 명령
}
```

```ts
/** 설정 페이지가 렌더하는 옵션 카탈로그 항목 (ADR-012). 어댑터가 선언 → UI는 이것만 안다. */
export interface OptionSpec {
  id: string;                 // 예: 'opt-level'
  category: string;           // 'compiler' | 'linker' | 'output' | 'env' | 'buildEvent' | 'runArgs'
  label: string;
  description: string;        // 옵션을 잘 모르는 개발자용 교육 텍스트
  example: string;            // 입력 필드 placeholder로 쓰이는 순수 값 (예: 'lld')
  injectsAs?: string;         // 【구현 반영】 주입 형태 힌트 — `<value>` 자리표시자 포함
                              //   (예: 'RUSTFLAGS=-C linker=<value>'). example과 분리해
                              //   사용자가 주입형을 그대로 붙여넣는 실수를 방지. 도움말 줄에 표시
  docUrl?: string;            // 【구현 반영】 공식 문서 링크 — 도움말 줄에 표시
  type: 'enum' | 'bool' | 'int' | 'string' | 'stringList';
  allowedValues?: string[];   // enum일 때 드롭다운 값
  defaultValue?: OptionValue;
  injection: 'config' | 'env' | 'flag' | 'preTask' | 'postTask';   // 주입 방식
}
```

**계약 규칙 (호출 구성)**

- UI/오케스트레이터는 `InvocationConfig` · `OptionSpec[]`만 알고 언어를 모른다(INV-2).
- 주입 시점(configure/build/run)과 방식은 **어댑터 내부 사항**이다. cargo는 빌드 시점, cmake는 configure+build 분리, dotnet은 `-p:` 빌드 시점, python/node는 실행 시점 중심.
- Task 생성 메서드는 활성 `InvocationConfig`를 **별도 인자 `config`로** 받는다(OQ-002 확정). 오버레이 해석·전달은 오케스트레이터 책임.
- 구성(profile) 목록은 캐노니컬 파일에서 읽으며 확장이 지어내지 않는다.
- preBuild/postBuild는 사용자 자유 명령이므로 `ShellExecution`을 허용한다(NFR-002의 문서화된 예외).
- **v1은 주입만** — 오버레이를 캐노니컬 파일에 영구 반영(편집/승격)하는 기능은 v2.

---

## 7. prepareInvocation 훅 (2단계 툴체인)

```ts
prepareInvocation?(project: ProjectInfo, sel: Selection, config: InvocationConfig): Promise<void>;
```

- **목적:** 동기 단일 Task 모델로 표현하지 못하는 2단계 툴체인의 **비동기 사전 단계**. 오케스트레이터가 build/run/debug Task 실행 전에 `await`한다.
- **CMake(유일한 구현체):** 여기서 configure(`cmake -S -B -D…`)를 수행해 오버레이 `-D` 플래그를 주입하고, build Task는 `cmake --build` 단일 명령으로 유지한다(ADR-014). 타깃·실행 경로는 CMake File API(codemodel-v2)의 `artifacts`로 해석한다(경로 추측 금지). 프리셋 활성 시 `cmake --preset <name>`이 컴파일러+제너레이터+빌드타입을 인코딩한다(TASK-041).
- **단일 명령 빌드 어댑터**(cargo/dotnet/python/go/node)는 미구현(생략)한다.
- **실패 시** `DevSwitcherError`를 throw → 오케스트레이터가 호출을 중단한다.

---

## 8. 진단 계약 (F19 Doctor)

> 【구현 반영】 이 절 전체는 `src/core/types.ts` §13에만 정의되어 있고 기준 계약 문서에는 없다. 어댑터는 원시 `DiagnosticProbe[]`를 방출하고(vscode/exec 호출 소유), 순수 코어(`core/diagnostics.ts`)가 상태·정렬을 도출해 `DiagnosticItem[]`으로 만든다 — Doctor 자체는 어댑터 무지를 유지한다(상세설계서 §13.5).

```ts
export type DiagnosticStatus = 'ok' | 'warn' | 'error' | 'info';
export type DiagnosticTier = 1 | 2 | 3;   // 1 완전자동(확장 설치/rustup target) ·
                                          // 2 반자동(OS 설치 명령 실행) · 3 안내만(WSL/Docker)
export type DiagnosticSeverity = 'critical' | 'optional' | 'info';

/** Doctor UI가 수행할 수 있는 해결 액션. 어댑터 무지. */
export type DiagnosticResolution =
  | { kind: 'installExtension'; extensionId: string }   // tier 1
  | { kind: 'installTarget'; triple: string }           // tier 1 (rustup target add)
  | { kind: 'runCommand'; command: string; args: string[] }   // tier 2
  | { kind: 'openUrl'; url: string };                   // tier 2/3 안내

/** 어댑터가 방출하는 원시 점검 (순수 데이터 — vscode 없음). */
export interface DiagnosticProbe {
  id: string;          // 안정 id, 예: 'cargo' | 'vadimcn.vscode-lldb'
  label: string;       // 표시 이름
  severity: DiagnosticSeverity;
  present: boolean;    // 설치/사용 가능 여부
  detail?: string;     // 버전 문자열 등
  tier: DiagnosticTier;
  resolution?: DiagnosticResolution;
}

/** Doctor UI가 렌더하는 분류된 점검 (상태는 프로브에서 도출). */
export interface DiagnosticItem {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail?: string;
  tier: DiagnosticTier;
  resolution?: DiagnosticResolution;   // status가 'ok'면 제거됨
}
```

---

## 9. Run Group 타입

> 【구현 반영】 이 절 전체는 `src/core/types.ts` §9에만 정의되어 있고 기준 계약 문서에는 없다(C-6 / MS-013 / MS-018, ADR-015/ADR-018). 여러 프로젝트를 의존 순서로 함께 기동한다(예: auth → api → web). v1은 run 전용 멤버만 지원하고, 위상 정렬 플랜 도출은 순수 로직(`core/runGroupPlan.ts`)이다.

```ts
/** 멤버 readiness 게이트 (MS-018 / ADR-018). 생략 시 프로세스 spawn = ready (ADR-015 기본). */
export type ReadinessProbe =
  | { kind: 'port'; port: number; timeoutMs: number }   // 127.0.0.1:port TCP 연결 성공 시 ready
  | { kind: 'http'; url: string; expectStatus?: number; timeoutMs: number };
                                                        // GET url이 expectStatus(기본 200) 반환 시 ready

export interface RunGroupMember {
  projectId: string;        // 감지된 프로젝트의 ProjectInfo.id — 그룹 내 유일
  dependsOn: string[];      // 먼저 시작해야 하는 형제 멤버의 projectId (자기참조/미참조/순환은 거부)
  readiness?: ReadinessProbe;   // 타임아웃 시 그룹 기동 중단 (시작 실패와 동일 취급)
}

/** 의존 순서로 함께 기동하는 프로젝트 집합. */
export interface RunGroup {
  id: string;       // 안정 id (예: `group:<token>`)
  name: string;     // 표시 이름
  members: RunGroupMember[];
}
```

---

## 10. 영속 상태·프로파일 Export 타입

> 【구현 반영】 `src/core/types.ts`에 함께 정의된 상태 저장 계약(ADR-001 workspaceState, 무DB). 값 자체는 저장하지 않고 선택·오버레이만 저장한다(ADR-007).

```ts
export const PERSISTED_STATE_KEY = 'devSwitcher.state.v1';

export interface PersistedState {
  activeProjectId?: string;
  selections: Record<string, Record<string, ChipValue>>;       // projectId → (chipId → 값)
  invocation: Record<string, Record<string, InvocationConfig>>; // projectId → profileName → 오버레이
  groups: RunGroup[];   // MS-013 추가 필드 — 이전 상태는 로드 시 []로 정규화.
                        // 그룹은 워크스페이스 로컬이며 v1 프로파일 export(F12) 비포함
}

export const PROFILE_EXPORT_VERSION = 1;

/** `devswitcher.profile.json` export/import 페이로드 (F12). */
export interface ProfileExport {
  version: number;
  exportedAt: string;   // ISO 8601
  selections: Record<string, Record<string, ChipValue>>;        // 기계 독립 projectId (ADR-006)
  invocation: Record<string, Record<string, InvocationConfig>>; // runArgs는 invocation[pid][profile].runArgs에 위치
}
// activeProjectId는 기계/세션 종속이라 의도적으로 export에서 제외
```

---

## 11. 어댑터별 계약 구현 요약

v1.0.0 구현 기준(각 `src/adapters/*/​*Adapter.ts`의 실제 선언값). 기준 계약 문서 §6 표(4개 어댑터·스텁 표기)를 대체한다. 【구현 반영】

| 어댑터 (`id`) | displayName | chips (id) | actions | manifestGlobs | requiredExtensions | createProject | configCategories |
|---|---|---|---|---|---|---|---|
| `cargo` | Rust (Cargo) | profile · architecture · features · target | build: true | `**/Cargo.toml` | `vadimcn.vscode-lldb` | task (`cargo new`) | compiler · linker · output · env · buildEvent · runArgs |
| `cmake` | C++ (CMake) | preset · profile · architecture · target (preset ↔ profile/architecture 상호 배타, `appliesTo`) | build: true, runRequiresBuild: true | `**/CMakeLists.txt` | (없음 — 디버거는 동적 판별, §4) | files (최소 템플릿) | compiler · linker · output · env · buildEvent · runArgs |
| `dotnet` | C# (.NET) | profile · architecture · target | build: true | `**/*.csproj` | `ms-dotnettools.csdevkit` | task (`dotnet new`) | compiler · linker · output · env · buildEvent · runArgs |
| `python` | Python | environment · target | build: false | `**/pyproject.toml` | `ms-python.python` | files (`pyproject.toml` 템플릿) | env · runArgs |
| `go` | Go | target | build: true | `**/go.mod` | `golang.go` | files (템플릿) | compiler · env · runArgs |
| `node` | Node.js / TypeScript | script | build: true, debugRequiresBuild: false | `**/package.json` | (없음 — js-debug는 VSCode 내장) | files (템플릿) | env · runArgs |

- `canCreateProject`는 6개 어댑터 모두 `true`.
- `prepareInvocation` 구현체는 `cmake` 단독.
- **Python 리트머스:** `actions.build: false` + `configCategories: ['env','runArgs']` — profile/architecture/build 없이 스위처+환경+실행+디버그가 동작하며, 설정 페이지에서 compiler/linker/output 카테고리가 선언대로 사라진다(INV-2 검증).

---

## 12. 오류 계약

- `DevSwitcherError`는 `src/core/errors.ts`(vscode 무의존)에 정의되고 `src/core/types.ts`에서 re-export된다. 경계 계층(예: `cargoBridge`)은 순수 Node 단위 테스트 유지를 위해 `./errors`에서 직접 import한다. 【구현 반영 — 기준 계약 문서 미기재】
- `prepareInvocation` 실패는 throw로 전파되어 오케스트레이터가 호출을 중단한다(§7).

---

## 13. 제약 사항

| 항목 | 값 |
|------|-----|
| 통신 방식 | in-process 함수 호출 (직렬화·네트워크 없음) |
| 실행 위임 | `vscode.Task`(ProcessExecution) → TaskRunner (ADR-002) |
| 셸 사용 예외 | preBuild/postBuild 사용자 명령만 ShellExecution 허용 (NFR-002 예외) |
| 경로 규약 | `vscode.Uri` 기반, OS 경로 형식 가정 금지 (ADR-008) |
| 동시 실행 | 동일 프로젝트 진행 중 Task 있으면 신규 요청 거부 (E9) |
| 캐노니컬 파일 | 읽기 전용 — 확장은 절대 편집하지 않음 (ADR-013, 영구 불변식) |

---

## 14. 미확정 사항

| ID | 항목 | 내용 | 상태 |
|----|------|------|------|
| DOC07-OQ-01 | Cargo 커스텀 프로파일 | 기준 계약 문서 §8은 "dev/release/커스텀 `--profile`"로 기술하나, 구현 코드 주석은 커스텀 `[profile.*]` 파싱을 이연(deferred)으로 표기 — v1.0.0 시점 커스텀 프로파일 노출 여부 | **미확정** |
| DOC07-OQ-02 | .NET 커스텀 configuration | 기준 계약 문서 §8은 "-c Debug/Release + 커스텀"으로 기술하나, 구현 코드 주석은 커스텀 configuration을 후순위로 표기 | **미확정** |
| DOC07-OQ-03 | Go·Node 언어별 호출 구성 능력 상세 | 기준 계약 문서 §8(언어별 주입 메커니즘 SSOT 표)에 Go·Node 열이 없음 — 본 문서는 구현의 `configCategories` 선언 사실만 기재하며, 카테고리별 주입 메커니즘 분류는 기준 문서 부재로 상세 기술하지 않음 | **미확정** (기준 문서 개정 필요) |

> 기준 계약 문서 자체의 미확정(OQ-001 활성 전환, OQ-002 config 전달 방식)은 각각 2026-08-16 / 2026-08-15에 **Resolved**되어 본 문서 본문에 확정 내용으로 반영했다.

---

## 15. 근거 / 출처

| ID | 근거 | 출처 |
|----|------|------|
| SRC-01 | 계약 구조·계약 규칙·언어별 능력 표 | `.cowork/03_design_artifacts/interface_contract.md` (v1) |
| SRC-02 | 전체 타입 시그니처 (단일 정의 지점) | `src/core/types.ts` |
| SRC-03 | 어댑터별 선언값 (§11 표) | `src/adapters/*/​*Adapter.ts`, `src/adapters/index.ts` |
| SRC-04 | 설계 결정 | ADR-001~003, 005~016, 018 (`.cowork/03_design_artifacts/adrs/`) |
