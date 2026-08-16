# 프로젝트 상태 (Project State)

> 공유 상태 인덱스 — 다음 세션의 AI가 가장 먼저 읽는 프로젝트 현재 상태 요약

---

## 현재 상태 요약

### 핵심 필드

| 항목 | 내용 |
|------|------|
| 프로젝트 | DevSwitcher Tools (`devswitcher-tools`) |
| 프로젝트 유형 | Greenfield(신규) — 코드 미착수, 확정 설계서 보유 |
| 팀 구성 | 1인 |
| 팀 규모 | 1인 |
| 협업 모드 | Active(Task 할당 완료) |
| 협업 실행 모드 | solo |
| 현재 Phase | Build (MS-001~008 Done · v0.2.0 / **INT-001 완주 로드맵 착수** MS-009~013) |
| 활성 Intent | INT-001 (Approved — 완료 조건 = C-7 다언어 실구현 + C-6 Run Group) |
| 활성 Milestone | MS-012 C++(CMake) 어댑터 실구현 (진행 중 — MS-011 main 병합 완료) |
| 활성 Task | TASK-034 (configure/build `-D` 주입 + resolveExecutable **코드 완료·F5 통과, 커밋 대기**) — TASK-033 커밋 완료 |
| 상태 | Green |
| 대화 언어 | 한국어 |
| 작업 문서 언어 | 한국어 |
| 공식 산출물 문서 언어 | 한국어 |
| 마지막 갱신일 | 2026-08-16 |
| 마지막 갱신자 | AI |
| 참조 세션 로그 | session_2026-08-16_009.md |

- `프로젝트 유형`: `Greenfield(신규)` / `Brownfield(기존)`
- `팀 구성`: `1인` / `확정팀` / `사전배분`
- `팀 규모`: `1인` / `소규모(2~5)` / `중규모(6~15)` / `대규모(16+)`
- `협업 모드`: `Inactive(준비 중)` / `Active(Task 할당 완료)`
- `협업 실행 모드`: `solo`(좌석 정의 유지 + 역할별 부기 생략) / `team`(역할별 부기 전부 운영) — 상세는 `decision_authority_matrix.md` §협업 실행 모드 (F-06)
- `현재 Phase`: `Define` / `Design` / `Build` / `Verify` / `Evolve` / `Deliver`
- `상태`: `Green` / `Yellow` / `Red`
- `활성 Intent`, `활성 Milestone`, `활성 Task`는 현재 실제 ID를 적고, 없으면 `없음`으로 적는다.
- `마지막 갱신자`: `Human` / `AI`
- `참조 세션 로그`: 최신 `session_YYYY-MM-DD_NNN.md`

### 한 줄 상태
> 현재 프로젝트 상태를 한두 문장으로만 요약한다.

- **MS-001~011 Done** (MS-009·010·011 main FF 병합·origin push 완료). INT-001 완주 로드맵 = C-7(다언어 실구현)+C-6(Run Group). **현재: MS-012 CMake(C-7 3/3) 진행** — ADR-014(자체 `cmake` CLI 구동). **TASK-033 F5통과·커밋**(Doctor+listProjects+chips+File API). **TASK-034 F5통과·커밋 대기**: prepareInvocation 훅 + configure/build `-D` 주입 + resolveExecutable(File API artifact). Build 실동작(test-cmake.exe 산출) 확인. 남음: TASK-035(run·debug). **C-3 폐기**(D-15).

### 현재 작업 스트림
> 핵심 작업 스트림만 3~5줄 이내로 유지한다.

- **완료**: TASK-033 F5통과·커밋(`8664be9`+`4ca0330`). **TASK-034 F5통과**(Build 실동작·test-cmake.exe 산출) — prepareInvocation 훅 + configure/build `-D` 주입 + resolveExecutable. unit 158·esbuild 76.9kb. 실 cmake 빌드/실행 스모크 통과.
- **다음**: TASK-034 커밋 → **TASK-035**(run + debug: build-then-launch·resolveExecutable UI 경유 + 디버거 확장 `cppdbg` vs CodeLLDB 확정 + 통합테스트) → MS-012 F5·병합. 이후 C-6 Run Group(MS-013).

---

## 활성 Task 요약
> 현재 바로 재개할 Task만 1~3개 남기고, 상세 배경은 목록 문서 / Task 문서 / 세션 로그에 둔다.

| Task ID | 제목 | 담당 | 상태 | 마지막 갱신일 | 다음 액션 |
|---------|------|------|------|---------------|-----------|
| TASK-033 | CMakeBridge + listProjects + chips | AI | Done | 2026-08-16 | F5 통과·커밋(`8664be9`+`4ca0330`). Doctor+listProjects+chips 3종+File API 계층 |
| TASK-034 | configure/build 주입 + resolveExecutable | AI | Review | 2026-08-16 | **코드 완료·F5 통과·커밋 대기** — `prepareInvocation` 훅(오케스트레이터 사전 configure) + `createBuildTask`=`cmake --build`(셸無·`$msCompile`) + configure `-D` 주입(profile/architecture/compiler/linker/build-dir) + resolveExecutable=File API artifact. Build 실동작(test-cmake.exe)·실 cmake 빌드/실행 스모크 통과. unit 158. **남음**: TASK-035(run·debug) |

> **TASK-001~032 Done. MS-010·011 병합·push. MS-012 진행: TASK-033 Doctor 슬라이스 완료(커밋).** 다음: TASK-033 계속(listProjects+chips) → 034(configure/build+resolveExecutable) → 035(디버그+통합) → MS-012 F5 → MS-013 Run Group. C-3 폐기(D-15/ADR-013). 수동검증 TC-11(WSL) Deferred.

- `상태` 값은 `Planned` / `In Progress` / `Review` / `Done`을 사용한다.
- `담당`, `상태`, `마지막 갱신일`, `다음 액션`은 `task_registry.md` / `tasks/TASK-*.md`와 같은 의미로 유지한다.

