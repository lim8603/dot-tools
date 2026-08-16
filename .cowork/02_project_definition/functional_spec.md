# Functional Specification

> 기능 명세서 — 각 기능이 실제로 어떻게 동작하는지 상세히 정의한다

---

## 문서 정보

| 항목 | 내용 |
| --- | --- |
| 관련 Intent | INT-001 |
| 버전 | v1 (설계서 v1.1 반입) |
| 출처 | `.cowork/06_evolution/imported_context/DevSwitcher-Tools_Detailed-Design.md`(우선), `.cowork/06_evolution/imported_context/DevSwitcher-Tools_Concept-Design.md` |

> ID는 설계서의 `F1~F19` 번호 체계를 그대로 승계해 추적성을 유지한다. 상세 시퀀스/에러 처리는 상세설계서 해당 절을 기준으로 하고, 이 문서는 구조화된 캐노니컬 명세로 유지한다.

---

## 기능 요약 (F1~F19)

| ID | 기능 | v1 범위 | 우선순위 | 근거 설계 |
|----|------|---------|----------|-----------|
| F1 | 프로젝트 자동 감지 (글롭 스캔 + 멀티루트) | 포함 | P1 | 상세 §3.3, §8.2 (DD-06) |
| F2 | 프로젝트 스위처 (상태바 칩 + QuickPick) | 포함 | P1 | 상세 §5.3 |
| F3 | 어댑터 능력 선언 — 선언적 칩 배열(`ChipDescriptor[]`) | 포함 | P1 | 상세 §4, §5.1 (DD-03) |
| F4 | 설정 영속화(SSOT) — 값은 캐노니컬 파일, 선택은 workspaceState | 포함 | P1 | 상세 §6 (DD-01·DD-07) |
| F5 | 액션 오케스트레이션 (빌드/디버그/실행 위임) | 포함 | P1 | 상세 §7 |
| F6 | 상태 표시·검증·에러 상태 UX | 포함 | P1 | 상세 §5.4 |
| F7 | 빌드 변형(프로파일) 제어 | 포함 | P2 | 상세 §8.3 |
| F8 | 빌드·디버그·실행 상태바 버튼 (Task API) | 포함 | P1 | 상세 §7 (DD-02) |
| F9 | 타깃/엔트리포인트 선택 | 포함 | P1 | 상세 §8.3 |
| F10 | 아키텍처 선택 (target triple) | 포함 | P2 | 상세 §8.3 |
| F11 | 환경(런타임) 선택 — venv/conda | **정의만** (PythonAdapter 구현 시 활성화) | P3 | 상세 §1.2 |
| F12 | 프로파일 export/import | 포함 | P2 | 상세 §6.3 |
| F13 | 문제 매처·단축키 (Task API problem matcher) | 포함 | P1 | 상세 §7.2 |
| F14 | 어댑터별 확장 의존성 안내 | 포함 (F19 1단계로 구현) | P2 | 상세 §13.3 (DD-09) |
| F15 | Cargo features 칩 (`--features`/`--no-default-features`) | 포함 | P2 | 상세 §8.3 (DD-04) |
| F16 | 실행 인자(run args) 설정 | 포함 | P2 | 상세 §8.4, §10 (DD-04) |
| F17 | 매니페스트 파일 감시 (Cargo.toml 변경 자동 갱신) | 포함 | P1 | 상세 §9 (DD-04) |
| F18 | 원격 개발 환경 호환 (WSL/Dev Containers/Remote-SSH) | 포함 | P1 | 상세 §12 (DD-08) |
| F19 | 환경 진단·의존성 처리 (Doctor) | 포함 | P1 | 상세 §13 (DD-09) |
| **F20** | **새 프로젝트 시작 마법사** (매니페스트 없는 폴더에서 언어 선택 → 네이티브 도구로 기본 템플릿 생성) | 포함 (**전 언어 실동작**) | P1 | 신규 (ADR-010) |
| **F21** | **호출 구성 오버레이** (컴파일옵션·출력·링커·env·빌드전후이벤트를 파일 편집 없이 (프로젝트×구성)별 저장 → 호출 시 `--config`/env 주입) + 설정 페이지 옵션 브라우저 | 포함 (**Rust 실데이터**, 카탈로그 프레임워크는 전 언어) | P2 | 신규 (ADR-011·012) |

