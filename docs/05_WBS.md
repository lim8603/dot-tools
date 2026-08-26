# DevSwitcher Tools — WBS (Work Breakdown Structure)

| 항목 | 내용 |
|------|------|
| 문서번호 | 05 |
| 문서명 | WBS (Work Breakdown Structure) |
| 프로젝트 | DevSwitcher Tools (`devswitcher-tools`) |
| 버전 | v1.3.0 |
| 작성일 | 2026-08-17 |
| 개정일 | 2026-08-25 (v1.3.0판) |
| 작성 | AI — Claude Code |
| 승인 | Human |
| 기준 문서 | `.cowork/04_implementation/milestone_registry.md` + `.cowork/04_implementation/task_registry.md` (합성) |

---

## 목차

1. 개요
2. WBS 계층 구조와 전체 현황
3. 버전 사다리·일정 요약
4. Milestone별 WBS (INT-001 — v1.0.0 완주)
   - 4.1 코어 구축 (M0~M6): MS-001 ~ MS-007
   - 4.2 시작 마법사·계약 정리: MS-008 ~ MS-009
   - 4.3 다언어 확장 (C-7): MS-010 ~ MS-012
   - 4.4 Run Group (C-6): MS-013
   - 4.5 v1.0.0 완주 로드맵 (D-21): MS-015 ~ MS-018 → MS-014
5. Post-1.0 백로그 (INT-002): MS-019 ~ MS-020
6. 미확정 항목
7. 표기 주석 (기준 문서 대비 상태 처리)

---

## 1. 개요

이 문서는 DevSwitcher Tools v1.0.0의 공식 WBS다.
Milestone(중간 완료 단위)을 골격으로 하고, 각 Milestone 아래에 실행 단위인 Task를 배치한다.

- **생성 방식**: 합성 — Milestone 목록·상태·비고는 `milestone_registry.md`에서, Task 목록·제목·상태는 `task_registry.md`에서 가져왔다. 상세 Task 문서(`tasks/TASK-*.md`)는 보조 근거로만 참조했다.
- **원칙**: 기준 문서에 없는 내용은 확정 사실로 추가하지 않고 `미확정`으로 표시한다(§6).

### 상태 범례

| 상태 | 의미 |
|------|------|
| Done | 완료 (검증·병합 포함) |
| Deferred | v1.0.0 범위 밖으로 이연 (INT-002 백로그) |

## 2. WBS 계층 구조와 전체 현황

계층: **Intent → Milestone → Task**

| Intent | 내용 | Milestone | Task | 상태 |
|--------|------|-----------|------|------|
| INT-001 | 다언어 통합 상태바 UX VSCode 확장 (v1.0.0 완주) | MS-001~018 (18개) | TASK-001~053 (53개) | **완료** — v1.0.0 (2026-08-17) |
| INT-002 | 원격 디버그·크로스 컴파일 (post-1.0) | MS-019~020 (2개) | 미분해 | Draft — v1.0.0 이후 (D-22) |
| (유지보수) | v1.0.0 이후 실사용 피드백·결함 수정 | MS-021~023 (3개) | TASK-056~065 + v1.2.1·v1.3.0 | **완료** — v1.3.0 (2026-08-25) |

- Milestone 총 23개: **Done 21** (MS-001~018·MS-021~023) / **Deferred 2** (MS-019·020, INT-002 백로그)
- Task 총 65개 (TASK-001~065): **전부 Done**. v1.2.1·v1.3.0은 유지보수 릴리즈로 Task 채번 없이 진행했다 (§7 주석 ④)
- 실구현 언어 **7종**: Rust(Cargo) · C#(Dotnet) · Python · C++(CMake) · Go · Node/TS · **Visual Studio(MSBuild)** 【v1.2.0】

## 3. 버전 사다리·일정 요약

버전 정책(SemVer, D-21): 1.0 이전은 `0.y.z` 개발 단계로 MINOR를 쌓고, **Human의 명시적 완주 선언 시 v1.0.0**으로 승격한다(D-19). 중간 릴리즈(v0.5.0~v0.8.0)는 vsix + git 태그만 생성하고, GitHub Release 페이지·Marketplace 게시는 v1.0.0에서만 수행한다.