---

## 다음 시작점
> 다음 세션이 바로 시작할 수 있도록 1~3개 우선 행동만 남긴다.

1. **TASK-034 커밋**(feat+docs) — 브랜치 `feature/ms-012-cmake-adapter`(미병합, main 병합은 MS-012 완료 후).
2. **TASK-035**(브랜치 동일) — **run**(build-then-launch: prepareInvocation→build→exec artifact) + **debug**(resolveExecutable UI 경유 + 디버거 확장 확정: cpptools `cppdbg` vs CodeLLDB·`requiredExtensions` 반영) + 통합테스트 → MS-012 F5 → main 병합.
3. **C-6**: MS-013 Run Group(C-7 이후). 별도 트랙: TC-11(WSL, Deferred, GAP-001).

---

## 이월 백로그 (Carryover Backlog)

> **이월의 단일 SSOT.** 흩어진 이월 메모(다음 시작점·my_state·세션 로그)를 이 표 하나로 모은다. 매 세션 브리핑(§1D)에 포함하고, 항목 추가/해소 시 및 `마무리` 시 이 표를 갱신한다. 상세 배경은 출처 세션 로그. 이월 트리거 감시는 AI의 책임이다 — Human이 찾아 지시하기 전에 브리핑·작업 중 이 표를 대조해 먼저 꺼낸다.

**지금 지시만 하면 착수 가능 (트리거 없음)**