> v1 실구현은 스위치·빌드·디버그 기준 **CargoAdapter(Rust)** 단독. CMake/Dotnet/Python은 칩 선언 스텁만 두며, 액션 시 "지원 예정" 안내(E8).
> **단, F20(시작 마법사)은 예외 — 4개 언어 모두 v1 실동작**한다(네이티브 init 호출은 단순해 전체 어댑터 실구현이 필요 없음).
> **F21(호출 구성)**: 오버레이 저장·주입 프레임워크와 옵션 카탈로그 구조는 전 언어 공통이나, 실데이터(cargo 옵션 카탈로그·주입)는 v1 Rust만. 언어별 능력 매핑은 `interface_contract.md` §8.
> **범위 조정**: 캐노니컬 파일 국소 편집(구 §8.7, `[profile.*]` 스칼라 쓰기)은 **v2로 이월** — v1은 파일을 읽기만 하고 호출 시점 주입(F21)으로 옵션을 적용한다(ADR-011).

---

## 핵심 동작 흐름 상세

### F1 — 프로젝트 자동 감지

| 항목 | 내용 |
| --- | --- |
| 관련 요구사항 | FR-001 |
| 우선순위 | P1 |
| 상태 | Approved (설계 확정, 미구현) |

**기본 흐름**
1. `activate()`에서 모든 `workspaceFolder` × 모든 어댑터의 `manifestGlobs`로 글롭 스캔(`workspace.findFiles('**/Cargo.toml', '**/target/**')`).
2. 루트 매니페스트가 `[workspace]`면 `cargo metadata`가 멤버 전체를 반환 → 멤버 패키지 각각을 `ProjectInfo`로.
3. 독립 매니페스트면 단일 `ProjectInfo`. `ProjectInfo.id = ${adapterId}:${상대경로}`.
4. 멀티루트는 폴더별 반복. 중복 발견 시 workspace 쪽으로 병합.

**예외 흐름**: 프로젝트 0개 → 상태바 미표시, watcher는 유지(E3). 툴체인 미설치 → 경고 칩(E1).

**검증 기준**
- [ ] 단일 패키지·cargo workspace(멤버 N)·멀티루트에서 프로젝트가 정확히 열거된다.
- [ ] `target/` 하위 매니페스트는 제외된다.

### F2 — 프로젝트 스위처

**기본 흐름**: 프로젝트 칩 클릭 → QuickPick으로 감지된 전체 프로젝트(언어 무관) 나열 → 선택 시 활성 프로젝트 전환 → `StateStore`에서 해당 프로젝트의 마지막 선택 복원 → 상태바 재렌더링.
**후행 조건**: 프로젝트별 선택 상태가 독립 유지된다(Rust ↔ C++ 오가도 각자 기억).

### F3 — 어댑터 능력 선언 (칩 프레임워크)

**규칙**: 상태바는 활성 어댑터의 `chips: ChipDescriptor[]`를 **순회**하며 그린다. 어댑터를 추가·변경해도 상태바/QuickPick/설정 패널 코드는 수정하지 않는다.
**리트머스**: PythonAdapter는 profile·architecture·build 칩을 선언하지 않고 environment 칩을 선언한다 → 칩 구성이 선언대로 바뀌면 프레임워크가 검증된 것(DoD 6).

### F5 / F8 — 액션 오케스트레이션 (빌드/실행/디버그)

**빌드**: required 칩 검증 → `adapter.createBuildTask()` → `TaskRunner.run()`(Task API, 종료 코드 감지) → 실패 시 Problems 포커스 제안.
**실행**: required 칩 검증 → `createRunTask()`(cargo run은 빌드 포함) → 실행.
**디버그(§7.4)**: required 칩 검증 → 필수 확장(CodeLLDB) 온디맨드 확인 → 빌드 Task 실행(실패 시 중단, E5) → `resolveExecutable()`로 실행 파일 경로 해석(DD-05) → `createDebugConfig()` → `vscode.debug.startDebugging()`.