| 버전 | Milestone | 핵심 내용 | 릴리즈일 |
|------|-----------|-----------|----------|
| v0.1.0 | MS-007 | 품질·배포 — Doctor·통합테스트·README·첫 VSIX | 2026-08-16 |
| v0.2.0 | MS-008 | 시작 마법사(F20) — 4개 언어 프로젝트 생성 | 2026-08-16 |
| v0.3.0 | MS-010·011·012 | C-7 다언어 — C#(Dotnet)·Python·C++(CMake) 어댑터 | 2026-08-17 |
| v0.4.0 | MS-013 | Run Group(C-6) | 2026-08-17 |
| v0.5.0 | MS-015 | Go 어댑터 (5번째 언어) | 2026-08-17 |
| v0.6.0 | MS-016 | Node/TS 어댑터 (6번째 언어 — 6개 언어 완성) | 2026-08-17 |
| v0.7.0 | MS-017 | 키보드 단축키 + Stop 커맨드/버튼 | 2026-08-17 |
| v0.8.0 | MS-018 | Run Group 준비 감지 (포트/HTTP) | 2026-08-17 |
| **v1.0.0** | **MS-014** | **최종 점검 + Marketplace 게시 + GitHub Release — 완주 선언(이번 릴리즈)** | **2026-08-17** |

### v1.0.0 이후 실제 릴리즈 (유지보수 사이클)

> **주의:** 아래 v1.1.0·v1.2.0은 §3 말미의 "Post-1.0 후보" 표가 INT-002에 예약해 두었던 번호와 **다르다.** 실사용 피드백이 원격·크로스보다 먼저 도착해 그쪽이 MINOR를 가져갔고, INT-002는 아직 착수되지 않았다.

| 버전 | Milestone | 핵심 내용 | 릴리즈일 |
|------|-----------|-----------|----------|
| v1.1.0 | MS-021 | 실사용 피드백 7건 — 중첩 CMake 하위 프로젝트·lib 타깃(ADR-019)·설정창 블랭크 수정·아이콘 투명화·Ctrl+Alt+T·All targets·런그룹 멤버 디버그(ADR-020) | 2026-08-19 |
| v1.2.0 | MS-022 | **Visual Studio 어댑터**(7번째 툴체인, ADR-021) + 언어 활성 필터(B-3) + 플랫 벡터 아이콘 | 2026-08-19 |
| v1.2.1 | (유지보수) | **결함 수정** — "보기만 해도 configure" 6경로 차단 + 프로젝트 목록 순서 고정(v1.0.0부터 잠복) | 2026-08-25 |
| **v1.3.0** | **MS-023** | **Clean / Delete Build Tree** · 스캔 제외 폴더 · `cmake.configureOnSelect` · 전 어댑터 probe 정합성 | **2026-08-25** |

- v1.2.1이 PATCH인 근거: 새 설정·명령이 없는 순수 결함 수정이라 SemVer상 패치이고, 프로젝트 규칙("패치=v1.2.x")과도 일치한다.
- v1.3.0이 MINOR인 근거: 새 명령 2개(`devSwitcher.clean`·`devSwitcher.deleteBuildTree`)와 새 설정 3개가 추가된다.

- v0.9.0은 없다 — v0.8.0 → v1.0.0 점프는 정상(최종 점검+게시 단계에서 MAJOR 승격, D-21).
- MS-009(정리)는 별도 릴리즈 버전 귀속이 기준 문서에 명시되어 있지 않다(§6).
- 기준 문서에는 Milestone별 완료일만 기록되어 있어 일정 요약은 완료일 기준이다(착수일은 미확정, §6). 기록상 전체 구현 기간: 2026-08-15(MS-001~006) → 2026-08-16(MS-007~010) → 2026-08-17(MS-011~018·v1.0.0).

### Post-1.0 후보 (INT-002 — 미확정)

| 버전(후보) | Milestone | 핵심 내용 | 일정 |
|------------|-----------|-----------|------|
| v1.1.0 (후보) | MS-019 | 원격 디버그 타깃 | 미확정 |
| v1.2.0 (후보, 모델 크게 변경 시 v2.0.0) | MS-020 | 크로스 컴파일 (도커 기반) | 미확정 |

## 4. Milestone별 WBS (INT-001 — v1.0.0 완주)

### 4.1 코어 구축 (M0~M6): MS-001 ~ MS-007

#### MS-001 — M0 셋업: 스캐폴드 + F5 Hello World

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-15)
- VSCode 확장 스캐폴드 구성과 F5 Hello World 검증(명령 팔레트 등록 + 알림 표시), main 병합.

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-001 | 스캐폴드 + F5 Hello World | Done |

