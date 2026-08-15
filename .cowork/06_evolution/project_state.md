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
| 현재 Phase | Build (MS-007 진행 중 — 016~019 병합, 020 착수) |
| 활성 Intent | INT-001 (Approved, F20·F21 반영) |
| 활성 Milestone | MS-007 (M6 품질·배포, In Progress — 016~019 Done, 020·021 남음) |
| 활성 Task | TASK-020 (통합 테스트 하네스 + 체크리스트 — In Progress) |
| 상태 | Green |
| 대화 언어 | 한국어 |
| 작업 문서 언어 | 한국어 |
| 공식 산출물 문서 언어 | 한국어 |
| 마지막 갱신일 | 2026-08-15 |
| 마지막 갱신자 | AI |
| 참조 세션 로그 | session_2026-08-15_005.md |

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

- Build 진행 중. **MS-001~006 전부 완료·main 병합.** MS-006 = 설정 페이지(옵션 카탈로그 편집·build/run+env 명령 미리보기·자동갱신) + InvocationConfig→cargo 주입(`--config`/RUSTFLAGS/env) + **프로파일 export/import(F12, TASK-015, b7864cf)**. mocha 73. **이제 상태바 전환·빌드·실행·디버그 + 호출 구성 편집 + 프로파일 export/import까지 실동작.** **다음: MS-007(품질·배포·통합테스트) 착수 — Task 분해 필요.** cargo가 실행 경로 해석(DD-05).

### 현재 작업 스트림
> 핵심 작업 스트림만 3~5줄 이내로 유지한다.

- DEFINE + DESIGN 반입 완료(기능·요구·도메인·리스크·US + ADR-001~010 + 설계 4종). BUILD 준비만 남음.
- 코드는 미착수(`src/`, `package.json` 없음) — v1은 CargoAdapter(Rust) 실구현 + 3개 스텁, **단 시작 마법사(F20)는 4개 언어 실동작**.

---

## 활성 Task 요약
> 현재 바로 재개할 Task만 1~3개 남기고, 상세 배경은 목록 문서 / Task 문서 / 세션 로그에 둔다.

| Task ID | 제목 | 담당 | 상태 | 마지막 갱신일 | 다음 액션 |
|---------|------|------|------|---------------|-----------|
| TASK-020 | 통합 테스트 하네스 + 수동 체크리스트 (§15.2) | AI | In Progress | 2026-08-15 | 착수 — `@vscode/test-electron` 셋업 + 자동화 스모크 + §15.2 13항목 수동 체크리스트(WSL/F18·Python 스텁 회귀) → test_case/verification_evidence |

> MS-007: 016·017(Doctor)·018(rustup target)·019(pre/postBuild) Done·main 병합. TASK-020·021 남음. TASK-001~015 Done(MS-001~006).

- `상태` 값은 `Planned` / `In Progress` / `Review` / `Done`을 사용한다.
- `담당`, `상태`, `마지막 갱신일`, `다음 액션`은 `task_registry.md` / `tasks/TASK-*.md`와 같은 의미로 유지한다.

---

## 다음 시작점
> 다음 세션이 바로 시작할 수 있도록 1~3개 우선 행동만 남긴다.