**검증 기준**
- [ ] 고의 컴파일 에러 시 Problems 패널에 진단 표시(problem matcher), 종료 코드 실패 감지.
- [ ] 빌드 실패 시 디버그가 중단된다.
- [ ] 디버그 시 runArgs가 전달된다.

### F6 — 상태·에러 표시

| 상태 | 상태바 표현 |
| --- | --- |
| 프로젝트 0개 | 칩 전체 미표시 |
| 툴체인 미설치 | 경고 칩 1개 → 클릭 시 Doctor |
| 매니페스트 파싱 실패 | 프로젝트 칩 errorBackground, 마지막 정상 캐시로 계속 동작 |
| required 칩 미선택 | warningBackground, 액션 시 해당 QuickPick 먼저 표시 |
| 작업 진행 중 | 액션 버튼 `$(sync~spin)` + disabled(중복 실행 방지) |

### F17 — 매니페스트 감시

**흐름**: `FileSystemWatcher`가 `manifestGlobs` 감시 → create/change/delete 이벤트 → 500ms 디바운스 → 해당 어댑터 `invalidateCache()` → 변경된 workspaceFolder만 재스캔 → `reconcile()` → 상태바 갱신. `target/`, `node_modules/` 제외. 확장은 캐노니컬 파일을 편집하지 않으므로(ADR-013) 재스캔 트리거는 외부 편집·F20 생성뿐이다.

### F19 — 환경 진단·의존성 처리 (Doctor)

**원칙**: 우아한 성능 저하 — 없는 것에 의존하는 기능만 비활성화하고 복구 경로를 항상 제시.
**3단계**: ①완전 자동(확장 설치, `rustup target add`) ②반자동(툴체인 설치 명령 대행) ③안내만(WSL 본체, Docker Desktop).
**Doctor 명령**: 활성 어댑터 전제조건 일괄 점검 + 항목별 해결 액션(QuickPick). 진입점: 명령 팔레트, E1 경고 칩, 온디맨드 설치 취소.

---

### F20 — 새 프로젝트 시작 마법사