#### MS-002 — M1 코어 타입·칩 프레임워크

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-15)
- `types.ts` 전체 타입 확정 + 4개 어댑터 칩 스텁(Python 리트머스) + F20 `createProject` 계약. tsc 인터페이스 확정 검증 통과.

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-002 | core/types.ts 전체 타입 확정 | Done |
| TASK-003 | 4개 어댑터 칩 선언 스텁 | Done |

#### MS-003 — M2 CargoBridge + CargoAdapter

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-15)
- 메타데이터/빌드 JSON 파싱·인자 조립·features·resolveExecutable + 단위테스트 34. build/run/resolveExecutable/chips/listProjects 실동작. (디버그 구성은 MS-005, `cargo createProjectTask`는 MS-008로 이월)

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-004 | CargoBridge 순수 코어 + 테스트 하네스 | Done |
| TASK-005 | CargoBridge cargo CLI 연동 | Done |
| TASK-006 | CargoAdapter 실구현 | Done |

#### MS-004 — M3 상태바·상태 저장·감시

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-15)
- 칩 렌더링·QuickPick·StateStore·reconcile·ManifestWatcher. F5 end-to-end 검증 통과 — Rust 선택 UX 실사용 가능.

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-007 | 데이터 계층 (AdapterRegistry + StateStore) | Done |
| TASK-008 | UI 계층 (StatusBar + QuickPick) | Done |
| TASK-009 | 배선·감시 (Orchestrator + Watcher + activate) | Done |

#### MS-005 — M4 실행·디버그

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-15)
- TaskRunner·problem matcher·디버그 플로우(CodeLLDB)·키바인딩. F5 검증 통과(Build/Run + Debug 중단점) — Rust 빌드·실행·디버그 실사용 가능. (F19·Doctor는 MS-007로 이월)

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-010 | 실행 (TaskRunner + Build/Run 플로우) | Done |
| TASK-011 | 디버그 플로우 (createDebugConfig + CodeLLDB) | Done |

#### MS-006 — M5 설정 페이지

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-15)
- 호출 오버레이 주입 코어 + SettingsPanel Webview 셸 + 호출 구성 탭(옵션 카탈로그) + 프로파일 export/import(F12). 전부 F5 통과. (pre/postBuild 실행은 C-5로 MS-007 이월, Cargo.toml 국소편집은 v2 이월)

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-012 | 호출 오버레이 주입 + 순수 코어 | Done |
| TASK-013 | SettingsPanel Webview 셸 | Done |
| TASK-014 | 호출 구성 탭 (옵션 카탈로그) | Done |
| TASK-015 | 프로파일 export/import | Done |

#### MS-007 — M6 품질·배포 (→ v0.1.0)

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-16)
- Doctor 진단 모델·UI(+E1 칩)·rustup target 자동 설치·pre/postBuild(C-5 해소)·통합 테스트+수동 체크리스트(F18)·README+VSIX. **v0.1.0 vsix 산출**. 잔여 수동검증(TC-11 WSL·TC-09·TC-02/03)은 문서화된 잔여 리스크로 v0.1 확정.

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-016 | Doctor 진단 모델 + 어댑터 진단 계약 | Done |
| TASK-017 | Doctor UI + E1 경고 칩 | Done |
| TASK-018 | rustup target 자동 설치 | Done |
| TASK-019 | pre/postBuild 실행 배선 + buildEvent 편집 | Done |
| TASK-020 | 통합 테스트 하네스 + 수동 체크리스트 | Done |
| TASK-021 | README + VSIX 패키징 | Done |

### 4.2 시작 마법사·계약 정리: MS-008 ~ MS-009

#### MS-008 — 시작 마법사 (F20) (→ v0.2.0)

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-16)
- 마법사 코어 + 4개 언어 프로젝트 생성(계약 `createProject: task|files`, D-13). 4개 언어 생성 F5 통과. OQ-001=자동 활성전환, v1 스위처 자동등장=Rust만(scope A).

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-022 | 마법사 코어 + Cargo createProjectTask | Done |
| TASK-023 | 3개 어댑터 createProject (dotnet/cmake/python) | Done |
| TASK-024 | F20 통합 테스트 + 검증 반영 | Done |