| # | 항목 | 내용 | 출처 |
|---|------|------|------|
| ~~B-1~~ | **해소(2026-08-15, 세션 #005)** — MS-006 코어(TASK-012·013·014) main FF 병합 완료(335f982), `feature/ms-006-settings-page` 브랜치 삭제. 다음: TASK-015 착수 | 세션 #004 → #005 병합 |

**트리거 대기 (도래 시 해당 세션이 흡수)**

| # | 항목 | 트리거 | 출처 |
|---|------|--------|------|
| ~~C-1~~ | **해소(2026-08-15, 세션 #004)** — `03_design_artifacts/ui_spec.md` 작성(설정 페이지 마스터-디테일·탭·명령 미리보기·데이터 흐름). 마법사 QuickPick 상세는 MS-008에서 보강 | (해소) | 세션 #001 Gate 3 → #004 작성 |
| ~~C-2~~ | **해소(2026-08-16, 세션 #006)** — MS-008(F20) TASK-022~024 분해·완료. 등록 Milestone 전부 완료 | (해소) | task_registry 경량 운영 |
| ~~C-7~~ | **승격(2026-08-16, 세션 #007) → MS-010·011·012** — CMake/Dotnet/Python 어댑터 실구현(스위치·빌드·실행·디버그). 언어별 3 MS 순차. 완료 시 4개 언어 전부 스위처 자동등장(scope A 해제). INT-001 완료 조건 | (승격) | 세션 #006 scope A → #007 |
| ~~C-3~~ | **폐기(2026-08-16, 세션 #007, D-15)** — 오버레이→캐노니컬 파일 영구 편집/승격. "파일 무편집"이 ADR-011의 근간이고 영속화·공유는 프로파일 export/import(F12)가 이미 파일 무편집으로 해결. 파일 손상·머지충돌 리스크 회피. `persistSetting` 계약도 제거(TASK-026). ADR-013으로 "파일 무편집 = 영구 불변식" 기록 | (폐기) | 세션 #002 ADR-011 → #007 |
| ~~C-6~~ | **승격(2026-08-16, 세션 #007) → MS-013** — Run Group(실행 그룹·종속성): 여러 프로젝트를 그룹으로 묶어 종속 순서대로 일괄 기동/정리(예: auth→api→web). (선택)준비 감지=포트/헬스체크. 필요 요소: 그룹 상태 모델 + GroupOrchestrator + 정의/트리거 UI. TaskRunner 프로젝트별 락 기반 존재. C-7 이후 착수(다언어 그룹 가치 최대). INT-001 완료 조건 | (승격) | 세션 #005 → #007 |
| ~~C-4~~ | **해소(2026-08-15, 세션 #005, TASK-015)** — `ProfileExport` 확정(= PersistedState 정렬: selections+invocation, activeProjectId 제외, runArgs는 ADR-011 승격 위치) + `data_model.md §2` 예시 정합화 | (해소) | 세션 #003 → #005 |
| ~~C-5~~ | **해소(2026-08-15, 세션 #005, TASK-019)** — preBuild/postBuild를 ShellExecution Task로 실제 실행(pre 실패→중단, post 성공 후) + 설정 페이지 buildEvent 에디터 | (해소) | 세션 #004 → #005 |

**저심각 · 기록 (지시 시에만)**

| # | 항목 | 출처 |
|---|------|------|
| ~~L-1~~ | **승격(2026-08-16, 세션 #007) → MS-009/TASK-025 (In Progress)** — `stringList` 자유 플래그("extra flags") 카탈로그 항목+에디터+주입 추가 | 세션 #005 TASK-015 검증 → #007 |

---

## AI 핸드오프 메모
> 다음 세션이 바로 이어받는 데 필요한 핵심만 2~5줄로 남긴다.

- DevSwitcher Tools = 다언어(Rust·C++·C#·Python) 통합 상태바 UX VSCode 확장. 핵심 설계는 `LanguageAdapter` + `ChipDescriptor[]`(ADR-003), SSOT 파사드(ADR-007), workspaceState 저장(ADR-001), Task API 실행(ADR-002), cargo가 실행 경로 해석(ADR-005).
- 상세설계서 §16 로드맵 M0~M6이 사실상의 Milestone 후보. v1 실구현 대상은 CargoAdapter(Rust) 단독.
- **세션 #002~#005 완료 서사**: [state_archive.md](state_archive.md) `#002~#005 이관분` 참조 (R1 다이어트, 세션 #008 마무리 이관). 요지: ADR-011·012(오버레이·설정페이지) → MS-001~006(스캐폴드·types·CargoBridge/Adapter·상태바/저장/감시·실행/디버그·설정페이지+export/import) → MS-007(Doctor·E1칩·rustup·pre/postBuild·통합테스트) 전부 Done·병합.
- **세션 #006 — TASK-021 완료·MS-007 Done·v0.1.0 릴리즈**: README.md(한국어: 소개·지원범위·요구사항·설치·상태바 칩표·명령·설정페이지·settings·한계) + package.json(version 0.1.0·publisher `lim8603`·repository `github.com/lim8603/dot-tools`·keywords) + `.vscodeignore`(dist+README+LICENSE+CHANGELOG+images/png만; 소스맵·CLAUDE/AGENTS·.claude·profile.json·workspace 제외) + LICENSE(MIT) + CHANGELOG(v0.1.0). **상태바 목업 2종**: 처음 손그림 SVG→PNG했으나 아이콘이 실물과 달라, **실제 VSCode codicon 폰트(simple-browser/media/codicon.css 내장 base64)로 HTML 렌더 후 Edge headless 스크린샷** → 실 codicon PNG(`images/status-bar.png`·`status-bar-compact.png`), 2x+LCD off로 색번짐 제거. `vsce package`→`devswitcher-tools-0.1.0.vsix`(9파일 34.68KB), 격리 프로필 설치 스모크 통과(`lim8603.devswitcher-tools@0.1.0`). Gate 5 조건부 Pass(D-12). 잔여 수동검증(TC-11 WSL 등)은 지시 시.
- **세션 #006 (계속) — v0.1.0 병합·push + MS-008 착수(TASK-022 코드완료·F5 대기)**: `feature/task-021-readme-vsix`→main FF 병합·`git push`(GitHub v0.1.0 반영). MS-008 분해(TASK-022~024, D-13). **TASK-022 구현**: `core/projectName.ts`(순수 검증·mocha4)+`ui/newProjectWizard.ts`(폴더→언어→이름)+`types.ts NEW_PROJECT_TASK_TYPE`+`cargoAdapter.createProjectTask`(`cargo new`, ProcessExecution 셸無)+`adapterRegistry.adapter()/creatableAdapters()`+`orchestrator.newProject()`(마법사→createProjectTask→TaskRunner(synthetic lock)→성공 시 refresh+findCreatedProject→setActiveProject+renderActive 자동전환 OQ-001; 실패 시 Run Doctor; 스텁 throw catch)+`extension.ts`/`package.json`(newProject 커맨드·devswitcher-newproject taskDef). check-types·lint·**unit 96**·esbuild OK. TASK-022 F5 통과·커밋(ab58c15/6999f34).
- **세션 #006 (계속) — TASK-023 코드완료·F5 대기**: 계약 일반화 `createProjectTask→createProject(target): {kind:'task'}|{kind:'files'}`(types.ts `ProjectFile`/`ProjectCreation`). cargo/dotnet=네이티브 new(task, `dotnet new console -o`), **cmake/python=확장이 `workspace.fs`로 템플릿 작성(files)** — D-13을 ShellExecution→workspace.fs로 개정(셸 종류 미제어·C++ `<>` 충돌 발견). `cmakeTemplate.ts`/`pythonTemplate.ts`(순수·mocha2) + orchestrator `newProject` kind 분기 + `writeProjectFiles`(createDirectory+writeFile). interface_contract §5 갱신. **scope A**: v1 스위처 자동등장=Rust만(나머지 3개 listProjects v2 스텁). check-types·lint·**unit 98**·esbuild OK. TASK-023 F5 통과(4언어 생성·내용 검증)·커밋(2684ee7/467f8f3).
- **세션 #006 (계속) — TASK-024·MS-008 Done**: 통합 테스트에 `newProject` 추가 + **퍼블리셔 회귀 fix**(EXTENSION_ID `seunghyun`→`lim8603`) → `npm run test:integration` **3 passing**. test_case(§1 퍼블리셔·11커맨드·§2 TC-14~17 F20 Pass·요약 Manual 11)·verification_evidence(EV-007 F20·EV-001 unit98·EV-002 11커맨드)·CHANGELOG([Unreleased] F20) 갱신. **MS-008 Done → 등록 Milestone(MS-001~008) 전부 완료.** 브랜치 `feature/ms-008-new-project-wizard` 5커밋(022·023 각 feat+docs + 024) **병합 대기**. **다음: main FF 병합+push (지시 시) → 선택적 v0.2.0 릴리즈.**
- **세션 #009 — TASK-033 계속(listProjects+chips+File API) 코드 완료(Review, F5 대기)**: cmake 4.4.2+VS18(2026)로 `hello` 픽스처 configure→**File API reply 실구조 확보**. **`cmakeBridge.ts`**: 순수 파서 `hasProjectCommand`/`parseProjectName`(project() 루트·이름, 주석제거·변수명 폴백) + File API 4종(`parseReplyIndexCodemodel`·`parseCodemodelConfigs`·`parseTargetInfo`·`executableArtifact`) + fs `readReplyDir`(index→codemodel→target, EXECUTABLE 필터·config 선택/폴백) + `CMakeBridge.listTargets`(shared query `codemodel-v2` 작성+plain configure+readReplyDir, (buildDir,config) 캐시)+`invalidateCache` 확장. **`cmakeAdapter.ts`**: `listProjects`(project() 루트 판별·`workspace.fs`·id=`cmake:${rel}`) + chips 3종(**profile** 정적 4 build type·default Debug / **architecture** 정적 플랫폼 Host default+x64/Win32/ARM64[Human 승인, `-A` 주입은 TASK-034] / **target** File API EXECUTABLE·단일 자동선택·configure 실패 시 [] graceful) + **`requiredExtensions` `[]`**(ADR-014: 빌드/실행 무의존, 디버거 확장 TASK-035). 픽스처: `fixtures/cmake/hello/`(F5용) + `fixtures/cmake/file-api-reply/`(실 reply 5파일). 테스트 +12(File API 파서·readReplyDir 실 픽스처 end-to-end). check-types·lint·**unit 154**·esbuild **76.9kb** OK. **실 cmake end-to-end 스모크 통과**: `listTargets(Debug)`→`Debug/hello.exe`, `listTargets(Release)`→`Release/hello.exe`(구성별 artifact 경로 정확). **F5 통과·커밋**(`8664be9`+`4ca0330`). ► **TASK-034**(동일 세션): 핵심이슈=동기 단일 Task 모델에 configure+build 2단계 담기 → **optional `prepareInvocation` 훅**(Human 승인; 오케스트레이터가 build/run/debug Task 전 await; CMake만 구현, 나머지 no-op). `cmakeBridge` `configureArgs`/`buildArgs`/`overlayDefines`+오버레이-aware `configure`(서명캐시)/`targetsFor`. `cmakeAdapter` `createBuildTask`=`cmake --build`(셸無·`$msCompile`)+`prepareInvocation`=오버레이 configure+`resolveExecutable`=File API artifact `join(buildDir,·)`. `package.json` `devSwitcher.cmake` taskDef. interface_contract §4 반영. unit **158**(+4). **실 cmake 빌드/실행 스모크 통과**(configure 오버레이→`cmake --build`→exe 산출·실행) + **F5 통과**(test-cmake.exe). F5 피드백: 교차-컴파일러 옵션 예시 수정(`/O2 /W4` MSVC·MSVC/GCC 병기, **KB #9**). **다음: TASK-034 커밋 → TASK-035(run·debug+디버거 확장)**.
- **세션 #008 — TASK-031(Python 실행) 코드 완료(Review, F5 대기)**: `makePythonRunTask`(ProcessExecution 셸無 NFR-002 · 인터프리터=environment 칩값, 순수 helper `resolveInterpreter`로 미선택 시 `python` 폴백[createRunTask 동기라 checkToolchain await 불가] · script=target 칩 · runArgs 뒤따름 · **problemMatcher 없음**[인터프리터 런은 컴파일 진단 없음]) + createRunTask 배선 + `taskEnv`(config.env 전달, dotnet 동형 — Python은 outputDir/RUSTFLAGS 아날로그 없음, env가 전부 §8) + `resolveExecutable`=**대상 `.py` 절대경로**(빌드 없음 → exec 호출 없이 경로 해석·부재 시 E6). **설계 판단**: registry는 "인터프리터 경로"였으나 debugpy launch가 `program`=스크립트/`python`=인터프리터 구조 → project_state handoff("스크립트 경로") 채택(TASK-032 디버그 `program` 직결). optionCatalog `PYTHONOPTIMIZE`(env, ≡`-O`) 추가 + `devSwitcher.python` taskDef 등록. **실 python 3.12 run 스모크 통과**(PYTHONPATH 모듈 import·PYTHONOPTIMIZE→`__debug__=False`·argv). **TASK-032(디버그+진단)**: 순수 `buildDebugpyConfig`(debugpy: program=스크립트·python=인터프리터[run 동일]·`console:integratedTerminal`[stdin]·justMyCode·env 비면 생략) + `createDebugConfig`(빌드 없음 §7.4 직행) + `collectDiagnostics`(Python 인터프리터 critical tier2 + `ms-python.python` optional tier1). debug 플로우는 어댑터-무지라 코드 변경 불요(build===false→빌드 스킵, requiredExtensions ensure로 Python 확장=debugpy 번들 설치 유도). **디버그 타입=`debugpy`**(구 `python` 아님, 현행 확장 등록). check-types·lint·**unit 133**(+debugpy 2)·esbuild 71.1kb OK. **MS-011 어댑터 계약 전 메서드 실구현 완성**(createBuildTask만 build===false 미호출 스텁). **F5(Human): 감지·리트머스·칩·Run·debugpy 통과 / Doctor 미확인.** F5 유래 수정 2건: **[A] Environment 칩 중복**(`python`/`python3` 동일 인터프리터 2회) → probe를 `-c`(버전+`sys.executable`)로 바꿔 실경로 `interpreterKey` dedup(선호순 유지·venv 겹침도 처리). **[B] New Project 항상 루트 생성** → 마법사 step1을 네이티브 폴더 선택창(showOpenDialog·하위 폴더 자유 선택·워크스페이스 내부 검증)으로 교체(`target.folderUri`만 변경, 배선 무변경). functional_spec F20 §2 동기화. **[C] 수동 재스캔 명령 부재**(감시가 폴더 이동 놓쳐 이전 경로 기억) → `DevSwitcher: Rescan Projects`(`devSwitcher.rescan`) 추가: `registry.invalidateAll`(전 어댑터 캐시)→`orchestrator.rescan`(refresh+진단+개수 토스트)+명령 등록+통합 12커맨드+README/functional_spec F17/EV-002 동기화. **F5 재현 버그 fix**: `invalidateAll`이 CMake 스텁 `invalidateCache`(notImplemented throw)까지 호출해 rescan 실패 → try/catch 관용(scan()이 스텁 listProjects throw 관용과 동일). check-types·lint·**unit 135**·**통합 3 passing**·esbuild 72.1kb OK. **다음: MS-011 재-F5(Doctor·A·B·C) → Done → v1.2.**
- **세션 #007 — INT-001 완주 로드맵 착수 + C-3 폐기 + L-1 구현**: ① 진척 브리핑 중 task_registry TASK-022·023 stale(`Review`) 발견→`Done` 정정. ② **INT-001 완료 조건 = C-7(다언어 실구현)+C-6(Run Group)** 확정. **C-3(캐노니컬 파일 편집) 폐기**(D-15/**ADR-013** — "파일 무편집 = 영구 불변식"; 영속화는 export/import가 이미 해결; `persistSetting` 계약 제거=TASK-026). ③ 스케줄 등록: **MS-009**(정리: L-1+계약정리) → **MS-010 C#** → **MS-011 Python** → **MS-012 CMake**(=C-7) → **MS-013 Run Group**(C-6). TASK-025~040. ④ **MS-009 Done**: TASK-025(L-1 Extra rustflags) — cargo optionCatalog `stringList`(**Compiler 섹션**) + `applyOption` 빈배열 제거 + `buildConfigArgs` rustflags 스킵 + `buildRustflags(linker, compiler)` append + 설정 페이지 stringList 에디터(textarea·blur) + preview RUSTFLAGS. **F5 통과**(1차 UX 버그=Linker 섹션 오배치→Compiler 이동 후 재확인 통과). TASK-026 — `persistSetting` 계약 제거(types.ts + 4어댑터 stub + cargo import 정리 + interface_contract/domain_model/functional_spec 정리, 호출처 0). **unit 104·esbuild 61.7kb OK.** **다음: MS-010(TASK-027 DotnetBridge)부터 C-7 착수.**

---

## Human 확인 필요 사항
> 열린 항목만 유지하고, 해결된 이력은 세션 로그나 관련 기준 문서에 남긴다.

| ID | 항목 | 우선순위 | 관련 문서 | 상태 |
|----|------|---------|----------|------|
| Q1 | 진행 방향 | High | `06_evolution/imported_context/*` | Resolved — 설계서 전체 반입 |
| Q2 | 현재 Phase | Medium | `project_state.md` | Resolved — Define부터 정식화 |
| Q3 | INT-001 승인 및 산출물 계획 확정 | High | `intents/INT-001*`, `deliverable_plan.md` | Resolved — 2026-08-13 승인 |
| Q4 | Gate 3: domain_model(도메인 모델) 검토 승인 | Medium | `domain_model.md` | Resolved — 2026-08-13 승인, Build 전환 |

- `우선순위`: `High` / `Medium` / `Low`
- `상태`: `Open` / `Resolved` / `Deferred`

---

## 주요 리스크 / 주의사항
> 현재 영향이 있는 리스크 위주로 유지하고, 닫힌 리스크의 상세 이력은 별도 기준 문서에 남긴다.

| ID | 내용 | 대응 상태 | 비고 |
|----|------|-----------|------|
| 없음 | - | - | - |

- `대응 상태`: `Open` / `Mitigating` / `Closed`

---

## 최근 승인된 결정

| ID | 결정 | 근거 문서 | 날짜 |
|----|------|-----------|------|
| D-01 | 설계서 전체를 cowork 기준 문서로 반입, Phase는 Define부터 정식화 | `06_evolution/imported_context/*` | 2026-08-13 |
| D-02 | INT-001 승인 (Approved) | `intents/INT-001*` | 2026-08-13 |
| D-03 | 산출물 계획 확정 (필수 5 / 권장 8 / 해당없음 1) | `deliverable_plan.md` | 2026-08-13 |
| D-04 | Gate 1 통과 | `quality_gate.md`, DEFINE 문서 | 2026-08-13 |
| D-05 | 신규: 프로젝트 시작 마법사(F20) 도입 — 전 언어·수동 호출·기본 템플릿·네이티브 위임 | `ADR-010` | 2026-08-13 |
| D-06 | 설계서 DD-01~09를 ADR-001~009로 승격 | `adr_registry.md` | 2026-08-13 |
| D-07 | Gate 3 통과 (domain_model 승인) → Build 전환 | `quality_gate.md`, `domain_model.md` | 2026-08-13 |
| D-08 | 호출 구성 오버레이 도입 — 컴파일옵션·출력·링커·env·빌드전후를 파일 무편집으로 (프로젝트×구성)별 저장·주입. 캐노니컬 파일 편집은 v2 이월 | `ADR-011` | 2026-08-15 |
| D-09 | 설정 UI = WebviewPanel "설정 페이지"(명칭 정정) + 어댑터 선언 옵션 카탈로그 브라우저 | `ADR-012` | 2026-08-15 |
| D-10 | OQ-002 확정 — InvocationConfig를 Task 생성 메서드에 별도 인자 `config`로 전달. Selection은 칩 선택만, runArgs는 InvocationConfig로 승격 | `interface_contract.md` §3·§4·§7·§11 | 2026-08-15 |
| D-11 | C-4 확정 — export 포맷(`ProfileExport`)을 `PersistedState`와 정렬(2-맵 selections+invocation, activeProjectId 제외, runArgs는 ADR-011 승격 위치). import는 스캔 존재 projectId만 반영 | `data_model.md §2`, `src/core/types.ts`, TASK-015 | 2026-08-15 |
| D-12 | v0.1.0 릴리즈 확정 — publisher=`lim8603`, `devswitcher-tools-0.1.0.vsix` 산출·설치 스모크 통과로 MS-007 Done. Gate 5 조건부 Pass(잔여 수동검증 TC-11 WSL 등은 문서화된 리스크로 수용) | `verification_evidence.md`, TASK-021 | 2026-08-16 |
| D-13 | MS-008 — OQ-001=자동 활성전환(생성 후 새 프로젝트 활성화). 계약 일반화 `createProject(target): {kind:'task'} \| {kind:'files'}`. cargo/dotnet=네이티브 new(task). **CMake/Python=확장이 `workspace.fs`로 템플릿 작성(files)** — 최초 "ShellExecution" 안에서 **셸 종류 미제어·C++ `<>` 리다이렉션 충돌** 발견해 workspace.fs로 개정(구현 중 우려 1회). ADR-010은 "네이티브 있으면 위임, 없으면 확장 작성"으로 해석. **v1 스위처 자동등장=Rust만**(scope A) | `interface_contract.md §5`, TASK-023 | 2026-08-16 |
| D-14 | v0.2.0 릴리즈 — F20 마법사 + 수동검증 중 발견한 버그 2건 수정(features 칩 토글/카운트/none 보존, untrusted 워크스페이스 무한스피너) 포함. `devswitcher-tools-0.2.0.vsix` 산출·설치 스모크 통과. version 0.1.0→0.2.0, CHANGELOG [Unreleased]→[0.2.0], README 마법사 반영 | `CHANGELOG.md`, `package.json` | 2026-08-16 |
| D-16 | **MS-012 CMake = 자체 `cmake` CLI 구동** (CMake Tools 확장 미위임). configure/build 2단계 `-D`/`--config` 호출시 주입, 타깃·실행경로=CMake File API(codemodel-v2), 디버그만 디버거 확장. cargo/dotnet/python 선례·§8·ADR-013(파일 무편집)에 부합. requiredExtensions=디버거(TASK-035 확정) | `ADR-014` | 2026-08-16 |
| D-15 | **C-3 폐기(Won't Do)** — 오버레이를 캐노니컬 파일에 영구 편집/승격하는 기능을 v2 백로그에서 제거. 근거: ①ADR-011 근간이 "파일 무편집" ②영속화·공유는 프로파일 export/import(F12)가 이미 해결 ③TOML 손상·머지충돌 리스크. 후속: `LanguageAdapter.persistSetting` 계약 제거(TASK-026). "파일 무편집 = 영구 불변식"을 ADR-013으로 기록. **INT-001 완료 조건 = C-7(다언어 실구현)+C-6(Run Group)** 확정, 완주 로드맵 MS-009~013 착수 | `ADR-013`, `milestone_registry.md` | 2026-08-16 |

---

## 최근 변경 파일 / 산출물
> 최근 핵심 변경만 짧게 남기고, 장기 이력은 세션 로그에 누적한다.

| 파일 | 변경 요약 | 관련 작업 |
|------|----------|----------|
| `intents/INT-001*.md` | 프로젝트 루트 Intent (Approved) | DEFINE 반입 |
| `intent_registry.md` | INT-001 등록 | DEFINE 반입 |
| `deliverable_plan.md` | 프로파일 + 14종 확정 | 산출물 협상 |
| `requirement_spec.md` | FR/NFR/제약/의존/가정/OQ 반입 | DEFINE 반입 |
| `functional_spec.md` | F1~F19 기능 명세 | DEFINE 반입 |
| `domain_glossary.md` | 용어·약어·도메인 규칙 | DEFINE 반입 |
| `risk_register.md` | RSK-001~011 (R1~R11) | DEFINE 반입 |
| `user_story_registry.md` | US-001~011 등록 (US-010 설정창, US-011 마법사) | DEFINE 반입 |
| `adrs/ADR-001~010*.md` + `adr_registry.md` | DD-01~09 승격(ADR-001~009) + 마법사 ADR-010 | DESIGN 반입 |
| `functional_spec.md`, `requirement_spec.md`, `intents/INT-001*` | F20·FR-013 추가, 파일 부재 능동복구, 마법사 반영 | F20 신규 |
| `interface_contract.md`·`domain_model.md`·`data_model.md`·`tech_stack.md` | DESIGN 본문 반입 (F20 프로젝트 생성 계약 포함) | DESIGN 반입 |
| `coding_convention.md` | 폴더 구조 확정 + TS/VSCode 컨벤션 | BUILD 준비 |
| `milestone_registry.md`·`task_registry.md` | MS-001~008(M0~M6+F20), TASK-001~003 | BUILD 준비 |
| `adrs/ADR-011·012*.md` + `adr_registry.md` | 호출 구성 오버레이 + 설정 페이지·옵션 카탈로그 | 세션 #002 신규 |
| `interface_contract.md` | §7 호출 구성 계약(InvocationConfig·OptionSpec·optionCatalog) + §8 **언어별 호출 구성 능력 매트릭스** | 세션 #002 |
| `src/core/types.ts` | 전체 타입 단일 정의 지점 신규(§2~§7 LanguageAdapter·InvocationConfig·OptionSpec·PersistedState·DevSwitcherError) | TASK-002 |
| `interface_contract.md` | OQ-002 Resolved — config 별도 인자, Selection.runArgs 제거, runArgs 승격 | TASK-002 |
| `src/adapters/*` | 4개 어댑터 선언 스텁(cargo/cmake/dotnet/python) + cargo optionCatalog + notImplemented + index(ALL_ADAPTERS). Python 리트머스. tsc 인터페이스 확정 검증 | TASK-003 |
| `tsconfig.json`·`.vscode/settings.json` | 편집기 TS2584(console) 수정 — `types:[node,vscode]`, 워크스페이스 TS 고정 | 세션 #003 |
| `imported_context/DevSwitcher-Tools_{Detailed,Concept}-Design.md` (구 `docs/*`) | 상세설계서 v1.2 최신화(F20·F21·OQ-002 통합) 후 개념·상세설계서를 `imported_context/`로 이동·영문명. 참조 5문서 경로 갱신. 목적: 회사 전용 개발툴에 아키텍처 재사용 | 세션 #003 |
| `data_model.md` | 설정 3계층 + PersistedState에 `(projectId×profile)` invocation 차원 도입 | 세션 #002 |
| `src/core/errors.ts`(신규)·`src/core/types.ts` | `DevSwitcherError`를 vscode-free 모듈로 분리, types는 재-export(하위호환). 브리지가 순수 Node에서 throw 가능 | TASK-005 |
| `src/adapters/cargo/cargoBridge.ts` | I/O 계층 추가 — `execCapture`/`defaultExec`(execFile, 셸無, DI) + `CargoBridge`(fetchMetadata+캐시·listInstalledTargets·checkToolchain·invalidateCache). vscode-free 유지 | TASK-005 |
| `src/test/unit/cargoBridge.io.test.ts`(신규) | I/O 계층 14 테스트(가짜 exec + 실 node 바이너리 스모크) | TASK-005 |
| `src/adapters/cargo/cargoAdapter.ts` | 런타임 스텁→실구현: listProjects(§8.2)·chips 4종(listItems/format/defaultValue)·createBuild/RunTask(ProcessExecution·env·CARGO_TARGET_DIR)·resolveExecutable(§8.5)·invalidateCache 위임. 디버그/createProject/persist는 스텁 유지(M4/MS-008/v2) | TASK-006 |
| `src/adapters/cargo/cargoBridge.ts` | `peekMetadata`(동기 캐시 접근자) 추가 — 동기 Task 생성 시 hasDefault 판정용 | TASK-006 |
| `src/core/adapterRegistry.ts`·`stateStore.ts`·`stateReconcile.ts`(신규) | 스캔·매칭 + workspaceState 래퍼 + reconcile 순수코어 | TASK-007 |
| `src/ui/statusBar.ts`·`statusBarFormat.ts`·`picks.ts`(신규) | 칩/버튼 렌더(어댑터무지) + QuickPick + defaultChipFormat | TASK-008 |
| `src/core/orchestrator.ts`·`manifestWatcher.ts`(신규)·`extension.ts`·`package.json` | 배선·명령·감시·activate + contributes(5커맨드·activationEvents) | TASK-009 |
| `src/test/fixtures/cargo/hello/*`(신규)·`.gitignore` | F5/통합용 cargo 픽스처 + target 제외 | TASK-009 |
| `src/test/unit/stateReconcile.test.ts`·`statusBarFormat.test.ts`(신규) | 순수코어 mocha 10 (총 44) | TASK-007·008 |
| `src/core/taskRunner.ts`(신규)·`orchestrator.ts`·`ui/statusBar.ts`·`cargoAdapter.ts`·`extension.ts`·`package.json` | TaskRunner + Build/Run 실행 플로우·spin·$devswitcher-rustc 매처·키바인딩 | TASK-010 |
| `src/core/ensureExtension.ts`(신규)·`cargoBridge.ts`·`cargoAdapter.ts`·`orchestrator.ts`·`.vscode/launch.json` | Debug 플로우 §7.4·createDebugConfig·buildLldbConfig·CodeLLDB 온디맨드·확장포함 launch | TASK-011 |
| `functional_spec.md`·`requirement_spec.md` | F21·FR-014 추가, §8.7 파일편집 v2 이월, NFR-002a 셸 예외 | 세션 #002 |
| `user_story_registry.md`·`milestone_registry.md`·`domain_model.md`·`coding_convention.md`·`deliverable_plan.md` | US-010 정정+US-012, MS-006 범위, INV-6, 카탈로그 반영, 명칭(다이얼로그→페이지) | 세션 #002 |

> 상세 변경 이력은 세션 로그 session_2026-08-13_001, session_2026-08-15_002 참조.

---

## 활성 산출물
> 활성 상태인 항목만 유지하고, 상세 내용은 목록 문서에서 우선 찾은 뒤 필요 시 상세 문서를 본다.

| 유형 | ID | 제목 | 상태 | 비고 |
|------|----|------|------|------|
| Intent | INT-001 | 다언어 통합 상태바 UX VSCode 확장 | Approved | 2026-08-13 승인 |
| Milestone | MS-001 | M0 셋업 | Done | 스캐폴드 + F5 검증 완료 |
| Milestone | MS-002 | M1 코어 타입·칩 | Done | 인터페이스 확정(tsc), main 병합 |
| Milestone | MS-003 | M2 CargoBridge/CargoAdapter | Done | main 병합(FF, 2026-08-15). 디버그·createProject 이월 |
| Milestone | MS-004 | M3 상태바·저장·감시 | Done | F5 검증 통과, main 병합(2026-08-15) |
| Milestone | MS-005 | M4 실행·디버그 | Done | F5 검증 통과(빌드·실행·중단점), main 병합(2026-08-15) |
| Milestone | MS-006 | M5 설정 페이지·호출 구성 | Done | 코어(012·013·014) + export/import(015) F5 통과, main 병합(2026-08-15). pre/postBuild(C-5) 이월 |
| Milestone | MS-007 | M6 품질·배포·통합테스트 | Done | 016~021 전부 Done. **v0.1.0 vsix 산출**(2026-08-16). Gate 5 조건부 Pass |
| Milestone | MS-008 | F20 시작 마법사 | Done | 4개 언어 생성 F5 통과(2026-08-16). 스위처 자동등장=Rust(scope A) |
| Milestone | MS-009 | v1.1 정리 (자유 플래그 L-1 + 계약 정리) | Done | TASK-025(L-1, F5 통과)·TASK-026(persistSetting 제거). 2026-08-16 |
| Milestone | MS-010 | C# (Dotnet) 어댑터 실구현 | Done | F5 통과(build/run/coreclr 디버그·Doctor). main FF 병합. C-7 1/3 |
| Milestone | MS-011 | Python 어댑터 실구현 (리트머스) | Done | C-7 2/3. F5(Doctr 제외) 통과·main 병합·push. v1.2 |
| Milestone | MS-012 | C++ (CMake) 어댑터 실구현 | In Progress | C-7 3/3. ADR-014. TASK-033 F5통과·커밋(감지+chips+File API). TASK-034 F5통과·커밋대기(configure/build 주입+resolveExecutable). 남음: TASK-035(run·debug) |
| Milestone | MS-013 | Run Group (C-6) | Planned | v2.0. TASK-036~040. C-7 이후 |
| Release | v0.1.0 | `devswitcher-tools-0.1.0.vsix` | Superseded | 최초 개인 릴리즈 |
| Release | v0.2.0 | `devswitcher-tools-0.2.0.vsix` | Done | F20 마법사 + features/untrusted 수정. 9파일 37.47KB. 설치 스모크 통과(`lim8603.devswitcher-tools@0.2.0`) |

- `Intent`: `Draft` / `Approved` / `Superseded` / `Split` / `Closed`
- `Milestone`: `Planned` / `In Progress` / `Review` / `Done`
- `User Story`: `Draft` / `Approved` / `Implemented`
- `Task`: `Planned` / `In Progress` / `Review` / `Done`

---

## 컨텍스트 로딩 가이드 (Context Loading Guide)

### 핵심 규칙

- 항상 로드: 이 문서(`project_state.md`), `02_project_definition/deliverable_plan.md`, `members/<이름>/workspace/my_state.md` (1인 프로젝트도 동일 경로), 최신 세션 로그
- 팀 프로젝트에서는 `members/team_board.md`도 함께 로드한다.
- 현재 Phase 관련 목록 문서를 먼저 읽고, 필요한 기준 본문과 상세 문서를 추가한다.
- `templates/`, `imported_context/`, `06_evolution/state_archive.md`, 오래된 세션 로그는 기본적으로 로드하지 않는다.
- `06_evolution/state_archive.md`는 과거 세션 완료 서사·핸드오프 이력 아카이브(Log/Archive)다. 이 문서의 요약이 포인터로 가리키며, 특정 과거 세션 맥락이 필요할 때만 해당 `#NNN 이관분` 섹션을 연다.
- `cowork.md`, `session_protocol.md` 등 규칙 문서는 첫 세션 숙지 후 필요할 때만 관련 섹션을 참조한다.
- imported context는 필요한 사실을 추출해 기준 문서에 반영한 뒤 보조 근거로만 활용한다.

### 권장 로딩 순서

1. `project_state.md` -> `deliverable_plan.md`
2. `members/<이름>/workspace/my_state.md` + 최신 세션 로그
3. 현재 Phase 관련 목록 문서 / 기준 본문
4. 필요한 상세 문서 (`INT-*`, `MS-*`, `TASK-*`, `ADR-*`)

### 단계별 로딩 맵 (Phase Map)

| Phase | 즉시 로드 | 필요 시 참조 |
|-------|----------|-------------|
| **Define** | `02_project_definition/intent_registry.md`, `02_project_definition/user_story_registry.md`, `02_project_definition/requirement_spec.md`, `02_project_definition/functional_spec.md`, `02_project_definition/risk_register.md`, `02_project_definition/deliverable_plan.md` | `02_project_definition/intents/INT-*.md`, `02_project_definition/user_stories/US-*.md`, `02_project_definition/domain_glossary.md` |
| **Design** | `03_design_artifacts/adr_registry.md`, `03_design_artifacts/domain_model.md`, `03_design_artifacts/interface_contract.md`, `03_design_artifacts/data_model.md`, `03_design_artifacts/tech_stack.md` | `03_design_artifacts/adrs/ADR-*.md`, `02_project_definition/requirement_spec.md`, `02_project_definition/functional_spec.md`, `03_design_artifacts/ui_spec.md` |
| **Build** | `04_implementation/milestone_registry.md`, `04_implementation/task_registry.md`, `04_implementation/coding_convention.md`, `04_implementation/review_checklist.md` | `04_implementation/milestones/MS-*.md`, `04_implementation/tasks/TASK-*.md`, `03_design_artifacts/interface_contract.md`, `03_design_artifacts/data_model.md` |
| **Verify** | `05_verification/test_strategy.md`, `05_verification/test_case.md`, `05_verification/verification_evidence.md`, `04_implementation/task_registry.md`, `05_verification/quality_gate.md` | `04_implementation/tasks/TASK-*.md`, `02_project_definition/requirement_spec.md`, `03_design_artifacts/*` |
| **Evolve** | `06_evolution/*` | 필요에 따라 전체 프로젝트 문서 |
| **Deliver** | `07_delivery/*`, `05_verification/quality_gate.md`, `05_verification/verification_evidence.md` | `02_project_definition/deliverable_plan.md`, 전체 프로젝트 문서 |

---

## 작성 / 유지 규칙

- 이 문서는 세션 로그를 대체하지 않는 공유 재개 인덱스다.
- 표와 요약 섹션에는 현재 실제 값만 적고, 값이 없으면 `없음`으로 적는다.
- `INT-*`, `MS-*`, `TASK-*` 표기는 형식 안내일 뿐이며, 실제 값이 생기면 바로 교체한다.
- `한 줄 상태`, `현재 작업 스트림`, `다음 시작점`, `AI 핸드오프 메모`는 보통 3~5줄 이내로 유지한다.
- 같은 사실을 여러 섹션에 반복하지 말고, 요약 1회 + 관련 ID/문서 경로로 연결한다.
- 세션 로그의 raw 메모, 미확정 가설, 1회성 디버깅 흔적은 그대로 복사하지 않는다.
- **완료 서사 하베스트 규칙 (R1 — 트리거형 다이어트).** 구 규칙("길어지면 압축")은 트리거가 없어 완료 서사가 세션마다 누적되기 쉽다. → **`다음 시작점`·`AI 핸드오프 메모`의 완료 서사(✅완료·핸드오프 블록)는 최근 N세션(기본 3)만 본문 유지.** `마무리` 선언 시 그보다 오래된 완료 서사는 [state_archive.md](state_archive.md) `#NNN 이관분`으로 **원문 이관(append-only)** 하고 본문엔 1줄 포인터만 남긴다. (상세: `session_protocol.md` §공유 상태 인덱스 관리)
- **표 셀 비대 분리 규칙 (R2).** `활성 Task 요약` 등 표 셀이 여러 세션 서사로 비대해지면 상세는 `tasks/TASK-*.md`(진행 중) 또는 세션 로그 포인터(Done + 맥락 영향 소멸)로 분리하고 셀엔 재개 핵심만 남긴다. **단, 현재 작업에 맥락이 영향을 주는 항목은 셀이 커도 그대로 둔다**(churn 금지). 정리 게이트 = "현재 작업 맥락에 영향이 없는가".
- `최근 변경 파일 / 산출물`, `Human 확인 필요 사항`, `주요 리스크`는 항목이 없더라도 `없음` 상태를 명시한다.