| 항목 | 내용 |
| --- | --- |
| 관련 요구사항 | FR-013 |
| 관련 ADR | ADR-010 |
| 우선순위 | P1 |
| 상태 | Approved (세션 #001 신규 결정) |

**기본 흐름**
1. 명령 `DevSwitcher: 새 프로젝트 시작`(`devSwitcher.newProject`) **수동 호출**.
2. 대상 폴더 확인(현재 워크스페이스 폴더 또는 선택).
3. 언어 QuickPick: Rust / C++ / C# / Python.
4. 해당 어댑터가 네이티브 도구로 **기본 템플릿 생성에 위임**:
   - Rust → `cargo new`(또는 `cargo init`)
   - C# → `dotnet new console`
   - C++ → cmake 최소 템플릿(`CMakeLists.txt` + `main`)
   - Python → 기본 `pyproject.toml`
5. 생성 후 ManifestWatcher(F17)가 새 매니페스트를 감지 → 스위처에 자동 등장 → 상태바 렌더.

**특이사항**
- **전 언어 v1 실동작** — 스위치/빌드/디버그가 Rust 단독인 것과 달리, 시작 마법사는 4개 언어 모두 동작(네이티브 init 위임이 단순).
- 트리거는 **수동 호출만** — 빈 폴더 자동 감지·자동 제안 없음.
- 네이티브 도구(cargo/dotnet/cmake/python) 부재 시 → Doctor/온디맨드 안내로 연결(F19 경로 재사용).

**검증 기준**
- [ ] 빈 폴더에서 명령 호출 → 언어 선택 → 매니페스트 생성 → 스위처 자동 등장.
- [ ] 4개 언어 각각 네이티브 기본 템플릿으로 생성된다.
- [ ] 네이티브 도구 부재 시 Doctor 안내로 연결된다.

---

### F21 — 호출 구성 오버레이 + 설정 페이지

| 항목 | 내용 |
| --- | --- |
| 관련 요구사항 | FR-014 |
| 관련 ADR | ADR-011(오버레이), ADR-012(설정 페이지·카탈로그) |
| 관련 US | US-010, US-012 |
| 우선순위 | P2 |
| 상태 | Approved (세션 #002 신규 결정) |

**개념**: VS2026식 "프로젝트 속성"(출력 위치/이름, 컴파일러/링커 옵션, 환경변수, 빌드 전/후 이벤트)을 **캐노니컬 파일을 편집하지 않고** `(프로젝트 × 구성)`별로 저장했다가, 빌드/실행 호출 시 `--config`/env/flag로 **대신 주입**한다. "중계가 명령을 조립해 대신 실행"하는 모델(F16 runArgs의 일반화).

**설정 페이지 (ADR-012)**
- 형태: `WebviewPanel`(에디터 탭) = "설정 페이지"(모달 다이얼로그 아님). VS 속성 페이지 메타포.
- 레이아웃: 상단 `프로젝트 / 구성(profile)` 스위처 → 좌측 카테고리 → 중앙 상세(설명·예제·허용값·기본값) → 값 에디터(타입 인식) → 하단 **적용 명령 미리보기**.
- 옵션 브라우저: 개발자가 옵션을 몰라도 되도록 **목록 + 설명 + 예제 + 값 에디트**. enum은 드롭다운, bool은 토글, 숫자/텍스트는 입력.
- 카탈로그·카테고리는 **어댑터가 선언**(번들 데이터) → UI는 언어를 모른다(ADR-003 연장). Python(build=false)은 컴파일러/링커/출력 카테고리 미표시(리트머스).

**기본 흐름 (빌드 시)**
1. 활성 `(프로젝트, 구성)`의 `InvocationConfig` 오버레이를 StateStore에서 로드.
2. 어댑터가 빌드 Task 조립 시 오버레이를 언어별로 접어 넣음(cargo `--config`/env / dotnet `-p:` / cmake `-D` / python env).
3. 전(pre) 명령이 있으면 먼저 실행 → 빌드 Task → 후(post) 명령. (`ShellExecution`, NFR-002 예외)
4. 설정 페이지 미리보기와 실제 실행 명령이 일치.

**언어별 능력**: `interface_contract.md` §8 표를 SSOT로 한다. 요지 — Rust는 빌드 시점 `--config`/RUSTFLAGS로 폭넓게 주입(v1 실데이터), cmake는 configure/build 2단계(v2), dotnet은 `-p:`(v2), python은 env·PYTHONPATH·실행 인자 중심(build 없음).

**범위·경계**
- **v1 = 주입만**. 오버레이를 캐노니컬 파일에 영구 반영(편집/승격)은 **v2**(구 §8.7).
- v1 실데이터는 cargo 옵션 카탈로그·주입만. 나머지 3어댑터는 카탈로그 스텁.
- 오버레이는 DevSwitcher 호출에만 적용(수동 터미널 빌드엔 미적용) — 설계된 동작.

**검증 기준**
- [ ] 같은 프로젝트에서 Debug/Release 구성별로 다른 컴파일 옵션·runArgs·env가 저장·주입된다.
- [ ] 설정 페이지에서 옵션 선택 시 설명·예제가 표시되고, 값 변경이 하단 명령 미리보기에 반영된다.
- [ ] 미리보기 명령과 실제 실행 명령이 일치한다.
- [ ] 빌드 전/후 명령이 순서대로 실행된다.
- [ ] Python 어댑터는 컴파일러/링커/출력 카테고리를 표시하지 않는다(리트머스).
- [ ] 캐노니컬 파일(`Cargo.toml`)은 이 기능으로 수정되지 않는다(v1).

---

## 나머지 기능 (F7·F9·F10·F12·F13·F15·F16·F18)

| ID | 요지 | 검증 기준(요약) |
|----|------|------------------|
| F7 프로파일 | dev/release + `Cargo.toml [profile.*]` 커스텀 | 프로파일 전환이 `cargo --profile`에 반영 |
| F9 타깃 | bin 타깃 + examples, `required` 칩, bin 1개면 자동 선택 | 미선택 시 액션 전 QuickPick 유도(E4) |
| F10 아키텍처 | 설치+미설치 target 열거, 미설치 선택 시 `rustup target add` 확인 실행 | 축약 표시(`x86_64-pc-windows-msvc`→`x64-msvc`), tooltip 전체값 |
| F12 export/import | `devswitcher.profile.json`, projectId 기계 독립 | 라운드트립 + 다른 클론에서 import 시 존재하는 것만 반영 |
| F13 problem matcher | `$rustc` 우선, 자체 정의 폴백 | 진단이 Problems에 표시, Rerun Last Task 호환 |
| F15 features | multiSelect, `default` 처리(`featuresToArgs`) | default 해제→`--no-default-features`, 조합→`--features a,b` |
| F16 run args | 실행/디버그 시 `--` 뒤 프로그램 인자 | `parseArgsLine()` 따옴표 토큰화 |
| F18 원격 | `extensionKind: ["workspace"]`, Uri 기반 경로, cargo가 경로 해석 | WSL에서 F1~F5 동일 동작, 창별 선택 상태 독립 |

---

## 파일 의존성 및 부재·손상 처리 (Graceful Degradation)

**원칙**: 없는 것이 있어도 확장은 죽지 않고, 그것에 **의존하는 기능만** 비활성화하며 복구 경로를 항상 제시한다(§13.1). 확장은 선택적 설정 파일(`settings.json`/`launch.json`)을 **필수로 요구하지 않는다**.

### 파일 의존성 (v1/Rust)

| 파일 | 필요성 | 부재 시 | 근거 |
|------|--------|---------|------|
| `Cargo.toml` (매니페스트) | 감지 기준(사실상 필수) | 프로젝트 0개 → 상태바 침묵, watcher 유지 → 생성 시 자동 등장 | E3 |
| `.vscode/settings.json` | **불필요** | 동작 설정은 declared default, 선택 상태는 workspaceState | DD-01 |
| `.vscode/launch.json` | **불필요** | debug 구성을 프로그램적으로 생성 | DD-05 |
| `devswitcher.profile.json` | 선택(F12) | import 안 하면 그만 | §6.3 |
| cargo/rustup 툴체인 | 실행 필요 | 경고 칩 → Doctor 2단계 | E1 |
| CodeLLDB | 디버그 필요 | 온디맨드 설치 | E7 |
| rustup target | 크로스빌드 필요 | `(미설치)` 표기 + `rustup target add` | §13.4 |

### 부재 vs 손상 구분

- **부재**(파일 없음): 매니페스트 없음 → 침묵(E3).
- **손상**(있지만 파싱 실패): 마지막 정상 캐시 유지 + errorBackground + Output stderr, 저장 시 재시도(E2).
- **값 소멸**(캐노니컬 파일에서 선택 값이 삭제됨): `reconcile`로 해당 값만 제거, 미선택 표시(E10).

**부재 시 능동 복구 (F20, ADR-010)**: 매니페스트가 없는 빈 폴더에서는 명령 `DevSwitcher: 새 프로젝트 시작`(F20)으로 언어를 골라 네이티브 도구(`cargo new` 등)로 기본 템플릿을 생성한다. 즉 **도구 부재(Doctor)처럼 매니페스트 부재도 능동 복구 경로가 있다** — 비대칭 해소. 단, 자동 제안 없이 **수동 호출**이며 파일 생성은 네이티브 도구에 위임한다(확장은 직접 스캐폴드하지 않음).

**검증 기준**
- [ ] `settings.json`/`launch.json` 없이 감지·칩·빌드·실행·디버그가 동작한다.
- [ ] 매니페스트 부재(E3)와 손상(E2)이 서로 다르게 처리된다.
- [ ] 매니페스트 부재 폴더에서 F20으로 새 프로젝트를 시작할 수 있다.

---

## 미확정 사항 (Open Questions)

- OQ-001: 언어 혼재 워크스페이스에서 칩이 나타났다 사라지는 UX(R6) — M6 실사용 후 재검토.

## 관련 근거 / 출처

| ID | 근거 | 출처 |
| --- | --- | --- |
| SRC-001 | 기능 명세 F1~F14 원안 | 개념설계서 §2 |
| SRC-002 | v1 범위·F15~F19·설계 결정 DD-01~09 | 상세설계서 §1.2, §2 |