#### MS-009 — v1.1 정리: 자유 플래그(L-1) + 계약 정리

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-16)
- `stringList` 자유 플래그(Extra rustflags) + `persistSetting` 계약 제거(C-3 폐기 후속, D-15/ADR-013).

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-025 | 자유 플래그 (extra flags, L-1) | Done |
| TASK-026 | persistSetting 계약 제거 (C-3 폐기 후속) | Done |

### 4.3 다언어 확장 (C-7): MS-010 ~ MS-012 (→ v0.3.0)

#### MS-010 — C# (Dotnet) 어댑터 실구현 (C-7 1/3)

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-16)
- 메타데이터=`msbuild -getProperty`(JSON)·실행경로=TargetPath·옵션 주입=`-p:`·디버그=coreclr. F5 통과(프로젝트 등장·Config/TFM 칩·build/run·중단점·Doctor).

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-027 | DotnetBridge + listProjects + chips | Done |
| TASK-028 | Dotnet build/run/resolveExecutable + `-p:` 주입 | Done |
| TASK-029 | Dotnet debug + 진단 + 통합/검증 | Done |

#### MS-011 — Python 어댑터 실구현 (리트머스, C-7 2/3)

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-16, v0.3.0 번들 릴리즈는 2026-08-17)
- environment 축·`python <script>` 실행(PYTHONPATH/PYTHONOPTIMIZE env)·debugpy 디버그·진단. `actions.build=false` 리트머스(빌드 없는 언어) 검증.

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-030 | PythonBridge + listProjects + chips | Done ※① |
| TASK-031 | Python run + PYTHONPATH env 주입 + 카탈로그 | Done ※① |
| TASK-032 | Python debug + 진단 + 리트머스 검증 | Done ※① |

#### MS-012 — C++ (CMake) 어댑터 실구현 (C-7 3/3)

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-17)
- ADR-014(자체 `cmake` CLI·File API). 감지+chips+File API → configure/build 2단계 `-D` 주입 → run/debug(컴파일러 자동판별 디버거) → CMakePresets 지원(`ChipDescriptor.appliesTo` 동적 대체, D-17). C-7 완주 → **v0.3.0 릴리즈**.

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-033 | CMakeBridge + listProjects + chips (+연동 ADR) | Done |
| TASK-034 | CMake configure/build 2단계 주입 + resolveExecutable | Done |
| TASK-035 | CMake run + debug (컴파일러 자동판별 디버거) | Done |
| TASK-041 | CMakePresets.json 지원 (Preset 칩) | Done ※① |

### 4.4 Run Group (C-6): MS-013 (→ v0.4.0)

#### MS-013 — Run Group (C-6)

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-17)
- 그룹 상태 모델 + GroupOrchestrator(계층적 위상정렬·병렬/순차·teardown·skip) + 설정 페이지 Run Groups 탭(스테이지 순서) + 상태바 통합 메뉴. ADR-015(준비=프로세스 시작·Run 전용)·D-20. C-6 충족 → **v0.4.0 배포**. (준비 감지 고도화 TASK-039는 MS-018로 분리)

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-036 | Run Group 상태 모델 + 정의 스키마 + 저장 | Done |
| TASK-037 | GroupOrchestrator (종속 순서 기동/정리) | Done |
| TASK-038 | 그룹 정의/트리거 UI | Done |
| TASK-040 | Run Group 통합 테스트 + 검증 + 문서 | Done |

### 4.5 v1.0.0 완주 로드맵 (D-21): MS-015 ~ MS-018 → MS-014

> 실행 순서: MS-015(v0.5.0) → MS-016(v0.6.0) → MS-017(v0.7.0) → MS-018(v0.8.0) → MS-014(v1.0.0). MS-014의 번호가 앞서는 것은 채번 순서 때문이며, 로드맵상 최종 단계다.

#### MS-015 — Go 어댑터 실구현 (→ v0.5.0)

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-17)
- 5번째 언어. `go.mod` 감지·target 칩(main 패키지, 칩=target only — D-21/Human)·`go build`/`go run`·delve 디버그(`type:'go'`)·Doctor·F20 생성. **v0.5.0 배포**.

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-043 | Go: GoBridge + listProjects + target 칩 + createProject(F20) | Done |
| TASK-044 | Go: build/run + resolveExecutable + 옵션 카탈로그/주입 | Done |
| TASK-045 | Go: debug + Doctor + 통합/검증 + v0.5.0 릴리즈 | Done |

