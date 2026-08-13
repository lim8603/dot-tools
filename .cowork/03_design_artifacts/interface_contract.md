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
| 출처 | `docs/DevSwitcher-Tools_상세설계서.md` §4 |

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
  values: Record<string, ChipValue>;   // chipId → 선택 값
  runArgs: string[];                    // 실행/디버그 시 프로그램 인자 (F16)
}

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

  createBuildTask(project: ProjectInfo, sel: Selection): vscode.Task;         // actions.build===false면 미호출(ADR-002)
  createRunTask(project: ProjectInfo, sel: Selection): vscode.Task;           // runArgs 포함(F16)
  createDebugConfig(project: ProjectInfo, sel: Selection): Promise<vscode.DebugConfiguration>;
  resolveExecutable(project: ProjectInfo, sel: Selection): Promise<string>;   // 디버그 전 경로 해석(ADR-005)

  persistSetting(project: ProjectInfo, key: string, value: unknown): Promise<void>;  // 캐노니컬 파일 국소 편집(ADR-007)
  invalidateCache(project?: ProjectInfo): void;                              // 매니페스트 변경 시 캐시 무효화(F17)
}
```

**계약 규칙**
- 어댑터는 `vscode.Task` **객체 생성까지만** 책임진다. 실행·종료 코드 감지는 `TaskRunner`가 전담한다(ADR-002).
- Task는 `ProcessExecution`(배열 인자)로 만든다 — 셸 이스케이프 차단(NFR-002).
- 경로·파일 접근은 `vscode.Uri` 기반, OS 경로 형식 가정 금지 — 원격 안전(ADR-008).

---

## 5. F20 확장 — 프로젝트 생성 계약 (ADR-010) 【신규】

시작 마법사(F20)를 위해 `LanguageAdapter`에 **프로젝트 생성 능력**을 추가한다. 실제 파일 생성은 네이티브 도구에 위임하고, 확장은 오케스트레이션만 한다.

```ts
export interface NewProjectTarget {
  folderUri: vscode.Uri;    // 생성 대상 폴더 (빈 워크스페이스 폴더 또는 사용자 선택)
  projectName: string;      // 새 프로젝트 이름
}

export interface LanguageAdapter {
  // ... §4 기존 멤버 ...

  /** F20 — 이 어댑터가 새 프로젝트 생성을 지원하는지. v1: 4개 어댑터 모두 true(스위치/빌드 스텁과 무관) */
  readonly canCreateProject: boolean;

  /**
   * F20 — 네이티브 도구로 기본 템플릿 프로젝트를 생성하는 Task를 만든다.
   * cargo new / dotnet new console / cmake 최소 템플릿 / python 기본 pyproject.toml.
   * 실행은 TaskRunner가 담당(ADR-002). 완료 후 ManifestWatcher(F17)가 새 매니페스트를 감지.
   */
  createProjectTask(target: NewProjectTarget): vscode.Task;
}
```

**계약 규칙 (F20)**
- 확장은 파일을 직접 쓰지 않는다 — 네이티브 도구가 생성(SSOT·위임 원칙, ADR-007/ADR-010).
- 네이티브 도구 부재 시 `requiredExtensions`/툴체인 점검과 동일하게 Doctor·온디맨드 경로로 연결(F19).
- 생성 후 상태 반영은 별도 로직 없이 ManifestWatcher 단일 경로를 재사용한다(F17).

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

## 7. 제약 사항

| 항목 | 값 |
|------|-----|
| 통신 방식 | in-process 함수 호출 (직렬화·네트워크 없음) |
| 실행 위임 | `vscode.Task`(ProcessExecution) → TaskRunner |
| 경로 규약 | `vscode.Uri` 기반, OS 경로 가정 금지 |
| 동시 실행 | 동일 프로젝트 진행 중 Task 있으면 신규 요청 거부(E9) |

---

## 8. 가정 (Assumptions)

| ID | 가정 | 영향 |
|----|------|------|
| ASM-001 | M1에서 4개 어댑터 칩 선언을 스텁으로 전부 작성해 이 인터페이스를 확정한다(Python 리트머스) | 인터페이스 변경 리스크(RSK-005) 완화 |

---

## 9. 미확정 사항 (Open Questions)

| ID | 항목 | 질문 | 상태 |
|----|------|------|------|
| OQ-001 | F20 생성 후 활성 전환 | 생성 직후 새 프로젝트를 자동 활성 프로젝트로 전환할지 | Open |

---

## 10. 관련 근거 / 출처

| ID | 근거 | 출처 | 비고 |
|----|------|------|------|
| SRC-001 | LanguageAdapter/ChipDescriptor 타입 | 상세설계서 §4 | 원문 |
| SRC-002 | F20 프로젝트 생성 계약 | ADR-010 | 세션 신규 |