1. **TASK-020 진행** (통합 테스트 하네스 + §15.2 체크리스트) — `@vscode/test-electron` 셋업 + 수동 체크리스트.
2. 이후 021(README+VSIX) → MS-007 Done → MS-008(F20 마법사)
3. 이월: 프로파일 편집(v2, C-3)·extra rustflags/stringList 옵션(L-1)은 후속. C-2(분해)는 해소.

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
| C-2 | **MS-007 분해 완료(2026-08-15, 세션 #005) — TASK-016~021**. MS-008(F20) 분해만 남음(착수 시) | MS-008 착수 시 | task_registry 경량 운영 |
| C-3 | **v2 기능**: 호출 구성 오버레이를 캐노니컬 파일에 영구 반영(편집/승격) — 구 §8.7 `[profile.*]` 스칼라 국소편집 | v2 착수 시 | 세션 #002 ADR-011 |
| C-6 | **v2 신규 기능 후보: Run Group(실행 그룹·종속성)** — 여러 cargo 프로젝트를 그룹으로 묶어 종속 순서대로 일괄 기동/정리(예: auth→api→web). (선택)준비 감지=포트/헬스체크(docker-compose `depends_on` 유사). 현 v1은 "단일 활성 프로젝트·한 창=한 환경"(§12.4)이라 미포함. 필요 요소: 그룹 상태 모델 + GroupOrchestrator + 그룹 정의/트리거 UI. TaskRunner는 이미 프로젝트별 락이라 병렬 실행 가능 | v2/새 Intent 착수 시 | 세션 #005 Human 제기 |
| ~~C-4~~ | **해소(2026-08-15, 세션 #005, TASK-015)** — `ProfileExport` 확정(= PersistedState 정렬: selections+invocation, activeProjectId 제외, runArgs는 ADR-011 승격 위치) + `data_model.md §2` 예시 정합화 | (해소) | 세션 #003 → #005 |
| ~~C-5~~ | **해소(2026-08-15, 세션 #005, TASK-019)** — preBuild/postBuild를 ShellExecution Task로 실제 실행(pre 실패→중단, post 성공 후) + 설정 페이지 buildEvent 에디터 | (해소) | 세션 #004 → #005 |

**저심각 · 기록 (지시 시에만)**

| # | 항목 | 출처 |
|---|------|------|
| L-1 | 옵션 카탈로그에 임의 추가 `-C` 플래그/여러 RUSTFLAGS를 넣는 자유 필드 없음(카탈로그 정의 옵션 + runArgs만 주입). 필요 시 `stringList` 타입 옵션/"extra rustflags" 필드 추가 | 세션 #005 TASK-015 검증 |

---

## AI 핸드오프 메모
> 다음 세션이 바로 이어받는 데 필요한 핵심만 2~5줄로 남긴다.

- DevSwitcher Tools = 다언어(Rust·C++·C#·Python) 통합 상태바 UX VSCode 확장. 핵심 설계는 `LanguageAdapter` + `ChipDescriptor[]`(ADR-003), SSOT 파사드(ADR-007), workspaceState 저장(ADR-001), Task API 실행(ADR-002), cargo가 실행 경로 해석(ADR-005).
- 상세설계서 §16 로드맵 M0~M6이 사실상의 Milestone 후보. v1 실구현 대상은 CargoAdapter(Rust) 단독.
- **세션 #002 신규(ADR-011·012)**: 설정은 3계층(①확장설정 ②캐노니컬 정의 ③호출 구성 오버레이). VS2026식 속성은 계층 ③으로 흡수 — 파일 무편집, `(프로젝트×구성)`별 저장, 빌드/실행 시 `--config`/env 주입. 설정 UI = WebviewPanel "설정 페이지" + 어댑터 선언 옵션 카탈로그. **언어별 능력은 `interface_contract.md` §8 매트릭스가 SSOT.** 캐노니컬 파일 편집은 v2. 구현은 MS-006(M5)에서.
- **세션 #003**: MS-001·002 완료·main 병합(스캐폴드·types.ts·4개 어댑터 스텁, tsc 인터페이스 확정). OQ-002 확정 = `config` 별도 인자. 상세설계서 v1.2 최신화 후 `06_evolution/imported_context/`(영문명 Detailed/Concept-Design)로 이동 — 운영 SSOT는 .cowork, 상세설계서는 **회사 툴 재사용용 통합 스냅샷**. cargo 구현 기준 = 상세설계서 §8.
- **세션 #004**: **TASK-005(cargo CLI I/O) 완료(Review)** — `cargoBridge.ts`에 I/O 계층 추가: `execCapture`+`defaultExec`(child_process.execFile, **셸無** NFR-002, DI로 테스트 가능) + `CargoBridge` 클래스(`fetchMetadata`+manifestPath 캐시·`listInstalledTargets`·`checkToolchain`·`invalidateCache`). 캐시는 시간만료 없음(watcher/명시적만, §8.1). **핵심 결정**: `DevSwitcherError`를 `core/errors.ts`(vscode-free)로 분리 → 브리지가 값으로 throw해도 mocha에서 `vscode` require 안 됨. `types.ts`는 재-export로 하위호환. mocha 14 신규(총 33)·tsc/eslint/esbuild OK·**실 cargo 1.96 스모크**(checkToolchain·metadata·targets·E2=CARGO_METADATA_FAILED).
- **세션 #004 (계속)**: **TASK-006(CargoAdapter 실구현) 완료(Review)** — `cargoAdapter.ts` 런타임 스텁을 실구현으로 교체(vscode-aware 얇은 배선). 모듈 싱글턴 `CargoBridge` 보유, `ProjectInfo→manifestPath/cwd` 변환 담당. listProjects(최단경로 우선·member 중복제거·`id=cargo:${상대경로}`)·chips 4종·createBuild/RunTask(`ProcessExecution`, 셸無, `config.env`+`CARGO_TARGET_DIR`)·resolveExecutable(build `--message-format=json`+`pickExecutable`, E6=`EXECUTABLE_NOT_FOUND`)·invalidateCache 위임. `CargoBridge.peekMetadata` 추가(동기 hasDefault 판정). **의도 이월**: createDebugConfig→M4, createProjectTask→MS-008, persistSetting→v2. problemMatcher/커스텀 profile/F19/compiler·linker 오버레이도 후속. **MS-003 3개 Task 모두 Review**. 34 테스트·tsc/eslint/esbuild OK.
- **세션 #004 (계속)**: **MS-003 main FF 병합**(d249de2, 브랜치 삭제). **MS-004(M3) 코드 완료** — 3분할 구현: TASK-007 데이터(AdapterRegistry 스캔·매칭 + StateStore workspaceState·reconcile, 순수코어 `stateReconcile.ts` mocha 8)·TASK-008 UI(StatusBarController 칩/버튼 렌더 어댑터무지 + picks QuickPick + `defaultChipFormat` mocha 2)·TASK-009 배선(Orchestrator pickChip/switchProject·applyDefaults·ManifestWatcher 500ms 디바운스·extension.ts activate·package.json 5커맨드+activationEvents·cargo 픽스처 `src/test/fixtures/cargo/hello`). mocha 44. 액션버튼 렌더만(실행=MS-005), 툴체인경고칩(E1)=MS-007, 30일GC/export=후속. **F5 end-to-end 검증 통과**. **MS-004 Done → main FF 병합.** CLAUDE.md·AGENTS.md 프로젝트 컨텍스트 작성.
- **세션 #004 (계속)**: **MS-005(M4 실행·디버그) 코드 완료 — F5 검증 대기.** 2분할: TASK-010 실행(`core/taskRunner.ts` executeTask+onDidEndTaskProcess 종료코드·프로젝트별 동시실행 거부 E9 · orchestrator.build()/run() = required 칩 검증 E4→Task 실행→실패 시 Problems 포커스 토스트 · 상태바 spin · `$devswitcher-rustc` 자체 problemMatcher(package.json, Rust 확장 없이 resolve) · ctrl+alt+b/r/d 키바인딩)·TASK-011 디버그(`cargoAdapter.createDebugConfig`=resolveExecutable+순수 `buildLldbConfig` · `core/ensureExtension.ts` CodeLLDB 온디맨드 설치 §13.3 · orchestrator.debug() §7.4 전체 플로우 · launch.json "Run Extension (with extensions)" 구성 추가). mocha 46(buildLldbConfig 2 신규). **F5 검증 통과**(Build/Run + Debug 중단점 정지). `ensureExtension` 온디맨드 설치 루프 fix(39af4ac). **MS-005 Done·main FF 병합.**
- **세션 #004 (계속)**: **MS-006 코어(설정 페이지) 구현·F5 검증 통과 — 미병합 `feature/ms-006-settings-page`.** 3분할: TASK-012(오버레이 주입 — `buildConfigArgs`/`tomlScalar`/`buildRustflags`/`parseArgsLine`, cargoAdapter가 compiler→`--config profile.<p>.<id>`·linker→RUSTFLAGS·env/outputDir 주입, execCapture에 env 추가로 resolveExecutable 동일 아티팩트)·TASK-013(`ui/settingsPanel/` WebviewPanel CSP·단방향 state·프로젝트/Features/프로파일RO 탭·`openSettings`+상태바 기어)·TASK-014(옵션 카탈로그 에디터·`core/invocationConfig.ts applyOption`(compiler/linker record·outputDir·env[label])·`core/argsLine.ts`(parseArgsLine 이동)·build/run 명령 미리보기(Task의 ProcessExecution 역읽기)). mocha 61. F5 피드백 반영: 명령 미리보기 2줄(runArgs 표시)·**자동갱신**(orchestrator `viewSync`→settingsPanel.refresh, Refresh 버튼 제거)·키바인딩 제거(충돌)·enum 기본값 튐 수정(실효값 표시)·입력창 넓힘/라벨 위 배치·**launch 기본을 확장 포함으로**(clean은 별도 구성). ui_spec.md 작성(C-1 해소). **다음: MS-006 병합 + TASK-015(export/import).**
- **세션 #005**: **MS-006 코어 main FF 병합 완료**(335f982, `feature/ms-006-settings-page` 삭제). 병합 전 게이트 재확인 — check-types/eslint clean·mocha 61·esbuild 41.4kb OK. B-1 해소.
- **세션 #005 (계속)**: **TASK-015(export/import F12) 완료 — F5 통과·main FF 병합(b7864cf), MS-006 Done.** `core/profileExport.ts`(vscode-free: build/parse(검증→`PROFILE_IMPORT_INVALID`)/merge(스캔 존재분만 반영·skip)) + `ProfileExport`(C-4: PersistedState 정렬, activeProjectId 제외) + StateStore getState/importState + orchestrator export/importProfile(save/open 다이얼로그+`workspace.fs`, import 후 refresh reconcile) + 커맨드 2종. **파생 개선(설정 페이지 UX)**: 옵션 `example`을 주입형태→**bare 값(placeholder)**로 교정하고 `injectsAs`(주입 힌트)·`docUrl`(공식문서 링크) 분리 — 사용자가 예제를 복붙해 이중 접두사 되던 문제 해결. Command preview에 **env 주입 표시**(`VAR=val` 접두사) 추가로 RUSTFLAGS/CARGO_TARGET_DIR/RUST_LOG 검증 가능. F5: export→값변경→import 라운드트립 복원 + preview env 정상 + docs 링크 정상 확인. mocha 73. **다음: MS-007(품질·배포) 착수 — Task 분해부터.**

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
| Milestone | MS-007 | M6 품질·배포·통합테스트 | Planned | 다음 착수. Task 분해 필요(C-2) |
| Milestone | MS-008 | F20 시작 마법사 | Planned | milestone_registry |

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