#### MS-016 — Node/TS 어댑터 실구현 (→ v0.6.0)

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-17)
- 6번째 언어 — **6개 언어 완성**. `package.json` 감지·script+packageManager 칩·`<pm> run <script>`(배열형 ShellExecution, ADR-016/NFR-002b)·js-debug 디버그(`debugRequiresBuild:false`)·Doctor. **v0.6.0 배포**.

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-046 | Node/TS: NodeBridge + listProjects + script·packageManager 칩 + createProject(F20) | Done |
| TASK-047 | Node/TS: build/run + resolveExecutable + 옵션 카탈로그/주입 + 매처 | Done |
| TASK-048 | Node/TS: debug(js-debug) + 통합/검증 + v0.6.0 릴리즈 | Done |

#### MS-017 — 키보드 단축키 설정 (→ v0.7.0)

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-17)
- ADR-017: 정적 `contributes.keybindings`(Ctrl+Alt+B/R/S/D/P/G/, · `when:hasProjects`) + 네이티브 편집기 딥링크 + General 탭 목록. 내장 키 불간섭·리맵 안내. F5 유래 추가: `devSwitcher.stop` 커맨드·상태바 Stop 버튼. **v0.7.0 배포**.

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-049 | 키보드 단축키: contributes.keybindings + hasProjects 컨텍스트 + General 탭 단축키 섹션 | Done |
| TASK-050 | 키보드 단축키: 문서 + v0.7.0 릴리즈 | Done |

#### MS-018 — Run Group 준비 감지 (→ v0.8.0)

- Intent: INT-001 / Phase: Build / 상태: **Done** (2026-08-17)
- Run Group 멤버 준비 신호를 프로세스 시작 → **포트 open/HTTP 상태코드**로 강화(멤버별 포트·URL·타임아웃). ADR-018(타임아웃=abort+teardown·HTTP=지정코드 기본 200·취소 가능). UI 재설계(멤버 카드·Add 드롭다운). **v0.8.0 배포** — v1.0.0 마지막 기능 완료.

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-039 | 준비 감지 (포트/헬스체크) — 우산 Task | Done ※② (TASK-051~053으로 분해 종료) |
| TASK-051 | 준비 감지: 모델 + 순수 폴링 + I/O 프로브 + 검증/편집 | Done |
| TASK-052 | 준비 감지: 오케스트레이터 게이트 + 취소 + Run Groups 탭 UI | Done |
| TASK-053 | 준비 감지: 통합/검증 + 문서 + v0.8.0 릴리즈 | Done |

#### MS-014 — v1.0.0 완주: 최종 점검 + 게시 (→ v1.0.0, 이번 릴리즈)

- Intent: INT-001 / Phase: **Deliver** / 상태: **Done** (2026-08-17)
- 로드맵 최종 단계(D-21). 통합 테스트 최종 보강(dotnet/cmake/python/go/node 픽스처) + **VS Code Marketplace 게시** + **GitHub Release 생성**(`v1.0.0` 태그 + vsix 첨부) → **v1.0.0 완주 선언**(INT-001 종료, Human — D-19). 게시 증빙 세부는 미확정(§6).

| Task ID | 제목 | 상태 |
|---------|------|------|
| TASK-042 | 추가 기능·논의 + v1.0.0 완주 결정 (게이트) — 담당: Human | Done ※③ |

## 4.1 유지보수 Milestone (MS-021 ~ MS-023) 【v1.3.0 추가】

### MS-021 — v1.1.0 실사용 피드백 (Done, 2026-08-19)

| Task | 내용 |
|------|------|
| TASK-056 | 중첩 CMake 하위 프로젝트 계층화 — `project()` 루트=최상위, 타깃 선언 디렉토리=하위 (ADR-019) |
| TASK-057 | library 타깃 노출 + `validateAction` 훅 신설(run/debug 사전 거부) + `projects.showLibraries` |
| TASK-058 | 설정창 블랭크 수정 — 느린 `listItems`가 첫 페인트를 막던 문제. 퀵 첫 페인트 → 풀 state 후속 |
| TASK-059 | 아이콘 투명화 (Marketplace 검은 사각형) |

### MS-022 — v1.2.0 Visual Studio 어댑터 (Done, 2026-08-19)

| Task | 내용 |
|------|------|
| TASK-063 | `vs` 어댑터 — sln/slnx/vcxproj 감지(CMake 생성물 제외)·MSBuild 빌드·`-getProperty:TargetPath` 실행 경로·cppvsdbg (ADR-021) |
| TASK-064 | B-3 언어 활성 필터 — `languages.enabled` + General 탭 체크박스 |
| TASK-065 | v1.2.0 릴리즈 |

### v1.2.1 — configure 부작용 수정 (Done, 2026-08-25, Task 미채번)

실사용 제보("서브모듈 리포에 CMake가 빌드 파일을 쏟아낸다")에서 출발. **"보기만 해도 configure" 경로 6개**를 차단하고, 곁가지로 **프로젝트 목록이 재스캔마다 뒤바뀌던 버그**(`findFiles` 결과 미정렬, v1.0.0부터 잠복)를 고쳤다.

### MS-023 — v1.3.0 정리 기능·스캔 제어 (Done, 2026-08-25)

| 항목 | 내용 |
|------|------|
| B-6 | 전 어댑터 `probe` 정합성 — dotnet·cargo·go·python이 전환/렌더/재스캔마다 띄우던 프로세스 제거 |
| B-5 | `devSwitcher.cmake.configureOnSelect`(기본 false) + 빈 칩 목록 플레이스홀더 |
| — | `devSwitcher.scan.exclude` — 스캔 제외 폴더 (#018 설계분 재착수) |
| B-4 | Clean / Delete Build Tree — v1.2.1이 남긴 "이미 생긴 `build/`" 문제 해결 |
| — | `docs/` 공식 산출물 13종 누적 동기화 (v1.1.0~v1.3.0) |

---

## 5. Post-1.0 백로그 (INT-002): MS-019 ~ MS-020

두 Milestone 모두 INT-002 소속(D-22)·v1.0.0 이후 백로그로, **Task 미분해** 상태다. INT-002 정식 착수 시 ADR 작성과 Task 분해를 거쳐 확정하며, 두 Milestone의 순서/번호도 그때 확정한다(§6).

| Milestone ID | 제목 | Phase | 상태 | 대상 버전 | 내용 요약 |
|--------------|------|-------|------|-----------|-----------|
| MS-019 | 원격 디버그 타깃 | Evolve | Deferred | v1.1.0 (후보, 미확정) | 로컬 빌드 + 원격 실행·어태치(lldb-server/gdbserver/debugpy attach). 설계서 §12.4 "한 창=한 환경" 한계 도전 |
| MS-020 | 크로스 컴파일 (도커 기반) | Evolve | Deferred | v1.2.0 (후보, 미확정 — 모델 크게 변경 시 v2.0.0) | `cross` 연동 — 아키텍처 칩 확장, 도커 기반 타깃 빌드 |

## 6. 미확정 항목

기준 문서(`milestone_registry.md` + `task_registry.md`)에 근거가 없어 확정하지 않은 항목:

1. **MS-014 게시 증빙 세부** — VS Code Marketplace 게시 링크, GitHub Release URL은 기준 문서에 기록 없음.
2. **MS-009의 릴리즈 버전 귀속** — 버전 사다리(D-21)에 MS-009가 어느 릴리즈에 포함되는지 명시 없음.
3. **MS-019 대상 버전** — v1.1.0은 "후보"로만 기록, 미확정.
4. **MS-020 대상 버전** — v1.2.0 후보(모델 크게 변경 시 v2.0.0), 미확정.
5. **MS-019·MS-020의 Task 분해·순서/번호·일정** — INT-002 정식 착수 시 ADR + Task 분해로 확정 예정, 현재 미확정.
6. **Milestone별 착수일(기간)** — 기준 문서에는 완료일만 기록되어 있어 착수일·소요 기간은 미확정. §3 일정 요약은 완료일 기준.

## 7. 표기 주석 (기준 문서 대비 상태 처리)

- **※①** TASK-030~032·TASK-041은 `task_registry.md` 개별 행에 `Review`(코드 완료·F5 대기)로 남아 있으나, 같은 문서의 요약("TASK-001~050 Done")과 `milestone_registry.md`의 MS-011·MS-012 **Done**(F5 통과·main 병합) 기록에 따라 본 WBS에서는 **Done**으로 표기했다.
- **※②** TASK-039는 우산 Task로, MS-018 착수 시 TASK-051/052/053으로 분해되어 종료(Done) 처리되었다(ADR-018).
- **※③** TASK-042는 `task_registry.md` 기준 `In Progress`(Human 게이트)였으며, 이번 v1.0.0 릴리즈의 완주 선언(D-19)으로 완료 처리했다. 담당은 Human(그 외 전체 Task 담당은 AI).
